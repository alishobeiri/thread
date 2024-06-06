import os
from jupyter_server.extension.application import ExtensionApp
from jupyter_server.utils import url_path_join
from tornado.web import StaticFileHandler, HTTPError, RedirectHandler
from traitlets import Unicode, default

# Constants
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
HERE = os.path.join(BASE_DIR, 'static')
app_version = "0.0.1"


class StaticIndexHandler(StaticFileHandler):
    async def get(self, path=None, include_body=True):
        if not path or path == "/":
            path = "index.html"
        try:
            await super().get(path, include_body)
        except HTTPError as e:
            if e.status_code == 404:
                self.set_status(404)
                self.finish(f"File {path} not found")
            else:
                raise e


class ThreadApp(ExtensionApp):
    version = app_version
    extension_url = "/thread"
    name = "thread"
    app_name = "Thread"
    app_version = app_version
    load_other_extensions = False

    load_other_extensions = True

    default_url = Unicode("/thread", config=True,
                          help="The default URL redirecting to `/`")
    app_dir = Unicode(None, config=True,
                      help="The app directory to launch the app from.")
    static_dir = Unicode(
        None, config=True, help="Directory with static files for this extension.")
    static_url_prefix = Unicode(
        "/static/thread/", config=True, help="URL prefix for static files.")
    templates_dir = Unicode(
        None, config=True, help="Templates directory for the extension.")

    @default("app_dir")
    def _default_app_dir(self):
        return BASE_DIR

    @default("static_dir")
    def _default_static_dir(self):
        return HERE

    @default("static_url_prefix")
    def _default_static_url_prefix(self):
        static_url = f"/static/{self.name}/"
        return url_path_join(self.serverapp.base_url, static_url)

    @default("templates_dir")
    def _default_templates_dir(self):
        return HERE

    def initialize_handlers(self):
        self.log.info("Initializing HecksApp handlers")

        static_path = self.static_dir
        self.log.info(f"Static path: {static_path}")

        handlers = [
            (url_path_join(self.serverapp.base_url, "/thread/?(.*)"),
             StaticIndexHandler, {"path": static_path}),
            (url_path_join(self.serverapp.base_url, "/favicon.ico"),
             RedirectHandler, {"url": self.serverapp.base_url + "thread/favicon.ico"})
        ]
        self.handlers.extend(handlers)


# Entry point to launch the extension app
main = ThreadApp.launch_instance

if __name__ == "__main__":
    main()
