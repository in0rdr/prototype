var web3, ctr, GAS_EST;
var utils;
var Customer = require('./Customer.js');

class Mitigator extends Customer {
    constructor(_options) {
        super(_options);
    }

    init(_task) {
        this.nextMove[_task.id] = 'approve';
        return Promise.resolve({});
    }

    complete(_task) {
        return super.complete(_task.id, ctr, web3, GAS_EST);
    }

    async approve(_task) {
        var receipt = Promise.resolve({});
        var reputation = await utils.getReputation(_task.tar);
        console.log("[", _task.id, "]", this.constructor.name, "\t reads reputation", reputation);
        if (reputation < 0.3) {
           this.nextMove[_task.id] = 'finish';
        } else {
            var tx = ctr.mitgn.approve.sendTransaction(_task.id, {from: this.addr, gas: GAS_EST});
            console.log("[", _task.id, "]", this.constructor.name, "\t approves");
            this.nextMove[_task.id] = 'uploadProof';
            receipt = await web3.eth.getTransactionReceiptMined(tx);
        }
        return receipt;
    }

    async uploadProof(_task) {
        var receipt = Promise.resolve({});
        if (!ctr.mitgn.completed(_task.id)) {
            var proofHash = await new Promise((resolve, reject) => {
                ipfs.files.add(new Buffer(`dummy-configuration`), (err, result) => {
                    if (err) reject(err);
                    resolve(result[0].hash);
                });
            });
            console.log("[", _task.id, "]", this.constructor.name, "\t uploads proof \t", proofHash);
            var tx = ctr.mitgn.uploadProof.sendTransaction(_task.id, proofHash, {from: this.addr, gas: GAS_EST});
            receipt = await web3.eth.getTransactionReceiptMined(tx);
            this.nextMove[_task.id] = 'rate';
        } else {
            this.nextMove[_task.id] = 'finish';
        }
        return receipt;
    }

    async rate(_task, rating) {
        var receipt = Promise.resolve({});
        var startTime = ctr.mitgn.getStartTime(_task.id).toNumber();
        var validationDeadline = startTime + ctr.mitgn.getValidationDeadline(_task.id).toNumber();

        if (web3.eth.blockNumber > validationDeadline) {
            receipt = await utils.rate(rating, this, _task.id, "target-ok");
            this.nextMove[_task.id] = 'complete';
        }

        return receipt;
    }
}

class UndecidedMitigator extends Mitigator {
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

class LazyMitigator extends Mitigator {
    constructor(_options) {
        super(_options);
    }

    uploadProof(_task) {
        this.nextMove[_task.id] = 'finish';
        return Promise.resolve({});
    }
}

class SelfishMitigator extends Mitigator {
    constructor(_options) {
        super(_options);
    }

    rate(_task) {
        this.nextMove[_task.id] = 'complete';
        return Promise.resolve({});
    }
}

class RationalMitigator extends Mitigator {
    constructor(_options) {
        super(_options);
    }

    async rate(_task) {
        // fetch target rating
        var targetRating;

        try {
            var repHash = ctr.rep.getReputon(_task.id, 0);

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

        console.log("[", _task.id, "]", this.constructor.name, "\t reads rating: \t", targetRating);

        // rate according to T's expectation
        var rating;
        if (ctr.mitgn.acknowledged(_task.id)) {
            rating = 1;
            console.log("[", _task.id, "]", this.constructor.name, "\t would rate \t", rating, "(target acknowledged)");
        } else if (ctr.mitgn.rejected(_task.id)) {
            rating = 0;
            console.log("[", _task.id, "]", this.constructor.name, "\t would rate \t", rating, "(target rejected)");
        } else {
            rating = 0;
            console.log("[", _task.id, "]", this.constructor.name, "\t would rate \t", rating, "(no target rating received)");
        }

        return super.rate(_task, rating);
    }
}

module.exports = function(_web3, _ipfs, _ctr, _GAS_EST) {
    web3 = _web3;
    ctr = _ctr;
    ipfs = _ipfs;
    GAS_EST = _GAS_EST;
    utils = require('./utils.js')(web3, ctr, GAS_EST);

    var module = {};
    module.Mitigator = Mitigator;
    module.UndecidedMitigator = UndecidedMitigator;
    module.LazyMitigator = LazyMitigator;
    module.SelfishMitigator = SelfishMitigator;
    module.RationalMitigator = RationalMitigator;
    return module;
}