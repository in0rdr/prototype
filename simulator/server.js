const CONTRACT_BUILD_PATH = './contracts/build/';
const GAS_EST = 3000000;

var args = process.argv.slice(2);

// ipfs connection
var ipfsAPI = require('ipfs-api');
var ipfs = ipfsAPI({host: args[1], port: '5001', protocol: 'http'});

var fs = require('fs');
var spawn = require("child_process").spawn;
var Web3 = require('web3');
console.log("Connecting to peer", "http://" + args[0] + ":8545");
var web3 = new Web3(new Web3.providers.HttpProvider("http://" + args[0] + ":8545"));
web3.eth.getTransactionReceiptMined = require("./getTransactionReceiptMined.js");

var accounts = web3.eth.accounts;
console.log("Currently", accounts.length, "accounts");
var contracts = loadContracts();
var ctr, taskFilter, startFilter, completeFilter;
var utils;

var idAbi = JSON.parse(contracts.identity.interface);
var mitigationAbi = JSON.parse(contracts.mitigation.interface);
var repAbi = JSON.parse(contracts.reputation.interface);

var Customer = require('./Customer.js');
var Mitigator, Target, Task;
var customers = [];

var latestTaskId = 0;
var tasks = [];
var finishedTasks = [];

new Promise(async (res) => {
    // deploy contracts
    console.log("Initializing, deploying smart contracts...");
    ctr = await init(accounts[0]);
    console.log("Deployed the contract instances at:");
    console.log(" Identity:\t", ctr.id.address);
    console.log(" Mitigation:\t", ctr.mitgn.address);
    console.log(" Reputation:\t", ctr.rep.address);
    res(ctr);
}).then(() => {
    // watch events
    /*console.log("Setting up event filters:");
    taskFilter = watchEvents(ctr.mitgn, "TaskCreated");
    console.log(" >> Set up TaskCreated filter");
    startFilter = watchEvents(ctr.mitgn, "TaskStarted");
    console.log(" >> Set up TaskStarted filter");
    completeFilter = watchEvents(ctr.mitgn, "TaskCompleted");
    console.log(" >> Set up TaskCompleted filter");
    completeFilter.stopWatching();*/

    // setup simulation peers and task
    Mitigator = require('./Mitigator.js')(web3, ipfs, ctr, GAS_EST);
    Target = require('./Target.js')(web3, ctr, GAS_EST);
    Task = require('./Task.js')(web3, ctr, GAS_EST);

    // setup unhandled promise exception logger
    utils = require('./utils.js')(web3, ctr, GAS_EST, args[2]);
    utils.enableLogger();
}).then(async () => {
    // create customer accounts
    console.log("Creating customer accounts...");
    return createCustomers(ctr.id, 8);
    //return false;
}).then((newCustomers) => {
    if (newCustomers) {
        // add new customers to the pool of all customers
        customers = customers.concat(newCustomers);
        console.log("Created customers:", newCustomers);

        // select customer profiles/strategies
        console.log("Selecting customer strategies...");
        console.log("Customer id\t Customer addr\t Customer strategy");

        for (var i = 0; i < 1; i++) {
            customers[i] = new Mitigator.RationalMitigator(customers[i]);
            console.log(i.toString(), "\t ", customers[i].addr, "\t", customers[i].constructor.name);
        }
        for (var i = 1; i < 2; i++) {
            customers[i] = new Target.SatisfiedTarget(customers[i]);
            console.log(i.toString(), "\t ", customers[i].addr, "\t", customers[i].constructor.name);
        }

        for (var i = 2; i < 3; i++) {
            customers[i] = new Target.UndecidedTarget(customers[i]);
            console.log(i.toString(), "\t ", customers[i].addr, "\t", customers[i].constructor.name);
        }
        for (var i = 3; i < 4; i++) {
            customers[i] = new Target.SelfishTarget(customers[i]);
            console.log(i.toString(), "\t ", customers[i].addr, "\t", customers[i].constructor.name);
        }
        for (var i = 4; i < 5; i++) {
            customers[i] = new Target.DissatisfiedTarget(customers[i]);
            console.log(i.toString(), "\t ", customers[i].addr, "\t", customers[i].constructor.name);
        }
        for (var i = 5; i < 6; i++) {
            customers[i] = new Mitigator.UndecidedMitigator(customers[i]);
            console.log(i.toString(), "\t ", customers[i].addr, "\t", customers[i].constructor.name);
        }
        for (var i = 6; i < 7; i++) {
            customers[i] = new Mitigator.LazyMitigator(customers[i]);
            console.log(i.toString(), "\t ", customers[i].addr, "\t", customers[i].constructor.name);
        }
        for (var i = 7; i < 8; i++) {
            customers[i] = new Mitigator.SelfishMitigator(customers[i]);
            console.log(i.toString(), "\t ", customers[i].addr, "\t", customers[i].constructor.name);
        }

        /*customers[0] = new Target.UndecidedTarget(customers[0]);
        customers[1] = new Target.SelfishTarget(customers[1]);
        customers[2] = new Target.SatisfiedTarget(customers[2]);
        customers[3] = new Target.DissatisfiedTarget(customers[3]);

        customers[4] = new Mitigator.UndecidedMitigator(customers[4]);
        customers[5] = new Mitigator.LazyMitigator(customers[5]);
        customers[6] = new Mitigator.SelfishMitigator(customers[6]);
        customers[7] = new Mitigator.RationalMitigator(customers[7]);*/
    }
}).then(() => {
    // create new tasks if needed
    //replenishTasks();
    setInterval(replenishTasks, 30000);
    //testAll();
});

