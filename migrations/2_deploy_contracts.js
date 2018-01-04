var Reputation = artifacts.require("Reputation");
var Identity = artifacts.require("Identity");
var Mitigation = artifacts.require("Mitigation");

module.exports = function(deployer, network, accounts) {
    deployer.deploy(Identity);
    deployer.deploy(Mitigation);
    deployer.link(Identity, Reputation);
    deployer.link(Mitigation, Reputation);
    deployer.deploy(Reputation);
};
