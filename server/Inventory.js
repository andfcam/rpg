class Inventory {
    constructor(socket) {
        this.items = []; // [{ id, amount }]
        this.socket = socket;
    }

    addItem(id, amount) {
        const existing = this.items.find(item => item.id === id);
        if (existing) {
            existing.amount += amount;
            this.refreshRender();
            return;
        }
        this.items.push({ id: id, amount: amount });
        this.refreshRender();
    }

    removeItem(id, amount) {
        const existing = this.items.find(item => item.id === id);
        if (existing) {
            if (existing.amount < amount) {
                console.log("Not enough items.");
                return;
            }
            existing.amount -= amount;
            if (existing.amount <= 0) this.items.splice(this.items.indexOf(id), 1);
            this.refreshRender();
            return;
        }
    }

    hasItem(id, amount) {
        const existing = this.items.find(item => item.id === id);
        if (existing) return existing.amount >= amount;
        return false;
    }

    refreshRender() {
        this.socket.emit('updateInventory', this.items);
    }
}

module.exports = Inventory;