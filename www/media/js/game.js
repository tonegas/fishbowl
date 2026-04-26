"use strict";

(function (window) {
	var cfg = window.FishbowlConfig;
	var state = window.Fishbowl;
	var network = window.FishbowlNetwork;
	var ui = window.FishbowlUI;

	var key = new Kibo();
	var timePrev;
	var debugDelaySamples = [];

	function clampFrameDelta(dt) {
		var cap = cfg.maxFrameDt;
		if (dt <= 0) return 0;
		return dt < cap ? dt : cap;
	}

	/** Stesso aggiornamento pesci remoti su tutte le schermate (nome, tutorial, leaderboard, gioco). */
	function advanceOtherFish(lake, worldDt, now, vxMin, vxMax, vyMin, vyMax, myView, localPlayActive) {
		var toRemove = [];
		var i;
		var mySim = myView ? myView.sim : null;
		for (i = 0; i < lake.otherFishId.length; i++) {
			var other = lake.otherFish[lake.otherFishId[i]];
			if (!other) continue;
			var oSim = other.sim;
			var root = other.fishParts && other.fishParts.cont && other.fishParts.cont[0];
			if (root && other._lastPos && other._lastVelocity && other._lastUpdateTime !== undefined) {
				var ext = Math.min(now - other._lastUpdateTime, 0.15);
				var targetX = other._lastPos.x + other._lastVelocity.x * ext;
				var targetY = other._lastPos.y + other._lastVelocity.y * ext;
				var smooth = cfg.otherFishSmooth;
				if (smooth > 0 && smooth < 1) {
					root.x = root.x + (targetX - root.x) * smooth;
					root.y = root.y + (targetY - root.y) * smooth;
				} else {
					root.x = targetX;
					root.y = targetY;
				}
				oSim.pos.x = root.x;
				oSim.pos.y = root.y;
			}
			if (other._displayCtp && other._targetCtp) {
				var ctpSmooth = cfg.otherFishSmooth;
				var tc = other._targetCtp;
				var dc = other._displayCtp;
				if (tc.length !== dc.length) {
					other._displayCtp = tc.slice();
				} else {
					for (var ci = 0; ci < tc.length; ci++) {
						var diff = tc[ci] - dc[ci];
						while (diff > Math.PI) diff -= 2 * Math.PI;
						while (diff < -Math.PI) diff += 2 * Math.PI;
						if (ctpSmooth > 0 && ctpSmooth < 1) {
							dc[ci] = dc[ci] + diff * ctpSmooth;
						} else {
							dc[ci] = tc[ci];
						}
					}
				}
			}
			other.sync(worldDt);
			if (myView) {
				other.updateRemotePlayerLabels(myView, lake);
			}
			if (root) {
				var ox = root.x, oy = root.y;
				root.visible = (ox >= vxMin && ox <= vxMax && oy >= vyMin && oy <= vyMax);
			}
			if (mySim && localPlayActive) {
				mySim.bite(mySim, oSim);
				if (oSim.alive) mySim.bite(oSim, mySim);
			}
			if (oSim.setAlive(-worldDt) === false) {
				other.die();
				toRemove.push(lake.otherFishId[i]);
			}
		}
		for (var k = 0; k < toRemove.length; k++) {
			lake.otherFish[toRemove[k]] = null;
		}
		lake.otherFishId = _.difference(lake.otherFishId, toRemove);
	}

	function drawBackground(lake, ls) {
		var halfLake = cfg.lakeSize / 2;
		var lakeLeft = (-halfLake - lake.x) * ls;
		var lakeRight = (halfLake - lake.x) * ls;
		var lakeTop = (-halfLake - lake.y) * ls;
		var lakeBottom = (halfLake - lake.y) * ls;
		var sx = state.stage.x;
		var sy = state.stage.y;
		state.bg.graphics.clear().beginFill("#888899").drawRect(-sx, -sy, state.stage.canvas.width, state.stage.canvas.height).endFill();
		var drawL = Math.max(lakeLeft, -sx);
		var drawR = Math.min(lakeRight, sx);
		var drawT = Math.max(lakeTop, -sy);
		var drawB = Math.min(lakeBottom, sy);
		if (drawL < drawR && drawT < drawB) {
			state.bg.graphics.beginLinearGradientFill(["#77F", "#113"], [0, 1], drawL, lakeTop, drawL, lakeBottom).drawRect(drawL, drawT, drawR - drawL, drawB - drawT).endFill();
		}
	}
	function drawInitialBackground() { drawBackground({ x: 0, y: 0 }, cfg.lakeScaleStart); }

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

	function setupLakeWorld(data) {
		var pos = data.pos;
		state.stage.removeAllChildren();
		state.lakeStage.removeAllChildren();
		state.stage.addChild(state.lakeStage);

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

		var halfLake = cfg.lakeSize / 2;
		var foodSpawnRadius = cfg.foodSpawnRadius;
		var cx = state.lake.x;
		var cy = state.lake.y;
		for (var j = 0; j < state.lake.mObjectN; j++) {
			var size = cfg.foodSizeMin + Math.random() * (cfg.foodSizeMax - cfg.foodSizeMin);
			var lx = cx + (Math.random() * 2 - 1) * foodSpawnRadius;
			var ly = cy + (Math.random() * 2 - 1) * foodSpawnRadius;
			lx = Math.max(-halfLake + 1, Math.min(halfLake - 1, lx));
			ly = Math.max(-halfLake + 1, Math.min(halfLake - 1, ly));
			var foodSim = new FoodSim(size, lx, ly);
			var foodView = new FoodView(foodSim);
			state.lake.mObject[j] = foodView;
			state.lakeStage.addChildAt(foodView.shape, 0);
		}
		state.lakeStage.addChild(state.waterSurface.shape);
		state.lakeStage.addChild(state.lakeBorder.shape);
		state.lakeStage.addChildAt(state.lakeBorder.innerLineShape, 0);
		state.stage.addChildAt(state.bg, 0);
	}

	function applyLakeStageViewport(ls, lake) {
		if (!state.lakeStage || !lake) return;
		state.lakeStage.scaleX = ls;
		state.lakeStage.scaleY = ls;
		state.lakeStage.regX = lake.x;
		state.lakeStage.regY = lake.y;
	}

	function applySpectatorLake(data) {
		if (state.myFish) return;
		if (!data || !data.fobj || !data.pos) return;
		state.savedLakeScale = null;
		var nx = data.pos.x;
		var ny = data.pos.y;
		if (state.lake && state._spectatorLakePos &&
			state._spectatorLakePos.x === nx && state._spectatorLakePos.y === ny) {
			return;
		}
		if (state.lake) {
			state.gameGeneration = (state.gameGeneration || 0) + 1;
		}
		setupLakeWorld(data);
		state._spectatorLakePos = { x: nx, y: ny };
		applyLakeStageViewport(cfg.lakeScaleStart, state.lake);
		if (state.bg) {
			drawInitialBackground();
		}
		state.stage.update();
	}

	function onNewFish(data) {
		state.savedLakeScale = null;
		state.debugEnabled = data.debugEnabled === true;
		state.gameGeneration = (state.gameGeneration || 0) + 1;
		setupLakeWorld(data);

		var pos = data.pos;
		var hue = Math.ceil(Math.random() * 360);
		var sim = new FishSim(data.id, pos, [0, 0, 0, 0, 0], state.playerName, hue);
		state.myFish = new FishView(sim, true);
		state.mySim = sim;
		resize();

		applyLakeStageViewport(sim.lakeScale, state.lake);

		state.localPlayActive = false;
		ui.showTutorial();
	}

	function tick(event) {
		var socket = window.FishbowlSocket;
		var dt = (timePrev !== undefined) ? (event.time - timePrev) / 1000 : 0;
		timePrev = event.time;

		if (!state.lake) {
			if (!state.myFish && state.bg) {
				drawInitialBackground();
			}
			if (state.debugEnabled && !state.myFish) {
				debugDelaySamples = [];
				ui.hideDebugPanels();
			}
			state.stage.update(event);
			return;
		}

		var fish = state.myFish;
		var sim = fish ? fish.sim : null;
		var lake = state.lake;
		var worldDt = clampFrameDelta(dt);

		var ls;
		if (sim) {
			var simDt = state.localPlayActive ? worldDt : 0;
			sim._mouthOpen = false;
			if (!sim.update(simDt, lake)) {
				handleFishDeath(socket);
				state.stage.update(event);
				return;
			}
			ls = sim.lakeScale;
			drawBackground(lake, ls);
			/* Allinea cont[0] e mounth/fin a sim.pos PRIMA di eat/bite, come Fish.update originale (che chiamava set→updateMouthFin in coda all'update). */
			fish.syncTransform();
		} else {
			if (state.bg) {
				drawInitialBackground();
			}
			ls = state.savedLakeScale || cfg.lakeScaleStart;
		}
		applyLakeStageViewport(ls, lake);

		var cw = state.stage.canvas.width;
		var ch = state.stage.canvas.height;
		var margin = 1.3 * Math.max(1, ls / 2);
		var halfW = (cw / ls) * margin;
		var halfH = (ch / ls) * margin;
		var vxMin = lake.x - halfW;
		var vxMax = lake.x + halfW;
		var vyMin = lake.y - halfH;
		var vyMax = lake.y + halfH;

		var i, o;
		for (i = 0; i < lake.fObject.N; i++) {
			o = lake.fObject.list[i];
			o.visible = (o.x >= vxMin && o.x <= vxMax && o.y >= vyMin && o.y <= vyMax);
		}

		if (state.waterSurface) {
			state.waterSurface.draw(lake, ls, worldDt);
		}
		if (state.lakeBorder) {
			state.lakeBorder.draw(lake, ls, sim || null);
		}

		var foodToRemove = [];
		_.each(lake.mObject, function(food) {
			if (sim && food.sim.size < sim.size / 2.0) {
				state.lakeStage.removeChild(food.shape);
				foodToRemove.push(food);
				return;
			}
			food.sim.update(lake.x, lake.y);
			food.sync();
			food.shape.visible = (food.sim.x >= vxMin && food.sim.x <= vxMax && food.sim.y >= vyMin && food.sim.y <= vyMax);
			if (sim && state.localPlayActive) sim.eat(food.sim);
		});
		if (foodToRemove.length) lake.mObject = _.difference(lake.mObject, foodToRemove);

		var now = (typeof performance !== "undefined" && performance.now) ? performance.now() / 1000 : Date.now() / 1000;
		advanceOtherFish(lake, worldDt, now, vxMin, vxMax, vyMin, vyMax, fish, state.localPlayActive);

		if (sim) {
			fish.sync(worldDt);
		}

		if (state.debugEnabled) {
			var delaySum = 0, delayCount = 0;
			for (var di = 0; di < lake.otherFishId.length; di++) {
				var oth = lake.otherFish[lake.otherFishId[di]];
				if (oth && oth._lastUpdateTime !== undefined) { delaySum += (now - oth._lastUpdateTime) * 1000; delayCount++; }
			}
			var instantAvg = delayCount > 0 ? delaySum / delayCount : 0;
			if (sim) {
				debugDelaySamples.push({ t: now, v: instantAvg });
				while (debugDelaySamples.length > 0 && debugDelaySamples[0].t < now - 1) debugDelaySamples.shift();
				var sum1s = 0;
				for (var si = 0; si < debugDelaySamples.length; si++) sum1s += debugDelaySamples[si].v;
				instantAvg = debugDelaySamples.length > 0 ? sum1s / debugDelaySamples.length : instantAvg;
			} else {
				debugDelaySamples = [];
			}
			var transport = (socket && socket.io && socket.io.engine && socket.io.engine.transport) ? socket.io.engine.transport.name : null;
			ui.updateDebugLocalPanel(sim ? { life: sim.life, time: sim.time, size: sim.size, scale: sim.scale, lifeGain: sim.lifeGain, gainWeight: sim.gainWeight, lakeScale: sim.lakeScale } : null);
			ui.updateDebugRemotePanel({ connected: !!(socket && socket.connected), transport: transport, networkMode: state.networkMode, avgDelayMs: (sim && delayCount > 0) ? instantAvg : undefined, fishCount: sim ? delayCount : 0, gameGeneration: state.gameGeneration || 0 });
			var totalFish = 1 + ((lake && lake.otherFishId) ? lake.otherFishId.length : 0);
			ui.updateDebugBitePanel((sim && totalFish === 2) ? (state.debugFishBite || null) : null);
		} else {
			debugDelaySamples = [];
			ui.hideDebugPanels();
		}

		var sortable = [];
		if (sim) sortable.push({ obj: fish.fishParts.cont[0], depth: 1000 + sim.size * cfg.mouthSizeFactor / 2 });
		_.each(lake.otherFishId, function(id) {
			var v = lake.otherFish[id];
			if (v && v.fishParts.cont[0] && state.lakeStage.getChildIndex(v.fishParts.cont[0]) >= 0) sortable.push({ obj: v.fishParts.cont[0], depth: 1000 + v.sim.size });
		});
		_.each(lake.mObject, function(food) {
			if (state.lakeStage.getChildIndex(food.shape) >= 0) sortable.push({ obj: food.shape, depth: food.sim.size });
		});
		for (i = 0; i < lake.fObject.N; i++) sortable.push({ obj: lake.fObject.list[i], depth: 1000 + lake.fObject.list[i].scaleX });
		sortable.sort(function(a, b) { return a.depth - b.depth; });
		var order = [];
		if (state.lakeBorder && state.lakeBorder.innerLineShape) order.push(state.lakeBorder.innerLineShape);
		for (i = 0; i < sortable.length; i++) order.push(sortable[i].obj);
		if (state.waterSurface && state.waterSurface.shape) order.push(state.waterSurface.shape);
		if (state.lakeBorder && state.lakeBorder.shape) order.push(state.lakeBorder.shape);
		for (i = 0; i < order.length; i++) {
			if (state.lakeStage.getChildIndex(order[i]) >= 0) state.lakeStage.setChildIndex(order[i], i);
		}

		if (sim && state.localPlayActive) {
			network.sendFish(socket);
		}

		if (sim && !sim.alive) {
			handleFishDeath(socket);
		}

		state.stage.update(event);
	}

	function handleFishDeath(socket) {
		var fish = state.myFish;
		var sim = fish.sim;
		sim.ctp = [];
		sim.nRPart = 0;
		network.sendFish(socket);
		var maxWeight = sim.max_weight || 0;
		fish.die();
		state.lastLeaderboardName = state.playerName;
		ui.showLeaderboardLoading();
		network.emitFishDeath(socket, maxWeight);
		state.playerName = null;
		state.savedLakeScale = sim.lakeScale;
		state.myFish = null;
		state.mySim = null;
		state.lake.vx = 0;
		state.lake.vy = 0;
		setTimeout(function() {
			socket.emit("leaderboard_request");
		}, 200);
	}

	function setupKeyboard() {
		function onMoveKey() {
			if (document.getElementById("tutorialOverlay").classList.contains("visible")) {
				ui.hideTutorial();
				state.localPlayActive = true;
			}
		}
		["up", "down", "left", "right"].forEach(function(d) {
			key.down(d, function() { onMoveKey(); if (state.mySim) state.mySim[d] = true; return false; });
			key.up(d, function() { if (state.mySim) state.mySim[d] = false; return false; });
		});
		key.down("q", function() {
			if (state.debugEnabled && state.mySim) {
				state.mySim.addLifeGain(0.02, "fish");
				console.log("Growing up to life " + state.mySim.life + " lifeGain " + state.mySim.lifeGain + " gainWeight x" + state.mySim.gainWeight + " Growing up to size " + state.mySim.size);
			}
			return false;
		});
		key.down("w", function() {
			if (state.debugEnabled && state.mySim) state.mySim.size = Math.max(state.mySim.size / 1.1, cfg.fishSizeStart);
			return false;
		});
	}

	function resetKeys() {
		if (state.mySim) {
			["left", "right", "up", "down"].forEach(function(d) { state.mySim[d] = false; });
		}
	}

	function resize() {
		state.stage.canvas.width = window.innerWidth;
		state.stage.canvas.height = window.innerHeight;
		if (state.myFish) {
			state.myFish.layoutLocalHud();
		}
		state.stage.x = state.stage.canvas.width / 2;
		state.stage.y = state.stage.canvas.height / 2;
	}

	window.FishbowlGame = {
		init: init,
		onNewFish: onNewFish,
		applySpectatorLake: applySpectatorLake
	};
}(window));
