const CONTRACT_BUILD_PATH = './build/';
const GAS_EST = 3000000;

var args = process.argv.slice(2);
var ipfsAPI = require('ipfs-api');
var ipfs = ipfsAPI({host: args[1], port: '5001', protocol: 'http'})

var fs = require('fs');
var spawn = require("child_process").spawn;
var Web3 = require('web3');
console.log("Connecting to peer", "http://" + args[0] + ":8545");
var web3 = new Web3(new Web3.providers.HttpProvider("http://" + args[0] + ":8545"));
web3.eth.getTransactionReceiptMined = require("./getTransactionReceiptMined.js");

var accounts = web3.eth.accounts;
console.log("Currently", accounts.length, "accounts");
var contracts = loadContracts();
var ctr, custFilter, taskFilter;

var idAbi = JSON.parse(contracts.identity.interface);
var mitigationAbi = JSON.parse(contracts.mitigation.interface);
var repAbi = JSON.parse(contracts.reputation.interface);

var Customer = require('./Customer.js');
var Task = require('./Task.js');
var Mitigator, Target;
var customers = [];

var tasks = [];
var inactive_tasks = [];

new Promise(async (res) => {
    // deploy contracts
    ctr = await init(accounts[0]);
    console.log("Deployed the contract instances at:");
    console.log(" Identity:\t", ctr.id.address);
    console.log(" Mitigation:\t", ctr.mitgn.address);
    console.log(" Reputation:\t", ctr.rep.address);
    res(ctr);
}).then(() => {
    // watch events
    console.log("Setting up event filters:");
    //custFilter = watchCustomers(ctr.id);
    taskFilter = watchEvents(ctr.mitgn, "TaskCreated");
    console.log(" >> Set up TaskCreated filter");
    startFilter = watchEvents(ctr.mitgn, "TaskStarted");
    console.log(" >> Set up TaskStarted filter");
    abortFilter = watchEvents(ctr.mitgn, "TaskAborted");
    console.log(" >> Set up TaskAborted filter");
    //custFilter.stopWatching();

    // setup simulation peers
    Mitigator = require('./Mitigator.js')(web3, ipfs, ctr, GAS_EST);
    Target = require('./Target.js')(web3, ctr, GAS_EST);
}).then(async () => {
    // create customer accounts
    console.log("Creating customer accounts...");
    return createCustomers(ctr.id, 5);
}).then((newCustomers) => {
    // add new customers to the pool of all customers
    customers = customers.concat(newCustomers);
    console.log("Created customers:", newCustomers);

    // select peer profiles/strategies
    console.log("Selecting customer strategies...");
    customers[0] = new Target.UndecidedTarget(customers[0]);
    customers[1] = new Target.SelfishTarget(customers[1]);
    customers[2] = new Mitigator.UndecidedMitigator(customers[2]);
    customers[3] = new Mitigator.LazyMitigator(customers[3]);
    customers[4] = new Mitigator.SelfishMitigator(customers[4]);
    console.log("Customer types:", customers.map(c => c.constructor.name));
}).then(() => {
    // create new tasks if needed
    var createIps;

    // prepare an attacker file
    // (task scope / IPs to block)
    createIps = spawn('python', ['createIPs.py', 1, 5]);
    createIps.stdout.on('data', function (data){
        ipfs.files.add(new Buffer(data), (err, result) => {
            if (!err) {
                /*
                // select random customers profile
                var target = mitigator = new Customer({});

                while (!(Object.getPrototypeOf(target) instanceof Target.Target
                    && Object.getPrototypeOf(mitigator) instanceof Mitigator.Mitigator)) {
                    target = customers[Math.floor(Math.random()*customers.length)];
                    mitigator = customers[Math.floor(Math.random()*customers.length)];
                    console.log("Sampled new customers")
                }*/

                // deterministic customer selection for testing
                var target = customers[1]
                var mitigator = customers[2]

                console.log("Creating a new task with");
                console.log(" >> Target:", target);
                console.log(" >> Mitigator:", mitigator);

                // create a new task with the chosen customer strategy
                var tx = ctr.mitgn.newTask.sendTransaction(
                    ctr.id.address,
                    target.addr,
                    mitigator.addr,
                    3,
                    6,
                    web3.toWei(1, "ether"),
                    result[0].hash,
                    {from: target.addr, gas: GAS_EST});
                console.log("Created task with tx hash:", tx);
            }
        });
    });
    /*for (;;) {
        if (tasks.length > 10) {
            console.log("Still 10 tasks in pipelne, checking again in 30s..");
            setTimeout(()=>{}, 30000);
            continue;
        } else {

        }
    }*/
});

