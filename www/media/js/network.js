"use strict";

(function (window) {
	var state = window.Fishbowl;
	var cfg = window.FishbowlConfig || { VIRTUAL_DELAY: 0 };

	function processFishToClient(data) {
		if (!state.lake || !state.myFish || state.myFish.id === data.id) return;
		var lake = state.lake;
		var now = (typeof performance !== "undefined" && performance.now) ? performance.now() / 1000 : Date.now() / 1000;
		var pos = { x: data.pos.x, y: data.pos.y };
		if (lake.otherFish[data.id]) {
			var o = lake.otherFish[data.id];
			if (o._lastUpdateTime !== undefined) {
				var dt = now - o._lastUpdateTime;
				if (dt > 0.001) {
					o._lastVelocity = {
						x: (pos.x - o._lastPos.x) / dt,
						y: (pos.y - o._lastPos.y) / dt
					};
				}
			} else {
				o._lastVelocity = { x: 0, y: 0 };
			}
			o._lastPos = { x: pos.x, y: pos.y };
			o._lastUpdateTime = now;
			o.set(data.ctp, data.pos, data.size, data.color, lake, data.name);
			o.setAlive(1);
		} else {
			lake.otherFishId.push(data.id);
			var o = new Fish(data.id, data.pos, data.ctp, data.color, data.name || "Fish");
			o._lastPos = { x: pos.x, y: pos.y };
			o._lastVelocity = { x: 0, y: 0 };
			o._lastUpdateTime = now;
			lake.otherFish[data.id] = o;
			o.set(data.ctp, data.pos, data.size, data.color, lake, data.name);
			o.setAlive(1);
		}
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
			window.FishbowlUI.showLeaderboard(rows);
		});

		document.getElementById("playAgainBtn").onclick = function() {
			window.FishbowlUI.hideLeaderboard();
			socket.emit("register_name", { name: state.playerName });
		};

		socket.on("fish_to_client", function(data) {
			var delay = (cfg.VIRTUAL_DELAY || 0);
			var payload = {
				id: data.id,
				pos: { x: data.pos.x, y: data.pos.y },
				ctp: data.ctp ? data.ctp.slice() : [],
				size: data.size,
				color: data.color,
				name: data.name
			};
			if (delay > 0) {
				setTimeout(function() { processFishToClient(payload); }, delay);
			} else {
				processFishToClient(payload);
			}
		});

		socket.on("new_fish_id", function(data) {
			if (state.myFish) return;
			window.FishbowlGame.onNewFish(data);
		});
	}

	function sendFish(socket) {
		var fish = state.myFish;
		if (!fish) return;
		var color = createjs.Graphics.getHSL(fish.color, fish.life / fish.max_life * 200 - 100, 50);
		socket.emit("fish_to_server", {
			id: fish.id,
			pos: fish.pos,
			ctp: fish.ctp,
			size: fish.size,
			color: color,
			name: state.playerName
		});
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
