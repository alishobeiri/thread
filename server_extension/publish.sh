#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

# Run the yarn build:prod command
yarn build:prod

# Check if ./server_extension/thread/static exists, create it if not
if [ ! -d "./thread/static" ]; then
    mkdir -p ./thread/static
fi

# Move files from ./out to server_extension/thread/static
cp -r ../out/* ./thread/static/

# Remove existing dist and build directories if they exist
if [ -d "./dist" ]; then
    rm -r ./dist
fi

if [ -d "./build" ]; then
    rm -r ./build
fi

# Ensure the MANIFEST.in is utilized during distribution creation
python setup.py sdist bdist_wheel

# # Upload the distribution files using twine
twine upload dist/*
