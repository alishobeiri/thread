#!/bin/bash

set -e  # Exit immediately if a command exits with a non-zero status.

# Check if ./server_extension/thread/static exists, create it if not
if [ ! -d "./server_extension/thread/static" ]; then
  mkdir -p ./server_extension/thread/static
fi

# Move files from ./out to server_extension/thread/static
cp -r ./out/* ./server_extension/thread/static/

# Uninstall and reinstall thread package
pip uninstall -y thread-dev
pip install -e ./server_extension

# Enable Jupyter server extension for thread
jupyter server extension enable thread

# Clean up log file
rm -f jupyter_server.log

# Start the Jupyter server with specified configurations
jupyter thread
