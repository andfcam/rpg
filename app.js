const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));

http.listen(2000, function () {
    console.log("Server started");
});

io.on('connection', function (socket) {
    console.log('User connected');

    socket.on('disconnect', function () {
        console.log('User disconnected');
    });

    socket.on('msg', function (data) {
        console.log(data.message);
    })
});