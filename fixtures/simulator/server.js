const CONTRACT_BUILD_PATH = './build/';
const GAS_EST = 3000000;

var args = process.argv.slice(2);
console.log("Connecting to peer", "http://" + args[0] + ":8545");

var fs = require('fs');
var Web3 = require('web3');
var web3 = new Web3(new Web3.providers.HttpProvider("http://" + args[0] + ":8545"));
web3.eth.getTransactionReceiptMined = require("./getTransactionReceiptMined.js");

var accounts = web3.eth.accounts;
console.log("Currently", accounts.length, "accounts");
var contracts = loadContracts();
var ctr, custFilter, taskFilter;

var idAbi = JSON.parse(contracts.identity.interface);
var mitigationAbi = JSON.parse(contracts.mitigation.interface);
var repAbi = JSON.parse(contracts.reputation.interface);

var targets = {
    honest: null,
    undecided: null,
    lazy: null,
    malicious: null,
    untrue: null,
    disturbing: null
};
var mitigators = {
    honest: null,
    undecided: null,
    lazy: null,
    malicious: null,
    disturbing: null
};
var customers = [{"id": 0, "addr": 0}];

var tasks = [];

new Promise(async (res) => {
    // deploy contracts
    ctr = await init(accounts[0]);
    console.log("Deployed the contract instances at:");
    console.log(" Identity:\t", ctr.id.address);
    console.log(" Mitigation:\t", ctr.mitgn.address);
    console.log(" Reputation:\t", ctr.rep.address);
    res(ctr);
}).then((ctr) => {
    // watch events
    //custFilter = watchCustomers(ctr.id);
    //taskFilter = watchTaskCreation(ctr.mitgn);
    startFilter = watchEvents(ctr.mitgn, "TaskStarted");
    //custFilter.stopWatching();
}).then(async () => {
    // create customer accounts
    return createCustomers(ctr.id, 2);
}).then((newCustomers) => {
    // add new customers to the pool of all customers
    customers = customers.concat(newCustomers);
    console.log("Created customers:", newCustomers);

    // decide honest and malicous peers
    targets['honest'] = customers.slice(1, 2);
    mitigators['honest'] = customers.slice(2, 3);
    console.log("Using honest targets:", targets.honest);
    console.log("Using honest mitigators:", mitigators.honest);
}).then(async () => {
    // create a new mitigation task
    var tx = ctr.mitgn.newTask.sendTransaction(
        ctr.id.address,
        targets.honest[0].addr,
        mitigators.honest[0].addr,
        3,
        6,
        web3.toWei(1, "ether"),
        "{\"223.41.172.148\": [\"229.79.231.228\", \"4.223.252.132\", \"141.212.103.220\"], \"118.176.117.135\": [\"32.17.197.237\", \"234.231.227.224\", \"142.134.164.149\"]}",
        {from: targets.honest[0].addr, gas: GAS_EST});

    return web3.eth.getTransactionReceiptMined(tx);
}).then(async (receipt) => {
    // add new task to the pool of all tasks
    if (ctr.mitgn.taskExists(0)) {
        tasks.push({"id": 0, "task": ctr.mitgn.tasks(0)});
        console.log("Created tasks:", tasks);
    }
    var serviceDeadline = ctr.mitgn.getServiceDeadline(tasks[0].id);
    var validationDeadline = ctr.mitgn.getValidationDeadline(tasks[0].id);
    console.log(serviceDeadline, validationDeadline);

    var tx = ctr.mitgn.approve.sendTransaction(tasks[0].id, {from: mitigators.honest[0].addr, gas: GAS_EST});
    await web3.eth.getTransactionReceiptMined(tx);
    if (ctr.mitgn.approved(tasks[0].id)) {
        console.log("Approved task", tasks[0].id);
    }

    console.log("Balances before start:", balances(customers.slice(1).map(c => c.addr)));
    tx = ctr.mitgn.start.sendTransaction(tasks[0].id, {from: targets.honest[0].addr, value: web3.toWei(1, "ether"), gas: GAS_EST});
    await web3.eth.getTransactionReceiptMined(tx);
    if (ctr.mitgn.started(tasks[0].id)) {
        console.log("Started task", tasks[0].id);
        console.log("Balances after start:", balances(customers.slice(1).map(c => c.addr)));
    }
    var sTime = ctr.mitgn.getStartTime(tasks[0].id);

    tx = ctr.mitgn.uploadProof.sendTransaction(tasks[0].id, "dummy-proof", {from: mitigators.honest[0].addr, gas: GAS_EST});
    await web3.eth.getTransactionReceiptMined(tx);
    if (ctr.mitgn.proofUploaded(tasks[0].id)) {
        console.log("Uploaded proof for task", tasks[0].id);
    }

    // attack target rates
    tx = ctr.rep.rate.sendTransaction(ctr.mitgn.address, tasks[0].id, "dummy-reputon", {from: targets.honest[0].addr, gas: GAS_EST});
    await web3.eth.getTransactionReceiptMined(tx);
    if (ctr.rep.attackTargetRated(tasks[0].id)) {
        console.log("Target rated for task", tasks[0].id);
    }

    console.log("Balances before ack:", balances(customers.slice(1).map(c => c.addr)));
    tx = ctr.mitgn.validateProof.sendTransaction(tasks[0].id, true, ctr.rep.address, {from: targets.honest[0].addr, gas: GAS_EST});
    await web3.eth.getTransactionReceiptMined(tx);
    if (ctr.mitgn.acknowledged(tasks[0].id)) {
        console.log("Targed validated task", tasks[0].id);
        console.log("Balances after ack:", balances(customers.slice(1).map(c => c.addr)));
    }

    // wait for the validation deadline to expire
    while (web3.eth.blockNumber <= sTime.plus(validationDeadline).toNumber()) {
        console.log(web3.eth.blockNumber, sTime.plus(validationDeadline).toNumber());
        console.log("Block number too low, checking again in 10s..");
        setTimeout(()=>{}, 10000);
    }

    console.log(web3.eth.blockNumber, sTime.plus(validationDeadline).toNumber());
    console.log("Validation deadline expired");

    // mitigator rates
    var tx2 = ctr.rep.rate.sendTransaction(ctr.mitgn.address, tasks[0].id, "dummy-reputon-1", {from: mitigators.honest[0].addr, gas: GAS_EST});
    await web3.eth.getTransactionReceiptMined(tx2);
    if (ctr.rep.mitigatorRated(tasks[0].id)) {
        console.log("Mitigator rated task", tasks[0].id);
    }
});


