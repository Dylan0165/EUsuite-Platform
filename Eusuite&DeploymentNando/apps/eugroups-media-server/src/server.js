/**
 * EUGroups Media Server
 * Self-hosted mediasoup SFU for video/voice calls
 * 
 * 100% EU - No American services
 * All media stays on YOUR server
 */

const express = require('express');
const https = require('https');
const http = require('http');
const { WebSocketServer } = require('ws');
const mediasoup = require('mediasoup');
const { v4: uuidv4 } = require('uuid');
const cookie = require('cookie');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET_KEY || 'jwt-secret-key-change-in-production';
const ANNOUNCED_IP = process.env.ANNOUNCED_IP || '192.168.124.50';

// mediasoup workers and routers
let workers = [];
let nextWorkerIndex = 0;

// Active rooms: roomId -> { router, peers: Map<odId, peer> }
const rooms = new Map();

// Media codecs configuration
const mediaCodecs = [
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2,
  },
  {
    kind: 'video',
    mimeType: 'video/VP8',
    clockRate: 90000,
    parameters: {
      'x-google-start-bitrate': 1000,
    },
  },
  {
    kind: 'video',
    mimeType: 'video/VP9',
    clockRate: 90000,
    parameters: {
      'profile-id': 2,
      'x-google-start-bitrate': 1000,
    },
  },
  {
    kind: 'video',
    mimeType: 'video/H264',
    clockRate: 90000,
    parameters: {
      'packetization-mode': 1,
      'profile-level-id': '42e01f',
      'level-asymmetry-allowed': 1,
      'x-google-start-bitrate': 1000,
    },
  },
];

// WebRTC transport settings
const webRtcTransportOptions = {
  listenIps: [
    {
      ip: '0.0.0.0',
      announcedIp: ANNOUNCED_IP,
    },
  ],
  initialAvailableOutgoingBitrate: 1000000,
  minimumAvailableOutgoingBitrate: 600000,
  maxSctpMessageSize: 262144,
  maxIncomingBitrate: 1500000,
};

/**
 * Initialize mediasoup workers
 */
async function createWorkers() {
  const numWorkers = require('os').cpus().length;
  console.log(`🚀 Creating ${numWorkers} mediasoup workers...`);

  for (let i = 0; i < numWorkers; i++) {
    const worker = await mediasoup.createWorker({
      logLevel: 'warn',
      logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
      rtcMinPort: 40000,
      rtcMaxPort: 49999,
    });

    worker.on('died', () => {
      console.error(`❌ mediasoup worker died, exiting...`);
      process.exit(1);
    });

    workers.push(worker);
    console.log(`  ✅ Worker ${i + 1} created (pid: ${worker.pid})`);
  }
}

/**
 * Get next worker (round-robin)
 */
function getNextWorker() {
  const worker = workers[nextWorkerIndex];
  nextWorkerIndex = (nextWorkerIndex + 1) % workers.length;
  return worker;
}

/**
 * Get or create a room
 */
async function getOrCreateRoom(roomId) {
  if (rooms.has(roomId)) {
    return rooms.get(roomId);
  }

  const worker = getNextWorker();
  const router = await worker.createRouter({ mediaCodecs });

  const room = {
    id: roomId,
    router,
    peers: new Map(),
  };

  rooms.set(roomId, room);
  console.log(`📺 Room ${roomId} created`);

  return room;
}

/**
 * Validate JWT token from cookie
 */
function validateToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return {
      user_id: String(decoded.user_id),
      email: decoded.email,
      username: decoded.username || decoded.email?.split('@')[0],
    };
  } catch (err) {
    return null;
  }
}

/**
 * Create Express server
 */
const server = http.createServer(app);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    rooms: rooms.size,
    workers: workers.length,
  });
});

// Get router RTP capabilities
app.get('/api/rooms/:roomId/rtp-capabilities', async (req, res) => {
  try {
    const room = await getOrCreateRoom(req.params.roomId);
    res.json({ rtpCapabilities: room.router.rtpCapabilities });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * WebSocket server for signaling
 */
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', async (ws, req) => {
  // Parse cookies and validate token
  const cookies = cookie.parse(req.headers.cookie || '');
  const token = cookies.eusuite_token;

  if (!token) {
    ws.close(4001, 'Not authenticated');
    return;
  }

  const user = validateToken(token);
  if (!user) {
    ws.close(4001, 'Invalid token');
    return;
  }

  // Parse room from URL: /ws?roomId=xxx
  const url = new URL(req.url, `http://${req.headers.host}`);
  const roomId = url.searchParams.get('roomId');

  if (!roomId) {
    ws.close(4002, 'Room ID required');
    return;
  }

  console.log(`👤 User ${user.user_id} connecting to room ${roomId}`);

  // Get or create room
  const room = await getOrCreateRoom(roomId);

  // Create peer object
  const peerId = uuidv4();
  const peer = {
    id: peerId,
    odId: user.user_id,
    name: user.username,
    ws,
    transports: new Map(),
    producers: new Map(),
    consumers: new Map(),
  };

  room.peers.set(peerId, peer);

  // Send welcome message with router capabilities
  send(ws, {
    type: 'welcome',
    peerId,
    userId: user.user_id,
    userName: user.username,
    rtpCapabilities: room.router.rtpCapabilities,
    peers: Array.from(room.peers.values())
      .filter(p => p.id !== peerId)
      .map(p => ({ id: p.id, odId: p.odId, name: p.name })),
  });

  // Notify others
  broadcastToRoom(room, peerId, {
    type: 'peer-joined',
    peerId,
    userId: user.user_id,
    userName: user.username,
  });

  // Handle messages
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);
      await handleMessage(room, peer, message);
    } catch (err) {
      console.error('Message error:', err);
      send(ws, { type: 'error', message: err.message });
    }
  });

  // Handle disconnect
  ws.on('close', () => {
    console.log(`👋 User ${user.user_id} left room ${roomId}`);

    // Close all transports
    for (const transport of peer.transports.values()) {
      transport.close();
    }

    // Remove peer
    room.peers.delete(peerId);

    // Notify others
    broadcastToRoom(room, null, {
      type: 'peer-left',
      peerId,
    });

    // Clean up empty rooms
    if (room.peers.size === 0) {
      room.router.close();
      rooms.delete(roomId);
      console.log(`🗑️ Room ${roomId} closed (empty)`);
    }
  });
});

