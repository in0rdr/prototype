#!/bin/sh

sed -i -e "s/ADDR0/$1/g" genesis.json
sed -i -e "s/ADDR1/$2/g" genesis.json

geth init genesis.json
