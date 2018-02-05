module Decentral
  class Identity
    CONTRACT_ABI = JSON.parse(File.read(File.join(BUILDPATH, "Identity.json")))['interface']
    @contract = Ethereum::Contract.create(
      name: 'Identity',
      address: IDENTITY_ADDR,
      abi: CONTRACT_ABI,
      client: Decentral::CLIENT,
    )
    def self.get_customer(addr)
      cust_id = @contract.call.get_customer_id("0x" + addr)
      @contract.call.customers(cust_id)
    end
  end
end