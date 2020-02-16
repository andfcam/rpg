const Entity = require('./Entity');

class Bullet extends Entity {
    constructor(data) {
        super({
            id: Math.random(),
            x: data.x,
            y: data.y,
            speedX: Math.cos(data.angle / 180 * Math.PI) * 5,
            speedY: Math.sin(data.angle / 180 * Math.PI) * 5,
            map: data.map
        });

        this.angle = data.angle;
        this.parentId = data.parentId;
        this.age = 0;

        this.init();
    }

    init() {
        Bullet.list[this.id] = this;

        Bullet.initPack.push(this.getInitPack());
    }

    update() {
        if (this.age++ > 100) this.remove();

        super.update();
    }

    remove() {
        Bullet.removePack.push({ id: this.id });
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

    // TODO: Player and bullet lists are only populated with people in same map (and vicinity later)
    static list = {}; // // { [id: {instance} ] }

    static getInitPacks = () => {
        let bullets = [];

        for (const id in Bullet.list) {
            bullets.push(Bullet.list[id].getInitPack());
        }

        return bullets;
    }

    static getUpdatePacks = () => {
        let positions = [];

        for (const id in Bullet.list) {
            const bullet = Bullet.list[id];
            bullet.update();
            positions.push(bullet.getUpdatePack());
        }

        return positions;
    }
}

module.exports = Bullet;