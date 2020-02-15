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

// const profiler = require('v8-profiler-node8');
// const fs = require('fs');

const SOCKET_LIST = {}; // {[id: socket, id: socket, id: socket]}
const fps = 50;

http.listen(process.env.PORT || 2000);
console.log("Server started.");

class Entity {
    constructor(data) {
        this.id = data.id;
        this.x = data.x || 250;
        this.y = data.y || 250;
        this.speedX = data.speedX || 0;
        this.speedY = data.speedY || 0;
        this.map = data.map || 'village';
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
    constructor(data) {
        super({ id: data.id, map: data.map });
        this.username = data.username;
        this.maxSpeed = 5;
        this.pressingUp = false;
        this.pressingDown = false;
        this.pressingLeft = false;
        this.pressingRight = false;
        this.pressingAttack = false;
        this.mouseAngle = 0;
        this.hp = 10;
        this.maxHp = 10;

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
        const bullet = new Bullet({ parentId: this.id, x: this.x, y: this.y, angle: angle, map: this.map });
    }

    getInitPack() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            hp: this.hp,
            maxHp: this.maxHp,
            map: this.map
            // and other initial information such as sprite
        }
    }

    // TODO: Idea: create a global updatePack variable like init and remove, only push necessary data to it
    // If any of the three packs are empty, don't emit
    getUpdatePack() {
        // TODO: Check if value has changed before sending info
        // TODO: Compression?
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            hp: this.hp,
            map: this.map
        }
    }

    static functionExample() { }
}

// TODO: Player and bullet lists are only populated with people in same map (and vicinity later)
Player.list = {}; // // { [id: {player} ] }

// All socket events we want available AFTER logging in 
Player.onConnect = (socket, username) => {
    SOCKET_LIST[socket.id] = socket;

    let map = 'village';
    if (Math.random() < 0.5) map = 'alt';

    const player = new Player({ id: socket.id, username: username, map: map });

    socket.on('changeMap', () => {
        if (player.map === 'village') player.map = 'alt';
        else player.map = 'village';
    });

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

    socket.on('sendMessage', (message) => {
        for (const id in SOCKET_LIST) {
            SOCKET_LIST[id].emit('addMessage', `${player.username}: ${message}`);
        }
    });

    socket.on('sendPM', (data) => {
        let recipientSocket = null;
        for (const id in Player.list) {
            if (Player.list[id].username === data.username) {
                recipientSocket = SOCKET_LIST[id];
            }
        }
        if (recipientSocket === null) {
            socket.emit('addMessage', `The player '${data.username}' is not online.`);
        } else {
            socket.emit('addPM', `To ${data.username}: ${data.message}`); 
            recipientSocket.emit('addPM', `From ${player.username}: ${data.message}`);
        }
    });

    socket.on('debug', (message) => { // TODO: Remove debug function or sanitise input
        if (!DEBUG) return;
        socket.emit('addToConsole', eval(message));
    });

    socket.on('disconnect', () => {
        Player.onDisconnect(socket, player.username);
        delete SOCKET_LIST[socket.id];
    });

    socket.emit('init', {
        self: socket.id,
        players: Player.getInitPack(),
        bullets: Bullet.getInitPack()
    });

    socket.emit('addMessage', `Hi, ${player.username}. Welcome to the game.`);

    console.log(`User ${player.username} connected.`);
}

Player.getInitPack = () => {
    let players = [];
    for (const id in Player.list) {
        players.push(Player.list[id].getInitPack());
    }
    return players;
}

Player.onDisconnect = (socket, username) => {
    removePack.players.push({ id: socket.id });
    delete Player.list[socket.id];

    console.log(`User ${username} disconnected.`);
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
    constructor(data) {
        super({
            id: Math.random(),
            x: data.x,
            y: data.y,
            speedX: Math.cos(data.angle / 180 * Math.PI) * 10,
            speedY: Math.sin(data.angle / 180 * Math.PI) * 10,
            map: data.map
        });

        this.angle = data.angle;
        this.parentId = data.parentId;
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
            if (this.parentId !== player.id && this.map === player.map && this.getDistance(player) < 30) {
                player.hp--;

                if (player.hp <= 0) {
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
            map: this.map
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

// All socket events we want available BEFORE logging in
io.on('connection', (socket) => {
    socket.id = Math.floor(100 * Math.random()); // TODO: Make id equal to user id

    socket.on('signIn', (data) => {
        isValidPassword(data, (res) => {
            if (res) {
                Player.onConnect(socket, data.username);
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

const startProfiling = (duration) => {
    profiler.startProfiling('1', true);
    setTimeout(() => {
        const profile1 = profiler.stopProfiling('1');

        profile1.export((err, res) => {
            fs.writeFileSync('./profile.cpuprofile', res);
            profile1.delete();
            console.log('Profile saved.');
        });
    }, duration);
}
// startProfiling(15000);
