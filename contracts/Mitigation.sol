pragma solidity ^0.4.18;

import './Identity.sol';
import './Reputation.sol';

contract Mitigation {

    struct Task {
        address attackTarget;
        address mitigator;
        uint serviceDeadline;
        uint validationDeadline;
        uint ratingDeadline;
        uint startTime;
        uint price;
        State state;
        string proof;
        string scope;
    }

    enum State { completed, init, approved, started, proofUploaded, acknowledged, rejected }

    Task[] public tasks;

    event TaskCreated(uint _taskId, address _target, address _mitigator);
    event TaskStarted(uint _taskId);
    event TaskCompleted(uint _taskId);

    function Mitigation() public {
    }

    function getMitigator(uint _id) constant public returns(address) {
        return tasks[_id].mitigator;
    }

    function getTarget(uint _id) constant public returns(address) {
        return tasks[_id].attackTarget;
    }

    function getServiceDeadline(uint _id) constant public returns(uint) {
        return tasks[_id].serviceDeadline;
    }

    function getValidationDeadline(uint _id) constant public returns(uint) {
        return tasks[_id].validationDeadline;
    }

    function getRatingDeadline(uint _id) constant public returns(uint) {
        return tasks[_id].ratingDeadline;
    }

    function getStartTime(uint _id) constant public returns(uint) {
        return tasks[_id].startTime;
    }

    function getPrice(uint _id) constant public returns(uint) {
        return tasks[_id].price;
    }

    function getProof(uint _id) constant public returns(string) {
        return tasks[_id].proof;
    }

    function getScope(uint _id) constant public returns(string) {
        return tasks[_id].scope;
    }

    function getState(uint _id) constant public returns(uint) {
        return uint(tasks[_id].state);
    }

    function taskExists(uint _id) constant public returns(bool) {
        return (_id < tasks.length);
    }

    function taskCount() constant public returns(uint) {
        return tasks.length;
    }

    function completed(uint _id) constant public returns(bool) {
        if (!taskExists(_id)) return false;
        return (uint(tasks[_id].state) == uint(State.completed));
    }

    function initialized(uint _id) constant public returns(bool) {
        if (!taskExists(_id)) return false;
        return (uint(tasks[_id].state) >= uint(State.init));
    }

    function approved(uint _id) constant public returns(bool) {
        if (!taskExists(_id)) return false;
        return (uint(tasks[_id].state) >= uint(State.approved));
    }

    function started(uint _id) constant public returns(bool) {
        if (!taskExists(_id)) return false;
        return (uint(tasks[_id].state) >= uint(State.started));
    }

    function proofUploaded(uint _id) constant public returns(bool) {
        if (!taskExists(_id)) return false;
        return (uint(tasks[_id].state) >= uint(State.proofUploaded));
    }

    function acknowledged(uint _id) constant public returns(bool) {
        if (!taskExists(_id)) return false;
        return (tasks[_id].state == State.acknowledged);
    }

    function rejected(uint _id) constant public returns(bool) {
        if (!taskExists(_id)) return false;
        return (tasks[_id].state == State.rejected);
    }

    function setState(uint _id, uint _state) external {
        tasks[_id].state = State(_state);
    }

    function newTask(address _identity, address _attackTarget, address _mitigator, uint _serviceDeadline, uint _validationDeadline, uint _ratingDeadline, uint _price, string _scope) external {
        require(_ratingDeadline > _validationDeadline);
        require(_validationDeadline > _serviceDeadline);
        require(Identity(_identity).isCustomer(_attackTarget));
        require(Identity(_identity).isCustomer(_mitigator));

        // allowing to create contracts for yourself
        // creates an opportunity to boost reputation
        require(_attackTarget != _mitigator);

        tasks.push(Task(_attackTarget,
            _mitigator,
            _serviceDeadline,
            _validationDeadline,
            _ratingDeadline,
            0,
            _price,
            State.init,
            "",
            _scope));

        TaskCreated(tasks.length - 1, _attackTarget, _mitigator);
    }

    function approve(uint _id) external {
        require(tasks[_id].state == State.init);
        require(msg.sender == getMitigator(_id));
        tasks[_id].state = State.approved;
    }

    function start(uint _id) payable external {
        require(tasks[_id].state == State.approved);
        require(msg.value == tasks[_id].price);
        require(msg.sender == getTarget(_id));

        tasks[_id].startTime = block.number;
        tasks[_id].state = State.started;
        TaskStarted(_id);
    }

    function uploadProof(uint _id, string _proof) external {
        require(tasks[_id].state == State.started);
        require(block.number <= tasks[_id].startTime + getServiceDeadline(_id));
        require(msg.sender == getMitigator(_id));
        // require a non-empty proof
        bytes memory proofAsBytes = bytes(_proof);
        require(proofAsBytes.length != 0);

        tasks[_id].proof = _proof;
        tasks[_id].state = State.proofUploaded;
    }

    function complete(uint _id, address _rep) external {
        require(initialized(_id) && !completed(_id));

        if (started(_id)) {
            require(block.number > (tasks[_id].startTime + getRatingDeadline(_id)));
            var target = getTarget(_id);
            var mitigator = getMitigator(_id);

            if (msg.sender == target) {
                require(!Reputation(_rep).mitigatorRated(_id));
                require(rejected(_id));
                target.transfer(tasks[_id].price);
            } else if (msg.sender == mitigator) {
                if (acknowledged(_id)) {
                    mitigator.transfer(tasks[_id].price);
                } else {
                    require(!Reputation(_rep).attackTargetRated(_id));
                    require(Reputation(_rep).mitigatorRated(_id));
                    // since mitigator can only rate once proof uploaded,
                    // there is no need to recheck the proof here
                    mitigator.transfer(tasks[_id].price);
                }
            }
        }

        // task can be completed once initialized
        tasks[_id].state = State.completed;
        TaskCompleted(_id);
    }

    function escalate(uint _id) external {
        // dispute rating and payments
        // todo, requires:
        //  block.number > validation deadline
        //  AND rated(msg.sender)
    }

}