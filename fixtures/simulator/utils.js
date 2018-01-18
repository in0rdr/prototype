async function rate(_value, _raterAddr, _taskId, _assertion) {
    var reputonHash = await new Promise((resolve, reject) => {
        ipfs.files.add(new Buffer(`{
            "application": "mitigation",
            "reputons": [
             {
               "rater": "${_raterAddr}",
               "assertion": ${_assertion},
               "rated": ${_taskId},
               "rating": ${_value},
               "sample-size": 1
             }
            ]
        }`), (err, result) => {
            if (err) reject(err);
            resolve(result[0].hash);
        });
    });

    console.log(this.constructor.name, "rates task", _taskId, (_value === 1) ? "POSITIVELY (+)" : "NEGATIVELY (-)");
    console.log(this.constructor.name, "created IPFS reputon:", reputonHash);
    var tx = ctr.rep.rate.sendTransaction(ctr.mitgn.address, _taskId, reputonHash, {from: _raterAddr, gas: GAS_EST});
    return await web3.eth.getTransactionReceiptMined(tx);
}

function enableLogger() {
    process.on('unhandledRejection', (reason, p) => {
        console.log("***************************************");
        console.log('Unhandled Rejection at: Promise', p)
        console.log("---------------------------------------");
        console.log('Reason:', reason);
        console.log("***************************************");
    });
}

function balances(_accounts) {
    var balances = [];
    for (var i in _accounts) {
        var balance = web3.toWei(web3.eth.getBalance(_accounts[i]), "ether");
        balances.push(web3.fromWei(balance, "ether").toNumber());
    }
    return balances;
}

module.exports = function(_web3, _ctr, _GAS_EST) {
    web3 = _web3;
    ctr = _ctr;
    GAS_EST = _GAS_EST;

    var module = {};
    module.rate = rate;
    module.enableLogger = enableLogger;
    module.balances = balances;
    return module;
}