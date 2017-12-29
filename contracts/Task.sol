pragma solidity ^0.4.18;

import './Customer.sol';

contract Task {

    address public attackTarget; // customer contract address
    address public mitigator; // customer contract address
    uint public serviceDeadline; // absolute block number in the future
    uint public validationDeadline; // absolute block number > serviceDeadline
    uint public price;

    string public proof; // proof of service delivery
    bool public mitigatorApproval; // true if mitigator accepts contract conditions
    uint public acknowledged; // acknowledgment of proof: 0 = unkown, 1 = ack, 2 = rej

    event TaskCreated(address _taskAddr);
    event TaskStarted(address _taskAddr);

    function Task(address _attackTarget, address _mitigator, uint _serviceDeadline, uint _validationDeadline, uint _price) public {
        require(_validationDeadline > _serviceDeadline);

        attackTarget = _attackTarget;
        mitigator = _mitigator;
        serviceDeadline = _serviceDeadline;
        validationDeadline = _validationDeadline;
        price = _price;

        TaskCreated(this);
    }

    /*modifier onlyAfterMitigatorRating() {
        require(keccak256(repMitigator) != "");
        _;
    }*/

    function approve() external {
        require(block.number < serviceDeadline && msg.sender == Customer(mitigator).owner() && !mitigatorApproval);
        mitigatorApproval = true;
    }

    function start() payable external {
        require(mitigatorApproval && block.number < serviceDeadline && msg.value == price && msg.sender == attackTarget);
        TaskStarted(this);
    }

    function uploadProof(string _proof) external {
        require(block.number < serviceDeadline && msg.sender == mitigator);
        proof = _proof;
    }

    function validateProof(uint _resp) external { //TODO: onlyAfterMitigatorRating
        require(block.number < validationDeadline && msg.sender == attackTarget);
        require(acknowledged == 0 && _resp <= 2);
        acknowledged = _resp;

        // reward payout
        if (_resp == 1) {
            mitigator.transfer(price);
        }
    }

    function abort() external {
        require(msg.sender == attackTarget || msg.sender == mitigator);

        if (block.number > serviceDeadline && keccak256(proof) == "" && msg.sender == attackTarget) {
            // no proof during service time window
            msg.sender.transfer(price);
        } else if (block.number > validationDeadline && acknowledged == 0 && keccak256(proof) != "" && msg.sender == mitigator) {
            // no validation and response during validation time window
            msg.sender.transfer(price);
        }
    }

}