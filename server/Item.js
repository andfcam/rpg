class Item {
    constructor(id, name, event) {
        this.id = id;
        this.name = name;
        this.event = event;

        this.init();
    }

    init() {
        Item.list[this.id] = this;
    }

    static list = {};
}

new Item('potion', 'Potion', (player) => {
    player.hp = Math.min(player.maxHp, player.hp += 10);
    player.inventory.removeItem('potion', 1);
});

module.exports = Item;