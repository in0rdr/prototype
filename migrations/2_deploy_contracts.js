//var Task = artifacts.require("Task");
var Customer = artifacts.require("Customer");

module.exports = function(deployer, network, accounts) {
    deployer.deploy(Customer);
};
