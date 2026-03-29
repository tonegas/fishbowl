"use strict";

(function (window) {
	var state = window.Fishbowl;
	var cfg = window.FishbowlConfig || { VIRTUAL_DELAY: 0 };

	function removeOtherFishById(fishId) {
		if (fishId === undefined || fishId === null || !state.lake) return;
		if (state.myFish && state.myFish.id === fishId) return;
		var lake = state.lake;
		var o = lake.otherFish[fishId];
		if (o) {
			try {
				o.die();
			} catch (e) { /* ignore */ }
			delete lake.otherFish[fishId];
		}
		var sid = String(fishId);
		lake.otherFishId = lake.otherFishId.filter(function(id) { return String(id) !== sid; });
	}

	function processFishToClient(msg, gen) {
		if (Array.isArray(msg)) {
			if (gen !== undefined && gen !== state.gameGeneration) return;
			if (!state.lake || !state.myFish) return;
			var lake = state.lake;
			var myId = state.myFish.id;
			var inBatch = {};
			for (var i = 0; i < msg.length; i++) {
				var e = msg[i];
				if (e && e.id !== undefined) inBatch[e.id] = true;
			}
			var toRemove = [];
			for (var j = 0; j < lake.otherFishId.length; j++) {
				var oid = lake.otherFishId[j];
				if (String(oid) === String(myId)) continue;
				if (!inBatch[oid]) toRemove.push(oid);
			}
			for (var k = 0; k < toRemove.length; k++) {
				removeOtherFishById(toRemove[k]);
			}
			for (var u = 0; u < msg.length; u++) {
				processFishToClient(msg[u], gen);
			}
			return;
		}

		if (gen !== undefined && gen !== state.gameGeneration) return;
		if (!msg || msg.id === undefined || !msg.pos) return;
		if (!state.lake || !state.myFish || state.myFish.id === msg.id) return;

		var ctp = msg.ctp ? msg.ctp.slice() : [];
		var colorHue = (typeof msg.colorHue === "number" && msg.colorHue >= 0 && msg.colorHue <= 360) ? msg.colorHue : null;
		var lake = state.lake;
		var now = (typeof performance !== "undefined" && performance.now) ? performance.now() / 1000 : Date.now() / 1000;
		var pos = { x: msg.pos.x, y: msg.pos.y };
		var o = lake.otherFish[msg.id];
		if (o) {
			if (o._lastUpdateTime !== undefined) {
				var dt = now - o._lastUpdateTime;
				if (dt > 0.001) {
					var rawV = {
						x: (pos.x - o._lastPos.x) / dt,
						y: (pos.y - o._lastPos.y) / dt
					};
					var blend = 0.5;
					o._lastVelocity = {
						x: (o._lastVelocity.x || 0) * (1 - blend) + rawV.x * blend,
						y: (o._lastVelocity.y || 0) * (1 - blend) + rawV.y * blend
					};
				}
			} else {
				o._lastVelocity = { x: 0, y: 0 };
			}
		} else {
			lake.otherFishId.push(msg.id);
			o = new Fish(msg.id, msg.pos, ctp, msg.color, msg.name || "Fish", colorHue);
			o._lastVelocity = { x: 0, y: 0 };
			lake.otherFish[msg.id] = o;
		}
		o._lastPos = { x: pos.x, y: pos.y };
		o._lastUpdateTime = now;
		o.set(ctp, msg.pos, msg.size, msg.color, lake, msg.name, colorHue);
		if (o.fishParts && o.fishParts.mounth) {
			if (msg.mouthOpen) { o.fishParts.mounth.scaleX = 2.2; o.fishParts.mounth.scaleY = 1.5; }
			else { o.fishParts.mounth.scaleX = 1; o.fishParts.mounth.scaleY = 1; }
		}
		o.look_target = (msg.lookTarget && typeof msg.lookTarget.x === "number") ? { x: msg.lookTarget.x, y: msg.lookTarget.y } : null;
		o.updatePupils();
		o.setAlive(1);
	}

	function setup(socket) {
		socket.on("name_rejected", function() {
			document.getElementById("nameError").textContent = "Name already taken";
		});

		socket.on("name_accepted", function() {
			document.getElementById("nameOverlay").style.display = "none";
			window.FishbowlUI.hideLeaderboard();
			socket.emit("new_fish", {});
		});

		socket.on("leaderboard", function(rows) {
			if (state.myFish) return;
			var no = document.getElementById("nameOverlay");
			if (no) no.style.display = "none";
			document.getElementById("nameError").textContent = "";
			window.FishbowlUI.showLeaderboard(rows);
		});

		document.getElementById("playAgainBtn").onclick = function() {
			window.FishbowlUI.hideLeaderboard();
			var no = document.getElementById("nameOverlay");
			var inp = document.getElementById("playerNameInput");
			var err = document.getElementById("nameError");
			if (inp) {
				inp.value = "";
				inp.focus();
			}
			if (err) err.textContent = "";
			if (no) no.style.display = "flex";
		};

		socket.on("fish_to_client", function(data) {
			state.networkMode = "emit";
			var delay = (cfg.VIRTUAL_DELAY || 0);
			var gen = state.gameGeneration;
			function process() {
				processFishToClient(data, gen);
			}
			if (delay > 0) {
				setTimeout(process, delay);
			} else {
				process();
			}
		});

		socket.on("fish_batch", function(data) {
			state.networkMode = "batch";
			var delay = (cfg.VIRTUAL_DELAY || 0);
			var gen = state.gameGeneration;
			var fishList = (data && data.fish) ? data.fish : [];
			function run() {
				processFishToClient(fishList, gen);
			}
			if (delay > 0) {
				setTimeout(run, delay);
			} else {
				run();
			}
		});

		socket.on("new_fish_id", function(data) {
			window.FishbowlGame.onNewFish(data);
		});
	}

	function sendFish(socket) {
		var fish = state.myFish;
		if (!fish) return;
		var color = createjs.Graphics.getHSL(fish.color, fish.life / fish.max_life * 200 - 100, 50);
		var payload = {
			id: fish.id,
			pos: fish.pos,
			ctp: fish.ctp,
			size: fish.size,
			color: color,
			colorHue: fish.color,
			name: state.playerName,
			mouthOpen: fish._mouthOpen === true
		};
		if (fish.look_target && typeof fish.look_target.x === "number" && typeof fish.look_target.y === "number") {
			payload.lookTarget = { x: fish.look_target.x, y: fish.look_target.y };
		}
		socket.emit("fish_to_server", payload);
	}

	function emitFishDeath(socket, maxWeight) {
		socket.emit("fish_death", {
			name: state.playerName,
			max_weight: maxWeight
		});
	}

	window.FishbowlNetwork = {
		setup: setup,
		sendFish: sendFish,
		emitFishDeath: emitFishDeath
	};
}(window));
