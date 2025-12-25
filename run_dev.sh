#!/bin/bash

# Clean up log file
rm -f jupyter_server.log

# Uninstall and reinstall thread-notebook package
pip uninstall -y thread-notebook
pip install -e ./server_extension --no-cache-dir

# Enable Jupyter server extension for thread-notebook
jupyter server extension enable thread-notebook

# Start the Jupyter server with specified configurations
jupyter server --ServerApp.allow_origin_pat="^(http://localhost:3000)$" \
               --ServerApp.allow_credentials=True \
               --ServerApp.ContentsManager.allow_hidden=True \
               --ServerApp.token="123" \
               --ServerApp.password="" \
               --Application.log_level=0 \
               --debug
