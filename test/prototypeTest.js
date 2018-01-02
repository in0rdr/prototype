import expectThrow from '../node_modules/zeppelin-solidity/test/helpers/expectThrow';
import * as utils from './utils';

const Customer = artifacts.require("Customer");
const Task = artifacts.require("Task");
const Reputation = artifacts.require("Reputation");

contract('Customer', function(accounts) {
  it("should create a customer", async function() {
    var cust = await Customer.deployed();
    var owner = await cust.owner.call().then(o => assert.equal(o, accounts[0], "customer contract should be owned by first account"));
  });
});

contract('Task', function(accounts) {
  it("should create a mitigation contract", async function() {
    var cust0 = await Customer.deployed();
    var cust1 = await Customer.new({from: accounts[1]});

    cust0.owner.call().then(addr => assert.equal(addr, accounts[0], "cust0 contract should be owned by first account"));
    cust1.owner.call().then(addr => assert.equal(addr, accounts[1], "cust1 contract should be owned by second account"));

    var task = await Task.new();
    var tx = await task.init.sendTransaction(cust0.address, cust1.address, 100, 200, web3.toWei(1, "ether"));
    task.attackTarget.call().then(t => assert.equal(t, cust0.address, "cust0 should be attack target"));
    task.mitigator.call().then(m => assert.equal(m, cust1.address, "cust1 should be mitigator"));
    task.serviceDeadline.call().then(d => assert.equal(d, 100, "service deadline should be 100"));
    task.validationDeadline.call().then(d => assert.equal(d, 200, "mitigation deadline should be 200"));
    task.price.call().then(p => assert.equal(p, web3.toWei(1, "ether"), "price should be 1 ether"));
  });

  it("should only start task when mitigator approved contract parameters", async function() {
    var cust0 = await Customer.deployed();
    var cust1 = await Customer.new({from: accounts[1]});

    var task = await Task.new();
    var tx = task.init.sendTransaction(cust0.address, cust1.address, 100, 200, web3.toWei(1, "ether"));
    await expectThrow(task.start.sendTransaction({from: accounts[1], value: web3.toWei(1, "ether")}));
    var started = await task.started.call();
    assert(!started, "task should not be started without mitigator approval");
  });

  it("attack target should not be allowed to sign the contract for the mitigator", async function() {
    var cust0 = await Customer.deployed();
    var cust1 = await Customer.new({from: accounts[1]});

    var task = await Task.new();
    var tx = await task.init.sendTransaction(cust0.address, cust1.address, 100, 200, web3.toWei(1, "ether"));
    await expectThrow(task.approve.sendTransaction({from: accounts[0]}));
    var approved = await task.approved.call();
    assert(!approved, "the mitigator should approve mitigation contracts");
  });

  it("mitigator should sign and approve the mitigation contract", async function() {
    var cust0 = await Customer.deployed();
    var cust1 = await Customer.new({from: accounts[1]});

    var task = await Task.new();
    var tx = await task.init.sendTransaction(cust0.address, cust1.address, 100, 200, web3.toWei(1, "ether"));
    tx = await task.approve.sendTransaction({from: accounts[1]});
    var approved = await task.approved.call();
    assert(approved, "the mitigator should approve mitigation contracts");
  });

  it("attack target should start the mitigation task", async function() {
    var cust0 = await Customer.deployed();
    var cust1 = await Customer.new({from: accounts[1]});

    var task = await Task.new();
    var tx = await task.init.sendTransaction(cust0.address, cust1.address, 100, 200, web3.toWei(1, "ether"));

    tx = await task.approve.sendTransaction({from: accounts[1]});
    var approved = await task.approved.call();
    assert(approved, "the mitigator should approve mitigation contracts");

    await expectThrow(task.start.sendTransaction({from: accounts[1], value: web3.toWei(1, "ether")}));
    assert(!started, "the mitigator is not allowed to start the task");

    await expectThrow(task.start.sendTransaction({from: accounts[0], value: web3.toWei(0.9, "ether")}));
    assert(!started, "the attack target needs to pay the exact amount");

    tx = await task.start.sendTransaction({from: accounts[0], value: web3.toWei(1, "ether")});
    var started = await task.started.call();
    assert(started, "the mitigation task should have started");

    assert(web3.eth.getBalance(task.address).equals(web3.toWei(1, "ether")), "the mitigation contract should hold the price");
  });

  it("mitigator should upload proof of service during service time window", async function() {
    var cust0 = await Customer.deployed();
    var cust1 = await Customer.new({from: accounts[1]});

    var startNum = web3.eth.blockNumber;
    var serviceDeadline = startNum + 100;
    var validationDeadline = startNum + 200;

    var task = await Task.new();
    var tx = task.init.sendTransaction(cust0.address, cust1.address, serviceDeadline, validationDeadline, web3.toWei(1, "ether"));

    await task.approve.sendTransaction({from: accounts[1]});
    var approved = await task.approved.call();
    assert(approved, "the mitigator should approve mitigation contracts");

    await task.start.sendTransaction({from: accounts[0], value: web3.toWei(1, "ether")});
    var started = await task.started.call();
    assert(started, "the mitigation task should have started");

    var currentNum = web3.eth.blockNumber;
    assert(currentNum < serviceDeadline, "current block number should be less than serviceDeadline");

    await expectThrow(task.uploadProof.sendTransaction("dummy-proof", {from: accounts[0]}));
    var proof = await task.proof.call();
    assert(!proof, "attack target should not be allowed to submit proofs");

    var proofUploaded = await task.proofUploaded.call();
    assert(!proofUploaded, "proof should not be uploaded");

    await task.uploadProof.sendTransaction("dummy-proof", {from: accounts[1]});
    proof = await task.proof.call();
    assert.equal(proof, "dummy-proof", "mitigator should be allowed to submit proofs during service time window");

    proofUploaded = await task.proofUploaded.call();
    assert(proofUploaded, "proof should be uploaded");

    // proof re-submission disallowed
    await expectThrow(task.uploadProof.sendTransaction("dummy-proof2", {from: accounts[1]}));
    proofUploaded = await task.proofUploaded.call();
    proof = await task.proof.call();
    assert(proofUploaded, "proof should be uploaded");
    assert.equal(proof, "dummy-proof", "re-submission should not be allowed");
  });

  it("mitigator should not upload proofs when service time window expired", async function() {
    var cust0 = await Customer.deployed();
    var cust1 = await Customer.new({from: accounts[1]});

    var startNum = web3.eth.blockNumber;
    var serviceDeadline = startNum + 100;
    var validationDeadline = startNum + 200;

    var task = await Task.new();
    var tx = task.init.sendTransaction(cust0.address, cust1.address, serviceDeadline, validationDeadline, web3.toWei(1, "ether"));

    await task.approve.sendTransaction({from: accounts[1]});
    var approved = await task.approved.call();
    assert(approved, "the mitigator should approve mitigation contracts");

    await task.start.sendTransaction({from: accounts[0], value: web3.toWei(1, "ether")});
    var started = await task.started.call();
    assert(started, "the mitigation task should have started");

    var currentNum = web3.eth.blockNumber;
    assert(currentNum < serviceDeadline, "current block number should be less than serviceDeadline");

    // fast forward mine 100 additional blocks
    utils.mine(100);
    currentNum = web3.eth.blockNumber;
    assert(currentNum > serviceDeadline, "service time window should have expired");

    await expectThrow(task.uploadProof.sendTransaction("dummy-proof", {from: accounts[1]}));
    var proofUploaded = await task.proofUploaded.call();
    var proof = await task.proof.call();
    assert(!proofUploaded, "proof should not be accepted");
    assert.equal(proof, "", "proof should still be empty");
  });

  it("attack target should rate the mitigator before validating the service", async function() {
    var cust0 = await Customer.deployed();
    var cust1 = await Customer.new({from: accounts[1]});

    var startNum = web3.eth.blockNumber;
    var serviceDeadline = startNum + 100;
    var validationDeadline = startNum + 200;

    var task = await Task.new();
    var tx = task.init.sendTransaction(cust0.address, cust1.address, serviceDeadline, validationDeadline, web3.toWei(1, "ether"));

    await task.approve.sendTransaction({from: accounts[1]});
    var approved = await task.approved.call();
    assert(approved, "the mitigator should approve mitigation contracts");

    await task.start.sendTransaction({from: accounts[0], value: web3.toWei(1, "ether")});
    var started = await task.started.call();
    assert(started, "the mitigation task should have started");

    var currentNum = web3.eth.blockNumber;
    assert(currentNum < serviceDeadline, "current block number should be less than serviceDeadline");

    await task.uploadProof.sendTransaction("dummy-proof", {from: accounts[1]});
    var proof = await task.proof.call();
    assert.equal(proof, "dummy-proof", "mitigator should be allowed to submit proofs during service time window");

    var proofUploaded = await task.proofUploaded.call();
    assert(proofUploaded, "proof should be uploaded");

    // fast forward mine 100 additional blocks
    utils.mine(100);
    currentNum = web3.eth.blockNumber;
    assert(currentNum > serviceDeadline, "service time window should have expired");
    assert(currentNum < validationDeadline, "validation time window should not have expired yet");

    var rep = await Reputation.new();
    var rated = await rep.attackTargetRated.call(task.address);
    assert(!rated, "attack target should not have rated yet");

    // validate the proof without rating, should throw
    await expectThrow(task.validateProof.sendTransaction(1, rep.address, {from: accounts[0]}));

    // rating the service as mitigator should throw
    await expectThrow(rep.rate.sendTransaction(task.address, cust0.address, "dummy-reputon", {from: accounts[1]}));
    await expectThrow(rep.rate.sendTransaction(task.address, cust1.address, "dummy-reputon", {from: accounts[1]}));
    await expectThrow(rep.rate.sendTransaction(task.address, cust1.address, "dummy-reputon", {from: accounts[0]}));
    rated = await rep.attackTargetRated.call(task.address);
    assert(!rated, "attack target should not have rated yet");
    rated = await rep.mitigatorRated.call(task.address);
    assert(!rated, "mitigator should not have rated yet");

    // attack target rates the mitigation service
    tx = await rep.rate.sendTransaction(task.address, cust0.address, "dummy-reputon", {from: accounts[0]});

    rated = await rep.attackTargetRated.call(task.address);
    assert(rated, "attack target should have rated");

    // validating the proof as mitigator should throw
    await expectThrow(task.validateProof.sendTransaction(1, rep.address, {from: accounts[1]}));
    var ack = await task.acknowledged.call();
    assert.equal(ack, 0, "mitigator should not be able to validate the service");

    // store the original balance before the payout
    assert(web3.eth.getBalance(task.address).equals(web3.toWei(1, "ether")), "the mitigation contract should hold the price");
    var mitigatorBalance = web3.eth.getBalance(accounts[1]);

    // acknowledge the service as attack target
    tx = await task.validateProof.sendTransaction(1, rep.address, {from: accounts[0]});
    ack = await task.acknowledged.call();
    assert.equal(ack, 1, "attack target should have acknowledged the service");
    assert(web3.eth.getBalance(task.address).equals(0), "the price should be paid out");

    // check balance and state after payout
    var newMitigatorBalance = web3.eth.getBalance(accounts[1]);
    assert(mitigatorBalance.plus(web3.toWei(1, "ether")).equals(newMitigatorBalance), "the price should be paid out to the mitigator");
  });

  it("attack target should be refunded on reject", async function() {
    var cust0 = await Customer.deployed();
    var cust1 = await Customer.new({from: accounts[1]});

    var startNum = web3.eth.blockNumber;
    var serviceDeadline = startNum + 100;
    var validationDeadline = startNum + 200;

    var task = await Task.new();
    var tx = task.init.sendTransaction(cust0.address, cust1.address, serviceDeadline, validationDeadline, web3.toWei(1, "ether"));

    await task.approve.sendTransaction({from: accounts[1]});
    var approved = await task.approved.call();
    assert(approved, "the mitigator should approve mitigation contracts");

    await task.start.sendTransaction({from: accounts[0], value: web3.toWei(1, "ether")});
    var started = await task.started.call();
    assert(started, "the mitigation task should have started");

    var currentNum = web3.eth.blockNumber;
    assert(currentNum < serviceDeadline, "current block number should be less than serviceDeadline");

    // fast forward mine 100 additional blocks
    utils.mine(100);
    currentNum = web3.eth.blockNumber;
    assert(currentNum > serviceDeadline, "service time window should have expired");
    assert(currentNum < validationDeadline, "validation time window should not have expired yet");

    // attack target rates the mitigation service
    var rep = await Reputation.new();
    tx = await rep.rate.sendTransaction(task.address, cust0.address, "dummy-reputon", {from: accounts[0]});
    var rated = await rep.attackTargetRated.call(task.address);
    assert(rated, "attack target should have rated");
    assert(web3.eth.getBalance(task.address).equals(web3.toWei(1, "ether")), "the mitigation contract should still hold the price");

    // store the original balance before the payout
    var attackTargetBalance = web3.fromWei(web3.eth.getBalance(accounts[0]).toNumber(), "ether");

    // reject the service as attack target
    tx = await task.validateProof.sendTransaction(2, rep.address, {from: accounts[0]});
    var ack = await task.acknowledged.call();
    assert.equal(ack, 2, "attack target should have rejected the service");
    assert(web3.eth.getBalance(task.address).equals(0), "the price should be paid out");

    // check balance after payout
    var newAttackTargetBalance = web3.fromWei(web3.eth.getBalance(accounts[0]).toNumber(), "ether");
    var diff = newAttackTargetBalance - attackTargetBalance;
    assert(diff < 1 && diff > 0.99, "the attack target should be refunded");
  });
});

