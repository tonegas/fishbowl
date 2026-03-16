"use strict";

var http = require("http");
var path = require("path");
var fs = require("fs");

function createStaticServer(wwwRoot) {
	return http.createServer(function(request, response) {
		var pathname = new URL(request.url, "http://localhost").pathname;
		if (pathname === "/favicon.ico") {
			response.writeHead(204);
			response.end();
			return;
		}
		var relPath = (pathname === "/" ? "fish.html" : pathname.replace(/^\//, ""));
		var filename = path.join(wwwRoot, relPath);

		fs.exists(filename, function(exists) {
			if (!exists) {
				response.writeHead(404, { "Content-Type": "text/plain" });
				response.write("404 Not Found\n");
				response.end();
				return;
			}
			if (fs.statSync(filename).isDirectory()) {
				filename = path.join(filename, "fish.html");
			}
			fs.readFile(filename, "binary", function(err, file) {
				if (err) {
					response.writeHead(500, { "Content-Type": "text/plain" });
					response.write(err + "\n");
					response.end();
					return;
				}
				var ext = path.extname(filename);
				var mime = {
					".js": "application/javascript",
					".html": "text/html",
					".png": "image/png",
					".svg": "image/svg+xml"
				};
				var contentType = mime[ext] || "text/plain";
				response.writeHead(200, { "Content-Type": contentType });
				response.write(file, "binary");
				response.end();
			});
		});
	});
}

module.exports = {
	createStaticServer: createStaticServer
};
