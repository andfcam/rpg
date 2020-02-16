const Player = require('./Player');
const Bullet = require('./Bullet');

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
    SOCKET_LIST[socket.id] = socket;

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

    socket.on('disconnect', () => {
        delete SOCKET_LIST[socket.id];
    });
});

const interval = setInterval(() => {
    handleCollisions();

    const packs = {
        initPack: {
            players: Player.initPack,
            bullets: Bullet.initPack
        },
        updatePack: {
            players: Player.getUpdatePacks(),
            bullets: Bullet.getUpdatePacks()
        },
        removePack: {
            players: Player.removePack,
            bullets: Bullet.removePack
        }
    }

    // console.log(packs);

    for (const id in SOCKET_LIST) {
        const socket = SOCKET_LIST[id];
        socket.emit('init', packs.initPack); // TODO: Emit 'init' and 'remove' on event, not interval - don't emit when empty
        socket.emit('update', packs.updatePack);
        socket.emit('remove', packs.removePack);
    }

    Player.initPack = [];
    Player.removePack = [];
    Bullet.initPack = [];
    Bullet.removePack = [];

}, 1000 / fps);

const handleCollisions = () => {
    if (Object.entries(Bullet.list).length === 0) return;

    for (const id in Bullet.list) {
        const bullet = Bullet.list[id];
        for (const id in Player.list) {
            const player = Player.list[id];
            if (bullet.parentId !== player.id && bullet.map === player.map && bullet.getDistance(player) < 30) {
                player.hp--;
                if (player.hp <= 0) {
                    player.hp = player.maxHp;
                    player.x = Math.random() * 500;
                    player.y = Math.random() * 500;
                }
                bullet.remove();
            }
        }
    }
}

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
