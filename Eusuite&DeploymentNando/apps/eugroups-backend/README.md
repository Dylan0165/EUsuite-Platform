# EUGroups Backend

Collaborative Groups application for EUSUITE - combines Teams, Slack, and Trello functionality.

## Features

- **Groups**: Create and manage collaborative groups
- **Channels**: Multiple chat channels per group
- **Real-time Chat**: WebSocket-powered instant messaging
- **Kanban Boards**: Task management with drag-and-drop cards
- **SSO Integration**: Uses EUSUITE single sign-on

## API Endpoints

### Groups
- `GET /api/groups` - List all groups
- `POST /api/groups` - Create a new group
- `GET /api/groups/{id}` - Get group details
- `PUT /api/groups/{id}` - Update group
- `DELETE /api/groups/{id}` - Delete group
- `POST /api/groups/{id}/join` - Join a group
- `DELETE /api/groups/{id}/leave` - Leave a group

### Channels
- `GET /api/groups/{id}/channels` - List group channels
- `POST /api/groups/{id}/channels` - Create channel
- `DELETE /api/channels/{id}` - Delete channel

### Messages
- `GET /api/channels/{id}/messages` - Get messages
- `POST /api/channels/{id}/messages` - Send message
- `WS /ws/channels/{id}` - WebSocket connection for real-time chat

### Boards
- `GET /api/groups/{id}/boards` - List boards
- `POST /api/groups/{id}/boards` - Create board
- `GET /api/boards/{id}` - Get board with columns and cards
- `DELETE /api/boards/{id}` - Delete board

### Columns & Cards
- `POST /api/boards/{id}/columns` - Add column
- `PUT /api/columns/{id}` - Update column
- `DELETE /api/columns/{id}` - Delete column
- `POST /api/columns/{id}/cards` - Add card
- `PUT /api/cards/{id}` - Update card
- `PUT /api/cards/{id}/move` - Move card to different column
- `DELETE /api/cards/{id}` - Delete card

## Local Development

```bash
# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Set environment variables
set DATABASE_URL=postgresql://user:pass@localhost/eugroups
set CORE_VALIDATE_URL=http://localhost:8000/api/auth/validate

# Run server
uvicorn app.main:app --reload --port 8001
```

## Docker

```bash
docker build -t eugroups-backend .
docker run -p 8001:8000 -e DATABASE_URL=... eugroups-backend
```

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `CORE_VALIDATE_URL` - SSO validation endpoint (default: http://eucloud-backend/api/auth/validate)
- `EXTRA_CORS_ORIGINS` - Additional CORS origins (comma-separated)
