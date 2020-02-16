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

    getDistance(object) {
        return Math.hypot(this.x - object.x, this.y - object.y);
    }

    static initPack = [];

    static removePack = [];
}

module.exports = Entity;