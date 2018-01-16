class Task {
    constructor(_id, _tar, _mit) {
        this.id = _id;
        this.tar = _tar;
        this.mit = _mit;
        this.next = _tar;
    }

    advance() {
        this.next = (this.next == this.mit) ? this.tar : this.mit;
        return this.next.advance(this.id);
    }
}

module.exports = Task