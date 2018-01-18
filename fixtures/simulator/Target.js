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
                var reputonHash = await new Promise((resolve, reject) => {
                    ipfs.files.add(new Buffer(`{
                        "application": "mitigation",
                        "reputons": [
                         {
                           "rater": "${ctr.mitgn.getTarget(_id)}",
                           "assertion": "proof-ok",
                           "rated": ${_id},
                           "rating": 1,
                           "sample-size": 1
                         }
                        ]
                    }`), (err, result) => {
                        if (err) reject(err);
                        resolve(result[0].hash);
                    });
                });

                console.log(this.constructor.name, "rates task", _id, "POSITIVELY (+)");
                console.log(this.constructor.name, "created IPFS reputon:", reputonHash);
                var tx = ctr.rep.rate.sendTransaction(ctr.mitgn.address, _id, reputonHash, {from: this.addr, gas: GAS_EST});
                receipt = await web3.eth.getTransactionReceiptMined(tx);

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
            if (web3.eth.blockNumber > serviceDeadline) {
                // always rate negatively
                var reputonHash = await new Promise((resolve, reject) => {
                    ipfs.files.add(new Buffer(`{
                        "application": "mitigation",
                        "reputons": [
                         {
                           "rater": "${ctr.mitgn.getTarget(_id)}",
                           "assertion": "proof-ok",
                           "rated": ${_id},
                           "rating": 0,
                           "sample-size": 1
                         }
                        ]
                    }`), (err, result) => {
                        if (err) reject(err);
                        resolve(result[0].hash);
                    });
                });

                console.log(this.constructor.name, "rates task", _id, "NEGATIVELY (+)");
                console.log(this.constructor.name, "created IPFS reputon:", reputonHash);
                var tx = ctr.rep.rate.sendTransaction(ctr.mitgn.address, _id, reputonHash, {from: this.addr, gas: GAS_EST});
                receipt = await web3.eth.getTransactionReceiptMined(tx);

                // validate
                console.log(this.constructor.name, "REJECTS task", _id);
                tx = ctr.mitgn.validateProof.sendTransaction(_id, false, ctr.rep.address, {from: this.addr, gas: GAS_EST});
                receipt = await web3.eth.getTransactionReceiptMined(tx);
            } else {
                console.log(this.constructor.name, "not rating/validating task", _id, "because service deadline not yet expired");
            }

            res(receipt);
        });
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
    module.SatisfiedTarget = SatisfiedTarget;
    return module;
}