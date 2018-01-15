class Task {
    constructor(_id, _tar, _mit) {
        this.id = _id;
        this.tar = _tar;
        this.mit = _mit;
        this.next = _mit;
    }

    advance() {
        if (this.next == this.mit) {
            return this.mit.advance(this.id);
            this.next = this.tar;
        } else if (this.next == this.tar) {
            return this.tar.advance(this.id);
            this.next = this.mit;
        }

    }
}

module.exports = Task