#!/bin/sh

APP_DIR="api/railsapp/"

rm -rf APP_DIR
mkdir -p $APP_DIR
cp -r ../api/* $APP_DIR