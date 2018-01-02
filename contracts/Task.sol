pragma solidity ^0.4.18;

import './Customer.sol';
import './Reputation.sol';

contract Task {

    address public attackTarget;    // customer contract address
    address public mitigator;       // customer contract address
    uint public serviceDeadline;    // absolute block number in the future
    uint public validationDeadline; // absolute block number > serviceDeadline
    uint public price;

    string public proof;            // proof of service delivery
    bool public proofUploaded;      // true after mitigator uploads first proof
    bool public approved;           // true if mitigator accepts contract conditions
    bool public started;            // true if price paid and task started
    uint public acknowledged;       // acknowledgment of proof: 0 = unkown, 1 = ack, 2 = rej

    event TaskCreated(address _taskAddr);
    event TaskStarted(address _taskAddr);

    function Task() public {
    }

    function init(address _attackTarget, address _mitigator, uint _serviceDeadline, uint _validationDeadline, uint _price) external {
        require(_validationDeadline > _serviceDeadline);

        attackTarget = _attackTarget;
        mitigator = _mitigator;
        serviceDeadline = _serviceDeadline;
        validationDeadline = _validationDeadline;
        price = _price;

        TaskCreated(this);
    }

    function approve() external {
        require(!started && block.number <= serviceDeadline && msg.sender == Customer(mitigator).owner() && !approved);
        approved = true;
    }

    function start() payable external {
        require(!started && approved && block.number <= serviceDeadline && msg.value == price && msg.sender == Customer(attackTarget).owner());
        started = true;
        TaskStarted(this);
    }

    function uploadProof(string _proof) external {
        require(!proofUploaded && started && block.number <= serviceDeadline && msg.sender == Customer(mitigator).owner());
        proof = _proof;
        proofUploaded = true;
    }

    function validateProof(uint _resp, address _repAddr) external {
        require(started && block.number <= validationDeadline && msg.sender == Customer(attackTarget).owner());
        // no feedback yet
        require(acknowledged == 0);
        // acknowledge (1) or reject (2)
        require(_resp == 1 || _resp == 2 );
        // incentive to rate, only validate the proof
        // after the attack target gave a rating for the mitigation service
        require(Reputation(_repAddr).attackTargetRated(this));

        acknowledged = _resp;

        if (_resp == 1) {
            // reward payout
            Customer(mitigator).owner().transfer(price);
        } else if (_resp == 2) {
            // refund attack target
            Customer(attackTarget).owner().transfer(price);
        }
    }

    function abort() external {
        require(started && msg.sender == Customer(attackTarget).owner() || msg.sender == Customer(mitigator).owner());

        if (block.number > serviceDeadline && keccak256(proof) == "" && msg.sender == Customer(attackTarget).owner()) {
            // no proof during service time window
            msg.sender.transfer(price);
        } else if (block.number > validationDeadline && acknowledged == 0 && keccak256(proof) != "" && msg.sender == Customer(mitigator).owner()) {
            // no validation and response during validation time window
            msg.sender.transfer(price);
        }
    }

}