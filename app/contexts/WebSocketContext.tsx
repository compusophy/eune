'use client';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { sdk } from '@farcaster/frame-sdk';

interface Position {
    x: number;
    y: number;
    z: number;
}

interface Player {
    id: string;
    position: Position;
}

interface WebSocketContextType {
    connected: boolean;
    connectionCount: number;
    players: Map<string, Player>;
    clientId: string | null;
    sendMessage: (message: any) => void;
}

const WebSocketContext = createContext<WebSocketContextType>({
    connected: false,
    connectionCount: 0,
    players: new Map(),
    clientId: null,
    sendMessage: () => {},
});

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [connected, setConnected] = useState(false);
    const [connectionCount, setConnectionCount] = useState(0);
    const [players, setPlayers] = useState<Map<string, Player>>(new Map());
    const [clientId, setClientId] = useState<string | null>(null);

    useEffect(() => {
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';
        const ws = new WebSocket(wsUrl);

        ws.onopen = async () => {
            console.log('Connected to WebSocket');
            setConnected(true);
            try {
                const { token } = await sdk.quickAuth.getToken();
                ws.send(JSON.stringify({ type: 'auth', token }));
            } catch (error) {
                console.error('Quick Auth failed', error);
                ws.close();
            }
        };

        ws.onclose = () => {
            console.log('Disconnected from WebSocket');
            setConnected(false);
            setPlayers(new Map());
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                switch (data.type) {
                    case 'assignId':
                        setClientId(data.id);
                        break;
                    case 'currentPlayers':
                        const playerMap = new Map<string, Player>();
                        data.players.forEach((p: Player) => playerMap.set(p.id, p));
                        setPlayers(playerMap);
                        break;
                    case 'playerConnected':
                        setPlayers(prevPlayers => {
                            const newPlayers = new Map(prevPlayers);
                            newPlayers.set(data.player.id, data.player);
                            return newPlayers;
                        });
                        break;
                    case 'connectionUpdate':
                        setConnectionCount(data.count);
                        break;
                    case 'position':
                        setPlayers(prevPlayers => {
                            const newPlayers = new Map(prevPlayers);
                            newPlayers.set(data.id, {
                                id: data.id,
                                position: data.position
                            });
                            return newPlayers;
                        });
                        break;
                    case 'playerDisconnected':
                        setPlayers(prevPlayers => {
                            const newPlayers = new Map(prevPlayers);
                            newPlayers.delete(data.id);
                            return newPlayers;
                        });
                        break;
                }
            } catch (error) {
                console.error('Error parsing message:', error);
            }
        };

        setSocket(ws);

        return () => {
            ws.close();
        };
    }, []);

    const sendMessage = useCallback((message: any) => {
        if (socket?.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(message));
        }
    }, [socket]);

    return (
        <WebSocketContext.Provider value={{ connected, connectionCount, players, clientId, sendMessage }}>
            {children}
        </WebSocketContext.Provider>
    );
}; 