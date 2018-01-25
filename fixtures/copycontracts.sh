#!/bin/sh

CONTRACT_DIRS=("../simulator/contracts/build/" "../api/contracts/build/")

for i in "${CONTRACT_DIRS[@]}"
do
    dir="${i}"
    rm -rf $dir
    mkdir -p $dir
    cp -r ../contracts/build/* $dir
    echo "Copied smart contract interfaces into '$dir'"
done
