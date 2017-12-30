import expectThrow from '../node_modules/zeppelin-solidity/test/helpers/expectThrow';

const Customer = artifacts.require("Customer");
const Task = artifacts.require("Task");

contract('Customer', function(accounts) {
  it("should create a customer", function() {
    return Customer.deployed().then(async function(instance) {
      var owner = await instance.owner.call();
      assert.equal(owner, accounts[0], "customer contract should be owned by first account");
    });
  });
});

contract('Task', function(accounts) {
  it("should create a mitigation contract", function() {
    var cust0;
    var cust1;

    return Customer.deployed().then(function(cust) {
      cust0 = cust;

      Customer.new({from: accounts[1]}).then(function(cust) {
        cust1 = cust;
      }).then(function() {
        cust0.owner.call().then(addr => assert.equal(addr, accounts[0], "cust0 contract should be owned by first account"));
        cust1.owner.call().then(addr => assert.equal(addr, accounts[1], "cust1 contract should be owned by second account"));
        Task.new(cust0.address, cust1.address, 100, 200, 999).then(function(task) {
          task.attackTarget.call().then(t => assert.equal(t, cust0.address, "cust0 should be attack target"));
          task.mitigator.call().then(m => assert.equal(m, cust1.address, "cust1 should be mitigator"));
          task.serviceDeadline.call().then(d => assert.equal(d, 100, "service deadline should be 100"));
          task.validationDeadline.call().then(d => assert.equal(d, 200, "mitigation deadline should be 200"));
          task.price.call().then(p => assert.equal(p, 999, "price should be 999"));
        });
      });
    });
  });

  it("should only start task after mitigator approved contract parameters", function() {
    var cust0;
    var cust1;

    return Customer.deployed().then(function(cust) {
      cust0 = cust;

      Customer.new({from: accounts[1]}).then(function(cust) {
        cust1 = cust;
      }).then(function() {
        Task.new(cust0.address, cust1.address, 100, 200, 999).then(async function(task) {
          var tx = await expectThrow(task.start.sendTransaction({from: accounts[1], value: 999}));
          var started = await task.started.call();
          assert(!started, "task should not be started without mitigator approval");
        });
      });
    });
  });

  it("attack target should not be allowed to sign the contract for the mitigator", function() {
    var cust0;
    var cust1;

    return Customer.deployed().then(function(cust) {
      cust0 = cust;

      Customer.new({from: accounts[1]}).then(function(cust) {
        cust1 = cust;
      }).then(function() {
        Task.new(cust0.address, cust1.address, 100, 200, 999).then(async function(task) {
          var tx = await expectThrow(task.approve.sendTransaction({from: accounts[0]}));
          var approved = await task.approved.call();
          assert(!approved, "the mitigator should approve mitigation contracts");
        });
      });
    });
  });

  it("mitigator should sign and approve the mitigation contract", function() {
    var cust0;
    var cust1;

    return Customer.deployed().then(function(cust) {
      cust0 = cust;

      Customer.new({from: accounts[1]}).then(function(cust) {
        cust1 = cust;
      }).then(function() {
        Task.new(cust0.address, cust1.address, 100, 200, 999).then(async function(task) {
          var tx = await task.approve.sendTransaction({from: accounts[1]});
          var approved = await task.approved.call();
          assert(approved, "the mitigator should approve mitigation contracts");
        });
      });
    });
  });

  it("attack target should start the mitigation contract", function() {
    var cust0;
    var cust1;

    return Customer.deployed().then(function(cust) {
      cust0 = cust;

      Customer.new({from: accounts[1]}).then(function(cust) {
        cust1 = cust;
      }).then(function() {
        Task.new(cust0.address, cust1.address, 100, 200, 999).then(async function(task) {
          var tx = await task.approve.sendTransaction({from: accounts[1]});
          var approved = await task.approved.call();
          assert(approved, "the mitigator should approve mitigation contracts");

          tx = await expectThrow(task.start.sendTransaction({from: accounts[1], value: 999}));
          assert(!started, "the mitigator is not allowed to start the task");

          tx = await expectThrow(task.start.sendTransaction({from: accounts[0], value: 998}));
          assert(!started, "the attack target needs to pay the exact amount");

          tx = await task.start.sendTransaction({from: accounts[0], value: 999});
          var started = await task.started.call();
          assert(started, "the mitigation task should have started");
        });
      });
    });
  });
});