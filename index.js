const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, clientTracking: true });

app.use(cors());
app.get('/', (req, res) => {
    res.send('WHAT ARE YOU DOING HERE!!!!!???? >:(');
});

let lobbies = new Map(); // LobbyId: { clients: [], lastActivity: Date }

wss.on('connection', ws => {
    ws.on('message', message => {
        let payload;
        try {
            payload = JSON.parse(message);
        } catch (e) {
            console.error('Invalid message received:', message);
            return;
        }

        let clients = (lobbies.get(payload.LobbyId) || {}).clients || [];

        // If the client isn't in the lobby yet, add them
        if (!clients.includes(ws)) {
            clients.push(ws);
            lobbies.set(payload.LobbyId, { clients, lastActivity: new Date() });
        }

        clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(payload.MessageContent);
                console.log(`Message sent to clients in room ${payload.LobbyId}: ${payload.MessageContent}`);
            }
        });

        console.log(`Message sent in room ${payload.LobbyId}: ${payload.MessageContent}`);
    });

    ws.on('close', () => {
        for (let [roomId, clients] of lobbies.entries()) {
            const index = clients.indexOf(ws);
            if (index !== -1) {
                clients.splice(index, 1);
            }

            if (clients.length === 0) {
                lobbies.delete(roomId);
            }
        }
    });
});

setInterval(() => {
    const now = new Date();
    for (let [roomId, { clients, lastActivity }] of lobbies.entries()) {
        const diffMinutes = (now - lastActivity) / (1000 * 60); 
        if (diffMinutes > 30) {
            lobbies.delete(roomId);
            console.log(`Lobby ${roomId} removed due to inactivity`);
        }
    }
}, 120 * 60 * 1000);

const PORT = process.env.DEFAULT_PORT || 8080;

server.listen(PORT, () => {
    console.log('Server is listening on port:', PORT);
});
