from .vizly_notebook_app import VizlyNotebookApp


def _jupyter_server_extension_paths():
    return [{"module": "vizly_notebook"}]


def _jupyter_server_extension_points():
    """
    Returns a list of dictionaries with metadata describing
    the extension.
    """
    return [{"module": "vizly_notebook", "app": VizlyNotebookApp}]


def launch_instance():
    VizlyNotebookApp.launch_instance()
