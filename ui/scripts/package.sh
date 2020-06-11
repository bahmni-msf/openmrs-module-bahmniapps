#!/bin/bash

export LANG=en_US.UTF-8
set -e

BASE_DIR=`dirname $0`
ROOT_DIR=$BASE_DIR/..
ZIP_FILE_NAME=bahmniapps

mkdir -p $ROOT_DIR/target
rm -rf $ROOT_DIR/target/${ZIP_FILE_NAME}*.zip

npm install
bower install
grunt bundle
grunt uglify-and-rename

cd $ROOT_DIR

if [ $(pgrep Xvfb) ]; then
    XVFB_PID=$(pgrep Xvfb)
    echo "Killing Xvfb process $XVFB_PID"
    /usr/bin/sudo kill $XVFB_PID
    /usr/bin/sudo rm -rf /tmp/.X99-lock
fi
export DISPLAY=:99
Xvfb :99 &
XVFB_PID=$!
echo "Starting Xvfb process $XVFB_PID"

echo "Starting tests..."
grunt web

retVal=$?
if [ $retVal -ne 0 ]; then
    echo "Error: Exiting with error code 1"
    exit 1
fi

cd dist && zip -r ../target/${ZIP_FILE_NAME}.zip *


echo "Killing Xvfb process $XVFB_PID"
/usr/bin/sudo kill $XVFB_PID
