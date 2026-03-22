"use strict";

var leaderboard = require("./leaderboard");
var lake = require("./lake");

var usedNames = {};
var nextFishId = 1;
var fishState = {};
var socketToFishId = {};

function setupSockets(io, config) {
	var lakeWorld = lake.createLake(config);
	var batchIntervalMs = config.batchIntervalMs || 50;
	var batchTimer = null;

	function broadcastFishBatch() {
		var fishList = [];
		for (var fid in fishState) {
			if (fishState[fid]) fishList.push(fishState[fid]);
		}
		if (fishList.length > 0) {
			io.sockets.emit("fish_batch", { fish: fishList });
		}
	}

	function startBatchTimer() {
		if (!batchTimer) {
			batchTimer = setInterval(broadcastFishBatch, batchIntervalMs);
		}
	}

	function stopBatchTimer() {
		if (batchTimer) {
			clearInterval(batchTimer);
			batchTimer = null;
		}
	}

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
			var fid = socketToFishId[socket.id];
			if (fid !== undefined) {
				delete fishState[fid];
				delete socketToFishId[socket.id];
			}
			if (Object.keys(fishState).length === 0) {
				stopBatchTimer();
			}
		});

		socket.on("canvas_to_server", function(data) {
			io.sockets.emit("canvas_to_client", data);
		});

		socket.on("fish_to_server", function(data) {
			var fid = data.id;
			if (fid !== undefined) {
				socketToFishId[socket.id] = fid;
				var state = {
					id: fid,
					pos: { x: data.pos.x, y: data.pos.y },
					ctp: data.ctp ? data.ctp.slice() : [],
					size: data.size,
					color: data.color,
					name: data.name,
					mouthOpen: data.mouthOpen === true
				};
				if (data.lookTarget && typeof data.lookTarget.x === "number" && typeof data.lookTarget.y === "number") {
					state.lookTarget = { x: data.lookTarget.x, y: data.lookTarget.y };
				}
				fishState[fid] = state;
				startBatchTimer();
			}
		});

		socket.on("new_fish", function(data) {
			if (!socket.playerName) return;
			var half = config.playerSpawnRange / 2;
			var pos = {
				x: -half + Math.random() * config.playerSpawnRange,
				y: -half + Math.random() * config.playerSpawnRange
			};
			socket.emit("new_fish_id", {
				id: nextFishId,
				pos: pos,
				fobj: lakeWorld,
				cheatEnabled: config.cheatEnabled === true
			});
			nextFishId += 1;
		});

		socket.on("fish_death", function(data) {
			var fid = socketToFishId[socket.id];
			if (fid !== undefined) {
				delete fishState[fid];
				delete socketToFishId[socket.id];
			}
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