function attackerFile() {
    // prepare an attacker file
    var createIps = spawn('python', ['createIPs.py', 1, 5]);
    var ipfsHash = new Promise((resolve, reject) => {
        createIps.stdout.on('data', function (data){
            ipfs.files.add(new Buffer(data), async (err, result) => {
                if (err) reject(err);
                resolve(result[0].hash);
            });
        });
    });
    return ipfsHash;
}

async function testAll() {
    // test all possible combinations of target/mitigator
    var targets = customers.slice(0, 4);
    console.log(targets);
    var mitigators = customers.slice(4, 8);
    console.log(mitigators);
    var tx;
    var i = 0;
    for (t of targets) {
        for (m of mitigators) {
            var ipfsHash = await attackerFile();

            // fund target
            tx = web3.eth.sendTransaction({from: web3.eth.coinbase, to: t.addr, value: web3.toWei(2, "ether"), gas: GAS_EST});
            await web3.eth.getTransactionReceiptMined(tx);

            // create mitigation contract
            tx = ctr.mitgn.newTask.sendTransaction(
                ctr.id.address,
                t.addr,
                m.addr,
                3,
                6,
                9,
                web3.toWei(1, "ether"),
                ipfsHash,
                {from: t.addr, gas: GAS_EST});
            await web3.eth.getTransactionReceiptMined(tx);
            console.log("Created new task for target", t.constructor.name, "and", m.constructor.name);

            var task = new Task.Task(i,
                customerWithAddr(t.addr),
                customerWithAddr(m.addr));
            tasks.push(task);
            i++;

            var move, currentPlayer;
            var startTime, serviceDeadline, validationDeadline, ratingDeadline;
            while (true) {
                currentPlayer = task.nextCustomer;
                startTime = ctr.mitgn.getStartTime(task.id).toNumber();
                serviceDeadline = startTime + ctr.mitgn.getServiceDeadline(task.id).toNumber();
                validationDeadline = startTime + ctr.mitgn.getValidationDeadline(task.id).toNumber();
                ratingDeadline = startTime + ctr.mitgn.getRatingDeadline(task.id).toNumber();

                console.log("----------------------------------------");
                console.log(" Task", task.id, ", next move");
                console.log("  - Profile:\t", currentPlayer.constructor.name);
                console.log("  - Move:\t", currentPlayer.nextMove);
                console.log("  - Time:\t");
                console.log("    - Block:\t\t", web3.eth.blockNumber);
                console.log("    - Start:\t\t", startTime);
                console.log("    - ServiceDl:\t\t", serviceDeadline);
                console.log("    - ValidationDl:\t", validationDeadline);
                console.log("    - RatingDl:\t", ratingDeadline);

                move = await task.advance(tasks, finishedTasks);
                if (typeof move.finishedTasks !== 'undefined') {
                    break;
                }
            }

            finishedTasks = move.finishedTasks;
            tasks = move.activeTasks;
            //console.log("Finished tasks:", finishedTasks);
            console.log("Remaining active tasks:", tasks);
        }
    }
}

