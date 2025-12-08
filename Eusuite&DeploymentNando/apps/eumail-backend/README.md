# EUMail Backend

Email microservice for EUSuite platform.

## Features

- Send and receive internal emails
- SSO authentication via core backend
- Inbox and Sent folders
- Unread message count

## API Endpoints

- `GET /health` - Health check
- `GET /api/mail/messages` - Get inbox
- `GET /api/mail/sent` - Get sent messages
- `GET /api/mail/messages/{id}` - Get specific message
- `POST /api/mail/messages` - Send new message
- `POST /api/mail/messages/{id}/read` - Mark as read
- `DELETE /api/mail/messages/{id}` - Delete message
- `GET /api/mail/unread-count` - Get unread count

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `CORE_VALIDATE_URL` - SSO validation endpoint

## Development

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Docker

```bash
docker build -t eumail-backend .
docker run -p 8000:8000 eumail-backend
```
