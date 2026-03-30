"use strict";

(function (window) {
	var host = window.location.host || "127.0.0.1:9999";
	var fcfg = window.FishbowlConfig;
	var path = fcfg.socketIoPath;
	window.FishbowlSocket = io.connect(host, {
		path: path,
		transports: ["websocket", "polling"]
	});
}(window));
