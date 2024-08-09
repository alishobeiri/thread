#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

# Export NODE_ENV as production for the entire script
export NODE_ENV=production

# Run the yarn build:prod command
yarn build:prod

# Check if ./server_extension/vizly-notebook/static exists, create it if not
if [ -d "./vizly_notebook/static" ]; then
    rm -r ./vizly_notebook/static
fi

if [ ! -d "./vizly_notebook/static" ]; then
    mkdir -p ./vizly_notebook/static
fi

# Move files from ./out to server_extension/vizly-notebook/static
cp -r ../out/* ./vizly_notebook/static/

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
