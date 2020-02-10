const mongojs = require('mongojs');
const db = mongojs('mongodb+srv://Admin:KWwIrPRC09RjK3wt@a67-gqim1.mongodb.net/myGame?retryWrites=true&w=majority', ['account', 'progress']);

const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));

const http = require('http').createServer(app);
const io = require('socket.io')(http);

const SOCKET_LIST = {}; // {[id: socket, id: socket, id: socket]}
const fps = 50;

http.listen(2000, () => {
    console.log("Server started.");
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

    getDistance(object) { return Math.hypot(this.x - object.x, this.y - object.y); }
}

class Player extends Entity {
    constructor(id) {
        super(id);
        this.maxSpeed = 5;
        this.pressingUp = false;
        this.pressingDown = false;
        this.pressingLeft = false;
        this.pressingRight = false;
        this.pressingAttack = false;
        this.mouseAngle = 0;
        this.hp = 10;
        this.maxHp = 10;
        this.score = 0;

        this.init();
    }

    init() {
        Player.list[this.id] = this;

        initPack.players.push(this.getInitPack());
    }

    update() {
        this.updateSpeed();
        super.update();
        if (this.pressingAttack) {
            // for (let i = -1; i <= 1; i++) this.shootBullet(i * 10 + this.mouseAngle); // 3-pronged attack
            this.shootBullet(this.mouseAngle);
        }
    }

    updateSpeed() {
        if (this.pressingUp) this.speedY = -this.maxSpeed;
        else if (this.pressingDown) this.speedY = this.maxSpeed;
        else this.speedY = 0;

        if (this.pressingLeft) this.speedX = -this.maxSpeed;
        else if (this.pressingRight) this.speedX = this.maxSpeed;
        else this.speedX = 0;
    }

    shootBullet(angle) {
        const bullet = new Bullet(this.id, angle);
        bullet.x = this.x;
        bullet.y = this.y;
    }

    getInitPack() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            hp: this.hp,
            maxHp: this.maxHp,
            score: this.score,
            // and other initial information such as sprite
        }
    }

    getUpdatePack() {
        // TODO: Check if value has changed before sending info
        // TODO: Compression?
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            hp: this.hp,
            score: this.score
        }
    }
}

Player.list = {}; // // { [id: {player} ] }

Player.onConnect = (socket) => {
    const player = new Player(socket.id);

    console.log(`User ${socket.id} connected.`);

    socket.emit('addToChat', `Hi, ${player.id}. Welcome to the game.`);

    socket.on('keyPress', (event) => {
        switch (event.action) {
            case 'up': player.pressingUp = event.value; break;
            case 'down': player.pressingDown = event.value; break;
            case 'left': player.pressingLeft = event.value; break;
            case 'right': player.pressingRight = event.value; break;
            case 'attack': player.pressingAttack = event.value; break;
            case 'aim': player.mouseAngle = event.value; break;
        }
    });

    socket.emit('init', {
        players: Player.getInitPack(),
        bullets: Bullet.getInitPack()
    });
}

Player.getInitPack = () => {
    let players = [];
    for (const id in Player.list) {
        players.push(Player.list[id].getInitPack());
    }
    return players;
}

Player.onDisconnect = (socket) => {
    removePack.players.push({ id: socket.id });
    delete Player.list[socket.id]; // TODO: Player disconnects even if never connected (logged in)

    console.log(`User ${socket.id} disconnected.`);
}

Player.update = () => {
    let positions = [];

    for (const id in Player.list) {
        const player = Player.list[id];
        player.update();
        positions.push(player.getUpdatePack());
    }

    return positions;
}

class Bullet extends Entity {
    constructor(parentId, angle) {
        super(Math.random()); // id
        this.speedX = Math.cos(angle / 180 * Math.PI) * 10;
        this.speedY = Math.sin(angle / 180 * Math.PI) * 10;
        this.parentId = parentId;

        this.timer = 0;

        this.init();
    }

