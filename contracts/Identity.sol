pragma solidity ^0.4.18;

contract Identity {

    struct Customer {
        address addr;
    }

    Customer[] private customers;
    mapping(address => uint) customerIds;
    event CustomerCreated(uint _custId, address _custAddr);

    function Identity() public {
        customers.push(Customer(0));
    }

    function newCustomer() external {
        require(!isCustomer(msg.sender));

        customerIds[msg.sender] = customers.length;
        customers.push(Customer(msg.sender));
        CustomerCreated(customers.length - 1, msg.sender);
    }

    function isCustomer(address addr) public constant returns (bool) {
        return (customerIds[addr] != 0);
    }

    function getCustomerAddr(uint _id) public constant returns (address) {
        return customers[_id].addr;
    }

    function getCustomerId(address addr) public constant returns (uint) {
        return customerIds[addr];
    }

}