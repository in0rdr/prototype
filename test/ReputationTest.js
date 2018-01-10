import expectThrow from '../node_modules/zeppelin-solidity/test/helpers/expectThrow';
import * as utils from './utils';

const Identity = artifacts.require("Identity");
const Mitigation = artifacts.require("Mitigation");
const Reputation = artifacts.require("Reputation");

contract('Reputation', function(accounts) {
  it("attack target should rate the mitigator during validation time window", async function() {
    var id = await Identity.new();
    await id.newCustomer.sendTransaction();
    await id.newCustomer.sendTransaction({from: accounts[1]});

    var m = await Mitigation.new();
    var tx = await m.newTask.sendTransaction(id.address, accounts[0], accounts[1], 100, 200, web3.toWei(1, "ether"), "ipfs-attackers-file-hash");

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

    // fast forward mine 220 additional blocks
    utils.mine(220);
    currentNum = web3.eth.blockNumber;
    assert(currentNum > validationDeadline, "validation time window should have expired");

    // attack target rates the mitigation service
    // after validation deadline expired, should throw
    var rep = await Reputation.new();
    await expectThrow(rep.rate.sendTransaction(m.address, 0, "dummy-reputon", {from: accounts[0]}));
    var r = await rep.attackTargetRated.call(0);
    assert(!r, "attack target should not have rated");

    // store the original balance before the payout attempt
    var mitigatorBalance = web3.fromWei(web3.eth.getBalance(accounts[1]).toNumber(), "ether");
    var attackTargetBalance = web3.fromWei(web3.eth.getBalance(accounts[0]).toNumber(), "ether");

    // validating a proof should no longer be possible,
    // because the validation time window expired
    await expectThrow(m.validateProof.sendTransaction(0, false, rep.address, {from: accounts[0]}));
    var v = await m.validated.call(0);
    assert(!v, "attack target should no longer be able to validate");
    a = await m.acknowledged.call(0);
    assert(!a, "attack target should no longer be able to acknowledge or reject the service");
    var r = await m.rejected.call(0);
    assert(!r, "attack target should no longer be able to acknowledge or reject the service");
    p = await m.proofUploaded.call(0);
    assert(p, "proof should be uploaded");
    assert(web3.eth.getBalance(m.address).equals(web3.toWei(1, "ether")), "the price should still be locked"); 

    // check balance and state after payout attempt
    var newMitigatorBalance = web3.fromWei(web3.eth.getBalance(accounts[1]).toNumber(), "ether");
    var newAttackTargetBalance = web3.fromWei(web3.eth.getBalance(accounts[0]).toNumber(), "ether");
    assert.equal(mitigatorBalance, newMitigatorBalance, "the price should not be paid out to the mitigator");

    var diff = attackTargetBalance - newAttackTargetBalance;
    assert(diff < web3.toWei(0.003, "ether"), "only the gas costs should be paid, no reward payout should be made");
  });

  it("mitigator should be able to rate the target after validation deadline", async function() {
    var id = await Identity.new();
    await id.newCustomer.sendTransaction();
    await id.newCustomer.sendTransaction({from: accounts[1]});

    var m = await Mitigation.new();
    var tx = await m.newTask.sendTransaction(id.address, accounts[0], accounts[1], 100, 200, web3.toWei(1, "ether"), "ipfs-attackers-file-hash");

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

    // fast forward mine 220 additional blocks
    utils.mine(220);
    currentNum = web3.eth.blockNumber;
    assert(currentNum > validationDeadline, "validation time window should have expired");

    var rep = await Reputation.new();
    await rep.rate.sendTransaction(m.address, 0, "dummy-reputon", {from: accounts[1]});
    var r = await rep.mitigatorRated.call(0);
    assert(r, "mitigator should have rated");
    r = await rep.attackTargetRated.call(0);
    assert(!r, "attack target should not have rated");
  });

  it("repeated rating should not be possible", async function() {
    var id = await Identity.new();
    await id.newCustomer.sendTransaction();
    await id.newCustomer.sendTransaction({from: accounts[1]});

    var m = await Mitigation.new();
    var tx = await m.newTask.sendTransaction(id.address, accounts[0], accounts[1], 100, 200, web3.toWei(1, "ether"), "ipfs-attackers-file-hash");

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

    // fast forward mine 120 additional blocks
    utils.mine(120);
    currentNum = web3.eth.blockNumber;
    assert(currentNum > serviceDeadline, "service time window should have expired");
    assert(currentNum < validationDeadline, "validation time window should not have expired yet");

    var rep = await Reputation.new();
    await rep.rate.sendTransaction(m.address, 0, "dummy-reputon", {from: accounts[0]});
    var r = await rep.attackTargetRated.call(0);
    assert(r, "attack target should not have rated");

    r = await rep.getReputon.call(0, 0);
    assert.equal(r, "dummy-reputon", "reputon should be uploaded");

    // repeated rating, should throw
    await expectThrow(rep.rate.sendTransaction(m.address, 0, "dummy-reputon-2", {from: accounts[0]}));
    r = await rep.getReputon.call(0, 0);
    assert.equal(r, "dummy-reputon", "reputon should be uploaded");

    // fast forward mine 120 additional blocks
    utils.mine(120);
    currentNum = web3.eth.blockNumber;
    assert(currentNum > validationDeadline, "validation time window should have expired");

    r = await rep.mitigatorRated.call(0);
    assert(!r, "mitigator should not have rated yet");
    await rep.rate.sendTransaction(m.address, 0, "dummy-reputon-from-mitigator", {from: accounts[1]});
    r = await rep.mitigatorRated.call(0);
    assert(r, "mitigator should have rated");
    r = await rep.attackTargetRated.call(0);
    assert(r, "attack target should have rated");

    // repeated rating, should throw
    await expectThrow(rep.rate.sendTransaction(m.address, 0, "dummy-reputon-from-mitigator-2", {from: accounts[1]}));
    r = await rep.getReputon.call(0, 1);
    assert.equal(r, "dummy-reputon-from-mitigator", "reputon should be uploaded");
  });
});