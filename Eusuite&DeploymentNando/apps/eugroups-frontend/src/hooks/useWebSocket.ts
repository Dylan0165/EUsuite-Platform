import { useEffect, useRef, useState, useCallback } from 'react';
import type { Message, TypingEvent } from '../types';

interface UseWebSocketOptions {
  channelId: number;
  onMessage: (message: Message) => void;
  onTyping?: (event: TypingEvent) => void;
  onUserJoined?: (userId: string, username: string) => void;
  onUserLeft?: (userId: string, username: string) => void;
}

export function useWebSocket({
  channelId,
  onMessage,
  onTyping,
  onUserJoined,
  onUserLeft,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<number>();
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    // Get WebSocket URL
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = import.meta.env.VITE_WS_URL || `${wsProtocol}//${window.location.host}`;
    const wsUrl = `${wsHost}/ws/channels/${channelId}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected to channel', channelId);
        setConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'new_message':
              onMessage(data.message);
              break;
            case 'typing':
              onTyping?.(data);
              break;
            case 'user_joined':
              onUserJoined?.(data.user_id, data.username);
              break;
            case 'user_left':
              onUserLeft?.(data.user_id, data.username);
              break;
            case 'pong':
              // Heartbeat response
              break;
            default:
              console.log('Unknown WS message type:', data.type);
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('Connection error');
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setConnected(false);
        wsRef.current = null;

        // Attempt reconnection with exponential backoff
        if (event.code !== 4001 && event.code !== 4003) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current++;
          
          reconnectTimeoutRef.current = window.setTimeout(() => {
            console.log('Attempting WebSocket reconnection...');
            connect();
          }, delay);
        }
      };
    } catch (e) {
      console.error('Error creating WebSocket:', e);
      setError('Failed to connect');
    }
  }, [channelId, onMessage, onTyping, onUserJoined, onUserLeft]);

  useEffect(() => {
    connect();

    // Heartbeat to keep connection alive
    const heartbeatInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    return () => {
      clearInterval(heartbeatInterval);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendTyping = useCallback((isTyping: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'typing', is_typing: isTyping }));
    }
  }, []);

  return {
    connected,
    error,
    sendTyping,
  };
}
