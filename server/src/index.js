const express = require('express');
const { WebSocketServer, WebSocket } = require('ws');
const http = require('http');

const app = express();
const port = process.env.PORT || 8080;

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Keep track of all connected clients and their data
const clients = new Map();

wss.on('connection', (ws) => {
    const clientId = Math.random().toString(36).substr(2, 9);
    const clientData = {
        id: clientId,
        position: { x: 0, y: 0.5, z: 0 }
    };
    
    clients.set(ws, clientData);
    
    ws.send(JSON.stringify({ type: 'assignId', id: clientId }));
    
    const currentPlayers = Array.from(clients.values());
    ws.send(JSON.stringify({ type: 'currentPlayers', players: currentPlayers }));

    const newPlayerMsg = JSON.stringify({ type: 'playerConnected', player: clientData });
    clients.forEach((data, client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(newPlayerMsg);
        }
    });
    
    const connectionMessage = JSON.stringify({
        type: 'connectionUpdate',
        count: clients.size
    });
    broadcast(connectionMessage);

    console.log(`Client ${clientId} connected. Total connections: ${clients.size}`);

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            const senderClient = clients.get(ws);
            if (!senderClient) return;
            
            if (data.type === 'position') {
                senderClient.position = data.position;
                broadcast(JSON.stringify({
                    type: 'position',
                    id: senderClient.id,
                    position: data.position
                }));
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    ws.on('close', () => {
        const client = clients.get(ws);
        clients.delete(ws);
        
        if (client) {
            console.log(`Client ${client.id} disconnected. Total connections: ${clients.size}`);
            broadcast(JSON.stringify({
                type: 'playerDisconnected',
                id: client.id
            }));
        }
        
        const disconnectionMessage = JSON.stringify({
            type: 'connectionUpdate',
            count: clients.size
        });
        broadcast(disconnectionMessage);
    });
});

// Broadcast function to send message to all connected clients
function broadcast(message) {
    clients.forEach((clientData, client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// Basic health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', connections: clients.size });
});

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}); 