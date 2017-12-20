#!/bin/sh

sed -ie "s/ADDR0/$1/g" genesis.json
sed -ie "s/ADDR1/$2/g" genesis.json

geth init /genesis.json