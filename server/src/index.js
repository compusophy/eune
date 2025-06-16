import 'dotenv/config';
import { WebSocketServer } from 'ws';
import { Pool } from 'pg';
import * as quickAuth from '@farcaster/quick-auth';
import http from 'http';
import express from 'express';

const app = express();
const port = process.env.PORT || 8080;
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const players = new Map();
const playerConnections = new Map();

const createTable = async () => {
    const client = await pool.connect();
    try {
        await client.query(`
      CREATE TABLE IF NOT EXISTS players (
        id BIGINT PRIMARY KEY,
        position_x REAL NOT NULL,
        position_y REAL NOT NULL,
        position_z REAL NOT NULL
      );
    `);
        console.log('Table "players" is ready.');
    } finally {
        client.release();
    }
};

createTable().catch(console.error);

wss.on('connection', ws => {
    console.log('Client connected');

    ws.on('message', async (messageBuffer) => {
        const message = JSON.parse(messageBuffer.toString());

        if (message.type === 'auth' && message.token) {
            try {
                const { fid } = await quickAuth.verifyJwt(message.token, {
                    domain: process.env.APP_DOMAIN
                });
                
                console.log(`Authenticated user with FID: ${fid}`);
                
                ws.id = fid;
                playerConnections.set(fid, ws);

                const client = await pool.connect();
                try {
                    const res = await client.query('SELECT * FROM players WHERE id = $1', [fid]);
                    let player;
                    if (res.rows.length > 0) {
                        player = {
                            id: res.rows[0].id,
                            position: { x: res.rows[0].position_x, y: res.rows[0].position_y, z: res.rows[0].position_z }
                        };
                    } else {
                        player = { id: fid, position: { x: 0, y: 0.5, z: 0 } };
                        await client.query('INSERT INTO players (id, position_x, position_y, position_z) VALUES ($1, $2, $3, $4)', [fid, player.position.x, player.position.y, player.position.z]);
                    }
                    players.set(fid, player);
                } finally {
                    client.release();
                }

                ws.send(JSON.stringify({ type: 'assignId', id: fid }));
                ws.send(JSON.stringify({ type: 'currentPlayers', players: Array.from(players.values()) }));
                
                wss.clients.forEach(client => {
                    if (client !== ws && client.readyState === ws.OPEN && client.id) {
                        client.send(JSON.stringify({ type: 'playerConnected', player: players.get(fid) }));
                    }
                });

                console.log(`Player ${fid} authenticated and connected.`);
            } catch (error) {
                console.error('Failed to process message or authenticate', error);
                ws.close();
            }
        }

        if (message.type === 'position') {
            const player = players.get(ws.id);
            if (player) {
                player.position = message.position;
                
                const query = {
                    text: 'UPDATE players SET position_x = $1, position_y = $2, position_z = $3 WHERE id = $4',
                    values: [player.position.x, player.position.y, player.position.z, ws.id],
                };
                pool.query(query).catch(console.error);
                
                wss.clients.forEach(client => {
                    if (client !== ws && client.readyState === ws.OPEN && client.id) {
                        client.send(JSON.stringify({ type: 'position', id: ws.id, position: message.position }));
                    }
                });
            }
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        if (ws.id) {
            players.delete(ws.id);
            playerConnections.delete(ws.id);
            wss.clients.forEach(client => {
                if (client.readyState === ws.OPEN && client.id) {
                    client.send(JSON.stringify({ type: 'playerDisconnected', id: ws.id }));
                }
            });
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

server.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
}); 