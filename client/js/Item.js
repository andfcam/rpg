class Item {
    constructor(id, name) {
        this.id = id;
        this.name = name;

        this.init();
    }

    init() {
        Item.list[this.id] = this;
    }

    static list = {};
}

new Item('potion', 'Potion');

new Item('specialAttack', 'Special Attack');