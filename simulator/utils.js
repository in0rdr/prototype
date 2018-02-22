var request = require('requestretry');
var API_URL;

function getReputation(_customer) {
    var addr = _customer.addr.slice(2, _customer.addr.length);
    var url = API_URL + "/customers/" + addr + "/reputation";
    return new Promise((resolve, reject) => {
        request(url, function(error, response, body) {
            if (error) reject(error);
            var reputation = JSON.parse(body).rating_summary;
            // reputation in range [0,1]
            // 0.5 is neutral
            var beta = (reputation.positive + 1) / (reputation.positive + reputation.negative + 2);
            resolve(beta);
        });
    });
}

async function rate(_value, _rater, _taskId, _assertion) {
    var reputonHash = await new Promise((resolve, reject) => {
        ipfs.files.add(new Buffer(`{
            "application": "mitigation",
            "reputons": [
             {
               "rater": "${_rater.addr}",
               "assertion": "${_assertion}",
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

    console.log("[", _taskId, "]", _rater.constructor.name, "\t rates\t", (_value === 1) ? "(+)" : "(-)", reputonHash);
    var tx;

    if (_assertion === 'proof-ok') {
        tx = ctr.rep.rateAsTarget.sendTransaction(ctr.mitgn.address, _taskId, reputonHash, (_value === 1) ? true : false, {from: _rater.addr, gas: GAS_EST});
    } else {
        tx = ctr.rep.rateAsMitigator.sendTransaction(ctr.mitgn.address, _taskId, reputonHash, (_value === 1) ? true : false, {from: _rater.addr, gas: GAS_EST});
    }
    return web3.eth.getTransactionReceiptMined(tx);
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

module.exports = function(_web3, _ctr, _GAS_EST, _api_url) {
    web3 = _web3;
    ctr = _ctr;
    GAS_EST = _GAS_EST;
    API_URL = _api_url;

    var module = {};
    module.getReputation = getReputation;
    module.rate = rate;
    module.enableLogger = enableLogger;
    module.balances = balances;
    return module;
}
