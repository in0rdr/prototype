#!/bin/sh

CONTRACT_DIR="simulator/contracts/"

rm -rf CONTRACT_DIR
mkdir -p $CONTRACT_DIR
cp -r ../contracts/* $CONTRACT_DIR