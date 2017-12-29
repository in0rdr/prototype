pragma solidity ^0.4.18;

import './Task.sol';
import '../node_modules/zeppelin-solidity/contracts/ownership/Ownable.sol';

contract Customer is Ownable {

    //address[] public tasks;

    event CustomerCreated(address _customerAddr);

    function Customer() public {
        CustomerCreated(this);
    }

    /*function ownsTask(address _taskAddr) constant external returns (bool)  {
        Task task = Task(_taskAddr);
        return ( task.customerContract() == address(this) );
    }*/


}