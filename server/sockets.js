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
	var batchFishThreshold = config.batchFishThreshold || 20;
	var batchTimer = null;

	function broadcastFishBatch() {
		var fishCount = Object.keys(fishState).filter(function(fid) { return fishState[fid]; }).length;
		if (fishCount < batchFishThreshold) return;
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

	function getFishCount() {
		return Object.keys(fishState).filter(function(fid) { return fishState[fid]; }).length;
	}

	function broadcastFishLeft(fishId) {
		if (fishId === undefined || fishId === null) return;
		io.sockets.emit("fish_left", { id: fishId });
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
				broadcastFishLeft(fid);
			}
			if (getFishCount() < batchFishThreshold) {
				stopBatchTimer();
			}
		});

		socket.on("canvas_to_server", function(data) {
			io.sockets.emit("canvas_to_client", data);
		});

		socket.on("fish_to_server", function(data) {
			var fid = data.id;
			if (fid !== undefined && socket.playerName) {
				socketToFishId[socket.id] = fid;
				var state = {
					id: fid,
					pos: { x: data.pos.x, y: data.pos.y },
					ctp: data.ctp ? data.ctp.slice() : [],
					size: data.size,
					color: data.color,
					colorHue: (typeof data.colorHue === "number" && data.colorHue >= 0 && data.colorHue <= 360) ? data.colorHue : null,
					name: (socket.playerName || "").trim().substring(0, 12) || "Fish",
					mouthOpen: data.mouthOpen === true
				};
				if (data.lookTarget && typeof data.lookTarget.x === "number" && typeof data.lookTarget.y === "number") {
					state.lookTarget = { x: data.lookTarget.x, y: data.lookTarget.y };
				}
				fishState[fid] = state;
				var fishCount = getFishCount();
				if (fishCount >= batchFishThreshold) {
					startBatchTimer();
				} else {
					io.sockets.emit("fish_to_client", state);
				}
			}
		});

		socket.on("new_fish", function(data) {
			if (!socket.playerName) return;
			var oldFid = socketToFishId[socket.id];
			if (oldFid !== undefined) {
				delete fishState[oldFid];
				delete socketToFishId[socket.id];
				broadcastFishLeft(oldFid);
			}
			var half = config.playerSpawnRange / 2;
			var pos = {
				x: -half + Math.random() * config.playerSpawnRange,
				y: -half + Math.random() * config.playerSpawnRange
			};
			var newId = nextFishId;
			nextFishId += 1;
			var fishList = [];
			for (var fid in fishState) {
				if (fishState[fid] && fid !== String(newId)) fishList.push(fishState[fid]);
			}
			socket.emit("new_fish_id", {
				id: newId,
				pos: pos,
				fobj: lakeWorld,
				debugEnabled: config.debugEnabled === true
			});
			if (fishList.length > 0) {
				var snapshotChunk = config.otherFishSnapshotChunk || 18;
				if (fishList.length <= snapshotChunk) {
					socket.emit("other_fish_snapshot", { fish: fishList });
				} else {
					var partCount = Math.ceil(fishList.length / snapshotChunk);
					for (var pi = 0; pi < partCount; pi++) {
						var from = pi * snapshotChunk;
						socket.emit("other_fish_snapshot", {
							fish: fishList.slice(from, from + snapshotChunk),
							part: pi,
							parts: partCount
						});
					}
				}
			}
		});

		socket.on("fish_death", function(data) {
			try {
				var fid = socketToFishId[socket.id];
				if (fid !== undefined) {
					delete fishState[fid];
					delete socketToFishId[socket.id];
					broadcastFishLeft(fid);
					if (getFishCount() < batchFishThreshold) {
						stopBatchTimer();
					}
				}
				var name = (data.name || socket.playerName || "").trim().substring(0, 12);
				if (name) {
					var nk = name.toLowerCase();
					usedNames[nk] = socket.id;
					socket.playerName = name;
				}
				var nameForLb = name || (socket.playerName || "").trim().substring(0, 12);
				var maxWeight = parseFloat(data.max_weight) || 0;
				var deadSocket = socket;
				function send() {
					leaderboard.getTopScores(100, function(rows) {
						try {
							if (deadSocket && deadSocket.connected) {
								deadSocket.emit("leaderboard", rows);
							}
						} catch (e) {
							console.error("leaderboard emit error:", e);
						}
					});
				}
				if (nameForLb && maxWeight >= 0) {
					leaderboard.insertScore(nameForLb, maxWeight, send);
				} else {
					send();
				}
			} catch (e) {
				console.error("fish_death error:", e);
			}
		});

		socket.on("leaderboard_request", function() {
			sendLeaderboard(socket);
		});
	});

	function sendLeaderboard(sock) {
		leaderboard.getTopScores(100, function(rows) {
			try {
				if (sock && sock.connected) sock.emit("leaderboard", rows);
			} catch (e) {
				console.error("sendLeaderboard emit error:", e);
			}
		});
	}
}

module.exports = {
	setupSockets: setupSockets
};
