pragma solidity ^0.4.18;

import './Task.sol';
import './Customer.sol';

contract Reputation {

    // reputon hash => reputon owner (customer contract address)
    mapping(string => address) reputons;
    // necessary to detect duplicate claims
    // and to register the owner of the claim

    // interaction => reputon IPFS hash
    mapping(address => string[2]) interactions;
    // reputons[i][0] is claim of attack target about mitigator
    // reputons[i][1] is claim of mitigator about attack target

    function Reputation() public {
    }

    function attackTargetRated(address _interactionAddr) constant public returns (bool) {
        return (reputons[interactions[_interactionAddr][0]] != 0);
        //return keccak256(interactions[_interactionAddr][0]) != keccak256("");
    }

    function mitigatorRated(address _interactionAddr) constant public returns (bool) {
        return (reputons[interactions[_interactionAddr][1]] != 0);
        //return keccak256(interactions[_interactionAddr][1]) != keccak256("");
    }

    // todo: getReputonForInteraction(address _interactionAddr)

    // todo: split in rateMitigator and rateAttackTarget
    function rate(address _interactionAddr, address _claimOnwer, string reputon) external {
        Task interaction = Task(_interactionAddr);
        Customer interactionAttackTarget = Customer(interaction.attackTarget());
        Customer interactionMitigator = Customer(interaction.mitigator());
        Customer claimOwnerContract = Customer(_claimOnwer);
        
        // no duplicate reputons
        require(reputons[reputon] == 0);
        // the sender must be the owner of the claim owner contract
        require(msg.sender == claimOwnerContract.owner());
        // the sender must be one of the contract parties
        require(msg.sender == interactionAttackTarget.owner() || msg.sender == interactionMitigator.owner());
        // there should be no feedback yet
        if (msg.sender == interactionAttackTarget.owner()) {
            require(!attackTargetRated(_interactionAddr));
        } else if (msg.sender == interactionMitigator.owner()) {
            require(!mitigatorRated(_interactionAddr));
        }

        // register reputon, if the attack target gives feedback during validation time window
        // or when mitigator gives feedback after validation time window
        if (_claimOnwer == interaction.attackTarget()) {
            require(block.number <= interaction.validationDeadline());
            reputons[reputon] = _claimOnwer;
            interactions[_interactionAddr][0] = reputon;
        } else if (_claimOnwer == interaction.mitigator()) {
            require(block.number > interaction.validationDeadline());
            reputons[reputon] = _claimOnwer;
            interactions[_interactionAddr][1] = reputon;
        }
    }

}