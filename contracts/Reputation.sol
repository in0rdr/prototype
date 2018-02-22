pragma solidity ^0.4.18;

import './Mitigation.sol';
import './Identity.sol';

contract Reputation {

    uint256 public reputonCount;

    // reputon hash => reputon owner
    // detect duplicate claims
    // and register claim owners
    mapping(string => address) reputons;

    // interaction => rating
    //   ratings[i][0] is claim of attack target about mitigator
    //   ratings[i][1] is claim of mitigator about attack target
    //
    //   0: no (neutral) rating
    //   1: positive rating
    //   2: negative rating
    mapping(uint => uint[2]) ratings;

    // there is no automated way to check,
    // that ratings[_taskId] is equivalent to IPFS rating
    // escalation is necessary

    // interaction => reputon IPFS hash
    //   reputons[i][0] is claim of attack target about mitigator
    //   reputons[i][1] is claim of mitigator about attack target
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

    function rateAsTarget(address _mitigation, uint _id, string _reputon, bool _rating) external {
        // no duplicate reputons and ratings
        require(reputons[_reputon] == 0 && ratings[_id][0] == 0);
        // the sender must be the attack target
        require(msg.sender == Mitigation(_mitigation).getTarget(_id));

        // register reputon, if the attack target gives feedback during validation time window
        require(!attackTargetRated(_id));
        require(block.number <= Mitigation(_mitigation).getStartTime(_id) + Mitigation(_mitigation).getValidationDeadline(_id));
        if (_rating) {
            ratings[_id][0] = 1;
        } else {
            ratings[_id][0] = 2;
        }
        reputons[_reputon] = msg.sender;
        interactions[_id][0] = _reputon;
        reputonCount++;

        // set state to trigger the right
        // payout after mitigator rating
        if (_rating) {
            // State.acknowledged: 5
            Mitigation(_mitigation).setState(_id, 5);
        } else {
            // State.rejected: 6
            Mitigation(_mitigation).setState(_id, 6);
        }
    }

    function rateAsMitigator(address _mitigation, uint _id, string _reputon, bool _rating) external {
        // no duplicate reputons and ratings
        require(reputons[_reputon] == 0 && ratings[_id][1] == 0);
        // a rating needs to reference an active task,
        // a completed task (or without proof) is no valid reference
        require(Mitigation(_mitigation).proofUploaded(_id));
        // the sender must be the mitigator
        require(msg.sender == Mitigation(_mitigation).getMitigator(_id));

        // register reputon, when mitigator gives feedback after validation time window
        require(!mitigatorRated(_id));
        // require block number > validation deadline
        require(block.number > Mitigation(_mitigation).getStartTime(_id) + Mitigation(_mitigation).getValidationDeadline(_id));
        // require rating before final rating deadline
        // before the rating deadline,
        // a dissatisfied mitigator can still escalate the case
        require(block.number <= Mitigation(_mitigation).getStartTime(_id) + Mitigation(_mitigation).getRatingDeadline(_id));
        if (_rating) {
            // a positive feedback is the required
            // response to an acknowledged service
            require(ratings[_id][0] == 1);
            ratings[_id][1] = 1;
        } else {
            // a negative feedback is only accepted,
            // when there was negative or no feedback
            // from the target
            require(ratings[_id][0] == 2 || ratings[_id][0] == 0);
            ratings[_id][1] = 2;
        }
        reputons[_reputon] = msg.sender;
        interactions[_id][1] = _reputon;
        reputonCount++;
    }

}