class Inventory {
    constructor(socket) {
        this.items = []; // [{ id, amount }]
        this.socket = socket;
    }
    
    refreshRender() {
        const inventory = document.querySelector('#inventory');
        inventory.innerHTML = ``;

        const addButton = (data) => {
            const item = Item.list[data.id];
            const button = document.createElement('button');
            button.onclick = () => {
                this.socket.emit('useItem', item.id);
            }
            button.innerText = `${item.name} x ${data.amount}`;
            inventory.appendChild(button);
        }

        this.items.forEach(item => {
            addButton(item);
        });
    }
}