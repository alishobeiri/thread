from .threadapp import ThreadApp


def _jupyter_server_extension_paths():
    return [{"module": "thread"}]


def _jupyter_server_extension_points():
    """
    Returns a list of dictionaries with metadata describing
    the extension.
    """
    return [{"module": "thread", "app": ThreadApp}]


def launch_instance():
    ThreadApp.launch_instance()
