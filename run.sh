#!/bin/bash

set -e  # Exit immediately if a command exits with a non-zero status.

# Check if ./server_extension/vizly-notebook/static exists, create it if not
if [ ! -d "./server_extension/vizly-notebook/static" ]; then
  mkdir -p ./server_extension/vizly-notebook/static
fi

# Check if source directory ./out exists
if [ ! -d "./out" ]; then
  echo "Source directory ./out does not exist. Aborting."
  exit 1
fi

# Move files from ./out to server_extension/vizly-notebook/static
cp -r ./out/* ./server_extension/vizly-notebook/static/

# Verify that files have been copied
if [[ "$(ls -A ./server_extension/vizly-notebook/static)" ]]; then
  echo "Files successfully copied to ./server_extension/vizly-notebook/static"
else
  echo "No files were copied to ./server_extension/vizly-notebook/static. Aborting."
  exit 1
fi

# Uninstall and reinstall vizly-notebook package
pip uninstall -y vizly-notebook-dev
pip install -e ./server_extension --no-cache-dir

# Enable Jupyter server extension for vizly-notebook
jupyter server extension enable vizly-notebook

# Clean up log file
rm -f jupyter_server.log

# Start the Jupyter server with specified configurations
jupyter vizly-notebook --Application.log_level=0
