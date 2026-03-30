"use strict";

var leaderboard = require("./leaderboard");
var lake = require("./lake");

var usedNames = {};
var nextFishId = 1;
var fishState = {};
var socketToFishId = {};

function setupSockets(io, config) {
	var lakeWorld = lake.createLake(config);
	var batchIntervalMs = config.batchIntervalMs;
	var batchFishThreshold = config.batchFishThreshold;
	var batchTimer = null;

	function buildFishList() {
		var fishList = [];
		for (var fid in fishState) {
			if (fishState[fid]) fishList.push(fishState[fid]);
		}
		return fishList;
	}

	function broadcastFishBatch() {
		var fishCount = Object.keys(fishState).filter(function(fid) { return fishState[fid]; }).length;
		if (fishCount < batchFishThreshold) return;
		var fishList = buildFishList();
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

	function emitFullSyncToAll() {
		if (getFishCount() >= batchFishThreshold) return;
		io.sockets.emit("fish_batch", { fish: buildFishList() });
	}

	function sendFishSnapshotToSocket(sock) {
		var fishList = buildFishList();
		if (fishList.length === 0) return;
		if (getFishCount() >= batchFishThreshold) {
			sock.emit("fish_batch", { fish: fishList });
		} else {
			for (var i = 0; i < fishList.length; i++) {
				sock.emit("fish_to_client", fishList[i]);
			}
		}
	}

	function randomSpawnPos() {
		var half = config.playerSpawnRange / 2;
		return {
			x: -half + Math.random() * config.playerSpawnRange,
			y: -half + Math.random() * config.playerSpawnRange
		};
	}

	io.on("connection", function(socket) {
		socket.playerName = null;

		socket.on("request_spectator_lake", function() {
			if (!socket.spawnPreviewPos) {
				socket.spawnPreviewPos = randomSpawnPos();
			}
			socket.emit("spectator_lake", {
				fobj: lakeWorld,
				pos: { x: socket.spawnPreviewPos.x, y: socket.spawnPreviewPos.y }
			});
			sendFishSnapshotToSocket(socket);
		});

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
			if (getFishCount() < batchFishThreshold) {
				stopBatchTimer();
			}
			emitFullSyncToAll();
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
			}
			var pos = socket.spawnPreviewPos || randomSpawnPos();
			socket.spawnPreviewPos = null;
			var newId = nextFishId;
			nextFishId += 1;
			socket.emit("new_fish_id", {
				id: newId,
				pos: pos,
				fobj: lakeWorld,
				debugEnabled: config.debugEnabled === true
			});
			if (getFishCount() < batchFishThreshold) {
				stopBatchTimer();
			}
			emitFullSyncToAll();
		});

		socket.on("fish_death", function(data) {
			try {
				var fid = socketToFishId[socket.id];
				if (fid !== undefined) {
					delete fishState[fid];
					delete socketToFishId[socket.id];
					if (getFishCount() < batchFishThreshold) {
						stopBatchTimer();
					}
					emitFullSyncToAll();
				}
				var nameForLb = (data.name || socket.playerName || "").trim().substring(0, 12);
				if (socket.playerName) {
					var keyRelease = socket.playerName.toLowerCase();
					if (usedNames[keyRelease] === socket.id) {
						delete usedNames[keyRelease];
					}
				}
				socket.playerName = null;
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
				console.error("sendLeaderboard error:", e);
			}
		});
	}
}

module.exports = {
	setupSockets: setupSockets
};
