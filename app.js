const express = require('express');
const app = express();

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));

const http = require('http').createServer(app);
const io = require('socket.io')(http);

const SOCKET_LIST = {}; // {[id: socket, id: socket, id: socket]}
const PLAYER_LIST = {};
const fps = 50;

http.listen(2000, function () {
    console.log("Server started");
});

class Player {
    constructor(id) {
        this.id = id;
        this.x = 250;
        this.y = 250;
        this.maxSpeed = 5;
        this.pressingUp = false;
        this.pressingDown = false;
        this.pressingLeft = false;
        this.pressingRight = false;
    }

    updatePosition() {
        if (this.pressingUp) this.y -= this.maxSpeed;
        if (this.pressingDown) this.y += this.maxSpeed;
        if (this.pressingLeft) this.x -= this.maxSpeed;
        if (this.pressingRight) this.x += this.maxSpeed;
    }
}

io.on('connection', function (socket) {
    socket.id = Math.floor(100 * Math.random()); // TODO: Make id equal to user id
    SOCKET_LIST[socket.id] = socket;

    const player = new Player(socket.id);
    PLAYER_LIST[player.id] = player;

    console.log('User connected');

    socket.on('keyPress', function (event) {
        switch (event.key) {
            case 'up': player.pressingUp = event.state; break;
            case 'down': player.pressingDown = event.state; break;
            case 'left': player.pressingLeft = event.state; break;
            case 'right': player.pressingRight = event.state; break;
        }
    });

    socket.on('disconnect', function () {
        delete PLAYER_LIST[player.id];
        delete SOCKET_LIST[socket.id];
        console.log('User disconnected');
    });
});

const interval = setInterval(function () {
    let players = [];

    for (const id in PLAYER_LIST) {
        const player = PLAYER_LIST[id];
        player.updatePosition();
        players.push({
            id: player.id,
            x: player.x,
            y: player.y
        });
    }

    for (const id in SOCKET_LIST) {
        const socket = SOCKET_LIST[id];
        socket.emit('playerPositions', players);
    }
}, 1000 / fps);