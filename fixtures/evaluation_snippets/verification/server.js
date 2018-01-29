const CONTRACT_BUILD_PATH = './build/';
const GAS_EST = 3000000;

var args = process.argv.slice(2);
var ipfsAPI = require('ipfs-api');
var ipfs = ipfsAPI({host: '172.17.0.5', port: '8080', protocol: 'http'})

var fs = require('fs');
var Web3 = require('web3');
var web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:8545"));

var accounts = web3.eth.accounts;
var contracts = loadContracts();

var mitigationAbi = JSON.parse(contracts.mitigation.interface);
var reputationAbi = JSON.parse(contracts.reputation.interface);
var Mitigation = web3.eth.contract(mitigationAbi);
var Reputation = web3.eth.contract(reputationAbi);

// instantiate by address
var customerAddress   = '0x1139626979429c1896fdb8f315b257144b9cc6a3';
var mitigationAddress = '0x414002558a7f6d0f114a1a98ae7f12bcbdb4d0d2';
var reputationAddress = '0x21f8aa14692e6645c5ac2726d5e020bc721edde4';
var MitigationInstance = Mitigation.at(mitigationAddress);
var ReputationInstance = Reputation.at(reputationAddress);

var taskIdsVerifyNegative = [20, 26];
var taskIdsVerifyNeutral = [2, 8, 14];

const InputDataDecoder = require('ethereum-input-data-decoder');
const decoder = new InputDataDecoder(reputationAbi);

var negative = neutral = 0;
new Promise(async (resolve, reject) => {
    for (var _id of taskIdsVerifyNegative) {
        var rating = await validateWithSCIface(_id);
        var reputon = ReputationInstance.getReputon(_id, 0);
        await validateByTxLookup(_id, reputon);
        if (rating === 0) negative++;
    }
    for (var _id of taskIdsVerifyNeutral) {
        try {
            await validateWithSCIface(_id);
        } catch (e) {
            if (e.message.startsWith('multihash too short')) neutral++;
        }
    }
    resolve();
}).then(() => {
    console.log("Verified", negative, "negative feedbacks");
    console.log("Verified", neutral, "neutral feedbacks");
});

function validateWithSCIface(_task_id) {
    // reputon 0: claim about mitigator
    // reputon 1: claim about target
    var reputonHash = ReputationInstance.getReputon(_task_id, 0);
    return new Promise((resolve, reject) => {
        ipfs.files.cat(`/ipfs/${reputonHash}`, (err, file) => {
            if (err) reject(err);
            var reputon = JSON.parse(file.toString());
            var rating = reputon['reputons'][0]['rating'];
            resolve(rating);
        });
    });
}

function validateByTxLookup(_task_id, _reputon) {
    var task = MitigationInstance.tasks(_task_id);
    var targetAddr = task[0];
    var mitigatorAddr = task[1];
    var startTime = task[4].toNumber();
    var validationDeadline = task[3].toNumber();

    for (var i = startTime; i <= startTime + validationDeadline; i++) {
        var block = web3.eth.getBlock(i, true);
        if (block == null || block.transactions == null)
            continue;

        for (var trx of block.transactions) {
            if (reputationAddress === trx.to
                && ( trx.from == targetAddr || trx.from == mitigatorAddr ) ) {
                var input = decoder.decodeData(trx.input);
                var txReputon = input['inputs'][2];
                if (_reputon === txReputon) {
                    console.log("Valid rating");
                    console.log(" from customer addr:", trx.from);
                    console.log(" to contract addr:", trx.to);
                    console.log(" tx hash:", trx.hash);
                    console.log(" blockHash:", trx.blockHash);
                    console.log(" blockNumber:", trx.blockNumber);
                    console.log(" time:", block.timestamp,
                                  new Date(block.timestamp * 1000).toGMTString());
                    console.log(" with ipfs reputon hash: ", txReputon);
                }
            }
        };
    }
}

function loadContracts() {
    var id = fs.readFileSync(CONTRACT_BUILD_PATH + 'Identity.json');
    var mitigation = fs.readFileSync(CONTRACT_BUILD_PATH + 'Mitigation.json');
    var rep = fs.readFileSync(CONTRACT_BUILD_PATH + 'Reputation.json');

    var bytecodes = {
        identity: JSON.parse(id),
        mitigation: JSON.parse(mitigation),
        reputation: JSON.parse(rep)
    };

    bytecodes.identity.bytecode = '0x' + bytecodes.identity.bytecode;
    bytecodes.mitigation.bytecode = '0x' + bytecodes.mitigation.bytecode;
    bytecodes.reputation.bytecode = '0x' + bytecodes.reputation.bytecode;
    return bytecodes;
}