/*.then(async () => {


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
    return sTime;
}).then(async (sTime) => {
    var validationDeadline = ctr.mitgn.getValidationDeadline(tasks[0].id);

    var proofHash = await new Promise((res, rej) => {
        ipfs.files.add(new Buffer(`dummy-configuration`), (err, result) => {
            if (err) rej(err);
            res(result[0].hash);
        });
    });
    console.log("Crated IPFS proof:", proofHash);

    // mitigator uploads proof
    tx = ctr.mitgn.uploadProof.sendTransaction(tasks[0].id, proofHash, {from: mitigators.honest[0].addr, gas: GAS_EST});
    await web3.eth.getTransactionReceiptMined(tx);
    if (ctr.mitgn.proofUploaded(tasks[0].id)) {
        console.log("Uploaded proof for task", tasks[0].id);
    }

    // attack target rates
    var reputonHash = await new Promise((res, rej) => {
        ipfs.files.add(new Buffer(`{
            "application": "mitigation",
            "reputons": [
             {
               "rater": "${ctr.mitgn.getTarget(0)}",
               "assertion": "proof-ok",
               "rated": "0",
               "rating": 1,
               "sample-size": 1
             }
            ]
        }`), (err, result) => {
            if (err) rej(err);
            res(result[0].hash);
        });
    });
    console.log("Crated IPFS reputon hash:", reputonHash);
    tx = ctr.rep.rate.sendTransaction(ctr.mitgn.address, tasks[0].id, reputonHash, {from: targets.honest[0].addr, gas: GAS_EST});
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
    reputonHash = await new Promise((res, rej) => {
        ipfs.files.add(new Buffer(`{
            "application": "mitigation",
            "reputons": [
             {
               "rater": "${ctr.mitgn.getMitigator(0)}",
               "assertion": "target-ok",
               "rated": "0",
               "rating": 1,
               "sample-size": 1
             }
            ]
        }`), (err, result) => {
            if (err) rej(err);
            res(result[0].hash);
        });
    });
    console.log("Crated IPFS reputon hash:", reputonHash);
    var tx2 = ctr.rep.rate.sendTransaction(ctr.mitgn.address, tasks[0].id, reputonHash, {from: mitigators.honest[0].addr, gas: GAS_EST});
    await web3.eth.getTransactionReceiptMined(tx2);
    if (ctr.rep.mitigatorRated(tasks[0].id)) {
        console.log("Mitigator rated task", tasks[0].id);
    }
});*/

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

        result.push(new Customer({"id": id, "addr": acc}));
    }
    return result;
}

function watchEvents(_contract, _event) {
    return _contract[_event]({}, { address: _contract.address }).watch(async (error, result) => {
        if (!error) {
            // wait until the transaction that triggered the event
            // is confirmed on the ledger
            await web3.eth.getTransactionReceiptMined(result.transactionHash);
            console.log(_event,":", result.args);

            if (ctr.mitgn.taskExists(result.args._taskId)) {
                // decide the next move
                switch (_event) {
                    case "TaskCreated":
                        // add new task to the pool of all tasks
                        var task = new Task(result.args._taskId.toNumber(),
                            customerWithAddr(result.args._target),
                            customerWithAddr(result.args._mitigator));
                        tasks.push(task);
                        console.log("Created tasks:", tasks);

                        var serviceDeadline = ctr.mitgn.getServiceDeadline(tasks[0].id);
                        var validationDeadline = ctr.mitgn.getValidationDeadline(tasks[0].id);
                        console.log("Service deadline:", serviceDeadline.toNumber());
                        console.log("Validation deadline:", validationDeadline.toNumber());

                        await task.advance();  // approve
                        if (ctr.mitgn.approved(task.id)) {
                            console.log("M approved task", task.id);
                        }

                        await task.advance();  // start
                        if (ctr.mitgn.started(task.id)) {
                            console.log("T started task", task.id);
                        }

                        await task.advance();  // upload proof
                        if (ctr.mitgn.proofUploaded(task.id)) {
                            console.log("M uploaded proof for task", task.id);
                        }
                        break;

                    case "TaskAborted":
                        var task = taskWithId(result.args._taskId.toNumber());

                        // mark task inactive
                        inactive_tasks.push(task);

                        // remove from active task list
                        var index = tasks.indexOf(task);
                        if (index > -1) {
                            tasks.splice(index, 1);
                        }

                        console.log("Inactive tasks:", inactive_tasks);
                        console.log("Remaining active tasks:", tasks);
                        break;

                    default:
                }
            }
        }
    });
}

function customerWithAddr(_addr) {
    return customers.find(c => c.addr == _addr );
}

function taskWithId(_id) {
    return tasks.find(t => t.id == _id);
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