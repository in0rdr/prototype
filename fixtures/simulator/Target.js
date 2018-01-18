var web3, ctr, GAS_EST;
var utils;
var Customer = require('./Customer.js');

class Target extends Customer {
    constructor(_options) {
        super(_options)
    }
    advance() {}
}

class UndecidedTarget extends Target {
    constructor(_options) {
        super(_options);
    }

    advance(_id) {
        if (!ctr.mitgn.approved(_id)) {
            console.log(this.constructor.name, "aborting task", _id);
            var tx = ctr.mitgn.abort.sendTransaction(_id, {from: this.addr, gas: GAS_EST});
            return web3.eth.getTransactionReceiptMined(tx);
        } else {
            console.log(this.constructor.name, "NOT aborting task", _id, "because NOT APPROVED YET");
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
            console.log(this.constructor.name, "starting task", _id);
            // start task, but never rate or validate
            var tx = ctr.mitgn.start.sendTransaction(_id, {from: this.addr, value: web3.toWei(1, "ether"), gas: GAS_EST});
            return web3.eth.getTransactionReceiptMined(tx);
        } else {
            console.log(this.constructor.name, "NOT starting task", _id, "because already started or not approved yet");
            return Promise.resolve(false);
        }
    }
}

class SatisfiedTarget extends SelfishTarget {
    constructor(_options) {
        super(_options);
    }

    advance(_id) {
        return new Promise(async (res, rej) => {
            var receipt = await super.advance(_id);

            var startTime = ctr.mitgn.getStartTime(_id).toNumber();
            var serviceDeadline = startTime + ctr.mitgn.getServiceDeadline(_id).toNumber();
            if (web3.eth.blockNumber > serviceDeadline && !ctr.mitgn.validated(_id)) {
                // always rate positively
                receipt = await utils.rate(1, ctr.mitgn.getTarget(_id), _id, "proof-ok");

                // validate
                console.log(this.constructor.name, "ACKNOWLEDGES task", _id);
                tx = ctr.mitgn.validateProof.sendTransaction(_id, true, ctr.rep.address, {from: this.addr, gas: GAS_EST});
                receipt = await web3.eth.getTransactionReceiptMined(tx);
            } else {
                console.log(this.constructor.name, "not rating/validating task", _id, "because service deadline not yet expired or already validated.");
            }

            res(receipt);
        });
    }
}

class DissatisfiedTarget extends SelfishTarget {
    constructor(_options) {
        super(_options);
    }

    advance(_id) {
        return new Promise(async (res, rej) => {
            var receipt = await super.advance(_id);

            var startTime = ctr.mitgn.getStartTime(_id).toNumber();
            var serviceDeadline = startTime + ctr.mitgn.getServiceDeadline(_id).toNumber();
            if (web3.eth.blockNumber > serviceDeadline && !ctr.mitgn.validated(_id)) {
                // always rate negatively
                receipt = await utils.rate(0, ctr.mitgn.getTarget(_id), _id, "proof-ok");

                // validate
                console.log(this.constructor.name, "REJECTS task", _id);
                tx = ctr.mitgn.validateProof.sendTransaction(_id, false, ctr.rep.address, {from: this.addr, gas: GAS_EST});
                receipt = await web3.eth.getTransactionReceiptMined(tx);
            } else {
                console.log(this.constructor.name, "not rating/validating task", _id, "because service deadline not yet expired or already validated.");
            }

            res(receipt);
        });
    }
}

class IrrationalTarget extends SelfishTarget {
    constructor(_options) {
        super(_options);
    }

    advance(_id) {
        return new Promise(async (res, rej) => {
            var receipt = await super.advance(_id);

            var startTime = ctr.mitgn.getStartTime(_id).toNumber();
            var serviceDeadline = startTime + ctr.mitgn.getServiceDeadline(_id).toNumber();
            if (web3.eth.blockNumber > serviceDeadline && !ctr.mitgn.validated(_id)) {
                // rate positive/negative 50/50
                var rating = Math.floor(Math.random() * 2);
                receipt = await utils.rate(rating, ctr.mitgn.getTarget(_id), _id, "proof-ok");

                // validate against expectations/rating
                console.log(this.constructor.name, (rating === 0) ? "ACKNOWLEDGES" : "REJECTS", "task", _id);
                tx = ctr.mitgn.validateProof.sendTransaction(_id, !rating, ctr.rep.address, {from: this.addr, gas: GAS_EST});
                receipt = await web3.eth.getTransactionReceiptMined(tx);
            } else {
                console.log(this.constructor.name, "not rating/validating task", _id, "because service deadline not yet expired or already validated.");
            }

            res(receipt);
        });
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