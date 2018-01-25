const CONTRACT_BUILD_PATH = './build/';

var fs = require('fs');
var solc = require('solc');

module.exports = {

    compile: function() {
        var identityContractFile = fs.readFileSync('./Identity.sol').toString();
        var mitigationContractFile = fs.readFileSync('./Mitigation.sol').toString();
        var reputationContractFile = fs.readFileSync('./Reputation.sol').toString();

        var input = {
            'Identity.sol': identityContractFile,
            'Mitigation.sol': mitigationContractFile,
            'Reputation.sol': reputationContractFile
        }

        // 1 paramater activates the optimiser
        var output = solc.compile({ sources: input }, 1);
        var compiledIdentityContract = output.contracts['Identity.sol:Identity'];
        var compiledMitigationContract = output.contracts['Mitigation.sol:Mitigation'];
        var compiledReputationContract = output.contracts['Reputation.sol:Reputation'];

        if (!fs.existsSync(CONTRACT_BUILD_PATH))
            fs.mkdirSync(CONTRACT_BUILD_PATH);

        fs.writeFileSync(CONTRACT_BUILD_PATH + 'Identity.json', JSON.stringify(compiledIdentityContract));
        fs.writeFileSync(CONTRACT_BUILD_PATH + 'Mitigation.json', JSON.stringify(compiledMitigationContract));
        fs.writeFileSync(CONTRACT_BUILD_PATH + 'Reputation.json', JSON.stringify(compiledReputationContract));
    }

}