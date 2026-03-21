"use strict";

(function (window) {
	var cfg = window.FishbowlConfig || { MOUTH_SIZE_FACTOR: 5, CHASE_DISTANCE_FACTOR: 5, FOOD_SPAWN_HALF: 400, LAKE_SIZE: 10000, FISH_INITIAL_LIFE: 180, FISH_END_LIFE: 1200, LAKE_START_SIZE: 10, FISH_START_SIZE: 0.04, FISH_END_SIZE: 2, WHOLE_FISH_SIZE_RATIO: 3, FOOD_SIZE_MIN: 0.02, FOOD_SIZE_MAX: 0.54 };
	var state = window.Fishbowl;

	function Fish(id, pos, ctp, colorStr, name) {
		this.id = id;
		this.name = name || "Fish";
		this.start_pos = { x: pos.x, y: pos.y };
		this.pos = { x: pos.x, y: pos.y };
		this.vel = { x: 0, y: 0 };
		this.velt = 0;
		this.acc = { x: 0, y: 0 };
		this.acct = 0;
		this.ctp = ctp;
		this.ctv = new Array(ctp.length + 1).join("0").split("").map(parseFloat);
		this.cta = new Array(ctp.length + 1).join("0").split("").map(parseFloat);
		this.color = colorStr.substr(4).split(",")[0] * 1;
		this.mounth = { x: 0, y: 0 };
		this.fin = { x: 0, y: 0 };

		var lakeStartSize = cfg.LAKE_START_SIZE;
		var lakeEndSize = cfg.LAKE_END_SIZE;
		var startFishSize = cfg.FISH_START_SIZE / cfg.LAKE_START_SIZE;
		var endFishSize = cfg.FISH_END_SIZE / cfg.LAKE_END_SIZE;
		var startScreenSize = startFishSize * lakeStartSize;
		var endScreenSize = endFishSize * lakeEndSize;

		this.time = 0;
		this.max_life = cfg.FISH_INITIAL_LIFE;
		this.life = cfg.FISH_INITIAL_LIFE;
		this.size_time = 0;
		this.size = startFishSize;
		this.lake_size = lakeStartSize;
		this.screen_size = startScreenSize;
		this.max_weight = Math.pow(this.size, 3) * 100;
		this.alive = true;
		this.look_target = null;
		this.left = false;
		this.right = false;
		this.up = false;
		this.down = false;
		this.nextPos = false;
		this.sp = 0;
		this.fsp = 0;
		this.ssp = 0;
		this.finSpreadLateral = 0;

		this.fishParts = {
			nPart: 5,
			nRPart: 5,
			dim: [60, 60, 50, 30, 35],
			dimS: [{ x: 50, y: 109 }, { x: 33, y: 109 }, { x: 19, y: 84 }, { x: 11, y: 44 }, { x: 6, y: 43 }],
			fin: [],
			mounth: null,
			part: [],
			cont: []
		};

		var fP = this.fishParts;
		var stage = state.stage;
		var lakeStage = state.lakeStage;
		var lake = state.lake;

		for (var i = fP.nPart - 1; i >= 0; i--) {
			fP.part[i] = new createjs.Shape();
			fP.part[i].regX = fP.dimS[i].x / 2;
			fP.part[i].regY = fP.dimS[i].y - fP.dim[i] - 5;
			fP.cont[i] = new createjs.Container();
			if (i < fP.nPart - 1) fP.cont[i].addChild(fP.cont[i + 1]);
			fP.cont[i].addChild(fP.part[i]);
			fP.cont[i].y = i > 0 ? fP.dim[i - 1] : 0;
		}

		var lfin = new createjs.Shape();
		lfin.regX = fP.dimS[0].x / 2 - 3;
		lfin.regY = 10;
		lfin.graphics.beginFill(createjs.Graphics.getHSL(this.color, 50, 60)).bezierCurveTo(0, 0, 10, 40, -20, 40).endFill();
		fP.fin[0] = lfin;
		fP.cont[0].addChild(lfin);

		var rfin = new createjs.Shape();
		rfin.regX = -fP.dimS[0].x / 2 + 3;
		rfin.regY = 10;
		rfin.graphics.beginFill(createjs.Graphics.getHSL(this.color, 50, 60)).bezierCurveTo(0, 0, -10, 40, 20, 40).endFill();
		fP.fin[1] = rfin;
		fP.cont[0].addChild(rfin);

		var dfin = new createjs.Shape();
		dfin.regX = 0;
		dfin.regY = 8;
		dfin.x = 0;
		dfin.y = -10;
		dfin.graphics.beginFill(createjs.Graphics.getHSL(this.color, 50, 60)).bezierCurveTo(0, 0, -15, 25, 0, 60).closePath().endFill();
		dfin.graphics.beginFill(createjs.Graphics.getHSL(this.color, 50, 60)).bezierCurveTo(0, 0, 15, 25, 0, 60).closePath().endFill();
		fP.dfin = dfin;
		fP.cont[0].addChild(dfin);

		var mounth = new createjs.Shape();
		mounth.regX = 0;
		mounth.regY = 0;
		mounth.x = 0;
		mounth.y = -40;
		mounth.graphics.beginFill("#AA5555").drawEllipse(-5, -5, 10, 5).endFill();
		fP.mounth = mounth;
		fP.cont[0].addChild(mounth);

		fP.cont[0].scaleX = this.size;
		fP.cont[0].scaleY = this.size;
		fP.cont[0].x = this.start_pos.x;
		fP.cont[0].y = this.start_pos.y;
		lakeStage.addChildAt(fP.cont[0], 0);

		var eye = new createjs.Shape();
		eye.graphics.beginFill(createjs.Graphics.getHSL(this.color, 50, 70)).drawCircle(-15, -30, 8);
		eye.graphics.beginFill(createjs.Graphics.getHSL(this.color, 50, 70)).drawCircle(15, -30, 8);
		fP.cont[0].addChild(eye);

		var pupilL = new createjs.Shape();
		pupilL.graphics.beginFill("#000000").drawCircle(0, 0, 3);
		pupilL.regX = pupilL.regY = 0;
		pupilL.x = -15;
		pupilL.y = -30;
		fP.pupilL = pupilL;
		fP.cont[0].addChild(pupilL);

		var pupilR = new createjs.Shape();
		pupilR.graphics.beginFill("#000000").drawCircle(0, 0, 3);
		pupilR.regX = pupilR.regY = 0;
		pupilR.x = 15;
		pupilR.y = -30;
		fP.pupilR = pupilR;
		fP.cont[0].addChild(pupilR);

		this.nameLabel = new createjs.Text(this.name || "Fish", "8px Arial", "#ffffff");
		this.nameLabel.alpha = 0.75;
		this.nameLabel.textAlign = "center";
		this.nameLabel.visible = false;
		stage.addChild(this.nameLabel);

		this.arrow = new createjs.Shape();
		this.arrow.graphics.beginFill(createjs.Graphics.getHSL(this.color, 50, 60)).lineTo(-5, 12.5).bezierCurveTo(-5, 12, 0, 8, 5, 12.2).lineTo(0, 0).endFill();
		this.arrow.visible = false;
		stage.addChild(this.arrow);

		this.arrowLabel = new createjs.Text("", "8px Arial", "#ffffff");
		this.arrowLabel.visible = false;
		this.arrowLabel.textAlign = "center";
		this.arrowLabel.alpha = 0.9;
		stage.addChild(this.arrowLabel);

		this.info = new createjs.Text("", "bold 24px Arial", "#000000");
		this.info.textAlign = "right";
		this.info.x = (stage.canvas.width / 2) - 12;
		this.info.y = -(stage.canvas.height / 2) + 8;
		stage.addChild(this.info);

		this.set(this.ctp, this.pos, this.size, createjs.Graphics.getHSL(this.color, this.life / this.max_life * 200 - 100, 50), lake);
	}

	Fish.prototype.updatePupils = function() {
		var fP = this.fishParts;
		var eyeL = { x: -15, y: -30 };
		var eyeR = { x: 15, y: -30 };
		var maxOff = 4;
		var lerpFactor = 0.18;
		var targetLX = eyeL.x, targetLY = eyeL.y, targetRX = eyeR.x, targetRY = eyeR.y;
		if (this.look_target && fP.pupilL && state.lakeStage) {
			var pt = state.lakeStage.localToLocal(this.look_target.x, this.look_target.y, fP.cont[0]);
			var dxL = pt.x - eyeL.x, dyL = pt.y - eyeL.y;
			var lenL = Math.sqrt(dxL * dxL + dyL * dyL) || 1;
			var offL = Math.min(maxOff, lenL);
			targetLX = eyeL.x + (dxL / lenL) * offL;
			targetLY = eyeL.y + (dyL / lenL) * offL;
			var dxR = pt.x - eyeR.x, dyR = pt.y - eyeR.y;
			var lenR = Math.sqrt(dxR * dxR + dyR * dyR) || 1;
			var offR = Math.min(maxOff, lenR);
			targetRX = eyeR.x + (dxR / lenR) * offR;
			targetRY = eyeR.y + (dyR / lenR) * offR;
		}
		if (fP.pupilL) {
			fP.pupilL.x += (targetLX - fP.pupilL.x) * lerpFactor;
			fP.pupilL.y += (targetLY - fP.pupilL.y) * lerpFactor;
			fP.pupilR.x += (targetRX - fP.pupilR.x) * lerpFactor;
			fP.pupilR.y += (targetRY - fP.pupilR.y) * lerpFactor;
		}
	};

	Fish.prototype.addLifeGain = function(consumedSize, gainType) {
		var gain = (consumedSize / this.size) * (gainType === "fish" ? cfg.FISH_LIFE_GAIN_FROM_FISH : cfg.FISH_LIFE_GAIN_FROM_FOOD);
		this.life += gain;
		if (this.life >= this.max_life) {
			let over = (this.life - this.max_life) / 2;
			this.life = this.max_life + over;
		}
	};

	Fish.prototype.bite = function(predator, prey) {
		var fP = this.fishParts;
		var mouthRadius = cfg.MOUTH_SIZE_FACTOR * predator.size;
		var preyDimS = prey.fishParts.dimS;
		var nRPart = prey.fishParts.nRPart;
		var tailD = preyDimS[nRPart - 1];
		var headD = preyDimS[0];
		var tailSegmentRadius = Math.min(tailD.x, tailD.y) / 2 * prey.size;
		var headDSegmentRadius = Math.min(headD.x, headD.y) / 2 * prey.size;
		if (mouthRadius <= tailSegmentRadius) return;
		var eatWhole = headDSegmentRadius < mouthRadius;
		var dis = cfg.CHASE_DISTANCE_FACTOR * predator.size;
		if (eatWhole) {
			dis = Math.sqrt(
				Math.pow(predator.mounth.x - prey.mounth.x, 2) + 
				Math.pow(predator.mounth.y - prey.mounth.y, 2)
			);
			var intersect = dis < mouthRadius + headDSegmentRadius;
			if (intersect) {
				if (prey === this) {
					this.alive = false;
				} else {
					var totalParts = nRPart > 2 ? (nRPart - 1) : 1;
					for (var p = 0; p < totalParts; p++) {
						this.addLifeGain(prey.size, "fish");
					}
					prey.die();
				}
			}
		} else if (nRPart > 2 && tailSegmentRadius < mouthRadius) {
			dis = Math.sqrt(
				Math.pow(predator.mounth.x - prey.fin.x, 2) + 
				Math.pow(predator.mounth.y - prey.fin.y, 2)
			);
			var intersect = dis < mouthRadius + tailSegmentRadius;
			if (intersect) {
				prey.lastfin.visible = false;
				prey.fishParts.nRPart -= 1;
				prey.lastfin = prey.fishParts.cont[prey.fishParts.nRPart - 1];
				if (prey === this) {
					this.life -= 15;
					this.ctp.splice(prey.fishParts.nRPart);
				} else {
					this.addLifeGain(prey.size, "fish");
				}
			}
		}
		if (dis < cfg.CHASE_DISTANCE_FACTOR * predator.size) {
			this.look_target = (predator === this) ? { x: prey.fin.x, y: prey.fin.y } : { x: predator.mounth.x, y: predator.mounth.y };
			this.updatePupils();
			fP.mounth.scaleX = 2.2;
			fP.mounth.scaleY = 1.5;
		}
	};

	Fish.prototype.eat = function(obj) {
		var fP = this.fishParts;
		var lake = state.lake;
		var lakeStage = state.lakeStage;
		if (!obj.active) return;
		var pos = obj.localToLocal(0, 0, lakeStage);
		var dis = Math.sqrt(Math.pow(this.mounth.x - pos.x, 2) + Math.pow(this.mounth.y - pos.y, 2));
		var mouthRadius = cfg.MOUTH_SIZE_FACTOR * this.size;
		var foodRadius = obj.size;
		var intersect = dis < mouthRadius + foodRadius;
		if (mouthRadius > foodRadius) {
			if (intersect) {
				this.addLifeGain(obj.size, "food");
				var halfLake = (cfg.LAKE_SIZE || 10000) / 2;
				var foodSpawnRadius = cfg.FOOD_SPAWN_RADIUS || cfg.FOOD_SPAWN_HALF || 1000;
				var newSize = cfg.FOOD_SIZE_MIN + Math.random() * (cfg.FOOD_SIZE_MAX - cfg.FOOD_SIZE_MIN);
				var lx = lake.x + (Math.random() * 2 - 1) * foodSpawnRadius;
				var ly = lake.y + (Math.random() * 2 - 1) * foodSpawnRadius;
				lx = Math.max(-halfLake + 1, Math.min(halfLake - 1, lx));
				ly = Math.max(-halfLake + 1, Math.min(halfLake - 1, ly));
				obj.activate(newSize, lx, ly);
			}
			if (dis < cfg.CHASE_DISTANCE_FACTOR * this.size) {
				this.look_target = { x: pos.x, y: pos.y };
				this.updatePupils();
				fP.mounth.scaleX = 2.2;
				fP.mounth.scaleY = 1.5;
			}
		} else {
			if (intersect) {
				obj.vCX = Math.sin(this.ctp[0]) * this.velt / 20;
				obj.vCY = -Math.cos(this.ctp[0]) * this.velt / 20;
			}
		}
	};

	Fish.prototype.update = function(dt, lake) {
		var fP = this.fishParts;
		var endLife = cfg.FISH_END_LIFE || 20 * 60;
		var lakeStartSize = cfg.LAKE_START_SIZE || 10;
		var lakeEndSize = cfg.LAKE_END_SIZE || 0.5;
		var startFishSize = cfg.FISH_START_SIZE || 0.04;
		var endFishSize = cfg.FISH_END_SIZE || 2.4;
		var startScreenSize = startFishSize * lakeStartSize;
		var endScreenSize = endFishSize * lakeEndSize;

		if (this.life <= 0 || !this.alive) {
			this.alive = false;
			return this.alive;
		}

		if (!this.nextPos) {
			this.sp = this.left ? -6 : (this.right ? 6 : 0);
			this.fsp = this.up ? 1 : 0;
			this.ssp = this.down ? 1 : 0;
		} else {
			this.sp = (this.ctp[0] - Math.atan2(this.nextPos.x - this.pos.x, -this.nextPos.y - this.pos.y) < 0) ? 6 : -6;
			this.fsp = 0;
			this.ssp = 0;
		}

		this.fishParts.cont[0].regY = -(this.velt / 10);

		this.cta[0] = this.sp * (1 + this.ssp * 0.7)  - this.ctv[0] * 2;
		this.ctv[0] = this.cta[0] * dt + this.ctv[0];
		this.ctp[0] = this.ctv[0] * dt + this.ctp[0];
		var ctat = this.cta[0];
		var ctvt = this.ctv[0];
		var ctata = 0, ctvta = 0;
		for (var i = 1; i < this.fishParts.nRPart; i++) {
			this.cta[i] = - ctat * 2 - ctvt * 5 - this.ctv[i] * 12 - this.ctp[i] * 35 * (1 + this.ssp * 1.05);
			ctat += this.cta[i];
			ctvt += this.ctv[i];
			this.ctv[i] = this.cta[i] * dt + this.ctv[i];
			this.ctp[i] = this.ctv[i] * dt + this.ctp[i];
			ctata += Math.abs(this.cta[i]);
			ctvta += Math.abs(this.ctv[i]);
		}

		this.pos2 = ctata / this.fishParts.nPart;
		this.vel2 = ctvta / this.fishParts.nPart;
		this.acc2 = ctata / this.fishParts.nPart;
		this.acct = (this.vel2 * 45 + this.acc2 * 4 *(this.size / cfg.FISH_START_SIZE)) / 10.0 - this.velt * ((1 - this.fsp * 0.5) + this.ssp * 4) * 0.4 ;
		this.velt = this.acct * dt + this.velt;
		var maxSpeed = cfg.FISH_MAX_SPEED * (this.size / cfg.FISH_START_SIZE);
		if (this.velt > maxSpeed) this.velt = maxSpeed;
		if (this.velt < 0) this.velt = 0;
		this.pos.x += Math.sin(this.ctp[0]) * this.velt * dt;
		this.pos.y += -Math.cos(this.ctp[0]) * this.velt * dt;
		var halfLake = (cfg.LAKE_SIZE || 10000) / 2;
		var fishMargin = this.size * 120;
		var innerHalf = Math.max(0, halfLake - fishMargin);
		this.pos.x = Math.max(-innerHalf, Math.min(innerHalf, this.pos.x));
		this.pos.y = Math.max(-innerHalf, Math.min(innerHalf, this.pos.y));
		this.acct = 0;

		if (!this.nextPos) {
			lake.ax = (this.pos.x - lake.x) * 3 - lake.vx * 2;
			lake.ay = (this.pos.y - lake.y) * 3  - lake.vy * 2;
			lake.vx = lake.ax * dt + lake.vx;
			lake.vy = lake.ay * dt + lake.vy;
			lake.x = lake.vx * dt + lake.x;
			lake.y = lake.vy * dt + lake.y;
			lake.x = Math.max(-halfLake, Math.min(halfLake, lake.x));
			lake.y = Math.max(-halfLake, Math.min(halfLake, lake.y));
		}

		this.life -= dt;
		this.time += dt;
		if(this.life > this.max_life) {
			this.size_time = Math.min(this.size_time + dt, endLife);
		}

		this.screen_size = (endScreenSize - startScreenSize) / endLife * this.size_time + startScreenSize;
		this.lake_size = (lakeEndSize - lakeStartSize) / endLife * this.size_time + lakeStartSize;
		this.size = this.screen_size / this.lake_size;

		var num = Math.pow(this.size, 3) * 100;
		if (num > this.max_weight) this.max_weight = num;
		var weightStr = num < 0.1 ? (num * 1000).toFixed(1) + " g" : num < 0.5 ? Math.ceil(num * 1000) + " g" : num < 10 ? num.toFixed(2) + " kg" : num < 100 ? num.toFixed(1) + " kg" : Math.ceil(num) + " kg";
		this.info.text = (this.name || "Fish") + " (" + weightStr + ")";

		var targetSpread = ( - (this.ssp || 0) + (this.fsp || 0)) * 20;
		this.finSpreadLateral += (targetSpread - this.finSpreadLateral) * 0.05;

		fP.mounth.scaleX = 1;
		fP.mounth.scaleY = 1;
		this.look_target = null;
		this.updatePupils();

		state.bg.graphics.clear();
		var halfLake = (cfg.LAKE_SIZE || 10000) / 2;
		var ls = state.myFish.lake_size;
		var lakeLeft = (-halfLake - lake.x) * ls;
		var lakeRight = (halfLake - lake.x) * ls;
		var lakeTop = (-halfLake - lake.y) * ls;
		var lakeBottom = (halfLake - lake.y) * ls;
		var sx = state.stage.x;
		var sy = state.stage.y;
		state.bg.graphics.beginFill("#888899").drawRect(-sx, -sy, state.stage.canvas.width, state.stage.canvas.height).endFill();
		var drawL = Math.max(lakeLeft, -sx);
		var drawR = Math.min(lakeRight, sx);
		var drawT = Math.max(lakeTop, -sy);
		var drawB = Math.min(lakeBottom, sy);
		if (drawL < drawR && drawT < drawB) {
			state.bg.graphics.beginLinearGradientFill(["#77F", "#113"], [0, 1], drawL, lakeTop, drawL, lakeBottom).drawRect(drawL, drawT, drawR - drawL, drawB - drawT).endFill();
		}

		this.set(this.ctp, this.pos, this.size, createjs.Graphics.getHSL(this.color, this.life / this.max_life * 200 - 100, 50), lake);
		state.lakeStage.regX = lake.x;
		state.lakeStage.regY = lake.y;
		return this.alive;
	};

	Fish.prototype.drawFish = function(ctp, colorStr) {
		var fP = this.fishParts;
		var finColor = createjs.Graphics.getHSL(this.color, 50, 60);
		for (var i = 0; i < ctp.length; i++) {
			var fillColor = (i === ctp.length - 1) ? finColor : colorStr;
			fP.part[i].graphics.clear().beginFill(fillColor).drawEllipse(0, 0, fP.dimS[i].x, fP.dimS[i].y).endFill();
			fP.cont[i].rotation = ctp[i] / Math.PI * 180;
		}
		if (ctp.length > 1) {
			var finOsc = ctp[1] / Math.PI * 180 * 0.5;
			var spread = this.finSpreadLateral || 0;
			if (fP.dfin) fP.dfin.rotation = -finOsc * 1.2;
			if (fP.fin[0]) fP.fin[0].rotation = finOsc - spread;
			if (fP.fin[1]) fP.fin[1].rotation = finOsc + spread;
		}
	};

	Fish.prototype.set = function(ctp, pos, size, colorStr, lake, name) {
		var fP = this.fishParts;
		var myFish = state.myFish;
		var stage = state.stage;
		if (name !== undefined) this.name = name || "Fish";
		this.drawFish(ctp, colorStr);
		if (myFish && this !== myFish) {
			if (ctp.length === 0) {
				this.die();
				return;
			}
			if (ctp.length !== fP.nRPart) {
				fP.nRPart = ctp.length;
				for (var i = 0; i < ctp.length; i++) fP.cont[i].visible = true;
				for (; i < fP.nPart; i++) fP.cont[i].visible = false;
			}
			var bordo = { x: stage.canvas.width / 2, y: stage.canvas.height / 2 };
			var p = { x: (pos.x - lake.x) * myFish.lake_size, y: (pos.y - lake.y) * myFish.lake_size };
			var ang = Math.atan2(p.x, -p.y);
			this.arrow.x = Math.max(-bordo.x, Math.min(bordo.x, p.x));
			this.arrow.y = Math.max(-bordo.y, Math.min(bordo.y, p.y));
			if (Math.abs(p.x) < bordo.x && Math.abs(p.y) < bordo.y) {
				this.arrow.visible = false;
				this.arrowLabel.visible = false;
				this.nameLabel.visible = true;
				this.nameLabel.text = this.name || "Fish";
				this.nameLabel.color = colorStr;
				var headPt = fP.cont[0].localToLocal(50, 50, stage);
				this.nameLabel.x = headPt.x;
				this.nameLabel.y = headPt.y;
			} else {
				this.arrow.visible = true;
				this.arrowLabel.visible = true;
				this.nameLabel.visible = false;
				this.arrowLabel.text = this.name || "Fish";
				this.arrowLabel.color = colorStr;
				this.arrow.graphics.clear();
				this.arrow.graphics.beginFill(colorStr).lineTo(-5, 12.5).bezierCurveTo(-5, 12, 0, 8, 5, 12.2).lineTo(0, 0).endFill();
				this.arrow.scaleX = 1.5;
				this.arrow.scaleY = 1.5;
				this.arrow.rotation = ang / Math.PI * 180;
				var offset = 22;
				this.arrowLabel.x = this.arrow.x + offset * Math.sin(ang);
				this.arrowLabel.y = this.arrow.y - offset * Math.cos(ang);
			}
		}
		this.fishParts.cont[0].x = pos.x;
		this.fishParts.cont[0].y = pos.y;
		this.size = size;
		this.fishParts.cont[0].scaleX = size;
		this.fishParts.cont[0].scaleY = size;
		this.mounth = this.fishParts.cont[0].localToLocal(0, -30, state.lakeStage);
		this.lastfin = fP.cont[fP.nRPart - 1];
		var d = fP.dimS[fP.nRPart - 1];
		this.fin = this.lastfin.children[0].localToLocal(d.x / 2, d.y / 2, state.lakeStage);
	};

	Fish.prototype.die = function() {
		state.stage.removeChild(this.arrow);
		state.stage.removeChild(this.arrowLabel);
		state.stage.removeChild(this.nameLabel);
		state.stage.removeChild(this.info);
		state.lakeStage.removeChild(this.fishParts.cont[0]);
		this.alive = false;
	};

	Fish.prototype.setAlive = function(val) {
		if (val > 0) {
			this.life = cfg.FISH_OTHER_LIFE || 2;
			this.alive = true;
		} else {
			this.life += val;
			if (this.life < 0) this.die();
		}
		return this.alive;
	};

	window.Fish = Fish;
}(window));
