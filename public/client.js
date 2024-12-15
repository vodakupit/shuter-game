const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const playerSize = 5;
const players = {};
const bullets = [];
let mouseX = 0;
let mouseY = 0;
let lastShotTime = 0;
const shootDelay = 340;

const keysPressed = { up: false, down: false, left: false, right: false };

// Запрос никнейма
let playerName = prompt("Введите ваш никнейм:");
socket.emit('setNickname', playerName);

// Обновление состояния клавиш
window.addEventListener('keydown', (event) => {
    const player = players[socket.id];
    if (!player || !player.alive || !player.canMove) return;

    switch (event.key.toLowerCase()) {
        case 'w': keysPressed.up = true; break;
        case 's': keysPressed.down = true; break;
        case 'a': keysPressed.left = true; break;
        case 'd': keysPressed.right = true; break;
    }
    socket.emit('move', keysPressed);
});

window.addEventListener('keyup', (event) => {
    switch (event.key.toLowerCase()) {
        case 'w': keysPressed.up = false; break;
        case 's': keysPressed.down = false; break;
        case 'a': keysPressed.left = false; break;
        case 'd': keysPressed.right = false; break;
    }
    socket.emit('move', keysPressed);
});

// Отслеживание мыши
canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = Math.floor((event.clientX - rect.left) / playerSize);
    mouseY = Math.floor((event.clientY - rect.top) / playerSize);
});

// Выстрел
window.addEventListener('click', () => {
    const currentTime = Date.now();
    const player = players[socket.id];
    if (currentTime - lastShotTime >= shootDelay && player && player.alive && player.canShoot) {
        const bullet = {
            x: player.x,
            y: player.y,
            targetX: mouseX,
            targetY: mouseY,
            owner: socket.id,
        };
        socket.emit('shoot', bullet);
        bullets.push(bullet);
        lastShotTime = currentTime;
    }
});

// Обновление игроков
socket.on('currentPlayers', (currentPlayers) => {
    Object.assign(players, currentPlayers);
    drawPlayers();
});

socket.on('newPlayer', (player) => {
    players[player.id] = player;
    drawPlayers();
});

socket.on('playerMoved', (player) => {
    players[player.id] = player;
    drawPlayers();
});

socket.on('playerKilled', (player) => {
    players[player.id] = player;
    drawPlayers();
});

socket.on('playerDisconnected', (playerId) => {
    delete players[playerId];
    drawPlayers();
});

// Пули
socket.on('bulletFired', (bullet) => {
    bullets.push(bullet);
});

// Проверка столкновений
function checkBulletCollision() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];

        for (let id in players) {
            const target = players[id];
            if (target.alive && target.id !== bullet.owner) {
                const dx = Math.abs(target.x - bullet.x);
                const dy = Math.abs(target.y - bullet.y);
                if (dx <= 1 && dy <= 1) {
                    socket.emit('playerHit', target.id);
                    bullets.splice(i, 1);
                    return;
                }
            }
        }

        const angle = Math.atan2(bullet.targetY - bullet.y, bullet.targetX - bullet.x);
        bullet.x += Math.cos(angle) * 0.5;
        bullet.y += Math.sin(angle) * 0.5;

        const reachedTarget = Math.abs(bullet.x - bullet.targetX) < 0.5 && Math.abs(bullet.y - bullet.targetY) < 0.5;
        if (reachedTarget) {
            bullets.splice(i, 1);
        }
    }
}

// Отрисовка игроков и пуль
function drawPlayers() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let id in players) {
        const player = players[id];
        ctx.fillStyle = player.alive ? 'green' : 'red';
        ctx.fillRect(player.x * playerSize, player.y * playerSize, playerSize, playerSize);
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.font = "10px Arial";
        ctx.fillText(player.nickname, player.x * playerSize + playerSize / 2, player.y * playerSize - 2);
    }

    bullets.forEach((bullet) => {
        ctx.fillStyle = 'blue';
        ctx.fillRect(bullet.x * playerSize, bullet.y * playerSize, playerSize / 2, playerSize / 2);
    });
}

function gameLoop() {
    drawPlayers();
    checkBulletCollision();
    requestAnimationFrame(gameLoop);
}

gameLoop();
