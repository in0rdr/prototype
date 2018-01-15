const defaults = {
    addr: "0x",
    id: 0
}

class Customer {
    constructor(_options) {
        this.addr = _options.addr || defaults.addr;
        this.id = _options.id || defaults.id;
    }
    advance() {}
}

module.exports = Customer