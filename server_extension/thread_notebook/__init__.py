from .thread_notebook_app import ThreadNotebookApp


def _jupyter_server_extension_paths():
    return [{"module": "thread_notebook"}]


def _jupyter_server_extension_points():
    """
    Returns a list of dictionaries with metadata describing
    the extension.
    """
    return [{"module": "thread_notebook", "app": ThreadNotebookApp}]


def launch_instance():
    ThreadNotebookApp.launch_instance()


# Export the app class for entry points
__all__ = ["ThreadNotebookApp", "launch_instance"]
