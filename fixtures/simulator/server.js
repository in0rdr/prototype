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

var idAbi = JSON.parse(contracts.identity.interface);
var mitigationAbi = JSON.parse(contracts.mitigation.interface);
var repAbi = JSON.parse(contracts.reputation.interface);
var id = web3.eth.contract(idAbi);
var mitgn = web3.eth.contract(mitigationAbi);
var rep = web3.eth.contract(repAbi);

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
}
var customers = [{"id": 0, "addr": 0}];

var tasks = [];

(async () => {
    var ctr = await init(accounts[0]);
    console.log("Deployed the contract instances at:");
    console.log(" Identity:\t", ctr.id.address);
    console.log(" Mitigation:\t", ctr.mitgn.address);
    console.log(" Reputation:\t", ctr.rep.address);

    // watch events
    var custFilter = watchCustomers(ctr.id);
    var taskFilter = watchMitigationTasks(ctr.mitgn);
    //custFilter.stopWatching();

    // create customer accounts
    var newAccounts = createAccounts(4);
    var accTxReceipts = await createCustomers(ctr.id, newAccounts);
    var receipts = await Promise.all(accTxReceipts);
    console.log("Created customers:", customers);

    targets['honest'] = customers.slice(1, 3);
    mitigators['honest'] = customers.slice(3, 4);
    console.log("Using honest targets:", targets.honest);
    console.log("Using honest mitigators:", mitigators.honest);

    // create a new mitigation task
    var tx = ctr.mitgn.newTask.sendTransaction(
        ctr.id.address,
        targets.honest[0].addr,
        mitigators.honest[0].addr,
        100,
        200,
        web3.toWei(1, "ether"),
        "{\"223.41.172.148\": [\"229.79.231.228\", \"4.223.252.132\", \"141.212.103.220\"], \"118.176.117.135\": [\"32.17.197.237\", \"234.231.227.224\", \"142.134.164.149\"]}",
        {from: targets.honest[0].addr, gas: GAS_EST});

    await web3.eth.getTransactionReceiptMined(tx);
    console.log("Created task, owner:", tasks);

    tx = ctr.mitgn.approve.sendTransaction(tasks[0].id, {from: mitigators.honest[0].addr, gas: GAS_EST});
    await web3.eth.getTransactionReceiptMined(tx);
    console.log("Approved task", tasks[0].id);

    console.log("Balances:", balances(customers.slice(1).map(c => c.addr)));
    tx = ctr.mitgn.start.sendTransaction(tasks[0].id, {from: targets.honest[0].addr, value: web3.toWei(1, "ether"), gas: GAS_EST});
    await web3.eth.getTransactionReceiptMined(tx);
    console.log("Started task", tasks[0].id);
    console.log("Balances:", balances(customers.slice(1).map(c => c.addr)));

    tx = ctr.mitgn.uploadProof.sendTransaction(tasks[0].id, "dummy-proof", {from: mitigators.honest[0].addr, gas: GAS_EST});
    await web3.eth.getTransactionReceiptMined(tx);
    console.log("Uploaded proof for task", tasks[0].id);

    tx = ctr.rep.rate.sendTransaction(ctr.mitgn.address, tasks[0].id, "dummy-reputon", {from: targets.honest[0].addr, gas: GAS_EST});
    await web3.eth.getTransactionReceiptMined(tx);
    console.log("Target rated for task", tasks[0].id);

    console.log("Balances:", balances(customers.slice(1).map(c => c.addr)));
    tx = ctr.mitgn.validateProof.sendTransaction(tasks[0].id, true, ctr.rep.address, {from: targets.honest[0].addr, gas: GAS_EST});
    await web3.eth.getTransactionReceiptMined(tx);
    console.log("Targed validated task", tasks[0].id);
    console.log("Balances:", balances(customers.slice(1).map(c => c.addr)));

    tx = ctr.rep.rate.sendTransaction(ctr.mitgn.address, tasks[0].id, "dummy-reputon", {from: mitigators.honest[0].addr, gas: GAS_EST});
    await web3.eth.getTransactionReceiptMined(tx);
    console.log("Mitigator rated task", tasks[0].id);
})();

function balances(_accounts) {
    var balances = [];
    for (var i in _accounts) {
        var balance = web3.toWei(web3.eth.getBalance(_accounts[i]), "ether");
        balances.push(web3.fromWei(balance, "ether").toNumber());
    }
    return balances;
}

function fundCustomer(_addr, _amount) {
    var balance = web3.eth.getBalance(web3.eth.coinbase);
    if (balance.lessThan(_amount)) {
        setTimeout(fundCustomer, 3000, _addr, _amount);
    } else {
        return web3.eth.sendTransaction({from: web3.eth.coinbase, to: _addr, value: _amount, gas: GAS_EST});
    }
}

function createAccounts(_n) {
    var result = [];
    for (var i=0; i < _n; i++) {
        var acc = web3.personal.newAccount("secret");
        web3.personal.unlockAccount(acc, "secret", 0);
        result.push(acc);
    }
    return result;
}

async function createCustomers(_ctr, _accounts) {
    var receipts = [];
    for (var i in _accounts) {
        var tx = fundCustomer(_accounts[i], web3.toWei(2, "ether"));
        var r = await web3.eth.getTransactionReceiptMined(tx);
        tx = _ctr.newCustomer.sendTransaction({from: _accounts[i], gas: GAS_EST});
        receipts.push(web3.eth.getTransactionReceiptMined(tx));
    }
    return receipts;
}

function watchCustomers(_contract) {
    return _contract.CustomerCreated({}, { address: _contract.address }).watch((error, result) => {
        if (!error) {
            console.log("CustomerCreated:", result.args);
            customers.push({"id": result.args._custId.toNumber(), "addr": result.args._custAddr});
        }
    });
}

function watchMitigationTasks(_contract) {
    return _contract.TaskCreated({}, { address: _contract.address }).watch((error, result) => {
        if (!error) {
            console.log("TaskCreated:", result.args);
            tasks.push({"id": result.args._taskId, "addr": result.args._creator});
        }
    });
}

function newIdentity(_from) {
    return new Promise(function(resolve, reject) {
        id.new({data: contracts.identity.bytecode, from: _from, gas: GAS_EST}, function(err, instance){
            if(err) reject(err);

            if(instance.address) {
                resolve(instance);
            }
        });
    });
}

function newMitigation(_from) {
    return new Promise(function(resolve, reject) {
        mitgn.new({data: contracts.mitigation.bytecode, from: _from, gas: GAS_EST}, function(err, instance){
            if(err) reject(err);

            if(instance.address) {
                resolve(instance);
            }
        });
    });
}

function newReputation(_from) {
    return new Promise(function(resolve, reject) {
        rep.new({data: contracts.reputation.bytecode, from: _from, gas: GAS_EST}, function(err, instance){
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