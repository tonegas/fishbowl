"use strict";

var path = require("path");
var config = require("./www/media/js/config");
var http = require("./server/http");
var sockets = require("./server/sockets");

var wwwRoot = path.join(__dirname, "www");
var app = http.createStaticServer(wwwRoot);
var port = parseInt(config.port, 10);

app.listen(port, function() {
	console.log("Fishbowl server on port", port);
});

var io = require("socket.io")(app, { log: false });
sockets.setupSockets(io, config);
