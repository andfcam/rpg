const express = require('express');
const app = express();

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));

const http = require('http').createServer(app);
const io = require('socket.io')(http);

const SOCKET_LIST = {}; // {[id: socket, id: socket, id: socket]}
const fps = 50;

http.listen(2000, function () {
    console.log("Server started");
});

class Entity {
    constructor(id) {
        this.id = id;
        this.x = 250;
        this.y = 250;
        this.speedX = 0;
        this.speedY = 0;
    }

    update() {
        this.updatePosition();
    }

    updatePosition() {
        this.x += this.speedX;
        this.y += this.speedY;
    }
}

class Player extends Entity {
    constructor(id) {
        super(id);
        this.maxSpeed = 5;
        this.pressingUp = false;
        this.pressingDown = false;
        this.pressingLeft = false;
        this.pressingRight = false;

        Player.list[this.id] = this;
    }

    update() {
        this.updateSpeed();
        super.update();
    }

    updateSpeed() {
        if (this.pressingUp) this.speedY = -this.maxSpeed;
        else if (this.pressingDown) this.speedY = this.maxSpeed;
        else this.speedY = 0;

        if (this.pressingLeft) this.speedX = -this.maxSpeed;
        else if (this.pressingRight) this.speedX = this.maxSpeed;
        else this.speedX = 0;
    }
}

Player.list = {}; // // { [id: {player} ] }

Player.onConnect = (socket) => {
    const player = new Player(socket.id);

    console.log('User connected');

    socket.on('keyPress', function (event) {
        switch (event.key) {
            case 'up': player.pressingUp = event.state; break;
            case 'down': player.pressingDown = event.state; break;
            case 'left': player.pressingLeft = event.state; break;
            case 'right': player.pressingRight = event.state; break;
        }
    });
}

Player.onDisconnect = (socket) => {
    delete Player.list[socket.id];

    console.log('User disconnected');
}

Player.update = () => {
    let positions = [];

    for (const id in Player.list) {
        const player = Player.list[id];
        player.update();
        positions.push({
            id: player.id,
            x: player.x,
            y: player.y
        });
    }

    return positions;
}

class Bullet extends Entity {
    constructor(angle) {
        super(Math.random()); // id
        this.speedX = Math.cos(angle / 180 * Math.PI) * 10;
        this.speedY = Math.sin(angle / 180 * Math.PI) * 10;

        this.timer = 0;
        // this.toRemove = false;

        Bullet.list[this.id] = this;
    }

    update() {
        if (this.timer++ > 100) delete Bullet.list[this.id];
        super.update();
    }
}

Bullet.list = {}; // { [id: {bullet} ] }

Bullet.update = () => {
    if (Math.random() < 0.05) new Bullet(Math.random() * 360);

    let positions = [];

    for (const id in Bullet.list) {
        const bullet = Bullet.list[id];
        bullet.update();
        positions.push({
            x: bullet.x,
            y: bullet.y
        });
    }

    return positions;
}

io.on('connection', function (socket) {
    socket.id = Math.floor(100 * Math.random()); // TODO: Make id equal to user id
    SOCKET_LIST[socket.id] = socket;

    Player.onConnect(socket);

    socket.on('disconnect', function () {
        Player.onDisconnect(socket);
        delete SOCKET_LIST[socket.id];
    });
});

const interval = setInterval(function () {
    const positions = {
        players: Player.update(),
        bullets: Bullet.update()
    }

    for (const id in SOCKET_LIST) {
        const socket = SOCKET_LIST[id];
        socket.emit('updatePositions', positions);
    }
}, 1000 / fps);