/**
 * Handle WebSocket messages
 */
async function handleMessage(room, peer, message) {
  const { type } = message;

  switch (type) {
    case 'create-transport': {
      const { direction } = message; // 'send' or 'recv'
      const transport = await room.router.createWebRtcTransport(webRtcTransportOptions);

      peer.transports.set(transport.id, transport);

      send(peer.ws, {
        type: 'transport-created',
        direction,
        transportId: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
        sctpParameters: transport.sctpParameters,
      });
      break;
    }

    case 'connect-transport': {
      const { transportId, dtlsParameters } = message;
      const transport = peer.transports.get(transportId);

      if (!transport) {
        throw new Error('Transport not found');
      }

      await transport.connect({ dtlsParameters });
      send(peer.ws, { type: 'transport-connected', transportId });
      break;
    }

    case 'produce': {
      const { transportId, kind, rtpParameters, appData } = message;
      const transport = peer.transports.get(transportId);

      if (!transport) {
        throw new Error('Transport not found');
      }

      const producer = await transport.produce({
        kind,
        rtpParameters,
        appData: { ...appData, odId: peer.odId, peerName: peer.name },
      });

      peer.producers.set(producer.id, producer);

      producer.on('transportclose', () => {
        producer.close();
        peer.producers.delete(producer.id);
      });

      send(peer.ws, {
        type: 'produced',
        producerId: producer.id,
        kind,
      });

      // Notify others about new producer
      broadcastToRoom(room, peer.id, {
        type: 'new-producer',
        peerId: peer.id,
        odId: peer.odId,
        peerName: peer.name,
        producerId: producer.id,
        kind,
      });
      break;
    }

    case 'consume': {
      const { producerId, rtpCapabilities } = message;

      // Find producer
      let producer = null;
      let producerPeer = null;

      for (const [, p] of room.peers) {
        if (p.producers.has(producerId)) {
          producer = p.producers.get(producerId);
          producerPeer = p;
          break;
        }
      }

      if (!producer) {
        throw new Error('Producer not found');
      }

      // Check if can consume
      if (!room.router.canConsume({ producerId, rtpCapabilities })) {
        throw new Error('Cannot consume this producer');
      }

      // Get recv transport
      const transport = Array.from(peer.transports.values())
        .find(t => t.appData?.direction === 'recv');

      if (!transport) {
        throw new Error('No recv transport');
      }

      const consumer = await transport.consume({
        producerId,
        rtpCapabilities,
        paused: true,
      });

      peer.consumers.set(consumer.id, consumer);

      consumer.on('transportclose', () => {
        consumer.close();
        peer.consumers.delete(consumer.id);
      });

      consumer.on('producerclose', () => {
        send(peer.ws, {
          type: 'consumer-closed',
          consumerId: consumer.id,
        });
        consumer.close();
        peer.consumers.delete(consumer.id);
      });

      send(peer.ws, {
        type: 'consumed',
        consumerId: consumer.id,
        producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
        producerPeerId: producerPeer.id,
        producerUserName: producerPeer.name,
      });
      break;
    }

    case 'resume-consumer': {
      const { consumerId } = message;
      const consumer = peer.consumers.get(consumerId);

      if (consumer) {
        await consumer.resume();
        send(peer.ws, { type: 'consumer-resumed', consumerId });
      }
      break;
    }

    case 'close-producer': {
      const { producerId } = message;
      const producer = peer.producers.get(producerId);

      if (producer) {
        producer.close();
        peer.producers.delete(producerId);

        broadcastToRoom(room, null, {
          type: 'producer-closed',
          peerId: peer.id,
          producerId,
        });
      }
      break;
    }

    case 'get-producers': {
      // Get all producers from other peers
      const producers = [];

      for (const [, p] of room.peers) {
        if (p.id !== peer.id) {
          for (const [producerId, producer] of p.producers) {
            producers.push({
              peerId: p.id,
              odId: p.odId,
              peerName: p.name,
              producerId,
              kind: producer.kind,
            });
          }
        }
      }

      send(peer.ws, { type: 'producers-list', producers });
      break;
    }

    default:
      console.warn(`Unknown message type: ${type}`);
  }
}

/**
 * Send message to WebSocket
 */
function send(ws, message) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

/**
 * Broadcast to all peers in room except sender
 */
function broadcastToRoom(room, excludePeerId, message) {
  for (const [peerId, peer] of room.peers) {
    if (peerId !== excludePeerId) {
      send(peer.ws, message);
    }
  }
}

/**
 * Start server
 */
async function start() {
  await createWorkers();

  server.listen(PORT, () => {
    console.log(`\n🎥 EUGroups Media Server running on port ${PORT}`);
    console.log(`📡 Announced IP: ${ANNOUNCED_IP}`);
    console.log(`🔒 100% Self-hosted - No external services\n`);
  });
}

start().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