async function replenishTasks() {
    const replThreshold = 5;

    if (tasks.length >= replThreshold) {
        console.log("Still", replThreshold ,"tasks in pipeline, checking again in 30s..");
    } else {
        console.log("Less than", replThreshold, "tasks, creating new one..");
        var ipfsHash = await attackerFile();

        // select random customers profile
        var target = mitigator = new Customer({});
        while (!(Object.getPrototypeOf(target) instanceof Target.Target
            && Object.getPrototypeOf(mitigator) instanceof Mitigator.Mitigator)) {
            target = customers[Math.floor(Math.random()*customers.length)];
            mitigator = customers[Math.floor(Math.random()*customers.length)];
            console.log("Sampled new customers")
        }

        // deterministic customer selection for testing
        //var target = customers[2]
        //var mitigator = customers[8]

        // fund target
        var tx = web3.eth.sendTransaction({from: web3.eth.coinbase, to: target.addr, value: web3.toWei(2, "ether"), gas: GAS_EST});
        await web3.eth.getTransactionReceiptMined(tx);

        console.log("Creating a new task with");
        console.log(" - Target:", target);
        console.log(" - Mitigator:", mitigator);

        // create a new task with the chosen customer strategy
        var tx = ctr.mitgn.newTask.sendTransaction(
            ctr.id.address,
            target.addr,
            mitigator.addr,
            Math.floor(Math.random() * 11) + 3,
            Math.floor(Math.random() * 11) + 17,
            Math.floor(Math.random() * 11) + 32,
            web3.toWei(1, "ether"),
            ipfsHash,
            {from: target.addr, gas: GAS_EST});
        await web3.eth.getTransactionReceiptMined(tx);
        console.log("Created new task for target", t.constructor.name, "and", m.constructor.name);

        var task = new Task.Task(latestTaskId,
            customerWithAddr(t.addr),
            customerWithAddr(m.addr));
        tasks.push(task);
        latestTaskId++;

        var move, currentPlayer;
        var startTime, serviceDeadline, validationDeadline, ratingDeadline;
        while (true) {
            currentPlayer = task.nextCustomer;
            startTime = ctr.mitgn.getStartTime(task.id).toNumber();
            serviceDeadline = startTime + ctr.mitgn.getServiceDeadline(task.id).toNumber();
            validationDeadline = startTime + ctr.mitgn.getValidationDeadline(task.id).toNumber();
            ratingDeadline = startTime + ctr.mitgn.getRatingDeadline(task.id).toNumber();

            console.log("----------------------------------------");
            console.log(" Task", task.id, ", next move");
            console.log("  - Profile:\t", currentPlayer.constructor.name);
            console.log("  - Move:\t", currentPlayer.nextMove);
            console.log("  - Time:\t");
            console.log("    - Block:\t\t", web3.eth.blockNumber);
            console.log("    - Start:\t\t", startTime);
            console.log("    - ServiceDl:\t\t", serviceDeadline);
            console.log("    - ValidationDl:\t", validationDeadline);
            console.log("    - RatingDl:\t", ratingDeadline);

            move = await task.advance(tasks, finishedTasks);
            if (typeof move.finishedTasks !== 'undefined') {
                break;
            }
        }

        finishedTasks = move.finishedTasks;
        tasks = move.activeTasks;
        //console.log("Finished tasks:", finishedTasks);
        console.log("Remaining active tasks:", tasks);
    }
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

/*function watchEvents(_contract, _event) {
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
                        var task = new Task.Task(result.args._taskId.toNumber(),
                            customerWithAddr(result.args._target),
                            customerWithAddr(result.args._mitigator));
                        tasks.push(task);
                        console.log("Task list length:", tasks.length);

                        var move, currentPlayer;
                        var startTime, serviceDeadline, validationDeadline, ratingDeadline;
                        while (true) {
                            currentPlayer = task.nextCustomer;
                            startTime = ctr.mitgn.getStartTime(task.id).toNumber();
                            serviceDeadline = startTime + ctr.mitgn.getServiceDeadline(task.id).toNumber();
                            validationDeadline = startTime + ctr.mitgn.getValidationDeadline(task.id).toNumber();
                            ratingDeadline = startTime + ctr.mitgn.getRatingDeadline(task.id).toNumber();

                            console.log("----------------------------------------");
                            console.log(" Task", task.id, ", next move");
                            console.log("  - Profile:\t", currentPlayer.constructor.name);
                            console.log("  - Move:\t", currentPlayer.nextMove);
                            console.log("  - Time:\t");
                            console.log("    - Block:\t\t", web3.eth.blockNumber);
                            console.log("    - Start:\t\t", startTime);
                            console.log("    - ServiceDl:\t\t", serviceDeadline);
                            console.log("    - ValidationDl:\t", validationDeadline);
                            console.log("    - RatingDl:\t", ratingDeadline);

                            // todo: better advance a random task
                            move = await task.advance(tasks, finishedTasks);
                            if (typeof move.finishedTasks !== 'undefined') {
                                break;
                            }
                        }

                        finishedTasks = move.finishedTasks;
                        tasks = move.activeTasks;
                        console.log("Finished tasks:", finishedTasks);
                        console.log("Remaining active tasks:", tasks);
                        break;

                    case "TaskStarted":
                        break;
                    case "TaskCompleted":
                        break;

                    default:
                }
            }
        }// else {console.log("error:", error)}
    });
}*/

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