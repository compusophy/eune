import 'dotenv/config';
import { WebSocketServer } from 'ws';
import { Pool } from 'pg';
import quickAuth from '@farcaster/quick-auth';
import http from 'http';

const server = http.createServer();
const wss = new WebSocketServer({ server });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Keep track of all connected clients and their data
const players = new Map();
const playerConnections = new Map();

const createTable = async () => {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS players (
                id BIGINT PRIMARY KEY,
                x FLOAT NOT NULL,
                y FLOAT NOT NULL,
                z FLOAT NOT NULL
            );
        `);
        console.log('Table "players" is ready');
    } finally {
        client.release();
    }
};

createTable().catch(console.error);

wss.on('connection', ws => {
    ws.on('message', async (messageBuffer) => {
        const message = JSON.parse(messageBuffer.toString());

        if (message.type === 'auth' && message.token) {
            try {
                const { fid } = await quickAuth.verifyJwt(message.token, {
                    domain: process.env.APP_DOMAIN
                });
                
                console.log(`Authenticated user with FID: ${fid}`);
                
                ws.id = fid;
                
                let position = { x: 0, y: 0.5, z: 0 };
                const res = await pool.query('SELECT * FROM players WHERE id = $1', [fid]);
                if (res.rows.length > 0) {
                    position = { x: res.rows[0].x, y: res.rows[0].y, z: res.rows[0].z };
                } else {
                    await pool.query('INSERT INTO players (id, x, y, z) VALUES ($1, $2, $3, $4)', [fid, position.x, position.y, position.z]);
                }
                
                const player = { id: fid, position };
                players.set(fid, player);
                
                ws.send(JSON.stringify({ type: 'assignId', id: fid }));
                ws.send(JSON.stringify({ type: 'currentPlayers', players: Array.from(players.values()) }));

                const newPlayerMsg = JSON.stringify({ type: 'playerConnected', player });
                wss.clients.forEach(client => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(newPlayerMsg);
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
                    text: 'UPDATE players SET x = $1, y = $2, z = $3 WHERE id = $4',
                    values: [player.position.x, player.position.y, player.position.z, ws.id],
                };

                pool.query(query).catch(console.error);

                wss.clients.forEach(client => {
                    if (client !== ws && client.readyState === WebSocket.OPEN && client.id) {
                        client.send(JSON.stringify({ type: 'position', id: ws.id, position: message.position }));
                    }
                });
            }
        }
    });

    ws.on('close', () => {
        const disconnectedPlayer = players.get(ws.id);
        if (disconnectedPlayer) {
            
            const query = {
                text: 'UPDATE players SET x = $1, y = $2, z = $3 WHERE id = $4',
                values: [disconnectedPlayer.position.x, disconnectedPlayer.position.y, disconnectedPlayer.position.z, ws.id],
            };
            pool.query(query).catch(e => console.error('Failed to save player on disconnect', e));

            players.delete(ws.id);
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'playerDisconnected', id: ws.id }));
                }
            });
            console.log(`Player ${ws.id} disconnected.`);
        }
    });
});

// Broadcast function to send message to all connected clients
function broadcast(message) {
    players.forEach((playerData, client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// Basic health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', connections: wss.clients.size });
});

server.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
}); 