    init() {
        Bullet.list[this.id] = this;

        initPack.bullets.push(this.getInitPack());
    }

    update() {
        if (this.timer++ > 100) this.remove();
        for (const id in Player.list) {
            const player = Player.list[id];
            if (this.getDistance(player) < 30 && this.parentId !== player.id) {
                player.hp--;

                if (player.hp <= 0) {
                    const shooter = Player.list[this.parent];
                    if (shooter) shooter.score++;
                    player.hp = player.maxHp;
                    player.x = Math.random() * 500;
                    player.y = Math.random() * 500;
                }
                this.remove();
            }
        }
        super.update();
    }

    remove() {
        removePack.bullets.push({ id: this.id });
        delete Bullet.list[this.id];
    }

    getInitPack() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            // and other initial information such as sprite
        }
    }

    getUpdatePack() {
        return {
            id: this.id,
            x: this.x,
            y: this.y
        }
    }
}

Bullet.list = {}; // { [id: {bullet} ] }

Bullet.getInitPack = () => {
    let bullets = [];
    for (const id in Bullet.list) {
        bullets.push(Bullet.list[id].getInitPack());
    }
    return bullets;
}

Bullet.update = () => {
    let positions = [];

    for (const id in Bullet.list) {
        const bullet = Bullet.list[id];
        bullet.update();
        positions.push(bullet.getUpdatePack());
    }

    return positions;
}

const DEBUG = true;

// Note: interacting with database is asynchronous -> callback
const isValidPassword = (data, callback) => {
    db.account.find({ username: data.username, password: data.password }, (err, res) => {
        if (res.length > 0) callback(true);
        else callback(false);
    });
};

const isUsernameTaken = (data, callback) => {
    db.account.find({ username: data.username }, (err, res) => {
        if (res.length > 0) callback(true);
        else callback(false);
    });
}

const addUser = (data, callback) => {
    db.account.insert({ username: data.username, password: data.password }, (err) => {
        callback();
    });
}

io.on('connection', (socket) => {
    socket.id = Math.floor(100 * Math.random()); // TODO: Make id equal to user id
    SOCKET_LIST[socket.id] = socket;

    socket.on('signIn', (data) => {
        isValidPassword(data, (res) => {
            if (res) {
                Player.onConnect(socket);
                socket.emit('signInResponse', { success: true });
            } else {
                socket.emit('signInResponse', { success: false });
            }
        });
    });

    socket.on('signUp', (data) => {
        isUsernameTaken(data, (res) => {
            if (res) {
                socket.emit('signUpResponse', { success: false });
            } else {
                addUser(data, () => {
                    socket.emit('signUpResponse', { success: true });
                });
            }
        });
    });

    socket.on('sendToChat', (message) => {
        for (const id in SOCKET_LIST) {
            SOCKET_LIST[id].emit('addToChat', `${socket.id}: ${message}`);
        }
    });

    socket.on('debug', (message) => { // TODO: Remove debug function or sanitise input
        if (!DEBUG) return;
        socket.emit('addToConsole', eval(message));
    });

    socket.on('disconnect', () => {
        Player.onDisconnect(socket);
        delete SOCKET_LIST[socket.id];
    });
});

let initPack = { players: [], bullets: [] };
let removePack = { players: [], bullets: [] };

const emptyPacks = () => {
    initPack = { players: [], bullets: [] };
    removePack = { players: [], bullets: [] };
}

const interval = setInterval(() => {
    const updatePack = {
        players: Player.update(),
        bullets: Bullet.update()
    }

    for (const id in SOCKET_LIST) {
        SOCKET_LIST[id].emit('init', initPack); // TODO: Emit 'init' and 'remove' on event, not interval
        SOCKET_LIST[id].emit('update', updatePack);
        SOCKET_LIST[id].emit('remove', removePack);
    }

    emptyPacks();
}, 1000 / fps);


