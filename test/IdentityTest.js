import expectThrow from '../node_modules/zeppelin-solidity/test/helpers/expectThrow';
const Identity = artifacts.require("Identity");

contract('Identity', function(accounts) {
  it("should create a new customer", async function() {
    var id = await Identity.new();
    await id.newCustomer.sendTransaction();
    // repeated customer creation, should throw
    await expectThrow(id.newCustomer.sendTransaction());
    var r = await id.isCustomer.call(accounts[0]);
    assert(r, "customer should be created");
    var i = await id.getCustomerId.call(accounts[0]);
    assert.equal(i, 1, "should assign customer id 1");
    var customer = await id.customers(1);
    var address = customer[0];
    assert.equal(address, accounts[0], "customer should be on first account");
  });
});