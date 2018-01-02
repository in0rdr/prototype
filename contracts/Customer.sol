pragma solidity ^0.4.18;

import '../node_modules/zeppelin-solidity/contracts/ownership/Ownable.sol';

contract Customer is Ownable {

	// todo: 1 customer contract, customerArray

    event CustomerCreated(address _customerAddr);

    function Customer() public {
        CustomerCreated(this);
    }

}