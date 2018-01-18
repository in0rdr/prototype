class Task {
    constructor(_id, _tar, _mit) {
        this.id = _id;
        this.tar = _tar;
        this.mit = _mit;
        this.next = _mit; // todo: randomize first next
    }

    advance() {
        var result = this.next.advance(this.id);
        this.next = (this.next == this.mit) ? this.tar : this.mit;
        return result;
    }
}

module.exports = Task