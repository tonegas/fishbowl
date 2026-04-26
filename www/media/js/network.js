"use strict";

(function (window) {
	var state = window.Fishbowl;
	var cfg = window.FishbowlConfig;

	function removeOtherFishById(fishId) {
		if (fishId === undefined || fishId === null || !state.lake) return;
		if (state.myFish && state.myFish.sim.id === fishId) return;
		var lake = state.lake;
		var v = lake.otherFish[fishId];
		if (v) {
			try {
				v.die();
			} catch (e) { /* ignore */ }
			delete lake.otherFish[fishId];
		}
		var sid = String(fishId);
		lake.otherFishId = lake.otherFishId.filter(function(id) { return String(id) !== sid; });
	}

	function processFishToClient(msg, gen) {
		if (Array.isArray(msg)) {
			if (gen !== undefined && gen !== state.gameGeneration) return;
			if (!state.lake) return;
			var lake = state.lake;
			var myId = state.myFish ? state.myFish.sim.id : null;
			var inBatch = {};
			for (var i = 0; i < msg.length; i++) {
				var e = msg[i];
				if (e && e.id !== undefined) inBatch[e.id] = true;
			}
			var toRemove = [];
			for (var j = 0; j < lake.otherFishId.length; j++) {
				var oid = lake.otherFishId[j];
				if (myId != null && String(oid) === String(myId)) continue;
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
		if (!state.lake) return;
		if (state.myFish && state.myFish.sim.id === msg.id) return;

		var ctp = msg.ctp ? msg.ctp.slice() : [];
		var colorHue = (typeof msg.colorHue === "number" && msg.colorHue >= 0 && msg.colorHue <= 360) ? msg.colorHue : null;
		var lake = state.lake;
		var now = (typeof performance !== "undefined" && performance.now) ? performance.now() / 1000 : Date.now() / 1000;
		var pos = { x: msg.pos.x, y: msg.pos.y };
		var view = lake.otherFish[msg.id];
		if (view) {
			var dt = now - view._lastUpdateTime;
			if (dt > 0.001) {
				var rawVx = (pos.x - view._lastPos.x) / dt;
				var rawVy = (pos.y - view._lastPos.y) / dt;
				view._lastVelocity.x = view._lastVelocity.x * 0.5 + rawVx * 0.5;
				view._lastVelocity.y = view._lastVelocity.y * 0.5 + rawVy * 0.5;
			}
		} else {
			lake.otherFishId.push(msg.id);
			var sim = new FishSim(msg.id, msg.pos, ctp, msg.name || "Fish", colorHue);
			view = new FishView(sim, false);
			view._lastVelocity = { x: 0, y: 0 };
			lake.otherFish[msg.id] = view;
		}
		view._lastPos = { x: pos.x, y: pos.y };
		view._lastUpdateTime = now;
		view.setRemoteSnapshot(ctp, msg.pos, msg.size, msg.color, msg.name, colorHue);
		view.sim._mouthOpen = !!msg.mouthOpen;
		view.sim.look_target = (msg.lookTarget && typeof msg.lookTarget.x === "number") ? { x: msg.lookTarget.x, y: msg.lookTarget.y } : null;
		view.sim.setAlive(1);
	}

	function setup(socket) {
		socket.on("spectator_lake", function(data) {
			window.FishbowlGame.applySpectatorLake(data);
		});

		function requestSpectatorLake() {
			socket.emit("request_spectator_lake");
		}
		socket.on("connect", requestSpectatorLake);
		if (socket.connected) requestSpectatorLake();

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
			if (inp) inp.value = "";
			if (err) err.textContent = "";
			if (no) no.style.display = "flex";
			socket.emit("request_spectator_lake");
			if (inp) {
				function focusName() {
					inp.focus();
				}
				if (typeof requestAnimationFrame === "function") {
					requestAnimationFrame(function() {
						requestAnimationFrame(focusName);
					});
				} else {
					setTimeout(focusName, 0);
				}
			}
		};

		function scheduleFish(payload, mode) {
			state.networkMode = mode;
			var gen = state.gameGeneration;
			var run = function() { processFishToClient(payload, gen); };
			if (cfg.virtualDelay > 0) setTimeout(run, cfg.virtualDelay); else run();
		}
		socket.on("fish_to_client", function(data) { scheduleFish(data, "emit"); });
		socket.on("fish_batch", function(data) { scheduleFish((data && data.fish) ? data.fish : [], "batch"); });

		socket.on("new_fish_id", function(data) {
			window.FishbowlGame.onNewFish(data);
		});
	}

	function sendFish(socket) {
		var fish = state.myFish;
		if (!fish) return;
		var sim = fish.sim;
		var color = createjs.Graphics.getHSL(sim.color, sim.life / sim.maxLife * 200 - 100, 50);
		var payload = {
			id: sim.id,
			pos: sim.pos,
			ctp: sim.ctp,
			size: sim.size,
			color: color,
			colorHue: sim.color,
			name: state.playerName,
			mouthOpen: sim._mouthOpen === true
		};
		if (sim.look_target && typeof sim.look_target.x === "number" && typeof sim.look_target.y === "number") {
			payload.lookTarget = { x: sim.look_target.x, y: sim.look_target.y };
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
