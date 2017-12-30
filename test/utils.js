/**
 *  Sends a request to the RPC provider to mine a single block
 *  synchronously
 */
var mineOneBlock = async function() {
  await web3.currentProvider.send({
    jsonrpc: '2.0',
    method: 'evm_mine',
    id: new Date().getTime()
  });
};

/**
 *  Mine n blocks
 */
var mine = async function(n) {
  for (var i = 0; i < n; i++)
    await mineOneBlock();
};

export { mine };