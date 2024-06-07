#!/bin/bash

# Clean up log file
rm -f jupyter_server.log

# Uninstall and reinstall thread package
pip uninstall -y thread-dev
pip install -e ./server_extension

# Enable Jupyter server extension for thread
jupyter server extension enable thread

# Start the Jupyter server with specified configurations
jupyter thread --ServerApp.allow_origin_pat="^(http?://localhost:3000|https?://.*\\.noterous\\.com|https?://noterous\\.onrender\\.com|https?://(.*\\.)?vizly\\.fyi|https?://(.*\\.)?vizlylabs\\.com)$" \
               --ServerApp.allow_credentials=True \
               --ServerApp.token="123" \
               --ServerApp.password="" \
               --Application.log_level=0 \
               --debug
