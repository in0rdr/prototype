pragma solidity ^0.4.18;

import './Task.sol';
import './Customer.sol';

contract Reputation {

    mapping(address => string[2]) reputons; // interaction => reputon IPFS hash
    mapping(address => address[2]) reputonOwners; // interaction => reputon owners (customer contract address)

    function Reputation() public {
    }

    function rate(address _interactionAddr, address _custAddr, string reputon) external {
        Task interaction = Task(_interactionAddr);
        Customer customer = Customer(_custAddr);
        
        // the sender must be the owner of the customer contract
        require(msg.sender == customer.owner());
        // the sender must be one of the contract parties
        require(msg.sender == interaction.attackTarget() || msg.sender == interaction.mitigator());
        // there should be not feedback yet
        require(msg.sender != Customer(reputonOwners[_interactionAddr][0]).owner()
            && msg.sender != Customer(reputonOwners[_interactionAddr][1]).owner());

        // register reputon, if the attack target gives feedback during validation time window
        // or when mitigator gives feedback after validation time window
        if ((block.number < interaction.validationDeadline() && _custAddr == interaction.attackTarget())
         || (block.number > interaction.validationDeadline() && _custAddr == interaction.mitigator())) {
            // register the reputon
            reputons[_interactionAddr][reputons[_interactionAddr].length] = reputon;
            // register the customer address of the reputon owner
            reputonOwners[_interactionAddr][reputons[_interactionAddr].length] = _custAddr;
        }
    }

}