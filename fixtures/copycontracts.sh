#!/bin/sh

CONTRACT_DIRS=("simulator/contracts/")

for i in "${CONTRACT_DIRS[@]}"
do
    dir="${i}"
    rm -rf $dir
    mkdir -p $dir
    cp -r ../contracts/* $dir
    echo "Copied smart contracts into '$dir'"
done
