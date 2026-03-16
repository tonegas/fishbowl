"use strict";

(function (window) {
	var cfg = window.FishbowlConfig;
	var state = window.Fishbowl;
	var network = window.FishbowlNetwork;
	var ui = window.FishbowlUI;

	var key = new Kibo();
	var timePrev;

	function drawInitialBackground() {
		var halfLake = (cfg.LAKE_SIZE || 10000) / 2;
		var ls = cfg.LAKE_START_SIZE || 10;
		var lake = { x: 0, y: 0 };
		var lakeLeft = (-halfLake - lake.x) * ls;
		var lakeRight = (halfLake - lake.x) * ls;
		var lakeTop = (-halfLake - lake.y) * ls;
		var lakeBottom = (halfLake - lake.y) * ls;
		var sx = state.stage.x;
		var sy = state.stage.y;
		state.bg.graphics.clear();
		state.bg.graphics.beginFill("#888899").drawRect(-sx, -sy, state.stage.canvas.width, state.stage.canvas.height).endFill();
		var drawL = Math.max(lakeLeft, -sx);
		var drawR = Math.min(lakeRight, sx);
		var drawT = Math.max(lakeTop, -sy);
		var drawB = Math.min(lakeBottom, sy);
		if (drawL < drawR && drawT < drawB) {
			state.bg.graphics.beginLinearGradientFill(["#77F", "#113"], [0, 1], drawL, lakeTop, drawL, lakeBottom).drawRect(drawL, drawT, drawR - drawL, drawB - drawT).endFill();
		}
	}

	function init(socket, loader) {
		state.loader = loader;
		if (!createjs.Ticker.hasEventListener("tick")) {
			createjs.Ticker.addEventListener("tick", tick);
		}
		state.stage = new createjs.Stage("Lake");
		state.stage.enableDOMEvents(true);
		state.lakeStage = new createjs.Container();
		state.bg = new createjs.Shape();
		resize();
		drawInitialBackground();
		state.stage.addChild(state.bg);
		ui.initNameOverlay(socket);
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
		state.waterSurface = new WaterSurface();
		state.lakeBorder = new LakeBorder();
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

		var halfLake = (cfg.LAKE_SIZE || 1000) / 2;
		var foodMargin = 1;
		for (var j = 0; j < state.lake.mObjectN; j++) {
			var size = Math.random() * 0.5 + 0.04;
			var lx = -halfLake + foodMargin + Math.random() * Math.max(0, 2 * halfLake - 2 * foodMargin);
			var ly = -halfLake + foodMargin + Math.random() * Math.max(0, 2 * halfLake - 2 * foodMargin);
			state.lake.mObject[j] = new Food(size, lx, ly);
			state.lakeStage.addChildAt(state.lake.mObject[j], 0);
		}
		state.lakeStage.addChild(state.waterSurface.shape);
		state.lakeStage.addChild(state.lakeBorder.shape);
		state.lakeStage.addChildAt(state.lakeBorder.innerLineShape, 0);
		state.stage.addChildAt(state.bg, 0);
		ui.showTutorial();
	}

	function tick(event) {
		var socket = window.FishbowlSocket;
		var dt = (timePrev !== undefined) ? (event.time - timePrev) / 1000 : 0;
		timePrev = event.time;

		if (!state.myFish || dt >= 0.1) {
			if (!state.myFish && state.bg) {
				drawInitialBackground();
			}
			state.stage.update(event);
			return;
		}

		var fish = state.myFish;
		var lake = state.lake;

		if (fish.update(dt, lake)) {
			network.sendFish(socket);
			state.lakeStage.scaleX = fish.lake_size;
			state.lakeStage.scaleY = fish.lake_size;
			if (state.waterSurface) {
				state.waterSurface.draw(lake, fish.lake_size, dt);
				state.lakeStage.setChildIndex(state.waterSurface.shape, state.lakeStage.getNumChildren() - 2);
			}
			if (state.lakeBorder) {
				state.lakeBorder.draw(lake, fish.lake_size, fish);
				state.lakeStage.setChildIndex(state.lakeBorder.innerLineShape, 0);
				state.lakeStage.setChildIndex(state.lakeBorder.shape, state.lakeStage.getNumChildren() - 1);
			}

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
		function onMoveKey() {
			if (document.getElementById("tutorialOverlay").classList.contains("visible")) {
				ui.hideTutorial();
			}
		}
		key.down("up", function() { onMoveKey(); if (state.myFish) state.myFish.up = true; return false; });
		key.up("up", function() { if (state.myFish) state.myFish.up = false; return false; });
		key.down("down", function() { onMoveKey(); if (state.myFish) state.myFish.down = true; return false; });
		key.up("down", function() { if (state.myFish) state.myFish.down = false; return false; });
		key.down("left", function() { onMoveKey(); if (state.myFish) state.myFish.left = true; return false; });
		key.up("left", function() { if (state.myFish) state.myFish.left = false; return false; });
		key.down("right", function() { onMoveKey(); if (state.myFish) state.myFish.right = true; return false; });
		key.up("right", function() { if (state.myFish) state.myFish.right = false; return false; });
		key.down("q", function() {
			if (state.myFish) {
				state.myFish.life = Math.min(state.myFish.life + 30, state.myFish.max_life);

				state.myFish.size_time += 10;
				state.myFish.size_time = Math.min(state.myFish.size_time, cfg.FISH_END_LIFE);
			}
			return false;
		});
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
