import json
import os
import re
from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join
import tornado

class RouteHandler(APIHandler):
    # The following decorator should be present on all verb methods (head, get, post,
    # patch, put, delete, options) to ensure only authorized user can request the
    # Jupyter server
    @tornado.web.authenticated
    def put(self, path):

        print('post')
        
        print('os.getcwd()', os.getcwd())

        path = os.path.join(os.getcwd(), path)

        print('path', path)

        with open(path, 'wb') as f:

            f.write(self.request.body)

        self.finish(json.dumps({
            'method': 'PUT',
            'path': path
        }))

    @tornado.web.authenticated
    def get(self, path):

        print('get')

        print('os.getcwd()', os.getcwd())

        path = os.path.join(os.getcwd(), path)

        print('path', path)

        with open(path, 'rb') as f:

            data = f.read()

        self.add_header('Content-Type', 'application/octet-stream')

        self.finish(data)


def setup_handlers(web_app):
    host_pattern = ".*$"

    base_url = web_app.settings["base_url"]
    route_pattern = url_path_join(base_url, "etc-jupyterlab-authoring", "media/(.*)")
    handlers = [(route_pattern, RouteHandler)]
    web_app.add_handlers(host_pattern, handlers)
