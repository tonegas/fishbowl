"use strict";

(function (window) {
	var host = window.location.host || "127.0.0.1:9999";
	window.FishbowlSocket = io.connect(host);
}(window));
