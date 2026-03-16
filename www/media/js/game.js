"use strict";

(function (window) {
	var cfg = window.FishbowlConfig;
	var state = window.Fishbowl;
	var network = window.FishbowlNetwork;
	var ui = window.FishbowlUI;

	var key = new Kibo();
	var timePrev;

	function init(socket, loader) {
		state.loader = loader;
		if (!createjs.Ticker.hasEventListener("tick")) {
			createjs.Ticker.addEventListener("tick", tick);
		}
		state.stage = new createjs.Stage("Lake");
		state.stage.enableDOMEvents(true);
		state.lakeStage = new createjs.Container();
		state.bg = new createjs.Shape();
		ui.initNameOverlay(socket);
		resize();
		state.stage.update();
		setupKeyboard();
		window.addEventListener("resize", resize, false);
		window.addEventListener("blur", resetKeys, false);
		document.addEventListener("visibilitychange", function() {
			if (document.hidden) resetKeys();
		}, false);
	}

	function onNewFish(data) {
		state.stage.removeAllChildren();
		state.lakeStage.removeAllChildren();
		state.stage.addChild(state.lakeStage);

		var pos = data.pos;
		state.lake = new Lake();
		state.lake.x = pos.x;
		state.lake.y = pos.y;
		state.lake.fObject = data.fobj;

		var loader = state.loader;
		for (var i = 0; i < state.lake.fObject.N; i++) {
			var a = state.lake.fObject.list[i];
			state.lake.fObject.list[i] = new Algae(a.s, a.x, a.y, a.r, a.t, loader);
			state.lakeStage.addChildAt(state.lake.fObject.list[i], 0);
		}

		var color = createjs.Graphics.getHSL(Math.ceil(Math.random() * 360), 100, 50);
		state.myFish = new Fish(data.id, pos, [0, 0, 0, 0, 0], color, state.playerName);

		for (var j = 0; j < state.lake.mObjectN; j++) {
			var lx = cfg.FOOD_SPAWN_HALF - Math.random() * cfg.FOOD_SPAWN_HALF * 2 + state.lake.x;
			var ly = cfg.FOOD_SPAWN_HALF - Math.random() * cfg.FOOD_SPAWN_HALF * 2 + state.lake.y;
			state.lake.mObject[j] = new Food(Math.random() * 0.5 + 0.04, lx, ly);
			state.lakeStage.addChildAt(state.lake.mObject[j], 0);
		}
		state.stage.addChildAt(state.bg, 0);
	}

	function tick(event) {
		var socket = window.FishbowlSocket;
		var dt = (timePrev !== undefined) ? (event.time - timePrev) / 1000 : 0;
		timePrev = event.time;

		if (!state.myFish || dt >= 0.1) {
			state.stage.update(event);
			return;
		}

		var fish = state.myFish;
		var lake = state.lake;

		if (fish.update(dt, lake)) {
			network.sendFish(socket);
			state.lakeStage.scaleX = fish.lake_size;
			state.lakeStage.scaleY = fish.lake_size;

			_.each(lake.mObject, function(obj) {
				if (obj.size < fish.size) {
					state.lakeStage.removeChild(obj);
					lake.mObject = _.without(lake.mObject, _.findWhere(lake.mObject, obj));
				} else {
					obj.update(event, lake.x, lake.y);
					fish.eat(obj);
				}
			});

			var toRemove = [];
			for (var i = 0; i < lake.otherFishId.length; i++) {
				var other = lake.otherFish[lake.otherFishId[i]];
				fish.bite(fish, other);
				fish.bite(other, fish);
				if (other.setAlive(-dt) === false) {
					toRemove.push(lake.otherFishId[i]);
				}
			}
			for (var k = 0; k < toRemove.length; k++) {
				lake.otherFish[toRemove[k]] = null;
			}
			lake.otherFishId = _.difference(lake.otherFishId, toRemove);

			if (!fish.alive) {
				handleFishDeath(socket);
			}
		} else {
			handleFishDeath(socket);
		}
		state.stage.update(event);
	}

	function handleFishDeath(socket) {
		var fish = state.myFish;
		fish.ctp = [];
		network.sendFish(socket);
		var maxWeight = fish.max_weight || 0;
		fish.die();
		state.myFish = null;
		state.lake.x = 0;
		state.lake.y = 0;
		state.lake.vx = 0;
		state.lake.vy = 0;
		ui.showLeaderboardLoading();
		network.emitFishDeath(socket, maxWeight);
		setTimeout(function() {
			socket.emit("leaderboard_request");
		}, 200);
	}

	function setupKeyboard() {
		key.down("up", function() { if (state.myFish) state.myFish.up = true; return false; });
		key.up("up", function() { if (state.myFish) state.myFish.up = false; return false; });
		key.down("down", function() { if (state.myFish) state.myFish.down = true; return false; });
		key.up("down", function() { if (state.myFish) state.myFish.down = false; return false; });
		key.down("left", function() { if (state.myFish) state.myFish.left = true; return false; });
		key.up("left", function() { if (state.myFish) state.myFish.left = false; return false; });
		key.down("right", function() { if (state.myFish) state.myFish.right = true; return false; });
		key.up("right", function() { if (state.myFish) state.myFish.right = false; return false; });
	}

	function resetKeys() {
		if (state.myFish) {
			state.myFish.left = false;
			state.myFish.right = false;
			state.myFish.up = false;
			state.myFish.down = false;
		}
	}

	function resize() {
		state.stage.canvas.width = window.innerWidth;
		state.stage.canvas.height = window.innerHeight;
		if (state.myFish) {
			state.myFish.info.x = (state.stage.canvas.width / 2) - 12;
			state.myFish.info.y = -(state.stage.canvas.height / 2) + 8;
		}
		state.stage.x = state.stage.canvas.width / 2;
		state.stage.y = state.stage.canvas.height / 2;
	}

	window.FishbowlGame = {
		init: init,
		onNewFish: onNewFish
	};
}(window));
