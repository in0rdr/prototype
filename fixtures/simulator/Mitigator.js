var web3, ctr, GAS_EST;
var Customer = require('./Customer.js');

class Mitigator extends Customer {
    constructor(_options) {
        super(_options)
    }

    approve() {}
    uploadProof() {}
    rate() {}
    abort() {}
}

class UndecidedMitigator extends Mitigator {
    constructor(_options) {
        super(_options);
    }

    advance(_id) {
        if (!ctr.mitgn.approved(_id)) {
            console.log(this.constructor.name, "aborting task", _id);
            var tx = ctr.mitgn.abort.sendTransaction(_id, {from: this.addr, gas: GAS_EST});
            return web3.eth.getTransactionReceiptMined(tx);
        } else {
            console.log(this.constructor.name, "NOT aborting task", _id);
            return Promise.resolve(false);
        }
    }
}

class LazyMitigator extends Mitigator {
    constructor(_options) {
        super(_options);
    }

    advance(_id) {
        if (!ctr.mitgn.approved(_id)) {
            // approve task
            console.log(this.constructor.name, "approving task", _id);
            var tx = ctr.mitgn.approve.sendTransaction(_id, {from: this.addr, gas: GAS_EST});
            return web3.eth.getTransactionReceiptMined(tx);
        } else {
            console.log(this.constructor.name, "NOT approving task", _id);
            return Promise.resolve(false);
        }
    }
}

class SelfishMitigator extends LazyMitigator {
    constructor(_options) {
        super(_options);
    }

    advance(_id) {
        return new Promise(async (res, rej) => {
            var receipt = await super.advance(_id);
            if (ctr.mitgn.started(_id) && !ctr.mitgn.proofUploaded(_id)) {
                // upload proof
                var proofHash = await new Promise((resolve, reject) => {
                    ipfs.files.add(new Buffer(`dummy-configuration`), (err, result) => {
                        if (err) reject(err);
                        resolve(result[0].hash);
                    });
                });
                console.log(this.constructor.name, "uploading proof for task", _id);
                console.log(this.constructor.name, "created IPFS proof:", proofHash);
                var tx = ctr.mitgn.uploadProof.sendTransaction(_id, proofHash, {from: this.addr, gas: GAS_EST});
                receipt = await web3.eth.getTransactionReceiptMined(tx);
            }
            res(receipt);
        });
    }
}

class RationalMitigator extends SelfishMitigator {
    constructor(_options) {
        super(_options);
    }

    advance(_id) {
        return new Promise(async (res, rej) => {
            var receipt = await super.advance(_id);

            var startTime = ctr.mitgn.getStartTime(_id);
            var validationDeadline = ctr.mitgn.getValidationDeadline(_id);

            // only advance after validation deadline expired
            if (ctr.mitgn.started(_id) && !ctr.rep.mitigatorRated(_id) && web3.eth.blockNumber > startTime.plus(validationDeadline).toNumber()) {
                // fetch target rating
                var targetRating;

                try {
                    var repHash = ctr.rep.getReputon(_id, 0);

                    var reputon = await new Promise((resolve, reject) => {
                        ipfs.files.cat(`/ipfs/${repHash}`, (err, file) => {
                            if (err) reject(err);
                            resolve(JSON.parse(file.toString()));
                        });
                    });
                    targetRating = reputon.reputons[0].rating;
                } catch (e) {
                    // assume a malicous rating if not formatted
                    // as reputon media type or if attack target did not rate
                    targetRating = 0;
                }

                // rate according to T's expectation
                var rating;
                if (ctr.mitgn.acknowledged(_id)) {
                    rating = 1;
                } else if (ctr.mitgn.rejected(_id)) {
                    rating = 0;
                } else if (!ctr.mitgn.validated(_id) && targetRating === 0) {
                    rating = 0;
                } else if (!ctr.mitgn.validated(_id) && targetRating === 1) {
                    rating = 1;
                }

                var reputonHash = await new Promise((resolve, reject) => {
                    ipfs.files.add(new Buffer(`{
                        "application": "mitigation",
                        "reputons": [
                         {
                           "rater": "${ctr.mitgn.getMitigator(_id)}",
                           "assertion": "target-ok",
                           "rated": ${_id},
                           "rating": ${rating},
                           "sample-size": 1
                         }
                        ]
                    }`), (err, result) => {
                        if (err) reject(err);
                        resolve(result[0].hash);
                    });
                });
                console.log(this.constructor.name, "rates", (rating === 1) ? "POSITIVELY (+)" : "NEGATIVELY (-)" ,"task", _id);
                console.log(this.constructor.name, "created IPFS reputon:", reputonHash);
                var tx = ctr.rep.rate.sendTransaction(ctr.mitgn.address, _id, reputonHash, {from: this.addr, gas: GAS_EST});
                receipt = await web3.eth.getTransactionReceiptMined(tx);

                // if this was a selfish target,
                // abort task to claim the price
                if (ctr.mitgn.proofUploaded(_id)) {
                    tx = ctr.mitgn.abort.sendTransaction(_id, {from: this.addr, gas: GAS_EST});
                    receipt = web3.eth.getTransactionReceiptMined(tx);
                }
            }
            res(receipt);
        });
    }
}

module.exports = function(_web3, _ipfs, _ctr, _GAS_EST) {
    web3 = _web3;
    ctr = _ctr;
    ipfs = _ipfs;
    GAS_EST = _GAS_EST;

    var module = {};
    module.Mitigator = Mitigator;
    module.UndecidedMitigator = UndecidedMitigator;
    module.LazyMitigator = LazyMitigator;
    module.SelfishMitigator = SelfishMitigator;
    module.RationalMitigator = RationalMitigator;
    return module;
}