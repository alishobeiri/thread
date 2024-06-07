from email.mime import application
import os
from jupyter_server.extension.application import ExtensionApp
from jupyter_server.utils import url_path_join
from tornado.web import StaticFileHandler, HTTPError, RedirectHandler, RequestHandler
from tornado.httpclient import AsyncHTTPClient, HTTPRequest, HTTPResponse
from traitlets import Unicode, default
import uuid
import json
import logging

# Constants
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
HERE = os.path.join(BASE_DIR, 'static')
app_version = "0.0.1"
app_log = logging.getLogger("tornado.application")


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


class ProxyHandler(RequestHandler):
    def initialize(self, display_url: str) -> None:
        app_log.info("Initializing ProxyHandler")
        app_log.log("display_url: ", display_url)
        self.display_url = display_url

    def check_xsrf_cookie(self):
        pass

    async def get(self, path):
        await self.forward_request()

    async def post(self, path):
        await self.forward_request()

    async def put(self, path):
        await self.forward_request()

    async def delete(self, path):
        await self.forward_request()

    async def patch(self, path):
        await self.forward_request()

    def get_mac_address(self):
        mac = uuid.UUID(int=uuid.getnode()).hex[-12:]
        return ":".join(mac[i:i+2] for i in range(0, 12, 2))

    def set_cors_headers(self):
        app_log.info(self)
        self.set_header('Access-Control-Allow-Origin', "*")
        self.set_header('Access-Control-Allow-Origin', 'null')
        self.set_header('Access-Control-Allow-Methods',
                        'POST, GET, OPTIONS, PUT, DELETE, PATCH')
        self.set_header('Access-Control-Allow-Headers',
                        'Content-Type, Authorization')

    async def forward_request(self):
        client = AsyncHTTPClient()

        # Determine the external API base URL based on the node environment
        environment = os.getenv("NODE_ENV", "development")
        app_log.info(f"Node Environment: {environment}")
        if environment == "production":
            external_api_base_url = "http://production.url"
        else:
            external_api_base_url = "http://localhost:5001"

        external_api_url = self.request.uri.replace(
            self.request.path, external_api_base_url +
            self.request.path[len("/thread"):]
        )

        unique_id = self.get_mac_address()

        body = None
        if self.request.method in ["POST", "PUT", "PATCH"]:
            try:
                existing_body = json.loads(self.request.body)
            except json.JSONDecodeError:
                existing_body = {}

            existing_body["uniqueId"] = unique_id
            body = json.dumps(existing_body).encode('utf-8')

        request = HTTPRequest(
            url=external_api_url,
            method=self.request.method,
            headers=self.request.headers,
            body=body if body is not None else self.request.body,
            follow_redirects=True,
            streaming_callback=self.on_streaming_chunk
        )

        response = await client.fetch(request, raise_error=False)

        for header, value in response.headers.items():
            if header not in ['Content-Length', 'Transfer-Encoding', 'Content-Encoding', 'Connection']:
                self.set_header(header, value)
        self.set_status(response.code)
        self.finish()

    def on_streaming_chunk(self, chunk):
        self.write(chunk)
        self.flush()

    def on_finish(self):
        # Add any necessary cleanup logic here
        pass

    def set_default_headers(self):
        self.set_cors_headers()


class ThreadApp(ExtensionApp):
    version = app_version
    extension_url = "/thread"
    name = "thread"
    app_name = "Thread"
    app_version = app_version
    load_other_extensions = False

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
        self.log.info(
            f"self.display_url: {str(self.serverapp.display_url)}")

        static_path = self.static_dir
        self.log.info(f"Static path: {static_path}")

        handlers = [
            (url_path_join(self.serverapp.base_url, "/thread/api/(.*)"),
             ProxyHandler, {'display_url': self.serverapp.display_url}),
            (url_path_join(self.serverapp.base_url, "/favicon.ico"), RedirectHandler,
             {"url": self.serverapp.base_url + "thread/favicon.ico"}),
            (url_path_join(self.serverapp.base_url, "/thread/?(.*)"),
             StaticIndexHandler, {"path": static_path}),
        ]
        self.handlers.extend(handlers)


# Entry point to launch the extension app
main = ThreadApp.launch_instance

if __name__ == "__main__":
    main()
