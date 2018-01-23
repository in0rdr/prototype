#!/bin/sh

sed -i -e "s/ADDR0/$1/g" genesis.json

geth init genesis.json
