"use strict";

var leaderboard = require("./leaderboard");
var lake = require("./lake");

var usedNames = {};
var nextFishId = 1;

function setupSockets(io, config) {
	var lakeWorld = lake.createLake(config);

	io.on("connection", function(socket) {
		socket.playerName = null;

		socket.on("register_name", function(data) {
			var name = (data.name || "").trim().substring(0, 12);
			if (!name) return;
			var key = name.toLowerCase();
			var existing = usedNames[key];
			if (existing && existing !== socket.id) {
				socket.emit("name_rejected");
			} else {
				usedNames[key] = socket.id;
				socket.playerName = name;
				socket.emit("name_accepted");
			}
		});

		socket.on("disconnect", function() {
			if (socket.playerName) {
				var key = socket.playerName.toLowerCase();
				if (usedNames[key] === socket.id) {
					delete usedNames[key];
				}
			}
		});

		socket.on("canvas_to_server", function(data) {
			io.sockets.emit("canvas_to_client", data);
		});

		socket.on("fish_to_server", function(data) {
			io.sockets.emit("fish_to_client", data);
		});

		socket.on("new_fish", function(data) {
			if (!socket.playerName) return;
			var pos = {
				x: Math.random() * config.playerSpawnRange,
				y: Math.random() * config.playerSpawnRange
			};
			socket.emit("new_fish_id", {
				id: nextFishId,
				pos: pos,
				fobj: lakeWorld
			});
			nextFishId += 1;
		});

		socket.on("fish_death", function(data) {
			var name = (data.name || socket.playerName || "").trim();
			var maxWeight = parseFloat(data.max_weight) || 0;
			function send() {
				leaderboard.getTopScores(100, function(rows) {
					socket.emit("leaderboard", rows);
				});
			}
			if (name && maxWeight >= 0) {
				leaderboard.insertScore(name, maxWeight, send);
			} else {
				send();
			}
		});

		socket.on("leaderboard_request", function() {
			sendLeaderboard(socket);
		});
	});

	function sendLeaderboard(sock) {
		leaderboard.getTopScores(100, function(rows) {
			sock.emit("leaderboard", rows);
		});
	}
}

module.exports = {
	setupSockets: setupSockets
};
