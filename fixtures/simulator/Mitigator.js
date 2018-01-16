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
            var tx = ctr.mitgn.abort.sendTransaction(_id, {from: this.addr, gas: GAS_EST});
            return web3.eth.getTransactionReceiptMined(tx);
        } else {
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
            var tx = ctr.mitgn.approve.sendTransaction(_id, {from: this.addr, gas: GAS_EST});
            return web3.eth.getTransactionReceiptMined(tx);
        } else {
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
                console.log("Created IPFS proof:", proofHash);
                var tx = ctr.mitgn.uploadProof.sendTransaction(_id, proofHash, {from: this.addr, gas: GAS_EST});
                receipt = await web3.eth.getTransactionReceiptMined(tx);
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
    return module;
}