var mineOneBlock = function() {
  web3.currentProvider.send({
    jsonrpc: '2.0',
    method: 'evm_mine',
    id: new Date().getTime()
  });
};

var mine = function(n) {
  for (var i = 0; i < n; i++)
    mineOneBlock();
};

export { mine };