#!/bin/bash

set -e  # Exit immediately if a command exits with a non-zero status.

# Check if ./server_extension/thread/static exists, create it if not
if [ ! -d "./server_extension/thread/static" ]; then
  mkdir -p ./server_extension/thread/static
fi

# Check if source directory ./out exists
if [ ! -d "./out" ]; then
  echo "Source directory ./out does not exist. Aborting."
  exit 1
fi

# Move files from ./out to server_extension/thread/static
cp -r ./out/* ./server_extension/thread/static/

# Verify that files have been copied
if [[ "$(ls -A ./server_extension/thread/static)" ]]; then
  echo "Files successfully copied to ./server_extension/thread/static"
else
  echo "No files were copied to ./server_extension/thread/static. Aborting."
  exit 1
fi

# Uninstall and reinstall thread package
pip uninstall -y thread-dev
pip install -e ./server_extension --no-cache-dir

# Enable Jupyter server extension for thread
jupyter server extension enable thread

# Clean up log file
rm -f jupyter_server.log

# Start the Jupyter server with specified configurations
jupyter thread --Application.log_level=0