contract('Reputation', function(accounts) {
  it("attack target should rate the mitigator during validation time window", async function() {
    var cust0 = await Customer.deployed();
    var cust1 = await Customer.new({from: accounts[1]});

    var startNum = web3.eth.blockNumber;
    var serviceDeadline = startNum + 100;
    var validationDeadline = startNum + 200;

    var task = await Task.new();
    var tx = task.init.sendTransaction(cust0.address, cust1.address, serviceDeadline, validationDeadline, web3.toWei(1, "ether"));

    await task.approve.sendTransaction({from: accounts[1]});
    var approved = await task.approved.call();
    assert(approved, "the mitigator should approve mitigation contracts");

    await task.start.sendTransaction({from: accounts[0], value: web3.toWei(1, "ether")});
    var started = await task.started.call();
    assert(started, "the mitigation task should have started");

    var currentNum = web3.eth.blockNumber;
    assert(currentNum < serviceDeadline, "current block number should be less than serviceDeadline");

    await task.uploadProof.sendTransaction("dummy-proof", {from: accounts[1]});
    var proof = await task.proof.call();
    assert.equal(proof, "dummy-proof", "mitigator should be allowed to submit proofs during service time window");

    var proofUploaded = await task.proofUploaded.call();
    assert(proofUploaded, "proof should be uploaded");

    // fast forward mine 200 additional blocks
    utils.mine(200);
    currentNum = web3.eth.blockNumber;
    assert(currentNum > validationDeadline, "validation time window should have expired");

    // attack target rates the mitigation service
    // after validation deadline expired, should throw
    var rep = await Reputation.new();
    await expectThrow(rep.rate.sendTransaction(task.address, cust0.address, "dummy-reputon", {from: accounts[0]}));

    var rated = await rep.attackTargetRated.call(task.address);
    assert(!rated, "attack target should not have rated");

    // store the original balance before the payout attempt
    var mitigatorBalance = web3.eth.getBalance(accounts[1]);
    var attackTargetBalance = web3.eth.getBalance(accounts[0]);

    // validating a proof should no longer be possible,
    // because the validation time window expired
    await expectThrow(task.validateProof.sendTransaction(2, rep.address, {from: accounts[0]}));
    var ack = await task.acknowledged.call();
    assert.equal(ack, 0, "attack target should no longer be able to acknowledge or reject the service");
    assert(web3.eth.getBalance(task.address).equals(web3.toWei(1, "ether")), "the price should still be locked"); 

    // check balance and state after payout attempt
    var newMitigatorBalance = web3.eth.getBalance(accounts[1]);
    var newAttackTargetBalance = web3.eth.getBalance(accounts[0]);
    assert(mitigatorBalance.equals(newMitigatorBalance), "the price should not be paid out to the mitigator");
    assert(newAttackTargetBalance.minus(attackTargetBalance).lessThan(web3.toWei(1, "ether")), "the price should not be paid out to the attack target");
  });

  /*it("mitigator should be able to rate the target after validation deadline", async function() {

  });*/

  /*it("repeated rating should not be possible", async function() {

  });*/
});