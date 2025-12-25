#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Change to project root to run build commands
cd "$PROJECT_ROOT"

# Export NODE_ENV as production for the entire script
export NODE_ENV=production

echo "Building Next.js application..."
# Run the yarn build:prod command
yarn build:prod

# Change to server_extension directory
cd "$SCRIPT_DIR"

echo "Preparing static files..."
# Remove existing static directory if it exists
if [ -d "./thread_notebook/static" ]; then
    rm -rf ./thread_notebook/static
fi

# Create static directory
mkdir -p ./thread_notebook/static

# Copy files from ../out to thread_notebook/static
if [ ! -d "$PROJECT_ROOT/out" ]; then
    echo "Error: Build output directory '$PROJECT_ROOT/out' does not exist."
    echo "Make sure 'yarn build:prod' completed successfully."
    exit 1
fi

echo "Copying static files..."
cp -r "$PROJECT_ROOT/out"/* ./thread_notebook/static/

# Remove existing dist and build directories if they exist
if [ -d "./dist" ]; then
    rm -rf ./dist
fi

if [ -d "./build" ]; then
    rm -rf ./build
fi

if [ -d "./thread_notebook.egg-info" ]; then
    rm -rf ./thread_notebook.egg-info
fi

echo "Building Python package..."
# Ensure the MANIFEST.in is utilized during distribution creation
python setup.py sdist bdist_wheel

echo "Package built successfully!"
echo ""
echo "Distribution files created in ./dist/"
echo "To upload to PyPI, run:"
echo "  twine upload dist/*"
echo ""
echo "Or to upload to TestPyPI first (recommended):"
echo "  twine upload --repository testpypi dist/*"
echo ""
read -p "Do you want to upload to PyPI now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Uploading to PyPI..."
    twine upload dist/*
    echo "Upload complete!"
else
    echo "Skipping upload. You can upload later with: twine upload dist/*"
fi
