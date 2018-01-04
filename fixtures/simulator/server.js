const REP_HISTORY_MAX = 20;
const CONTRACT_BUILD_PATH = './build/';

var args = process.argv.slice(2);
console.log("Connecting to peer", "http://" + args[0] + ":8545");

var fs = require('fs');
var Web3 = require('web3');
var web3 = new Web3(new Web3.providers.HttpProvider("http://" + args[0] + ":8545"));
console.log();

var accounts = web3.eth.accounts;
console.log("Work accounts ([0] target, [1] mitigator):");
console.log(accounts);

var target = web3.eth.accounts[0];
var mitigator = web3.eth.accounts[1];
var gasEstimate = 3000000;

var contracts = loadContracts();

idAbi = JSON.parse(contracts.identity.interface);
mitigationAbi = JSON.parse(contracts.mitigation.interface);
repAbi = JSON.parse(contracts.reputation.interface);
var id = web3.eth.contract(idAbi);
var mitigation = web3.eth.contract(mitigationAbi);
var rep = web3.eth.contract(repAbi);

init();

function init() {
    id.new({data: contracts.identity.bytecode, from: target, gas: gasEstimate}, function(err, instance){
        if(err) {
            console.log(err);
            return;
        }

        if(instance.address) {
            console.log("Identity contract deployed at address:", instance.address);
        }
    });

    mitigation.new({data: contracts.mitigation.bytecode, from: target, gas: gasEstimate}, function(err, instance){
        if(err) {
            console.log(err);
            return;
        }

        if(instance.address) {
            console.log("Mitigation contract deployed at address:", instance.address);
        }
    });

    rep.new({data: contracts.reputation.bytecode, from: target, gas: gasEstimate}, function(err, instance){
        if(err) {
            console.log(err);
            return;
        }

        if(instance.address) {
            console.log("Reputation contract deployed at address:", instance.address);
        }
    });
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