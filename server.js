const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

const players = {};
const bullets = [];

io.on('connection', (socket) => {
    console.log(`Игрок подключился: ${socket.id}`);

    // Новый игрок
    socket.on('setNickname', (nickname) => {
        players[socket.id] = {
            id: socket.id,
            x: Math.floor(Math.random() * 100),
            y: Math.floor(Math.random() * 100),
            nickname,
            alive: true,
            canMove: true,
            canShoot: true,
        };
        socket.emit('currentPlayers', players);
        socket.broadcast.emit('newPlayer', players[socket.id]);
        console.log(`Игрок ${nickname} (${socket.id}) зашел в игру.`);
    });

    // Движение игрока
    socket.on('move', (direction) => {
        const player = players[socket.id];
        if (player && player.alive && player.canMove) {
            if (direction.up) player.y = Math.max(player.y - 1, 0);
            if (direction.down) player.y = Math.min(player.y + 1, 99);
            if (direction.left) player.x = Math.max(player.x - 1, 0);
            if (direction.right) player.x = Math.min(player.x + 1, 99);
            io.emit('playerMoved', player);
        }
    });

    // Выстрел
    socket.on('shoot', (bullet) => {
        const player = players[socket.id];
        if (player && player.alive && player.canShoot) {
            bullets.push(bullet);
            io.emit('bulletFired', bullet);
        }
    });

    // Обработка попадания
    socket.on('playerHit', (targetId) => {
        const target = players[targetId];
        if (target && target.alive) {
            target.alive = false;
            target.canMove = false;
            target.canShoot = false;
            io.emit('playerKilled', target);
            console.log(`Игрок ${target.nickname} (${target.id}) был поражен пулей.`);
        }
    });

    // Отключение игрока
    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
        console.log(`Игрок отключился: ${socket.id}`);
    });
});

server.listen(3000, () => {
    console.log('Сервер запущен на http://localhost:3000');
});
