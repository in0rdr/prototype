#!/bin/sh

APP_DIR="railsapp/"

rm -rf APP_DIR
mkdir -p $APP_DIR
cp -r ../../api/* $APP_DIR