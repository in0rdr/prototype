var web3, ctr, GAS_EST;
var utils;
var Customer = require('./Customer.js');

class Target extends Customer {
    constructor(_options) {
        super(_options);
    }

    init(_task) {
        this.nextMove[_task.id] = 'start';
        return Promise.resolve({});
    }

    complete(_task) {
        return super.complete(_task.id, ctr, web3, GAS_EST);
    }

    async start(_task) {
        var receipt = Promise.resolve({});
        var reputation = await utils.getReputation(_task.mit);
        console.log("[", _task.id, "]", this.constructor.name, "\t reads reputation", reputation);
        if (reputation < 0.3) {
           this.nextMove[_task.id] = 'finish';
        } else if (!ctr.mitgn.completed(_task.id)) {
            console.log("[", _task.id, "]", this.constructor.name, "\t starts");
            var tx = ctr.mitgn.start.sendTransaction(_task.id, {from: this.addr, value: web3.toWei(1, "ether"), gas: GAS_EST});
            receipt = await web3.eth.getTransactionReceiptMined(tx);
            this.nextMove[_task.id] = 'rate';
        } else {
           this.nextMove[_task.id] = 'finish';
        }

        return receipt;
    }

    async rate(_task, _rating) {
        var receipt = Promise.resolve({});
        var startTime = ctr.mitgn.getStartTime(_task.id).toNumber();
        var serviceDeadline = startTime + ctr.mitgn.getServiceDeadline(_task.id).toNumber();

        if (web3.eth.blockNumber > serviceDeadline) {
            console.log("[", _task.id, "]", this.constructor.name, "\t", (_rating === 1) ? "acknowledges" : "rejects");
            receipt = await utils.rate(_rating, this, _task.id, "proof-ok");
            this.nextMove[_task.id] = 'complete';
        }

        return receipt;
    }
}

class UndecidedTarget extends Target {
    constructor(_options) {
        super(_options);
    }

    init(_task) {
        this.nextMove[_task.id] = 'complete';
        return Promise.resolve({});
    }

    complete(_task) {
        var tx = ctr.mitgn.complete.sendTransaction(_task.id, ctr.rep.address, {from: this.addr, gas: GAS_EST});
        console.log("[", _task.id, "]", this.constructor.name, "\t completes");
        this.nextMove[_task.id] = 'finish';
        return web3.eth.getTransactionReceiptMined(tx);
    }
}

class SelfishTarget extends Target {
    constructor(_options) {
        super(_options);
    }

    rate(_task) {
        this.nextMove[_task.id] = 'complete';
        return Promise.resolve({});
    }
}

class SatisfiedTarget extends Target {
    constructor(_options) {
        super(_options);
    }

    rate(_task) {
        // rate according to M's expectations
        var rating;
        if (ctr.mitgn.proofUploaded(_task.id)) {
            rating = 1;
            console.log("[", _task.id, "]", this.constructor.name, "\t rates \t", rating, "(proof uploaded)");
        } else {
            rating = 0;
            console.log("[", _task.id, "]", this.constructor.name, "\t rates \t", rating, "(proof not uploaded)");
        }
        return super.rate(_task, rating);
    }
}

class DissatisfiedTarget extends Target {
    constructor(_options) {
        super(_options);
    }

    rate(_task) {
        // always rate negatively,
        // even when a proof was uploaded
        console.log("[", _task.id, "]", this.constructor.name, "\t rates 0\t (proof not uploaded)");
        return super.rate(_task, 0);
    }
}

module.exports = function(_web3, _ctr, _GAS_EST) {
    web3 = _web3;
    ctr = _ctr;
    GAS_EST = _GAS_EST;
    utils = require('./utils.js')(web3, ctr, GAS_EST);

    var module = {};
    module.Target = Target;
    module.UndecidedTarget = UndecidedTarget;
    module.SelfishTarget = SelfishTarget;
    module.SatisfiedTarget = SatisfiedTarget;
    module.DissatisfiedTarget = DissatisfiedTarget;
    return module;
}