//const delay = ms => new Promise(r => setTimeout(r, ms));

function balances(_accounts) {
    var balances = [];
    for (var i in _accounts) {
        var balance = web3.toWei(web3.eth.getBalance(_accounts[i]), "ether");
        balances.push(web3.fromWei(balance, "ether").toNumber());
    }
    return balances;
}

async function createCustomers(_ctr, _n) {
    var result = [];
    for (var i = 0; i < _n; i++) {
        // create new account
        var acc = web3.personal.newAccount("secret");
        web3.personal.unlockAccount(acc, "secret", 0);

        // fund customer
        var tx = web3.eth.sendTransaction({from: web3.eth.coinbase, to: acc, value: web3.toWei(2, "ether"), gas: GAS_EST});
        await web3.eth.getTransactionReceiptMined(tx);

        // create customer id
        tx = _ctr.newCustomer.sendTransaction({from: acc, gas: GAS_EST});
        await web3.eth.getTransactionReceiptMined(tx);
        var id = _ctr.getCustomerId(acc);

        result.push({"id": id, "addr": acc});
    }
    return result;
}

function watchEvents(_contract, _event) {
    return _contract[_event]({}, { address: _contract.address }).watch((error, result) => {
        if (!error) {
            console.log(_event,":", result.args);
        }
    });
}

function deployContract(_from, _ctr, _bytecode) {
    return new Promise(function(resolve, reject) {
        _ctr.new({data: _bytecode, from: _from, gas: GAS_EST}, function(err, instance){
            if(err) reject(err);

            if(instance.address) {
                resolve(instance);
            }
        });
    });
}

async function init(_from) {
    return {
        id: await deployContract(_from, web3.eth.contract(idAbi), contracts.identity.bytecode),
        mitgn: await deployContract(_from, web3.eth.contract(mitigationAbi), contracts.mitigation.bytecode),
        rep: await deployContract(_from, web3.eth.contract(repAbi), contracts.reputation.bytecode)
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