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

    var a = await id.getCustomerAddr.call(1);
    assert.equal(a, accounts[0], "first customer should be on first account");
    a = await id.getCustomerAddr.call(2);
    assert.equal(a, accounts[1], "second customer should be on second account");

    var m = await Mitigation.new();
    await m.newTask.sendTransaction(id.address, accounts[0], accounts[1], 100, 200, web3.toWei(1, "ether"));

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
    var tx = await m.newTask.sendTransaction(id.address, accounts[0], accounts[1], 100, 200, web3.toWei(1, "ether"));
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
    var tx = await m.newTask.sendTransaction(id.address, accounts[0], accounts[1], 100, 200, web3.toWei(1, "ether"));
    i = await m.initialized.call(0);
    assert(i, "this task should be initialized");
  });

  it("attack target should not be allowed to sign the contract for the mitigator", async function() {
    var id = await Identity.new();
    await id.newCustomer.sendTransaction();
    await id.newCustomer.sendTransaction({from: accounts[1]});

    var m = await Mitigation.new();
    var tx = await m.newTask.sendTransaction(id.address, accounts[0], accounts[1], 100, 200, web3.toWei(1, "ether"));
    await expectThrow(m.approve.sendTransaction(0, {from: accounts[0]}));
    var a = await m.approved.call(0);
    assert(!a, "the mitigator should approve mitigation contracts");
  });

  it("mitigator should sign and approve the mitigation contract", async function() {
    var id = await Identity.new();
    await id.newCustomer.sendTransaction();
    await id.newCustomer.sendTransaction({from: accounts[1]});

    var m = await Mitigation.new();
    var tx = await m.newTask.sendTransaction(id.address, accounts[0], accounts[1], 100, 200, web3.toWei(1, "ether"));
    tx = await m.approve.sendTransaction(0, {from: accounts[1]});
    var a = await m.approved.call(0);
    assert(a, "the mitigator should approve mitigation contracts");
  });

  it("attack target should start the mitigation task", async function() {
    var id = await Identity.new();
    await id.newCustomer.sendTransaction();
    await id.newCustomer.sendTransaction({from: accounts[1]});

    var m = await Mitigation.new();
    var tx = await m.newTask.sendTransaction(id.address, accounts[0], accounts[1], 100, 200, web3.toWei(1, "ether"));

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

    var startNum = web3.eth.blockNumber;
    var serviceDeadline = startNum + 100;
    var validationDeadline = startNum + 200;

    var m = await Mitigation.new();
    var tx = await m.newTask.sendTransaction(id.address, accounts[0], accounts[1], serviceDeadline, validationDeadline, web3.toWei(1, "ether"));

    await m.approve.sendTransaction(0, {from: accounts[1]});
    var a = await m.approved.call(0);
    assert(a, "the mitigator should approve mitigation contracts");

    await m.start.sendTransaction(0, {from: accounts[0], value: web3.toWei(1, "ether")});
    var s = await m.started.call(0);
    assert(s, "the mitigation task should have started");

    var currentNum = web3.eth.blockNumber;
    assert(currentNum < serviceDeadline, "current block number should be less than serviceDeadline");

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

    var startNum = web3.eth.blockNumber;
    var serviceDeadline = startNum + 100;
    var validationDeadline = startNum + 200;

    var m = await Mitigation.new();
    var tx = await m.newTask.sendTransaction(id.address, accounts[0], accounts[1], serviceDeadline, validationDeadline, web3.toWei(1, "ether"));

    await m.approve.sendTransaction(0, {from: accounts[1]});
    var a = await m.approved.call(0);
    assert(a, "the mitigator should approve mitigation contracts");

    await m.start.sendTransaction(0, {from: accounts[0], value: web3.toWei(1, "ether")});
    var s = await m.started.call(0);
    assert(s, "the mitigation task should have started");

    var currentNum = web3.eth.blockNumber;
    assert(currentNum < serviceDeadline, "current block number should be less than serviceDeadline");

    // fast forward mine 100 additional blocks
    utils.mine(100);
    currentNum = web3.eth.blockNumber;
    assert(currentNum > serviceDeadline, "service time window should have expired");

    await expectThrow(m.uploadProof.sendTransaction(0, "dummy-proof", {from: accounts[1]}));
    var p = await m.proofUploaded.call(0);
    assert(!p, "proof should not be accepted");
    p = await m.getProof.call(0);
    assert.equal(p, "", "proof should still be empty");
  });

  it("attack target should rate the mitigator before validating the service", async function() {
    var id = await Identity.new();
    await id.newCustomer.sendTransaction();
    await id.newCustomer.sendTransaction({from: accounts[1]});

    var startNum = web3.eth.blockNumber;
    var serviceDeadline = startNum + 100;
    var validationDeadline = startNum + 200;

    var m = await Mitigation.new();
    var tx = await m.newTask.sendTransaction(id.address, accounts[0], accounts[1], serviceDeadline, validationDeadline, web3.toWei(1, "ether"));

    await m.approve.sendTransaction(0, {from: accounts[1]});
    var a = await m.approved.call(0);
    assert(a, "the mitigator should approve mitigation contracts");

    await m.start.sendTransaction(0, {from: accounts[0], value: web3.toWei(1, "ether")});
    var s = await m.started.call(0);
    assert(s, "the mitigation task should have started");

    var currentNum = web3.eth.blockNumber;
    assert(currentNum < serviceDeadline, "current block number should be less than serviceDeadline");

    await m.uploadProof.sendTransaction(0, "dummy-proof", {from: accounts[1]});
    var p = await m.getProof.call(0);
    assert.equal(p, "dummy-proof", "mitigator should be allowed to submit proofs during service time window");
    p = await m.proofUploaded.call(0);
    assert(p, "proof should be uploaded");

    // fast forward mine 100 additional blocks
    utils.mine(100);
    currentNum = web3.eth.blockNumber;
    assert(currentNum > serviceDeadline, "service time window should have expired");
    assert(currentNum < validationDeadline, "validation time window should not have expired yet");

    var rep = await Reputation.new();
    var r = await rep.attackTargetRated.call(0);
    assert(!r, "attack target should not have rated yet");

    // validate the proof without rating, should throw
    await expectThrow(m.validateProof.sendTransaction(0, true, rep.address, {from: accounts[0]}));

    // rating the service as mitigator should throw
    await expectThrow(rep.rate.sendTransaction(m.address, 0, "dummy-reputon", {from: accounts[1]}));
    r = await rep.attackTargetRated.call(0);
    assert(!r, "attack target should not have rated yet");
    r = await rep.mitigatorRated.call(0);
    assert(!r, "mitigator should not have rated yet");

    // attack target rates the mitigation service
    tx = await rep.rate.sendTransaction(m.address, 0, "dummy-reputon", {from: accounts[0]});
    r = await rep.attackTargetRated.call(0);
    assert(r, "attack target should have rated");

    // validating the proof as mitigator should throw
    await expectThrow(m.validateProof.sendTransaction(0, true, rep.address, {from: accounts[1]}));
    var v = await m.validated.call(0);
    assert(!v, "mitigator should not be able to validate the service");
    a = await m.acknowledged.call(0);
    assert(!a, "mitigator should not be able to validate the service");

    // store the original balance before the payout
    assert(web3.eth.getBalance(m.address).equals(web3.toWei(1, "ether")), "the mitigation contract should hold the price");
    var mitigatorBalance = web3.eth.getBalance(accounts[1]);

    // acknowledge the service as attack target
    tx = await m.validateProof.sendTransaction(0, true, rep.address, {from: accounts[0]});
    var v = await m.validated.call(0);
    assert(v, "attack target should have validated the service");
    a = await m.acknowledged.call(0);
    assert(a, "attack target should have acknowledged the service");
    assert(web3.eth.getBalance(m.address).equals(0), "the price should be paid out");

    // check balance and state after payout
    var newMitigatorBalance = web3.eth.getBalance(accounts[1]);
    assert(mitigatorBalance.plus(web3.toWei(1, "ether")).equals(newMitigatorBalance), "the price should be paid out to the mitigator");
  });

  it("attack target should be refunded on reject", async function() {
    var id = await Identity.new();
    await id.newCustomer.sendTransaction();
    await id.newCustomer.sendTransaction({from: accounts[1]});

    var startNum = web3.eth.blockNumber;
    var serviceDeadline = startNum + 100;
    var validationDeadline = startNum + 200;

    var m = await Mitigation.new();
    var tx = await m.newTask.sendTransaction(id.address, accounts[0], accounts[1], serviceDeadline, validationDeadline, web3.toWei(1, "ether"));

    await m.approve.sendTransaction(0, {from: accounts[1]});
    var a = await m.approved.call(0);
    assert(a, "the mitigator should approve mitigation contracts");

    await m.start.sendTransaction(0, {from: accounts[0], value: web3.toWei(1, "ether")});
    var s = await m.started.call(0);
    assert(s, "the mitigation task should have started");

    var currentNum = web3.eth.blockNumber;
    assert(currentNum < serviceDeadline, "current block number should be less than serviceDeadline");

    // fast forward mine 100 additional blocks
    utils.mine(100);
    currentNum = web3.eth.blockNumber;
    assert(currentNum > serviceDeadline, "service time window should have expired");
    assert(currentNum < validationDeadline, "validation time window should not have expired yet");

    // attack target rates the mitigation service
    var rep = await Reputation.new();
    tx = await rep.rate.sendTransaction(m.address, 0, "dummy-reputon", {from: accounts[0]});
    var r = await rep.attackTargetRated.call(0);
    assert(r, "attack target should have rated");
    assert(web3.eth.getBalance(m.address).equals(web3.toWei(1, "ether")), "the mitigation contract should still hold the price");

    // store the original balance before the payout
    var attackTargetBalance = web3.fromWei(web3.eth.getBalance(accounts[0]).toNumber(), "ether");

    // reject the service as attack target
    tx = await m.validateProof.sendTransaction(0, false, rep.address, {from: accounts[0]});
    var v = await m.validated.call(0);
    assert(v, "attack target should have validated the service");
    a = await m.acknowledged.call(0);
    assert(!a, "attack target should have rejected the service");
    r = await m.rejected.call(0);
    assert(r, "attack target should have rejected the service");
    assert(web3.eth.getBalance(m.address).equals(0), "the price should be paid out");

    // check balance after payout
    var newAttackTargetBalance = web3.fromWei(web3.eth.getBalance(accounts[0]).toNumber(), "ether");
    var diff = newAttackTargetBalance - attackTargetBalance;
    assert(diff < 1 && diff > 0.99, "the attack target should be refunded");
  });

  it("should abort before started", async function() {
    var id = await Identity.new();
    await id.newCustomer.sendTransaction();
    await id.newCustomer.sendTransaction({from: accounts[1]});

    var startNum = web3.eth.blockNumber;
    var serviceDeadline = startNum + 100;
    var validationDeadline = startNum + 200;

    var m = await Mitigation.new();
    var tx = await m.newTask.sendTransaction(id.address, accounts[0], accounts[1], serviceDeadline, validationDeadline, web3.toWei(1, "ether"));

    var a = await m.aborted.call(0);
    assert(!a, "task should not be aborted");

    // store the original balance before abort
    var attackTargetBalance = web3.fromWei(web3.eth.getBalance(accounts[0]).toNumber(), "ether");

    await m.abort.sendTransaction(0);
    a = await m.aborted.call(0);
    assert(a, "task should be aborted");

    // check balance after abort
    var newAttackTargetBalance = web3.fromWei(web3.eth.getBalance(accounts[0]).toNumber(), "ether");
    var diff = attackTargetBalance - newAttackTargetBalance;
    assert(diff < web3.toWei(0.003, "ether"), "only the gas costs should be paid, no reward payout should be made");

    // repeated abort, should throw
    await expectThrow(m.abort.sendTransaction(0));

    await expectThrow(m.approve.sendTransaction(0, {from: accounts[1]}));
    var a = await m.approved.call(0);
    assert(!a, "the aborted task should not be approved");

    await expectThrow(m.start.sendTransaction(0, {from: accounts[0], value: web3.toWei(1, "ether")}));
    var s = await m.started.call(0);
    assert(!s, "the aborted task should not be started");
  });

  it("should abort after validation time window expired and refund target when no proof", async function() {
    var id = await Identity.new();
    await id.newCustomer.sendTransaction();
    await id.newCustomer.sendTransaction({from: accounts[1]});

    var startNum = web3.eth.blockNumber;
    var serviceDeadline = startNum + 100;
    var validationDeadline = startNum + 200;

    var m = await Mitigation.new();
    var tx = await m.newTask.sendTransaction(id.address, accounts[0], accounts[1], serviceDeadline, validationDeadline, web3.toWei(1, "ether"));

    await m.approve.sendTransaction(0, {from: accounts[1]});
    var a = await m.approved.call(0);
    assert(a, "the mitigator should approve mitigation contracts");

    await m.start.sendTransaction(0, {from: accounts[0], value: web3.toWei(1, "ether")});
    var s = await m.started.call(0);
    assert(s, "the mitigation task should have started");

    var currentNum = web3.eth.blockNumber;
    // SERVICE TIME WINDOW
    assert(currentNum < serviceDeadline, "current block number should be less than serviceDeadline");

    // store the original balance before abort
    var attackTargetBalance = web3.fromWei(web3.eth.getBalance(accounts[0]).toNumber(), "ether");
    var mitigatorBalance = web3.fromWei(web3.eth.getBalance(accounts[1]).toNumber(), "ether");

    await expectThrow(m.abort.sendTransaction(0));
    await expectThrow(m.abort.sendTransaction(0, {from: accounts[1]}));
    a = await m.aborted.call(0);
    assert(!a, "task should not be aborted during service time window");

    // check balance after abort
    var newAttackTargetBalance = web3.fromWei(web3.eth.getBalance(accounts[0]).toNumber(), "ether");
    var newMitigatorBalance = web3.fromWei(web3.eth.getBalance(accounts[1]).toNumber(), "ether");
    var targetDiff = attackTargetBalance - newAttackTargetBalance;
    var mitigatorDiff = mitigatorBalance - newMitigatorBalance;
    assert(targetDiff < web3.toWei(0.003, "ether"), "only the gas costs should be paid, no reward payout should be made");
    assert(mitigatorDiff < web3.toWei(0.003, "ether"), "only the gas costs should be paid, no reward payout should be made");

    // fast forward mine 100 additional blocks
    // VALIDATION TIME WINDOW
    utils.mine(100);
    currentNum = web3.eth.blockNumber;
    assert(currentNum > serviceDeadline, "service time window should have expired");
    assert(currentNum < validationDeadline, "validation time window should not have expired yet");

    // store the original balance before abort
    attackTargetBalance = web3.fromWei(web3.eth.getBalance(accounts[0]).toNumber(), "ether");
    mitigatorBalance = web3.fromWei(web3.eth.getBalance(accounts[1]).toNumber(), "ether");

    // use validate to resolve the protocol during validation time window
    await expectThrow(m.abort.sendTransaction(0));
    await expectThrow(m.abort.sendTransaction(0, {from: accounts[1]}));
    a = await m.aborted.call(0);
    assert(!a, "task should not be aborted during validation time window");

    // check balance after abort
    newAttackTargetBalance = web3.fromWei(web3.eth.getBalance(accounts[0]).toNumber(), "ether");
    newMitigatorBalance = web3.fromWei(web3.eth.getBalance(accounts[1]).toNumber(), "ether");
    targetDiff = attackTargetBalance - newAttackTargetBalance;
    mitigatorDiff = mitigatorBalance - newMitigatorBalance;
    assert(targetDiff < web3.toWei(0.003, "ether"), "only the gas costs should be paid, no reward payout should be made");
    assert(mitigatorDiff < web3.toWei(0.003, "ether"), "only the gas costs should be paid, no reward payout should be made");

    assert(currentNum < validationDeadline, "validation time window should not have expired yet");

    // fast forward mine 100 additional blocks
    // VALIDATION DEADLINE EXPIRED
    utils.mine(100);
    currentNum = web3.eth.blockNumber;
    assert(currentNum > validationDeadline, "validation time window should have expired");

    // store the original balance before abort
    attackTargetBalance = web3.fromWei(web3.eth.getBalance(accounts[0]).toNumber(), "ether");
    mitigatorBalance = web3.fromWei(web3.eth.getBalance(accounts[1]).toNumber(), "ether");

    // no proof uploaded, attack target should be refunded
    await expectThrow(m.abort.sendTransaction(0, {from: accounts[1]}));
    await m.abort.sendTransaction(0);

    a = await m.aborted.call(0);
    assert(a, "task should be aborted");

    // check balance after abort
    newAttackTargetBalance = web3.fromWei(web3.eth.getBalance(accounts[0]).toNumber(), "ether");
    newMitigatorBalance = web3.fromWei(web3.eth.getBalance(accounts[1]).toNumber(), "ether");
    targetDiff = newAttackTargetBalance - attackTargetBalance;
    mitigatorDiff = mitigatorBalance - newMitigatorBalance;
    assert(targetDiff < 1 && targetDiff > 0.99, "the attack target should be refunded");
    assert(mitigatorDiff < web3.toWei(0.003, "ether"), "only the gas costs should be paid, no reward payout should be made");
  });

  it("should abort after validation time window expired and refund mitigator when proof uploaded", async function() {
    var id = await Identity.new();
    await id.newCustomer.sendTransaction();
    await id.newCustomer.sendTransaction({from: accounts[1]});

    var startNum = web3.eth.blockNumber;
    var serviceDeadline = startNum + 100;
    var validationDeadline = startNum + 200;

    var m = await Mitigation.new();
    var tx = await m.newTask.sendTransaction(id.address, accounts[0], accounts[1], serviceDeadline, validationDeadline, web3.toWei(1, "ether"));

    await m.approve.sendTransaction(0, {from: accounts[1]});
    var a = await m.approved.call(0);
    assert(a, "the mitigator should approve mitigation contracts");

    await m.start.sendTransaction(0, {from: accounts[0], value: web3.toWei(1, "ether")});
    var s = await m.started.call(0);
    assert(s, "the mitigation task should have started");

    var currentNum = web3.eth.blockNumber;
    // SERVICE TIME WINDOW
    assert(currentNum < serviceDeadline, "current block number should be less than serviceDeadline");

    // upload proof
    await m.uploadProof.sendTransaction(0, "dummy-proof", {from: accounts[1]});
    var p = await m.getProof.call(0);
    assert.equal(p, "dummy-proof", "mitigator should be allowed to submit proofs during service time window");
    p = await m.proofUploaded.call(0);
    assert(p, "proof should be uploaded");

    // store the original balance before abort
    var attackTargetBalance = web3.fromWei(web3.eth.getBalance(accounts[0]).toNumber(), "ether");
    var mitigatorBalance = web3.fromWei(web3.eth.getBalance(accounts[1]).toNumber(), "ether");

    await expectThrow(m.abort.sendTransaction(0));
    await expectThrow(m.abort.sendTransaction(0, {from: accounts[1]}));
    a = await m.aborted.call(0);
    assert(!a, "task should not be aborted during service time window");

    // check balance after abort
    var newAttackTargetBalance = web3.fromWei(web3.eth.getBalance(accounts[0]).toNumber(), "ether");
    var newMitigatorBalance = web3.fromWei(web3.eth.getBalance(accounts[1]).toNumber(), "ether");
    var targetDiff = attackTargetBalance - newAttackTargetBalance;
    var mitigatorDiff = mitigatorBalance - newMitigatorBalance;
    assert(targetDiff < web3.toWei(0.003, "ether"), "only the gas costs should be paid, no reward payout should be made");
    assert(mitigatorDiff < web3.toWei(0.003, "ether"), "only the gas costs should be paid, no reward payout should be made");

    // fast forward mine 100 additional blocks
    // VALIDATION TIME WINDOW
    utils.mine(100);
    currentNum = web3.eth.blockNumber;
    assert(currentNum > serviceDeadline, "service time window should have expired");
    assert(currentNum < validationDeadline, "validation time window should not have expired yet");

    // store the original balance before abort
    attackTargetBalance = web3.fromWei(web3.eth.getBalance(accounts[0]).toNumber(), "ether");
    mitigatorBalance = web3.fromWei(web3.eth.getBalance(accounts[1]).toNumber(), "ether");

    // use validate to resolve the protocol during validation time window
    await expectThrow(m.abort.sendTransaction(0));
    await expectThrow(m.abort.sendTransaction(0, {from: accounts[1]}));
    a = await m.aborted.call(0);
    assert(!a, "task should not be aborted during validation time window");

    // check balance after abort
    newAttackTargetBalance = web3.fromWei(web3.eth.getBalance(accounts[0]).toNumber(), "ether");
    newMitigatorBalance = web3.fromWei(web3.eth.getBalance(accounts[1]).toNumber(), "ether");
    targetDiff = attackTargetBalance - newAttackTargetBalance;
    mitigatorDiff = mitigatorBalance - newMitigatorBalance;
    assert(targetDiff < web3.toWei(0.003, "ether"), "only the gas costs should be paid, no reward payout should be made");
    assert(mitigatorDiff < web3.toWei(0.003, "ether"), "only the gas costs should be paid, no reward payout should be made");

    assert(currentNum < validationDeadline, "validation time window should not have expired yet");

    // fast forward mine 100 additional blocks
    // VALIDATION DEADLINE EXPIRED
    utils.mine(100);
    currentNum = web3.eth.blockNumber;
    assert(currentNum > validationDeadline, "validation time window should have expired");

    // store the original balance before abort
    attackTargetBalance = web3.fromWei(web3.eth.getBalance(accounts[0]).toNumber(), "ether");
    mitigatorBalance = web3.fromWei(web3.eth.getBalance(accounts[1]).toNumber(), "ether");

    // proof was uploaded,
    // mitigator should be rewarded because target did not validate in time
    await expectThrow(m.abort.sendTransaction(0));
    await m.abort.sendTransaction(0, {from: accounts[1]});

    a = await m.aborted.call(0);
    assert(a, "task should be aborted");

    // check balance after abort
    newAttackTargetBalance = web3.fromWei(web3.eth.getBalance(accounts[0]).toNumber(), "ether");
    newMitigatorBalance = web3.fromWei(web3.eth.getBalance(accounts[1]).toNumber(), "ether");
    targetDiff = attackTargetBalance - newAttackTargetBalance;
    mitigatorDiff = newMitigatorBalance - mitigatorBalance;
    assert(mitigatorDiff < 1 && mitigatorDiff > 0.99, "the mitigatorDiff should be rewarded");
    assert(targetDiff < web3.toWei(0.003, "ether"), "only the gas costs should be paid, no refund");
  });

  it("when not started, should abort without payout when target aborts", async function() {
    var id = await Identity.new();
    await id.newCustomer.sendTransaction();
    await id.newCustomer.sendTransaction({from: accounts[1]});

    var startNum = web3.eth.blockNumber;
    var serviceDeadline = startNum + 100;
    var validationDeadline = startNum + 200;

    var m = await Mitigation.new();
    var tx = await m.newTask.sendTransaction(id.address, accounts[0], accounts[1], serviceDeadline, validationDeadline, web3.toWei(1, "ether"));

    await m.approve.sendTransaction(0, {from: accounts[1]});
    var a = await m.approved.call(0);
    assert(a, "the mitigator should approve mitigation contracts");

    // fast forward mine 200 additional blocks
    // VALIDATION DEADLINE EXPIRED
    utils.mine(200);
    var currentNum = web3.eth.blockNumber;
    assert(currentNum > validationDeadline, "validation time window should have expired");

    // store the original balance before abort
    var attackTargetBalance = web3.fromWei(web3.eth.getBalance(accounts[0]).toNumber(), "ether");

    await m.abort.sendTransaction(0);

    var a = await m.aborted.call(0);
    assert(a, "task should be aborted");

    // check balance after abort
    var newAttackTargetBalance = web3.fromWei(web3.eth.getBalance(accounts[0]).toNumber(), "ether");
    var diff = attackTargetBalance - newAttackTargetBalance;
    assert(diff < web3.toWei(0.003, "ether"), "only the gas costs should be paid, no payment");
  });

  it("when not started, should abort without payout when mitigator aborts", async function() {
    var id = await Identity.new();
    await id.newCustomer.sendTransaction();
    await id.newCustomer.sendTransaction({from: accounts[1]});

    var startNum = web3.eth.blockNumber;
    var serviceDeadline = startNum + 100;
    var validationDeadline = startNum + 200;

    var m = await Mitigation.new();
    var tx = await m.newTask.sendTransaction(id.address, accounts[0], accounts[1], serviceDeadline, validationDeadline, web3.toWei(1, "ether"));

    // fast forward mine 200 additional blocks
    // VALIDATION DEADLINE EXPIRED
    utils.mine(200);
    var currentNum = web3.eth.blockNumber;
    assert(currentNum > validationDeadline, "validation time window should have expired");

    // store the original balance before abort
    var mitigatorBalance = web3.fromWei(web3.eth.getBalance(accounts[1]).toNumber(), "ether");

    // abort as mitigator
    await m.abort.sendTransaction(0, {from: accounts[1]});

    var a = await m.aborted.call(0);
    assert(a, "task should be aborted");

    // check balance after abort
    var newMitigatorBalance = web3.fromWei(web3.eth.getBalance(accounts[1]).toNumber(), "ether");
    var diff = mitigatorBalance - newMitigatorBalance;
    assert(diff < web3.toWei(0.003, "ether"), "only the gas costs should be paid, no payment");
  });
});