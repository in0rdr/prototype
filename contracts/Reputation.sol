pragma solidity ^0.4.18;

import './Mitigation.sol';
import './Identity.sol';

contract Reputation {

    // reputon hash => reputon owner
    // detect duplicate claims
    // and register claim owners
    mapping(string => address) reputons;

    // interaction => reputon IPFS hash
    // reputons[i][0] is claim of attack target about mitigator
    // reputons[i][1] is claim of mitigator about attack target
    mapping(uint => string[2]) interactions;

    function Reputation() public {
    }

    function attackTargetRated(uint _id) constant public returns (bool) {
        return (reputons[interactions[_id][0]] != 0);
    }

    function mitigatorRated(uint _id) constant public returns (bool) {
        return (reputons[interactions[_id][1]] != 0);
    }

    function getReputon(uint _id, uint _peer) constant public returns (string) {
        require(_peer <= 1);
        return interactions[_id][_peer];
    }

    // todo: split in rateMitigator and rateAttackTarget
    function rate(address _mitigation, uint _interactionId, string _reputon) external {
        address targetAddr = Mitigation(_mitigation).getTarget(_interactionId);
        address mitigatorAddr = Mitigation(_mitigation).getMitigator(_interactionId);

        // no duplicate reputons
        require(reputons[_reputon] == 0);
        // the sender must be one of the contract parties
        require(msg.sender == targetAddr || msg.sender == mitigatorAddr);

        // register reputon, if the attack target gives feedback during validation time window
        // or when mitigator gives feedback after validation time window
        if (msg.sender == targetAddr) {
            require(!attackTargetRated(_interactionId));
            require(block.number <= Mitigation(_mitigation).getValidationDeadline(_interactionId));
            reputons[_reputon] = msg.sender;
            interactions[_interactionId][0] = _reputon;
        } else if (msg.sender == mitigatorAddr) {
            require(!mitigatorRated(_interactionId));
            require(block.number > Mitigation(_mitigation).getValidationDeadline(_interactionId));
            reputons[_reputon] = msg.sender;
            interactions[_interactionId][1] = _reputon;
        }
    }

}