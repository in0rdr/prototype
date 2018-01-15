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
        }
    }
}

module.exports = function(_web3, _ctr, _GAS_EST) {
    web3 = _web3;
    ctr = _ctr;
    GAS_EST = _GAS_EST;

    var module = {};
    module.UndecidedTarget = UndecidedTarget;
    return module;
}