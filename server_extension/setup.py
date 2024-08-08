from setuptools import setup, find_packages
import os

# Determine the directory containing setup.py and get its parent directory
this_directory = os.path.abspath(os.path.dirname(__file__))
parent_directory = os.path.abspath(os.path.join(this_directory, os.pardir))

# Read the content of README.md from the parent directory
with open(os.path.join(parent_directory, "README.md"), "r") as fh:
    long_description = fh.read()

# Replace all mentions of 'public/' with 'vizly-notebook/static/'
long_description = long_description.replace(
    'public/', 'vizly-notebook/static/')

setup(
    name="vizly_notebook",
    version="0.1.25",
    packages=find_packages(),
    include_package_data=True,
    package_data={"vizly_notebook": ["static/**/*"]},
    install_requires=[
        "jupyter-server>=2.0",
        "jupyter",
    ],
    entry_points={
        "console_scripts": [
            "jupyter-vizly-notebook = vizly_notebook:launch_instance",
            "jupyter-thread = vizly_notebook:launch_instance",
            "thread = vizly_notebook:launch_instance",
            "vizly-notebook = vizly_notebook:launch_instance",
        ]
    },
    long_description=long_description,
    long_description_content_type="text/markdown",
)
