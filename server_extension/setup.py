from setuptools import setup, find_packages
import os

# Determine the directory containing setup.py and get its parent directory
this_directory = os.path.abspath(os.path.dirname(__file__))
parent_directory = os.path.abspath(os.path.join(this_directory, os.pardir))

# Read the content of README.md from the parent directory
with open(os.path.join(parent_directory, "README.md"), "r") as fh:
    long_description = fh.read()

# Replace all mentions of 'public/' with 'thread/static/'
long_description = long_description.replace('public/', 'thread/static/')

setup(
    name="thread-dev",
    version="0.1.2",
    packages=find_packages(),
    include_package_data=True,
    install_requires=[
        "jupyter-server>=2.0",
        "jupyter",
    ],
    entry_points={
        "console_scripts": [
            "jupyter-thread = thread:launch_instance",
            "thread = thread:launch_instance",
        ]
    },
    long_description=long_description,
    long_description_content_type="text/markdown",
)
