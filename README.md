# Medieval MMO

A medieval MMO game built with Next.js, Three.js, and WebSockets.

## Project Structure

The project is split into two main parts:
- `client/` - Next.js frontend application with Three.js for 3D rendering
- `server/` - WebSocket server for real-time communication

## Getting Started

### Client Setup

First, run the development server:

```bash
# In the client directory
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Server Setup

```bash
# In the server directory
npm install
npm run dev
```

The WebSocket server will start on port 8080 by default.

## Deployment

The project is deployed using Railway:
- Frontend: Next.js application
- Backend: WebSocket server

## Development

You can test the real-time functionality by opening multiple browser windows or connecting from different devices. The connection status and number of connected players will be displayed in real-time.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.
