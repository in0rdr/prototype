var Reputation = artifacts.require("Reputation");
var Customer = artifacts.require("Customer");
var Task = artifacts.require("Task");

module.exports = function(deployer, network, accounts) {
    deployer.deploy(Customer);
    deployer.deploy(Task);
    deployer.link(Customer, Reputation);
    deployer.link(Task, Reputation);
    deployer.deploy(Reputation);
};
