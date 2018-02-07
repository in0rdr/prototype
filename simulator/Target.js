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

    abort(_task) {
        return super.abort(_task.id, ctr.mitgn, web3, GAS_EST);
    }

    async start(_task) {
        var receipt = Promise.resolve({});
        var reputation = await utils.getReputation(_task.mit);
        console.log("[", _task.id, "]", this.constructor.name, "\t reads reputation", reputation);
        if (reputation < 0.5) {
            this.nextMove[_task.id] = 'complete';
        } else if (!ctr.mitgn.aborted(_task.id)) {
            console.log("[", _task.id, "]", this.constructor.name, "\t starts");
            var tx = ctr.mitgn.start.sendTransaction(_task.id, {from: this.addr, value: web3.toWei(1, "ether"), gas: GAS_EST});
            receipt = await web3.eth.getTransactionReceiptMined(tx);
            this.nextMove[_task.id] = 'rate';
        } else {
            this.nextMove[_task.id] = 'complete';
        }

        return receipt;
    }

    async rate(_task, _rating) {
        var receipt = Promise.resolve({});
        var startTime = ctr.mitgn.getStartTime(_task.id).toNumber();
        var serviceDeadline = startTime + ctr.mitgn.getServiceDeadline(_task.id).toNumber();

        if (web3.eth.blockNumber > serviceDeadline) {
            receipt = await utils.rate(_rating, this, _task.id, "proof-ok");
            this.nextMove[_task.id] = 'validate';
        }

        return receipt;
    }

    async validate(_task, _response) {
        var receipt = Promise.resolve({});
        var startTime = ctr.mitgn.getStartTime(_task.id).toNumber();
        var serviceDeadline = startTime + ctr.mitgn.getServiceDeadline(_task.id).toNumber();
        if (web3.eth.blockNumber > serviceDeadline) {
            console.log("[", _task.id, "]", this.constructor.name, "\t", _response ? "acknowledges" : "rejects");
            var tx = ctr.mitgn.validateProof.sendTransaction(_task.id, _response, ctr.rep.address, {from: this.addr, gas: GAS_EST});
            receipt = await web3.eth.getTransactionReceiptMined(tx);
            this.nextMove[_task.id] = 'abort';
        }

        return receipt;
    }
}

class UndecidedTarget extends Target {
    constructor(_options) {
        super(_options);
    }

    init(_task) {
        this.nextMove[_task.id] = 'abort';
        return Promise.resolve({});
    }

    abort(_task) {
        var tx = ctr.mitgn.abort.sendTransaction(_task.id, {from: this.addr, gas: GAS_EST});
        console.log("[", _task.id, "]", this.constructor.name, "\t aborts");
        this.nextMove[_task.id] = 'complete';
        return web3.eth.getTransactionReceiptMined(tx);
    }
}

class SelfishTarget extends Target {
    constructor(_options) {
        super(_options);
    }

    rate(_task) {
        this.nextMove[_task.id] = 'abort';
        return Promise.resolve({});
    }

    validate(_task) {
        this.nextMove[_task.id] = 'abort';
        return Promise.resolve({});
    }
}

class SatisfiedTarget extends Target {
    constructor(_options) {
        super(_options);
    }

    rate(_task) {
        return super.rate(_task, 1);
    }

    validate(_task) {
        return super.validate(_task, true);
    }
}

class DissatisfiedTarget extends Target {
    constructor(_options) {
        super(_options);
    }

    rate(_task) {
        return super.rate(_task, 0);
    }

    validate(_task) {
        return super.validate(_task, false);
    }
}

class IrrationalTarget extends Target {
    constructor(_options) {
        super(_options);
        this.rating = Math.floor(Math.random() * 2);
    }

    rate(_task) {
        return super.rate(_task, this.rating);
    }

    validate(_task) {
        return super.validate(_task, (this.rating === 0) ? true : false);
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
    module.IrrationalTarget = IrrationalTarget;
    return module;
}