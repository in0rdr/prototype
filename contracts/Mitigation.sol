pragma solidity ^0.4.18;

import './Identity.sol';
import './Reputation.sol';

contract Mitigation {

    struct Task {
        address attackTarget;
        address mitigator;
        uint serviceDeadline;
        uint validationDeadline;
        uint price;
        State state;
        string proof;
    }

    enum State { aborted, init, approved, started, proofUploaded, acknowledged, rejected }

    Task[] public tasks;
    //mapping(uint => address) creators;
    //mapping(uint => uint) balances;

    event TaskCreated(uint _taskId, address _creator);
    event TaskStarted(uint _taskId);

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

    function getPrice(uint _id) constant public returns(uint) {
        return tasks[_id].price;
    }

    function getProof(uint _id) constant public returns(string) {
        return tasks[_id].proof;
    }

    function taskExists(uint _id) constant public returns(bool) {
        return (_id < tasks.length);
    }

    function aborted(uint _id) constant public returns(bool) {
        if (!taskExists(_id)) return false;
        return (uint(tasks[_id].state) == uint(State.aborted));
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

    function validated(uint _id) constant public returns(bool) {
        if (!taskExists(_id)) return false;
        return (uint(tasks[_id].state) >= uint(State.acknowledged));
    }

    function acknowledged(uint _id) constant public returns(bool) {
        if (!taskExists(_id)) return false;
        return (tasks[_id].state == State.acknowledged);
    }

    function rejected(uint _id) constant public returns(bool) {
        if (!taskExists(_id)) return false;
        return (tasks[_id].state == State.rejected);
    }

    function newTask(address _identity, address _attackTarget, address _mitigator, uint _serviceDeadline, uint _validationDeadline, uint _price) external {
        require(_validationDeadline > _serviceDeadline);
        require(Identity(_identity).isCustomer(_attackTarget));
        require(Identity(_identity).isCustomer(_mitigator));

        //creators[tasks.length] = msg.sender;
        tasks.push(Task(_attackTarget,
            _mitigator,
            _serviceDeadline,
            _validationDeadline,
            _price,
            State.init,
            ""));

        TaskCreated(tasks.length - 1, msg.sender);
    }

    function approve(uint _id) external {
        require(tasks[_id].state == State.init);
        require(block.number <= getServiceDeadline(_id));
        require(msg.sender == getMitigator(_id));
        tasks[_id].state = State.approved;
    }

    function start(uint _id) payable external {
        require(tasks[_id].state == State.approved);
        require(block.number <= getServiceDeadline(_id));
        require(msg.value == tasks[_id].price);
        require(msg.sender == getTarget(_id));

        //balances[_id] = msg.value;
        tasks[_id].state = State.started;
        TaskStarted(_id);
    }

    function uploadProof(uint _id, string _proof) external {
        require(tasks[_id].state == State.started);
        require(block.number <= getServiceDeadline(_id));
        require(msg.sender == getMitigator(_id));
        tasks[_id].proof = _proof;
        tasks[_id].state = State.proofUploaded;
    }

    function validateProof(uint _id, bool _ack, address _repAddr) external {
        require(started(_id)); // proofUploaded no requirement, but possible
        require(block.number <= getValidationDeadline(_id));
        require(msg.sender == getTarget(_id));

        // incentive to rate, only validate the proof
        // after the attack target rated the mitigation service
        require(Reputation(_repAddr).attackTargetRated(_id));

        if (_ack) {
            // reward payout
            tasks[_id].state = State.acknowledged;
            //balances[_id] = 0;
            getMitigator(_id).transfer(tasks[_id].price);
        } else {
            // refund attack target
            tasks[_id].state = State.rejected;
            //balances[_id] = 0;
            getTarget(_id).transfer(tasks[_id].price);
        }
    }

    function abort(uint _id) external {
        require(initialized(_id));
        // payout already made if validated
        // in this case, protocol already resolved
        require(!validated(_id));
        require(msg.sender == getTarget(_id)
            || msg.sender == getMitigator(_id));

        if (started(_id)) {
            // during the validation time window,
            // the attack target should not abort but validate
            require(block.number > getValidationDeadline(_id));

            bytes memory proofAsBytes = bytes(tasks[_id].proof);
            if (msg.sender == getTarget(_id)) {
                // no proof uploaded
                require(proofAsBytes.length == 0);
                //balances[_id] = 0;
                msg.sender.transfer(tasks[_id].price);
            } else if (msg.sender == getMitigator(_id)) {
                // proof was uploaded
                require(proofAsBytes.length != 0);
                //balances[_id] = 0;
                msg.sender.transfer(tasks[_id].price);
            }
        }

        // payout only made once started,
        // but task can be aborted once initialized
        tasks[_id].state = State.aborted;
    }

}