var web3, ctr, GAS_EST;
var utils;
var Customer = require('./Customer.js');

class Target extends Customer {
    constructor(_options) {
        super(_options);
        this.nextMove = 'start';
    }

    async abort(_task) {
        var receipt = Promise.resolve(false);
        var startTime = ctr.mitgn.getStartTime(_task.id).toNumber();
        var validationDeadline = startTime + ctr.mitgn.getValidationDeadline(_task.id).toNumber();

        if (web3.eth.blockNumber > validationDeadline && !ctr.mitgn.proofUploaded(_task.id)) {
            tx = ctr.mitgn.abort.sendTransaction(_task.id, {from: this.addr, gas: GAS_EST});
            console.log("[", _task.id, "]", currentPlayer.constructor.name, "\t aborts (validation timeout)");
            receipt = await web3.eth.getTransactionReceiptMined(tx);
        }

        if (ctr.mitgn.aborted(_task.id))
            this.nextMove = 'complete';
        return receipt;
    }

    async start(_task) {
        var receipt = Promise.resolve(false);
        if (ctr.mitgn.approved(_task.id) && !ctr.mitgn.started(_task.id)) {
            console.log("[", _task.id, "]", this.constructor.name, "starts");
            var tx = ctr.mitgn.start.sendTransaction(_task.id, {from: this.addr, value: web3.toWei(1, "ether"), gas: GAS_EST});
            receipt = await web3.eth.getTransactionReceiptMined(tx);
        }

        if (ctr.mitgn.started(_task.id))
            this.nextMove = 'rate';
        return receipt;
    }

    async rate(_task, _rating) {
        var receipt = Promise.resolve(false);
        var startTime = ctr.mitgn.getStartTime(_task.id).toNumber();
        var validationDeadline = startTime + ctr.mitgn.getValidationDeadline(_task.id).toNumber();

        if (ctr.mitgn.started(_task.id)
            && !ctr.rep.attackTargetRated(_task.id)
            && web3.eth.blockNumber > validationDeadline) {
            receipt = await utils.rate(_rating, this, _task.id, "proof-ok");
        }

        if (ctr.rep.attackTargetRated(_task.id))
            this.nextMove = 'validate';
        return receipt;
    }

    async validate(_task, _response) {
        var receipt = Promise.resolve(false);
        var startTime = ctr.mitgn.getStartTime(_task.id).toNumber();
        var serviceDeadline = startTime + ctr.mitgn.getServiceDeadline(_task.id).toNumber();
        if (web3.eth.blockNumber > serviceDeadline && !ctr.mitgn.validated(_task.id)) {
            console.log("[", _task.id, "]", this.constructor.name, "\t acknowledges");
            var tx = ctr.mitgn.validateProof.sendTransaction(_task.id, true, ctr.rep.address, {from: this.addr, gas: GAS_EST});
            receipt = await web3.eth.getTransactionReceiptMined(tx);
        }

        if (ctr.rep.validated(_task.id))
            this.nextMove = 'abort';
        return receipt;
    }
}

class UndecidedTarget extends Target {
    constructor(_options) {
        super(_options);
        this.nextMove = 'abort';
    }

    abort(_task) {
        tx = ctr.mitgn.abort.sendTransaction(_task.id, {from: this.addr, gas: GAS_EST});
        console.log("[", _task.id, "]", currentPlayer.constructor.name, "\t aborts");
        this.nextMove = 'complete';
        return web3.eth.getTransactionReceiptMined(tx);
    }
}

class SelfishTarget extends Target {
    constructor(_options) {
        super(_options);
        this.nextMove = 'start';
    }

    rate(_task) {
        this.nextMove = 'complete';
        return Promise.resolve(false);
    }

    validate(_task) {
        this.nextMove = 'complete';
        return Promise.resolve(false);
    }
}

class SatisfiedTarget extends Target {
    constructor(_options) {
        super(_options);
        this.nextMove = 'start';
    }

    rate(_task) {
        return super.rate(_task, 1);
    }

    validate(_task) {
        return super.validate(_task, 1);
    }
}

class DissatisfiedTarget extends Target {
    constructor(_options) {
        super(_options);
        this.nextMove = 'start';
    }

    rate(_task) {
        return super.rate(_task, 0);
    }

    validate(_task) {
        return super.validate(_task, 0);
    }
}

class IrrationalTarget extends Target {
    constructor(_options) {
        super(_options);
        this.rating = Math.floor(Math.random() * 2);
        this.nextMove = 'start';
    }

    rate(_task) {
        return super.rate(_task, rating);
    }

    validate(_task) {
        return super.validate(_task, !rating);
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