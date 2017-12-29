var Customer = artifacts.require("Customer");
var Task = artifacts.require("Task");

contract('Customer', function(accounts) {
  it("should create a customer", function() {
    return Customer.deployed().then(function(instance) {
      instance.owner().then(function(owner) {
        assert.equal(owner, accounts[0], "customer contract should be owned by first account");
      });
    });
  });
});

contract('Task', function(accounts) {
  it("should create a mitigation contract", function() {
    var cust1;
    var cust2;

    return Customer.deployed().then(function(cust) {
      cust1 = cust;

      Customer.new({from: accounts[1]}).then(function(cust) {
        cust2 = cust;
      }).then(function() {
        Task.new(cust1.address, cust2.address, 100, 200, 999).then(function(task) {
          assert(task.attackTarget(), cust1.address, "cust1 should be attack target");
          assert(task.mitigator(), cust2.address, "cust2 should be mitigator");
          assert(task.serviceDeadline(), 100, "service deadline should be 100");
          assert(task.validationDeadline(), 200, "mitigation deadline should be 200");
          assert(task.price(), 999, "price should be 999");
        });
      });
    });
  });
});
