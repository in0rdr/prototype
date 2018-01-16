var web3, ctr, GAS_EST;
var Customer = require('./Customer.js');

class Target extends Customer {
    constructor(_options) {
        super(_options)
    }

    rate() {}
    validate() {}
    abort() {}
}

class UndecidedTarget extends Target {
    constructor(_options) {
        super(_options);
    }

    advance(_id) {
        if (!ctr.mitgn.approved(_id)) {
            var tx = ctr.mitgn.abort.sendTransaction(_id, {from: this.addr, gas: GAS_EST});
            return web3.eth.getTransactionReceiptMined(tx);
        } else {
            return Promise.resolve(false);
        }
    }
}

class SelfishTarget extends Target {
    constructor(_options) {
        super(_options);
    }

    advance(_id) {
        if (ctr.mitgn.approved(_id) && !ctr.mitgn.started(_id)) {
            // start task, but never rate or validate
            var tx = ctr.mitgn.start.sendTransaction(_id, {from: this.addr, value: web3.toWei(1, "ether"), gas: GAS_EST});
            return web3.eth.getTransactionReceiptMined(tx);
        } else {
            return Promise.resolve(false);
        }
    }
}

module.exports = function(_web3, _ctr, _GAS_EST) {
    web3 = _web3;
    ctr = _ctr;
    GAS_EST = _GAS_EST;

    var module = {};
    module.Target = Target;
    module.UndecidedTarget = UndecidedTarget;
    module.SelfishTarget = SelfishTarget;
    return module;
}