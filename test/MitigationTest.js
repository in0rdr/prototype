import expectThrow from '../node_modules/zeppelin-solidity/test/helpers/expectThrow';
import * as utils from './utils';

const Identity = artifacts.require("Identity");
const Mitigation = artifacts.require("Mitigation");
const Reputation = artifacts.require("Reputation");

contract('Mitigation', function(accounts) {
  it("should create a mitigation contract", async function() {
    var id = await Identity.new();
    await id.newCustomer.sendTransaction();
    await id.newCustomer.sendTransaction({from: accounts[1]});

    var customer = await id.customers(1);
    var address = customer[0];
    assert.equal(address, accounts[0], "first customer should be on first account");
    customer = await id.customers(2);
    address = customer[0];
    assert.equal(address, accounts[1], "second customer should be on second account");

    var m = await Mitigation.new();
    await m.newTask.sendTransaction(
        id.address,
        accounts[0],
        accounts[1],
        100,
        200,
        300,
        web3.toWei(1, "ether"),
        "ipfs-attackers-file-hash");

    var t = await m.getTarget.call(0);
    assert.equal(t, accounts[0], "should be attack target");
    var mitigator = await m.getMitigator.call(0);
    assert.equal(mitigator, accounts[1], "should be mitigator");
    var d = await m.getServiceDeadline.call(0);
    assert.equal(d, 100, "service deadline should be 100");
    d = await m.getValidationDeadline.call(0);
    assert.equal(d, 200, "mitigation deadline should be 200");
    var p = await m.getPrice.call(0);
    assert.equal(p, web3.toWei(1, "ether"), "price should be 1 ether");
  });

  it("should only start task when mitigator approved contract parameters", async function() {
    var id = await Identity.new();
    await id.newCustomer.sendTransaction();
    await id.newCustomer.sendTransaction({from: accounts[1]});

    var m = await Mitigation.new();
    var tx = await m.newTask.sendTransaction(
        id.address,
        accounts[0],
        accounts[1],
        100,
        200,
        300,
        web3.toWei(1, "ether"),
        "ipfs-attackers-file-hash");
    await expectThrow(m.start.sendTransaction(0, {from: accounts[1], value: web3.toWei(1, "ether")}));
    var s = await m.started.call(0);
    assert(!s, "task should not be started without mitigator approval");
  });

  it("find out if task exists", async function() {
    var id = await Identity.new();
    await id.newCustomer.sendTransaction();
    await id.newCustomer.sendTransaction({from: accounts[1]});

    var m = await Mitigation.new();
    var i = await m.initialized.call(0);
    assert(!i, "this task should not be initialized");
    var tx = await m.newTask.sendTransaction(
        id.address,
        accounts[0],
        accounts[1],
        100,
        200,
        300,
        web3.toWei(1, "ether"),
        "ipfs-attackers-file-hash");
    i = await m.initialized.call(0);
    assert(i, "this task should be initialized");
  });

  it("attack target should not be allowed to sign the contract for the mitigator", async function() {
    var id = await Identity.new();
    await id.newCustomer.sendTransaction();
    await id.newCustomer.sendTransaction({from: accounts[1]});

    var m = await Mitigation.new();
    var tx = await m.newTask.sendTransaction(
        id.address,
        accounts[0],
        accounts[1],
        100,
        200,
        300,
        web3.toWei(1, "ether"),
        "ipfs-attackers-file-hash");
    await expectThrow(m.approve.sendTransaction(0, {from: accounts[0]}));
    var a = await m.approved.call(0);
    assert(!a, "the mitigator should approve mitigation contracts");
  });

  it("mitigator should sign and approve the mitigation contract", async function() {
    var id = await Identity.new();
    await id.newCustomer.sendTransaction();
    await id.newCustomer.sendTransaction({from: accounts[1]});

    var m = await Mitigation.new();
    var tx = await m.newTask.sendTransaction(
        id.address,
        accounts[0],
        accounts[1],
        100,
        200,
        300,
        web3.toWei(1, "ether"),
        "ipfs-attackers-file-hash");
    tx = await m.approve.sendTransaction(0, {from: accounts[1]});
    var a = await m.approved.call(0);
    assert(a, "the mitigator should approve mitigation contracts");
  });

  it("attack target should start the mitigation task", async function() {
    var id = await Identity.new();
    await id.newCustomer.sendTransaction();
    await id.newCustomer.sendTransaction({from: accounts[1]});

    var m = await Mitigation.new();
    var tx = await m.newTask.sendTransaction(
        id.address,
        accounts[0],
        accounts[1],
        100,
        200,
        300,
        web3.toWei(1, "ether"), "ipfs-attackers-file-hash");

    tx = await m.approve.sendTransaction(0, {from: accounts[1]});
    var a = await m.approved.call(0);
    assert(a, "mitigator should approve mitigation contract");

    await expectThrow(m.start.sendTransaction(0, {from: accounts[1], value: web3.toWei(1, "ether")}));
    var s = await m.started.call(0);
    assert(!s, "mitigator is not allowed to start the task");

    await expectThrow(m.start.sendTransaction(0, {from: accounts[0], value: web3.toWei(0.9, "ether")}));
    s = await m.started.call(0);
    assert(!s, "the attack target needs to pay the exact amount");

    tx = await m.start.sendTransaction(0, {from: accounts[0], value: web3.toWei(1, "ether")});
    s = await m.started.call(0);
    assert(s, "the mitigation task should have started");

    assert(web3.eth.getBalance(m.address).equals(web3.toWei(1, "ether")), "the mitigation contract should hold the price");
  });

  it("mitigator should upload proof of service during service time window", async function() {
    var id = await Identity.new();
    await id.newCustomer.sendTransaction();
    await id.newCustomer.sendTransaction({from: accounts[1]});

    var m = await Mitigation.new();
    var tx = await m.newTask.sendTransaction(
        id.address,
        accounts[0],
        accounts[1],
        100,
        200,
        300,
        web3.toWei(1, "ether"),
        "ipfs-attackers-file-hash");

    await m.approve.sendTransaction(0, {from: accounts[1]});
    var a = await m.approved.call(0);
    assert(a, "the mitigator should approve mitigation contracts");

    await m.start.sendTransaction(0, {from: accounts[0], value: web3.toWei(1, "ether")});
    var s = await m.started.call(0);
    assert(s, "the mitigation task should have started");

    var startTime = await m.getStartTime.call(0);
    var currentNum = web3.eth.blockNumber;
    assert(currentNum < startTime.plus(100), "current block number should be less than serviceDeadline");

    await expectThrow(m.uploadProof.sendTransaction(0, "dummy-proof", {from: accounts[0]}));
    var p = await m.getProof.call(0);
    assert.equal(p, "", "attack target should not be allowed to submit proofs");

    p = await m.proofUploaded.call(0);
    assert(!p, "proof should not be uploaded");

    await m.uploadProof.sendTransaction(0, "dummy-proof", {from: accounts[1]});
    p = await m.getProof.call(0);
    assert.equal(p, "dummy-proof", "mitigator should be allowed to submit proofs during service time window");

    p = await m.proofUploaded.call(0);
    assert(p, "proof should be uploaded");

    // proof re-submission disallowed
    await expectThrow(m.uploadProof.sendTransaction(0, "dummy-proof2", {from: accounts[1]}));
    p = await m.proofUploaded.call(0);
    assert(p, "proof should be uploaded");
    p = await m.getProof.call(0);
    assert(p, "dummy-proof", "re-submission should not be allowed");
  });

  it("mitigator should not upload proofs when service time window expired", async function() {
    var id = await Identity.new();
    await id.newCustomer.sendTransaction();
    await id.newCustomer.sendTransaction({from: accounts[1]});

    var m = await Mitigation.new();
    var tx = await m.newTask.sendTransaction(
        id.address,
        accounts[0],
        accounts[1],
        100,
        200,
        300,
        web3.toWei(1, "ether"),
        "ipfs-attackers-file-hash");

    await m.approve.sendTransaction(0, {from: accounts[1]});
    var a = await m.approved.call(0);
    assert(a, "the mitigator should approve mitigation contracts");

    await m.start.sendTransaction(0, {from: accounts[0], value: web3.toWei(1, "ether")});
    var s = await m.started.call(0);
    assert(s, "the mitigation task should have started");

    var startTime = await m.getStartTime.call(0);
    var serviceDeadline = startTime.plus(100);
    var currentNum = web3.eth.blockNumber;
    assert(currentNum < serviceDeadline, "current block number should be less than serviceDeadline");

    // fast forward mine 120 additional blocks
    utils.mine(120);
    currentNum = web3.eth.blockNumber;
    assert(currentNum > serviceDeadline, "service time window should have expired");

    await expectThrow(m.uploadProof.sendTransaction(0, "dummy-proof", {from: accounts[1]}));
    var p = await m.proofUploaded.call(0);
    assert(!p, "proof should not be accepted");
    p = await m.getProof.call(0);
    assert.equal(p, "", "proof should still be empty");
  });

  it("attack target should rate the mitigator", async function() {
    var id = await Identity.new();
    await id.newCustomer.sendTransaction();
    await id.newCustomer.sendTransaction({from: accounts[1]});

    var m = await Mitigation.new();
    var tx = await m.newTask.sendTransaction(
        id.address,
        accounts[0],
        accounts[1],
        100,
        200,
        300,
        web3.toWei(1, "ether"),
        "ipfs-attackers-file-hash");

    await m.approve.sendTransaction(0, {from: accounts[1]});
    var a = await m.approved.call(0);
    assert(a, "the mitigator should approve mitigation contracts");

    await m.start.sendTransaction(0, {from: accounts[0], value: web3.toWei(1, "ether")});
    var s = await m.started.call(0);
    assert(s, "the mitigation task should have started");

    var startTime = await m.getStartTime.call(0);
    var serviceDeadline = startTime.plus(100);
    var validationDeadline = startTime.plus(200);
    var currentNum = web3.eth.blockNumber;
    assert(currentNum < serviceDeadline, "current block number should be less than serviceDeadline");

    await m.uploadProof.sendTransaction(0, "dummy-proof", {from: accounts[1]});
    var p = await m.getProof.call(0);
    assert.equal(p, "dummy-proof", "mitigator should be allowed to submit proofs during service time window");
    p = await m.proofUploaded.call(0);
    assert(p, "proof should be uploaded");

    // fast forward mine 120 additional blocks
    utils.mine(120);
    currentNum = web3.eth.blockNumber;
    assert(currentNum > serviceDeadline, "service time window should have expired");
    assert(currentNum < validationDeadline, "validation time window should not have expired yet");

    var rep = await Reputation.new();
    var r = await rep.attackTargetRated.call(0);
    assert(!r, "attack target should not have rated yet");

    // rating the service as mitigator should throw
    await expectThrow(rep.rateAsMitigator.sendTransaction(m.address, 0, "dummy-reputon", false, {from: accounts[1]}));
    r = await rep.mitigatorRated.call(0);
    assert(!r, "mitigator should not have rated yet");

    // store the original balance before the rating
    assert(web3.eth.getBalance(m.address).equals(web3.toWei(1, "ether")), "the mitigation contract should hold the price");
    var mitigatorBalance = web3.eth.getBalance(accounts[1]);

    // attack target rates the mitigation service
    tx = await rep.rateAsTarget.sendTransaction(m.address, 0, "dummy-reputon", true, {from: accounts[0]});
    r = await rep.attackTargetRated.call(0);
    assert(r, "attack target should have rated");

    a = await m.acknowledged.call(0);
    assert(a, "attack target should have acknowledged the service");
  });

  it("attack target should be refunded on reject", async function() {
    var id = await Identity.new();
    await id.newCustomer.sendTransaction();
    await id.newCustomer.sendTransaction({from: accounts[1]});

    var m = await Mitigation.new();
    var tx = await m.newTask.sendTransaction(
        id.address,
        accounts[0],
        accounts[1],
        100,
        200,
        300,
        web3.toWei(1, "ether"),
        "ipfs-attackers-file-hash");

    await m.approve.sendTransaction(0, {from: accounts[1]});
    var a = await m.approved.call(0);
    assert(a, "the mitigator should approve mitigation contracts");

    await m.start.sendTransaction(0, {from: accounts[0], value: web3.toWei(1, "ether")});
    var s = await m.started.call(0);
    assert(s, "the mitigation task should have started");

    var startTime = await m.getStartTime.call(0);
    var serviceDeadline = startTime.plus(100);
    var validationDeadline = startTime.plus(200);
    var ratingDeadline = startTime.plus(300);
    var currentNum = web3.eth.blockNumber;
    assert(currentNum < serviceDeadline, "current block number should be less than serviceDeadline");

    await m.uploadProof.sendTransaction(0, "dummy-proof", {from: accounts[1]});
    var p = await m.getProof.call(0);
    assert.equal(p, "dummy-proof", "mitigator should be allowed to submit proofs during service time window");

    // fast forward mine 120 additional blocks
    utils.mine(120);
    currentNum = web3.eth.blockNumber;
    assert(currentNum > serviceDeadline, "service time window should have expired");
    assert(currentNum < validationDeadline, "validation time window should not have expired yet");

    // reject the service as attack target
    var rep = await Reputation.new();
    tx = await rep.rateAsTarget.sendTransaction(m.address, 0, "dummy-reputon", false, {from: accounts[0]});
    var r = await rep.attackTargetRated.call(0);
    assert(r, "attack target should have rated");
    a = await m.acknowledged.call(0);
    assert(!a, "attack target should have rejected the service");
    r = await m.rejected.call(0);
    assert(r, "attack target should have rejected the service");
    assert(web3.fromWei(web3.eth.getBalance(m.address), "ether").equals(1), "the price should not be paid out yet");

    // fast forward mine 200 additional blocks
    utils.mine(200);
    currentNum = web3.eth.blockNumber;
    assert(currentNum > ratingDeadline, "final rating deadline should have expired");

    // store the original balance before completion
    var attackTargetBalance = web3.fromWei(web3.eth.getBalance(accounts[0]).toNumber(), "ether");

    // complete to retrieve funds
    tx = await m.complete.sendTransaction(0, rep.address, {from: accounts[0]});

    // check balance after completion
    var newAttackTargetBalance = web3.fromWei(web3.eth.getBalance(accounts[0]).toNumber(), "ether");
    var targetDiff = newAttackTargetBalance - attackTargetBalance;
    assert(targetDiff < 1 && targetDiff > 0.98, "the attack target should be refunded");
  });

  it("should complete before start", async function() {
    var id = await Identity.new();
    await id.newCustomer.sendTransaction();
    await id.newCustomer.sendTransaction({from: accounts[1]});

    var m = await Mitigation.new();
    var tx = await m.newTask.sendTransaction(
        id.address,
        accounts[0],
        accounts[1],
        100,
        200,
        300,
        web3.toWei(1, "ether"),
        "ipfs-attackers-file-hash");

    var a = await m.completed.call(0);
    assert(!a, "task should not be completed");

    // store the original balance before completion
    var attackTargetBalance = web3.fromWei(web3.eth.getBalance(accounts[0]).toNumber(), "ether");

    var rep = await Reputation.new();
    await m.complete.sendTransaction(0, rep.address);
    a = await m.completed.call(0);
    assert(a, "task should be completed");

    // check balance after completion
    var newAttackTargetBalance = web3.fromWei(web3.eth.getBalance(accounts[0]).toNumber(), "ether");
    var diff = attackTargetBalance - newAttackTargetBalance;
    assert(diff < web3.toWei(0.003, "ether"), "only the gas costs should be paid, no reward payout should be made");

    // repeated completion, should throw
    await expectThrow(m.complete.sendTransaction(0, rep.address));

    await expectThrow(m.approve.sendTransaction(0, {from: accounts[1]}));
    var a = await m.approved.call(0);
    assert(!a, "the completed task should not be approved");

    await expectThrow(m.start.sendTransaction(0, {from: accounts[0], value: web3.toWei(1, "ether")}));
    var s = await m.started.call(0);
    assert(!s, "the completed task should not be started");
  });

  it("should complete after validation time window expired and refund target when no proof",  async function() {
    var id = await Identity.new();
    await id.newCustomer.sendTransaction();
    await id.newCustomer.sendTransaction({from: accounts[1]});

    var m = await Mitigation.new();
    var tx = await m.newTask.sendTransaction(
        id.address,
        accounts[0],
        accounts[1],
        100,
        200,
        300,
        web3.toWei(1, "ether"),
        "ipfs-attackers-file-hash");

    await m.approve.sendTransaction(0, {from: accounts[1]});
    var a = await m.approved.call(0);
    assert(a, "the mitigator should approve mitigation contracts");

    await m.start.sendTransaction(0, {from: accounts[0], value: web3.toWei(1, "ether")});
    var s = await m.started.call(0);
    assert(s, "the mitigation task should have started");

    var startTime = await m.getStartTime.call(0);
    var serviceDeadline = startTime.plus(100);
    var validationDeadline = startTime.plus(200);
    var ratingDeadline = startTime.plus(300);
    var currentNum = web3.eth.blockNumber;
    assert(currentNum < serviceDeadline, "current block number should be less than serviceDeadline");

    // store the original balance before completion
    var attackTargetBalance = web3.fromWei(web3.eth.getBalance(accounts[0]).toNumber(), "ether");
    var mitigatorBalance = web3.fromWei(web3.eth.getBalance(accounts[1]).toNumber(), "ether");

    var rep = await Reputation.new();
    await expectThrow(m.complete.sendTransaction(0, rep.address));
    await expectThrow(m.complete.sendTransaction(0, rep.address, {from: accounts[1]}));
    a = await m.completed.call(0);
    assert(!a, "task should not be completed during service time window");

    // check balance after completion
    var newAttackTargetBalance = web3.fromWei(web3.eth.getBalance(accounts[0]).toNumber(), "ether");
    var newMitigatorBalance = web3.fromWei(web3.eth.getBalance(accounts[1]).toNumber(), "ether");
    var targetDiff = attackTargetBalance - newAttackTargetBalance;
    var mitigatorDiff = mitigatorBalance - newMitigatorBalance;
    assert(targetDiff < web3.toWei(0.003, "ether"), "only the gas costs should be paid, no reward payout should be made");
    assert(mitigatorDiff < web3.toWei(0.003, "ether"), "only the gas costs should be paid, no reward payout should be made");

    // go to validation time window
    utils.mine(100);
    currentNum = web3.eth.blockNumber;
    assert(currentNum > serviceDeadline, "service time window should have expired");
    assert(currentNum < validationDeadline, "validation time window should not have expired yet");

    // reject, in order to be refunded at the end
    await rep.rateAsTarget.sendTransaction(m.address, 0, "dummy-reputon", false, {from: accounts[0]});
    var r = await rep.attackTargetRated.call(0);
    assert(r, "task should be rated");
    r = await m.rejected.call(0);
    assert(r, "attack target should have rejected the service");
    a = await m.acknowledged.call(0);
    assert(!a, "attack target should have rejected the service");

    // fast forward mine 310 additional blocks
    utils.mine(310);
    currentNum = web3.eth.blockNumber;
    assert(currentNum > ratingDeadline, "final rating time window should have expired");

    // store the original balance before completion
    attackTargetBalance = web3.fromWei(web3.eth.getBalance(accounts[0]).toNumber(), "ether");
    mitigatorBalance = web3.fromWei(web3.eth.getBalance(accounts[1]).toNumber(), "ether");

    // complete as target
    await m.complete.sendTransaction(0, rep.address, {from: accounts[0]});
    a = await m.completed.call(0);
    assert(a, "task should be completed");

    // check balance after completion
    newAttackTargetBalance = web3.fromWei(web3.eth.getBalance(accounts[0]).toNumber(), "ether");
    newMitigatorBalance = web3.fromWei(web3.eth.getBalance(accounts[1]).toNumber(), "ether");
    targetDiff = newAttackTargetBalance - attackTargetBalance;
    mitigatorDiff = mitigatorBalance - newMitigatorBalance;
    //console.log("targetdiff:", targetDiff)
    //console.log("mitigatorDiff:", mitigatorDiff)
    assert(targetDiff < 1 && targetDiff > 0.98, "the attack target should be refunded");
    assert(mitigatorDiff < web3.toWei(0.003, "ether"), "only the gas costs should be paid, no reward payout should be made");
  });

  it("should reward mitigator after final rating if proof uploaded", async function() {
    var id = await Identity.new();
    await id.newCustomer.sendTransaction();
    await id.newCustomer.sendTransaction({from: accounts[1]});

    var m = await Mitigation.new();
    var tx = await m.newTask.sendTransaction(
        id.address,
        accounts[0],
        accounts[1],
        100,
        200,
        300,
        web3.toWei(1, "ether"),
        "ipfs-attackers-file-hash");

    await m.approve.sendTransaction(0, {from: accounts[1]});
    var a = await m.approved.call(0);
    assert(a, "the mitigator should approve mitigation contracts");

    await m.start.sendTransaction(0, {from: accounts[0], value: web3.toWei(1, "ether")});
    var s = await m.started.call(0);
    assert(s, "the mitigation task should have started");

    var startTime = await m.getStartTime.call(0);
    var serviceDeadline = startTime.plus(100);
    var validationDeadline = startTime.plus(200);
    var ratingDeadline = startTime.plus(300);
    var currentNum = web3.eth.blockNumber;
    assert(currentNum < serviceDeadline, "current block number should be less than serviceDeadline");

    // upload proof
    await m.uploadProof.sendTransaction(0, "dummy-proof", {from: accounts[1]});
    var p = await m.getProof.call(0);
    assert.equal(p, "dummy-proof", "mitigator should be allowed to submit proofs during service time window");
    p = await m.proofUploaded.call(0);
    assert(p, "proof should be uploaded");

    // store the original balance before completion
    var attackTargetBalance = web3.fromWei(web3.eth.getBalance(accounts[0]).toNumber(), "ether");
    var mitigatorBalance = web3.fromWei(web3.eth.getBalance(accounts[1]).toNumber(), "ether");

    var rep = await Reputation.new();
    await expectThrow(m.complete.sendTransaction(0, rep.address));
    await expectThrow(m.complete.sendTransaction(0, rep.address, {from: accounts[1]}));
    a = await m.completed.call(0);
    assert(!a, "task should not be completed by mitigator");

    // check balance after completion
    var newAttackTargetBalance = web3.fromWei(web3.eth.getBalance(accounts[0]).toNumber(), "ether");
    var newMitigatorBalance = web3.fromWei(web3.eth.getBalance(accounts[1]).toNumber(), "ether");
    var targetDiff = attackTargetBalance - newAttackTargetBalance;
    var mitigatorDiff = mitigatorBalance - newMitigatorBalance;
    assert(targetDiff < web3.toWei(0.003, "ether"), "only the gas costs should be paid, no reward payout should be made");
    assert(mitigatorDiff < web3.toWei(0.003, "ether"), "only the gas costs should be paid, no reward payout should be made");

    // fast forward mine 220 additional blocks
    utils.mine(220);
    currentNum = web3.eth.blockNumber;
    assert(currentNum > validationDeadline, "validation time window should have expired");
    assert(currentNum < ratingDeadline, "rating time window should not have expired yet");

    // proof was uploaded,
    // mitigator should be rewarded because target did not validate in time
    var rep = await Reputation.new();
    await expectThrow(rep.rateAsTarget.sendTransaction(m.address, 0, "dummy-reputon", false, {from: accounts[0]}));
    // it should not be possible to upload positive ratings in this case
    await expectThrow(rep.rateAsMitigator.sendTransaction(m.address, 0, "dummy-reputon-neg-xy", true, {from: accounts[1]}));
    var r = await rep.mitigatorRated.call(0);
    assert(!r, "mitigator rating should not be registered yet");
    await rep.rateAsMitigator.sendTransaction(m.address, 0, "dummy-reputon", false, {from: accounts[1]});

    r = await rep.mitigatorRated.call(0);
    assert(r, "mitigator should have rated");
    r = await m.rejected.call(0);
    assert(!r, "attack target should not have rated the service");
    a = await m.acknowledged.call(0);
    assert(!a, "attack target should not have rated the service");

    utils.mine(100);
    currentNum = web3.eth.blockNumber;
    assert(currentNum > ratingDeadline, "final rating time window should have expired");

    // store the original balance before completion
    attackTargetBalance = web3.fromWei(web3.eth.getBalance(accounts[0]).toNumber(), "ether");
    mitigatorBalance = web3.fromWei(web3.eth.getBalance(accounts[1]).toNumber(), "ether");

    // complete
    await m.complete.sendTransaction(0, rep.address, {from: accounts[1]});
    a = await m.completed.call(0);
    assert(a, "task should be completed");

    // check balance after completion
    newAttackTargetBalance = web3.fromWei(web3.eth.getBalance(accounts[0]).toNumber(), "ether");
    newMitigatorBalance = web3.fromWei(web3.eth.getBalance(accounts[1]).toNumber(), "ether");
    targetDiff = attackTargetBalance - newAttackTargetBalance;
    mitigatorDiff = newMitigatorBalance - mitigatorBalance;
    var state = await m.getState.call(0)
    var price = await m.getPrice.call(0)
    // console.log("state:", state)
    // console.log("price:", web3.fromWei(price, "ether").toNumber())
    // console.log("targetdiff:", targetDiff)
    // console.log("mitigatorDiff:", mitigatorDiff)
    assert(mitigatorDiff < 1 && mitigatorDiff > 0.98, "the mitigator should be rewarded");
    assert(targetDiff < web3.toWei(0.003, "ether"), "only the gas costs should be paid, no refund");
  });

  it("escalation case should not pay out", async function() {
    var id = await Identity.new();
    await id.newCustomer.sendTransaction();
    await id.newCustomer.sendTransaction({from: accounts[1]});

    var m = await Mitigation.new();
    var tx = await m.newTask.sendTransaction(
        id.address,
        accounts[0],
        accounts[1],
        100,
        200,
        300,
        web3.toWei(1, "ether"),
        "ipfs-attackers-file-hash");

    await m.approve.sendTransaction(0, {from: accounts[1]});
    var a = await m.approved.call(0);
    assert(a, "the mitigator should approve mitigation contracts");

    await m.start.sendTransaction(0, {from: accounts[0], value: web3.toWei(1, "ether")});
    var s = await m.started.call(0);
    assert(s, "the mitigation task should have started");

    var startTime = await m.getStartTime.call(0);
    var serviceDeadline = startTime.plus(100);
    var validationDeadline = startTime.plus(200);
    var ratingDeadline = startTime.plus(300);
    var currentNum = web3.eth.blockNumber;
    assert(currentNum < serviceDeadline, "current block number should be less than serviceDeadline");

    // upload proof
    await m.uploadProof.sendTransaction(0, "dummy-proof", {from: accounts[1]});
    var p = await m.getProof.call(0);
    assert.equal(p, "dummy-proof", "mitigator should be allowed to submit proofs during service time window");
    p = await m.proofUploaded.call(0);
    assert(p, "proof should be uploaded");

    // fast forward mine 110 additional blocks
    utils.mine(110);
    currentNum = web3.eth.blockNumber;
    assert(currentNum > serviceDeadline, "service time window should have expired");
    assert(currentNum < validationDeadline, "validation time window should not have expired yet");

    // rate negatively as target
    var rep = await Reputation.new();
    rep.rateAsTarget.sendTransaction(m.address, 0, "dummy-reputon", false, {from: accounts[0]});
    var r = await m.rejected.call(0);
    assert(r, "attack target should have rated the service");

    // fast forward mine 110 additional blocks
    utils.mine(110);
    currentNum = web3.eth.blockNumber;
    assert(currentNum > validationDeadline, "validation time window should have expired");
    assert(currentNum < ratingDeadline, "rating time window should not have expired yet");

    // rate negatively as mitigator
    // this allows the mitigator to open dispute after completion
    rep.rateAsMitigator.sendTransaction(m.address, 0, "dummy-reputon-2", false, {from: accounts[1]});
    r = await rep.mitigatorRated.call(0)
    assert(r, "mitigator should have rated the service");

    utils.mine(110);
    currentNum = web3.eth.blockNumber;
    assert(currentNum > ratingDeadline, "final rating time window should have expired");

    // store the original balance before completion
    var attackTargetBalance = web3.fromWei(web3.eth.getBalance(accounts[0]).toNumber(), "ether");
    var mitigatorBalance = web3.fromWei(web3.eth.getBalance(accounts[1]).toNumber(), "ether");

    // try to complete as mitigator
    await expectThrow(m.complete.sendTransaction(0, rep.address, {from: accounts[1]}));
    a = await m.completed.call(0);
    assert(!a, "task should not be completed, escalation required");

    // try to complete as target
    await expectThrow(m.complete.sendTransaction(0, rep.address, {from: accounts[0]}));
    a = await m.completed.call(0);
    assert(!a, "task should not be completed, escalation required");

    // check balance after completion
    var newAttackTargetBalance = web3.fromWei(web3.eth.getBalance(accounts[0]).toNumber(), "ether");
    var newMitigatorBalance = web3.fromWei(web3.eth.getBalance(accounts[1]).toNumber(), "ether");
    var targetDiff = attackTargetBalance - newAttackTargetBalance;
    var mitigatorDiff = newMitigatorBalance - mitigatorBalance;
    var state = await m.getState.call(0)
    var price = await m.getPrice.call(0)
    //console.log("state:", state)
    //console.log("price:", web3.fromWei(price, "ether").toNumber())
    //console.log("targetdiff:", targetDiff)
    //console.log("mitigatorDiff:", mitigatorDiff)
    assert(mitigatorDiff < web3.toWei(0.003, "ether"), "only the gas costs should be paid,");
    assert(targetDiff < web3.toWei(0.003, "ether"), "only the gas costs should be paid, no refund");
  });

  it("when not started, should complete without payout when target completes", async function() {
    var id = await Identity.new();
    await id.newCustomer.sendTransaction();
    await id.newCustomer.sendTransaction({from: accounts[1]});

    var m = await Mitigation.new();
    var tx = await m.newTask.sendTransaction(
        id.address,
        accounts[0],
        accounts[1],
        100,
        200,
        300,
        web3.toWei(1, "ether"),
        "ipfs-attackers-file-hash");

    await m.approve.sendTransaction(0, {from: accounts[1]});
    var a = await m.approved.call(0);
    assert(a, "the mitigator should approve mitigation contracts");

    // fast forward mine 220 additional blocks
    // VALIDATION DEADLINE EXPIRED
    utils.mine(220);
    var startTime = await m.getStartTime.call(0);
    var validationDeadline = startTime.plus(200);
    var currentNum = web3.eth.blockNumber;
    assert(currentNum > validationDeadline, "validation time window should have expired");

    // store the original balance before completion
    var attackTargetBalance = web3.fromWei(web3.eth.getBalance(accounts[0]).toNumber(), "ether");

    var rep = await Reputation.new();
    await m.complete.sendTransaction(0, rep.address);

    var a = await m.completed.call(0);
    assert(a, "task should be completed");

    // check balance after completion
    var newAttackTargetBalance = web3.fromWei(web3.eth.getBalance(accounts[0]).toNumber(), "ether");
    var diff = attackTargetBalance - newAttackTargetBalance;
    assert(diff < web3.toWei(0.003, "ether"), "only the gas costs should be paid, no payment");
  });

  it("when not started, should complete without payout when mitigator completes", async function() {
    var id = await Identity.new();
    await id.newCustomer.sendTransaction();
    await id.newCustomer.sendTransaction({from: accounts[1]});

    var m = await Mitigation.new();
    var tx = await m.newTask.sendTransaction(
        id.address,
        accounts[0],
        accounts[1],
        100,
        200,
        300,
        web3.toWei(1, "ether"),
        "ipfs-attackers-file-hash");

    // fast forward mine 220 additional blocks
    // VALIDATION DEADLINE EXPIRED
    utils.mine(220);
    var startTime = await m.getStartTime.call(0);
    var validationDeadline = startTime.plus(200);
    var currentNum = web3.eth.blockNumber;
    assert(currentNum > validationDeadline, "validation time window should have expired");

    // store the original balance before completion
    var mitigatorBalance = web3.fromWei(web3.eth.getBalance(accounts[1]).toNumber(), "ether");

    // complete as mitigator
    var rep = await Reputation.new();
    await m.complete.sendTransaction(0, rep.address, {from: accounts[1]});

    var a = await m.completed.call(0);
    assert(a, "task should be completed");

    // check balance after completion
    var newMitigatorBalance = web3.fromWei(web3.eth.getBalance(accounts[1]).toNumber(), "ether");
    var diff = mitigatorBalance - newMitigatorBalance;
    assert(diff < web3.toWei(0.003, "ether"), "only the gas costs should be paid, no payment");
  });
});