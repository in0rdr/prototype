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

class SatisfiedTarget extends SelfishTarget {
    constructor(_options) {
        super(_options);
    }

    advance(_id) {
        return new Promise(async (res, rej) => {
            var receipt = await super.advance(_id);
            if (ctr.mitgn.proofUploaded(_id)) {
                // rate
                var reputonHash = await new Promise((resolve, reject) => {
                    ipfs.files.add(new Buffer(`{
                        "application": "mitigation",
                        "reputons": [
                         {
                           "rater": "${ctr.mitgn.getTarget(_id)}",
                           "assertion": "proof-ok",
                           "rated": "${_id}",
                           "rating": 1,
                           "sample-size": 1
                         }
                        ]
                    }`), (err, result) => {
                        if (err) reject(err);
                        resolve(result[0].hash);
                    });
                });
                console.log("Created IPFS reputon:", reputonHash);
                var tx = ctr.rep.rate.sendTransaction(ctr.mitgn.address, _id, reputonHash, {from: this.addr, gas: GAS_EST});
                receipt = await web3.eth.getTransactionReceiptMined(tx);

                // validate
                tx = ctr.mitgn.validateProof.sendTransaction(_id, true, ctr.rep.address, {from: this.addr, gas: GAS_EST});
                receipt = await web3.eth.getTransactionReceiptMined(tx);
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