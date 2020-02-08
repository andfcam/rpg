const express = require('express');
const app = express();

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));

const http = require('http').createServer(app);
const io = require('socket.io')(http);

const PLAYER_LIST = {}; // {[id: socket, id: socket, id: socket]}
const fps = 50;

http.listen(2000, function () {
    console.log("Server started");
});

io.on('connection', function (player) {
    player.id = Math.floor(100 * Math.random()); // TODO: Make id equal to user id
    player.x = 0;
    player.y = 0;

    PLAYER_LIST[player.id] = player;

    console.log('User connected');

    player.on('disconnect', function () {
        delete PLAYER_LIST[player.id];
        console.log('User disconnected');
    });
});

const interval = setInterval(function () {
    let players = [];

    for (const id in PLAYER_LIST) {
        player = PLAYER_LIST[id];
        player.x++;
        player.y++;
        players.push({
            id: player.id,
            x: player.x,
            y: player.y
        });
    }

    for (const id in PLAYER_LIST) {
        player = PLAYER_LIST[id];
        player.emit('playerPositions', players);
    }
}, 1000 / fps);