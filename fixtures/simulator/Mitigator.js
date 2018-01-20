var web3, ctr, GAS_EST;
var utils;
var Customer = require('./Customer.js');

class Mitigator extends Customer {
    constructor(_options) {
        super(_options);
        this.nextMove = 'approve';
    }

    async abort(_task) {
        var receipt = Promise.resolve(false);
        var startTime = ctr.mitgn.getStartTime(_task.id).toNumber();
        var validationDeadline = startTime + ctr.mitgn.getValidationDeadline(_task.id).toNumber();

        if (web3.eth.blockNumber > validationDeadline && ctr.mitgn.proofUploaded(_task.id)) {
            tx = ctr.mitgn.abort.sendTransaction(_task.id, {from: this.addr, gas: GAS_EST});
            console.log("[", _task.id, "]", currentPlayer.constructor.name, "\t aborts (validation timeout)");
            receipt = await web3.eth.getTransactionReceiptMined(tx);
        }

        if (ctr.mitgn.aborted(_task.id))
            this.nextMove = 'complete';
        return receipt;
    }

    async approve(_task) {
        var receipt = Promise.resolve(false);
        if (!ctr.mitgn.approved(_task.id)) {
            var tx = ctr.mitgn.approve.sendTransaction(_task.id, {from: this.addr, gas: GAS_EST});
            console.log("[", _task.id, "]", this.constructor.name, "\t approves");
            receipt = await web3.eth.getTransactionReceiptMined(tx);
        }

        if (ctr.mitgn.approved(_task.id))
            this.nextMove = 'uploadProof';
        return receipt;
    }

    async uploadProof(_task) {
        var receipt = Promise.resolve(false);
        if (ctr.mitgn.started(_task.id) && !ctr.mitgn.proofUploaded(_task.id)) {
            var proofHash = await new Promise((resolve, reject) => {
                ipfs.files.add(new Buffer(`dummy-configuration`), (err, result) => {
                    if (err) reject(err);
                    resolve(result[0].hash);
                });
            });
            console.log("[", _task.id, "]", this.constructor.name, "\t uploads proof \t", proofHash);
            var tx = ctr.mitgn.uploadProof.sendTransaction(_task.id, proofHash, {from: this.addr, gas: GAS_EST});
            receipt = await web3.eth.getTransactionReceiptMined(tx);
        }

        if (ctr.mitgn.proofUploaded(_task.id))
            this.nextMove = 'rate';
        return receipt;
    }

    async rate(_task, rating) {
        var receipt = Promise.resolve(false);
        var startTime = ctr.mitgn.getStartTime(_task.id).toNumber();
        var validationDeadline = startTime + ctr.mitgn.getValidationDeadline(_task.id).toNumber();

        if (ctr.mitgn.started(_task.id)
            && !ctr.rep.mitigatorRated(_task.id)
            && web3.eth.blockNumber > validationDeadline) {
            receipt = await utils.rate(rating, this, _task.id, "target-ok");
        }

        if (ctr.rep.mitigatorRated(_task.id))
            this.nextMove = 'complete';
        return receipt;
    }
}

class UndecidedMitigator extends Mitigator {
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

class LazyMitigator extends Mitigator {
    constructor(_options) {
        super(_options);
    }

    uploadProof(_task) {
        this.nextMove = 'complete';
        return Promise.resolve(false);
    }
}

class SelfishMitigator extends Mitigator {
    constructor(_options) {
        super(_options);
    }

    rate(_task) {
        this.nextMove = 'complete';
        return Promise.resolve(false);
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
            console.log("[", _task.id, "]", this.constructor.name, "\t rates \t", rating, "(target acknowledged)");
        } else if (ctr.mitgn.rejected(_task.id)) {
            rating = 0;
            console.log("[", _task.id, "]", this.constructor.name, "\t rates \t", rating, "(target rejected)");
        } else if (!ctr.mitgn.validated(_task.id) && targetRating === 0) {
            rating = 0;
            console.log("[", _task.id, "]", this.constructor.name, "\t rates \t", rating, "(no validation, bad rating received)");
        } else if (!ctr.mitgn.validated(_task.id) && targetRating === 1) {
            rating = 1;
            console.log("[", _task.id, "]", this.constructor.name, "\t rates \t", rating, "(no validation, good rating received)");
        }
        return super.rate(_task, rating);
    }
}

class AltruisticMitigator extends Mitigator {
    constructor(_options) {
        super(_options);
    }

    rate(_task) {
        return super.rate(_task, 1);
    }
}

class MaliciousMitigator extends Mitigator {
    constructor(_options) {
        super(_options);
    }

    rate(_task) {
        return super.rate(_task, 0);
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
    module.AltruisticMitigator = AltruisticMitigator;
    module.MaliciousMitigator = MaliciousMitigator;
    return module;
}