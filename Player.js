const Entity = require('./Entity');
const Bullet = require('./Bullet');

class Player extends Entity {
    constructor(data) {
        super({ id: data.id, map: data.map });
        this.username = data.username;
        this.socket = data.socket;
        this.hp = 10;
        this.maxHp = 10;
        this.maxSpeed = 5;
        this.pressingUp = false;
        this.pressingDown = false;
        this.pressingLeft = false;
        this.pressingRight = false;
        this.pressingAttack = false;
        this.mouseAngle = 0;

        this.init();
    }

    init() {
        Player.list[this.id] = this;

        Player.initPack.push(this.getInitPack());
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

    // All socket events we want available AFTER logging in 
    static onConnect = (socket, username) => {
        let map = 'village';
        if (Math.random() < 0.5) map = 'alt';

        const player = new Player({ socket: socket, id: socket.id, username: username, map: map });

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
            for (const id in Player.list) {
                Player.list[id].socket.emit('addMessage', `${player.username}: ${message}`);
            }
        });

        socket.on('sendPM', (data) => {
            let recipientSocket = null;
            for (const id in Player.list) {
                if (Player.list[id].username === data.username) {
                    recipientSocket = Player.list[id];
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
            Player.removePack.push({ id: socket.id });
            delete Player.list[socket.id];

            console.log(`User ${player.username} disconnected.`);
        });

        socket.emit('init', {
            self: socket.id,
            players: Player.getInitPacks(),
            bullets: Bullet.getInitPacks()
        });

        socket.emit('addMessage', `Hi, ${player.username}. Welcome to the game.`);

        console.log(`User ${player.username} connected.`);
    }

    // TODO: Player and bullet lists are only populated with people in same map (and vicinity later)
    static list = {}; // // { [id: {instance} ] }

    static getInitPacks = () => {
        let players = [];

        for (const id in Player.list) {
            players.push(Player.list[id].getInitPack());
        }

        return players;
    }

    static getUpdatePacks = () => {
        let positions = [];

        for (const id in Player.list) {
            const player = Player.list[id];
            player.update();
            positions.push(player.getUpdatePack());
        }

        return positions;
    }
}

module.exports = Player;