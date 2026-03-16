"use strict";

(function (window) {
	var state = window.Fishbowl;

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
			if (!state.lake || !state.myFish || state.myFish.id === data.id) return;
			var lake = state.lake;
			if (lake.otherFish[data.id]) {
				lake.otherFish[data.id].set(data.ctp, data.pos, data.size, data.color, lake, data.name);
				lake.otherFish[data.id].setAlive(1);
			} else {
				lake.otherFishId.push(data.id);
				lake.otherFish[data.id] = new Fish(data.id, data.pos, data.ctp, data.color, data.name || "Fish");
				lake.otherFish[data.id].setAlive(1);
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
