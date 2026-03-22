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
			o._lastPos = { x: pos.x, y: pos.y };
			o._lastUpdateTime = now;
			o.set(data.ctp, data.pos, data.size, data.color, lake, data.name);
			if (o.fishParts && o.fishParts.mounth) {
				if (data.mouthOpen) { o.fishParts.mounth.scaleX = 2.2; o.fishParts.mounth.scaleY = 1.5; }
				else { o.fishParts.mounth.scaleX = 1; o.fishParts.mounth.scaleY = 1; }
			}
			o.look_target = (data.lookTarget && typeof data.lookTarget.x === "number") ? { x: data.lookTarget.x, y: data.lookTarget.y } : null;
			o.updatePupils();
			o.setAlive(1);
		} else {
			lake.otherFishId.push(data.id);
			var o = new Fish(data.id, data.pos, data.ctp, data.color, data.name || "Fish");
			o._lastPos = { x: pos.x, y: pos.y };
			o._lastVelocity = { x: 0, y: 0 };
			o._lastUpdateTime = now;
			lake.otherFish[data.id] = o;
			o.set(data.ctp, data.pos, data.size, data.color, lake, data.name);
			if (o.fishParts && o.fishParts.mounth) {
				if (data.mouthOpen) { o.fishParts.mounth.scaleX = 2.2; o.fishParts.mounth.scaleY = 1.5; }
				else { o.fishParts.mounth.scaleX = 1; o.fishParts.mounth.scaleY = 1; }
			}
			o.look_target = (data.lookTarget && typeof data.lookTarget.x === "number") ? { x: data.lookTarget.x, y: data.lookTarget.y } : null;
			o.updatePupils();
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
			if (data && data.id !== undefined) {
				processFishToClient(data);
			}
		});

		socket.on("fish_batch", function(data) {
			var delay = (cfg.VIRTUAL_DELAY || 0);
			var fishList = data.fish || [];
			function processAll() {
				for (var i = 0; i < fishList.length; i++) {
					var d = fishList[i];
					var payload = {
						id: d.id,
						pos: { x: d.pos.x, y: d.pos.y },
						ctp: d.ctp ? d.ctp.slice() : [],
						size: d.size,
						color: d.color,
						name: d.name,
						mouthOpen: d.mouthOpen === true
					};
					if (d.lookTarget && typeof d.lookTarget.x === "number" && typeof d.lookTarget.y === "number") {
						payload.lookTarget = { x: d.lookTarget.x, y: d.lookTarget.y };
					}
					processFishToClient(payload);
				}
			}
			if (delay > 0) {
				setTimeout(processAll, delay);
			} else {
				processAll();
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
		var payload = {
			id: fish.id,
			pos: fish.pos,
			ctp: fish.ctp,
			size: fish.size,
			color: color,
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
