pragma solidity ^0.4.18;

import './Mitigation.sol';
import './Identity.sol';

contract Reputation {

    // reputon hash => reputon owner
    // detect duplicate claims
    // and register claim owners
    mapping(string => address) reputons;
    uint256 public reputonCount;

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

    function rate(address _mitigation, uint _id, string _reputon) external {
        address targetAddr = Mitigation(_mitigation).getTarget(_id);
        address mitigatorAddr = Mitigation(_mitigation).getMitigator(_id);

        // no duplicate reputons
        require(reputons[_reputon] == 0);
        // a rating needs to reference a completed task,
        // an aborted task (or without proof) is no valid reference
        require(Mitigation(_mitigation).proofUploaded(_id));
        // the sender must be one of the contract parties
        require(msg.sender == targetAddr || msg.sender == mitigatorAddr);

        // register reputon, if the attack target gives feedback during validation time window
        // or when mitigator gives feedback after validation time window
        if (msg.sender == targetAddr) {
            require(!attackTargetRated(_id));
            require(block.number <= Mitigation(_mitigation).getStartTime(_id) + Mitigation(_mitigation).getValidationDeadline(_id));
            reputons[_reputon] = msg.sender;
            interactions[_id][0] = _reputon;
            reputonCount++;
        } else if (msg.sender == mitigatorAddr) {
            require(!mitigatorRated(_id));
            require(block.number > Mitigation(_mitigation).getStartTime(_id) + Mitigation(_mitigation).getValidationDeadline(_id));
            reputons[_reputon] = msg.sender;
            interactions[_id][1] = _reputon;
            reputonCount++;
        }
    }

}