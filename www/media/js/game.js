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
		state.stage.enableDOMEvents(false);
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
		state.cheatEnabled = data.cheatEnabled === true;
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

		var halfLake = (cfg.LAKE_SIZE || 10000) / 2;
		var foodSpawnRadius = cfg.FOOD_SPAWN_RADIUS || cfg.FOOD_SPAWN_HALF || 1000;
		var cx = state.lake.x;
		var cy = state.lake.y;
		for (var j = 0; j < state.lake.mObjectN; j++) {
			var size = cfg.FOOD_SIZE_MIN + Math.random() * (cfg.FOOD_SIZE_MAX - cfg.FOOD_SIZE_MIN);
			var lx = cx + (Math.random() * 2 - 1) * foodSpawnRadius;
			var ly = cy + (Math.random() * 2 - 1) * foodSpawnRadius;
			lx = Math.max(-halfLake + 1, Math.min(halfLake - 1, lx));
			ly = Math.max(-halfLake + 1, Math.min(halfLake - 1, ly));
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

			var cw = state.stage.canvas.width;
			var ch = state.stage.canvas.height;
			var ls = fish.lake_size;
			// Con pesce piccolo (ls grande) la viewport è stretta e le alghe appaiono "in ritardo".
			// Aumentiamo il margin quando ls è grande per mostrare più alghe.
			var margin = 1.3 * Math.max(1, ls / 2);
			var halfW = (cw / ls) * margin;
			var halfH = (ch / ls) * margin;
			var vxMin = lake.x - halfW;
			var vxMax = lake.x + halfW;
			var vyMin = lake.y - halfH;
			var vyMax = lake.y + halfH;

			var i, o;
			for (i = 0; i < state.lake.fObject.N; i++) {
				o = state.lake.fObject.list[i];
				o.visible = (o.x >= vxMin && o.x <= vxMax && o.y >= vyMin && o.y <= vyMax);
			}

			if (state.waterSurface) {
				state.waterSurface.draw(lake, fish.lake_size, dt);
				state.lakeStage.setChildIndex(state.waterSurface.shape, state.lakeStage.getNumChildren() - 2);
			}
			if (state.lakeBorder) {
				state.lakeBorder.draw(lake, fish.lake_size, fish);
				state.lakeStage.setChildIndex(state.lakeBorder.innerLineShape, 0);
				state.lakeStage.setChildIndex(state.lakeBorder.shape, state.lakeStage.getNumChildren() - 1);
			}

			var foodToRemove = [];
			_.each(lake.mObject, function(obj) {
				if (obj.size < fish.size / 2.0) {
					state.lakeStage.removeChild(obj);
					foodToRemove.push(obj);
				} else {
					obj.update(event, lake.x, lake.y);
					obj.visible = (obj.x >= vxMin && obj.x <= vxMax && obj.y >= vyMin && obj.y <= vyMax);
					fish.eat(obj);
				}
			});
			if (foodToRemove.length) {
				lake.mObject = _.difference(lake.mObject, foodToRemove);
			}

			var toRemove = [];
			var now = (typeof performance !== "undefined" && performance.now) ? performance.now() / 1000 : Date.now() / 1000;
			for (var i = 0; i < lake.otherFishId.length; i++) {
				var other = lake.otherFish[lake.otherFishId[i]];
				if (!other) continue;
				var root = other.fishParts && other.fishParts.cont && other.fishParts.cont[0];
				if (root && other._lastPos && other._lastVelocity && other._lastUpdateTime !== undefined) {
					var ext = now - other._lastUpdateTime;
					root.x = other._lastPos.x + other._lastVelocity.x * ext;
					root.y = other._lastPos.y + other._lastVelocity.y * ext;
				}
				if (root) {
					var ox = root.x, oy = root.y;
					root.visible = (ox >= vxMin && ox <= vxMax && oy >= vyMin && oy <= vyMax);
				}
				fish.bite(fish, other);
				if (other.alive) fish.bite(other, fish);
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
			if (state.cheatEnabled && state.myFish) {
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
