#!/bin/sh

#--nodiscover

if [ "$1" -eq 1 ]
then
 geth --fast --maxpeers 1 \
 --networkid 4 --verbosity 6 \
 --rpccorsdomain "*" --rpc --rpcport 8545 --rpcaddr "0.0.0.0" --rpcapi="eth,net,web3,admin,personal" \
 --mine --minerthreads=1 --etherbase=0 \
 --bootnodes "$2"
else
 geth --fast --maxpeers 1 \
 --networkid 4 --verbosity 6 \
 --rpccorsdomain "*" --rpc --rpcport 8545 --rpcaddr "0.0.0.0" --rpcapi="eth,net,web3,admin,personal" \
 --bootnodes "$2"
fi
