var web3, ctr, GAS_EST;
var Target;

class Task {
    constructor(_id, _tar, _mit) {
        this.id = _id;
        this.tar = _tar;
        this.mit = _mit;
        this.nextCustomer = _mit; // todo: randomize first next
    }

    advance(_activeTasks, _completedTasks) {
        var result = this.nextCustomer.advance(this, _activeTasks, _completedTasks);
        if (!( Object.getPrototypeOf(this.nextCustomer) instanceof Target.Target
               && this.nextCustomer.nextMove[this.id] === 'rate' )) {
            // allow target to rate and validate
            this.nextCustomer = (this.nextCustomer == this.mit) ? this.tar : this.mit;
        }
        return result;
    }
}

module.exports = function(_web3, _ctr, _GAS_EST) {
    web3 = _web3;
    ctr = _ctr;
    GAS_EST = _GAS_EST;
    Target = require('./Target.js')(web3, ctr, GAS_EST);

    var module = {};
    module.Task = Task;
    return module;
}