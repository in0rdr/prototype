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

module.exports = function(_web3, _ctr, _GAS_EST) {
    web3 = _web3;
    ctr = _ctr;
    GAS_EST = _GAS_EST;

    var module = {};
    module.rate = rate;
    return module;
}