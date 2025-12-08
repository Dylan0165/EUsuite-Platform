# EUGroups Frontend

Modern collaborative teams application built with React, TypeScript, and Tailwind CSS.

## Features

- **Groups**: Browse, create, and manage collaborative groups
- **Channels**: Real-time chat with WebSocket support
- **Kanban Boards**: Drag-and-drop task management
- **SSO Integration**: Seamless authentication via EUSUITE

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Axios
- Lucide Icons

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Variables

Create a `.env` file:

```env
VITE_API_URL=http://localhost:8001
VITE_WS_URL=ws://localhost:8001
VITE_LOGIN_URL=http://192.168.124.50:30081
VITE_DASHBOARD_URL=http://192.168.124.50:30080
```

## Docker

```bash
docker build -t eugroups-frontend .
docker run -p 80:80 eugroups-frontend
```

## Project Structure

```
src/
├── api/          # API client and hooks
├── components/   # Reusable UI components
├── hooks/        # Custom React hooks
├── pages/        # Page components
├── types.ts      # TypeScript definitions
└── App.tsx       # Main app with routing
```
