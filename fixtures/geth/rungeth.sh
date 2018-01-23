#!/bin/sh

#--nodiscover

if [ -z "$1" ]
then
 geth --fast --maxpeers 1 \
 --networkid 4 --verbosity 6 \
 --rpccorsdomain "*" --rpc --rpcport 8545 --rpcaddr "0.0.0.0" --rpcapi="eth,net,web3,admin,personal"
else
 geth --fast --maxpeers 1 \
 --networkid 4 --verbosity 6 \
 --rpccorsdomain "*" --rpc --rpcport 8545 --rpcaddr "0.0.0.0" --rpcapi="eth,net,web3,admin,personal" \
 --bootnodes "$1"
fi
