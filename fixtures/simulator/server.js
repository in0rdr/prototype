const HISTORY_MAX = 20;
const CONTRACT_BUILD_PATH = './build/';

var args = process.argv.slice(2);
console.log("Connecting to peer", "http://" + args[0] + ":8545");

var fs = require('fs');
var Web3EthAccounts = require('web3-eth-accounts');
var Web3 = require('web3');
var web3 = new Web3(new Web3.providers.HttpProvider("http://" + args[0] + ":8545"));
web3.eth.getTransactionReceiptMined = require("./getTransactionReceiptMined.js");

var gasEstimate = 3000000;
var accounts = web3.eth.accounts;
console.log("Work accounts ([0] target, [1] mitigator):");
console.log(accounts);

var contracts = loadContracts();

idAbi = JSON.parse(contracts.identity.interface);
mitigationAbi = JSON.parse(contracts.mitigation.interface);
repAbi = JSON.parse(contracts.reputation.interface);
var id = web3.eth.contract(idAbi);
var mitgn = web3.eth.contract(mitigationAbi);
var rep = web3.eth.contract(repAbi);

var honestPeers = [0];
// todo: add malicous, evil(colluding), selfish, disturbing(chaning) peers
var taskOwners = [];

(async () => {
    var ctr = await init(accounts[0]);
    console.log("Deployed the contract instances at:");
    console.log(" Identity:\t", ctr.id.address);
    console.log(" Mitigation:\t", ctr.mitgn.address);
    console.log(" Reputation:\t", ctr.rep.address);

    // watch events
    var custFilter = watchCustomers(ctr.id);
    var taskFilter = watchMitigationTasks(ctr.mitgn);

    // create customer accounts
    var c1tx = ctr.id.newCustomer.sendTransaction({from: accounts[0], gas: gasEstimate});
    var c2tx = ctr.id.newCustomer.sendTransaction({from: accounts[1], gas: gasEstimate});

    await web3.eth.getTransactionReceiptMined(c1tx);
    await web3.eth.getTransactionReceiptMined(c2tx);
    console.log("Created honest peers:", honestPeers);

    custFilter.stopWatching();

    // create a new mitigation task
    var startNum = web3.eth.blockNumber;
    var serviceDeadline = startNum + 100;
    var validationDeadline = startNum + 200;
    var tx = ctr.mitgn.newTask.sendTransaction(ctr.id.address, accounts[0], accounts[1], serviceDeadline, validationDeadline, web3.toWei(1, "ether"), {from: accounts[0], gas: gasEstimate});

    await web3.eth.getTransactionReceiptMined(tx);
    console.log("Created mitigation contracts:", taskOwners);
})();

function watchCustomers(_contract) {
    return _contract.CustomerCreated({}, { address: _contract.address }).watch((error, result) => {
        if (!error) {
            console.log("CustomerCreated:", result.args);
            honestPeers[result.args._custId] = result.args._custAddr;
        }
    });
}

function watchMitigationTasks(_contract) {
    return _contract.TaskCreated({}, { address: _contract.address }).watch((error, result) => {
        if (!error) {
            console.log("TaskCreated:", result.args);
            taskOwners[result.args._taskId] = result.args._creator;
        }
    });
}

function newIdentity(_from) {
    return new Promise(function(resolve, reject) {
        id.new({data: contracts.identity.bytecode, from: _from, gas: gasEstimate}, function(err, instance){
            if(err) reject(err);

            if(instance.address) {
                resolve(instance);
            }
        });
    });
}

function newMitigation(_from) {
    return new Promise(function(resolve, reject) {
        mitgn.new({data: contracts.mitigation.bytecode, from: _from, gas: gasEstimate}, function(err, instance){
            if(err) reject(err);

            if(instance.address) {
                resolve(instance);
            }
        });
    });
}

function newReputation(_from) {
    return new Promise(function(resolve, reject) {
        rep.new({data: contracts.reputation.bytecode, from: _from, gas: gasEstimate}, function(err, instance){
            if(err) reject(err);

            if(instance.address) {
                resolve(instance);
            }
        });
    });
}

async function init(_from) {
    return {
        id: await newIdentity(_from),
        mitgn: await newMitigation(_from),
        rep: await newReputation(_from)
    };
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