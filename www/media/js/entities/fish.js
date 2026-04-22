"use strict";

(function (window) {
	var cfg = window.FishbowlConfig;
	var state = window.Fishbowl;

	function Fish(id, pos, ctp, colorStr, name, colorHue) {
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
		var h = (typeof colorHue === "number" && colorHue >= 0 && colorHue <= 360) ? colorHue : parseHueFromColorStr(colorStr);
		this.color = (h !== null && !isNaN(h)) ? h : 0;
		this.mounth = { x: 0, y: 0 };
		this.fin = { x: 0, y: 0 };

		this.time = 0;
		this.maxLife = cfg.fishLifeStart;
		this.life = cfg.fishLifeStart;
		this.lifeGain = this.life;
		this.gainWeight = 1;
		this._lastGainMulShown = 1;
		this._gainMulPulseT = 0;
		this.size = cfg.fishSizeStart;
		this.lakeScale = cfg.lakeScaleStart;
		this.scale = 0;
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

		this.nameLabel = new createjs.Text(this.name || "Fish", "600 9px Fredoka,Arial,sans-serif", "#ffffff");
		this.nameLabel.alpha = 0.9;
		this.nameLabel.textAlign = "center";
		this.nameLabel.visible = false;
		this.nameLabel.shadow = new createjs.Shadow("rgba(0,24,48,0.92)", 0, 1, 2);
		stage.addChild(this.nameLabel);

		this.arrow = new createjs.Shape();
		this.arrow.graphics.beginFill(createjs.Graphics.getHSL(this.color, 50, 60)).lineTo(-5, 12.5).bezierCurveTo(-5, 12, 0, 8, 5, 12.2).lineTo(0, 0).endFill();
		this.arrow.visible = false;
		stage.addChild(this.arrow);

		this.arrowLabel = new createjs.Text("", "600 9px Fredoka,Arial,sans-serif", "#eaf6ff");
		this.arrowLabel.visible = false;
		this.arrowLabel.textAlign = "center";
		this.arrowLabel.alpha = 0.92;
		this.arrowLabel.shadow = new createjs.Shadow("rgba(0,24,48,0.92)", 0, 1, 2);
		stage.addChild(this.arrowLabel);

		var hudLocal = !(state.myFish && state.myFish !== this);
		var hudRight = (stage.canvas.width / 2) - 12;
		var hudTop = -(stage.canvas.height / 2) + 10;
		this.infoName = new createjs.Text("", "600 15px Fredoka,Arial,sans-serif", "#eaf6ff");
		this.infoName.textAlign = "right";
		this.infoName.x = hudRight;
		this.infoName.y = hudTop;
		this.infoName.visible = hudLocal;
		this.infoName.shadow = new createjs.Shadow("rgba(0,28,48,0.88)", 0, 1, 3);
		this.infoWeight = new createjs.Text("", "500 12px Fredoka,Arial,sans-serif", "#7dd3fc");
		this.infoWeight.textAlign = "right";
		this.infoWeight.x = hudRight;
		this.infoWeight.y = hudTop + 22;
		this.infoWeight.visible = hudLocal;
		this.infoWeight.shadow = new createjs.Shadow("rgba(0,28,48,0.88)", 0, 1, 3);
		this.infoGrowthArrow = new createjs.Text("↑", "700 12px Fredoka,Arial,sans-serif", "#fef3c7");
		this.infoGrowthArrow.textAlign = "right";
		this.infoGrowthArrow.visible = false;
		this.infoGrowthArrow.shadow = new createjs.Shadow("rgba(0,28,48,0.88)", 0, 1, 3);
		this.infoGainMul = new createjs.Text("", "700 11px Fredoka,Arial,sans-serif", "#fef3c7");
		this.infoGainMul.textAlign = "right";
		this.infoGainMul.visible = false;
		this.infoGainMul.shadow = new createjs.Shadow("rgba(0,28,48,0.88)", 0, 1, 3);
		if (hudLocal) {
			this._lifeBarW = 148;
			this._lifeBarH = 7;
			this._lifeBarGap = 8;
			this.lifeBarBg = new createjs.Shape();
			this.lifeBarFill = new createjs.Shape();
			this.lifeBarFill.regX = 0;
			this.lifeBarFill.regY = 0;
			this._growthBarW = 54;
			this._growthBarH = 6;
			this._growthBarGap = 6;
			this.growthBarBg = new createjs.Shape();
			this.growthBarFill = new createjs.Shape();
			this.growthBarBg.visible = false;
			this.growthBarFill.visible = false;
			stage.addChild(this.lifeBarBg);
			stage.addChild(this.lifeBarFill);
			stage.addChild(this.growthBarBg);
			stage.addChild(this.growthBarFill);
		} else {
			this.lifeBarBg = null;
			this.lifeBarFill = null;
			this.growthBarBg = null;
			this.growthBarFill = null;
		}
		stage.addChild(this.infoName);
		stage.addChild(this.infoWeight);
		stage.addChild(this.infoGrowthArrow);
		stage.addChild(this.infoGainMul);

		this.set(this.ctp, this.pos, this.size, createjs.Graphics.getHSL(this.color, this.life / this.maxLife * 200 - 100, 50), lake);
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
		var gain = (consumedSize / this.size) * (gainType === "fish" ? cfg.fishLifeGainFromFish : cfg.fishLifeGainFromFood);
		this.life += gain;
		if(this.life > this.maxLife + cfg.growingTime){
			this.life = this.maxLife + cfg.growingTime;
		}
		this.lifeGain += gain;
		this.gainWeight = Math.min(cfg.maxGainWeight, Math.max(1, Math.floor(this.lifeGain / Math.max(1e-6, this.maxLife))));
	};

	Fish.prototype.bite = function(predator, prey) {
		var fP = this.fishParts;
		var mouthRadius = cfg.mouthSizeFactor * predator.size;
		var preyDimS = prey.fishParts.dimS;
		var nRPart = prey.fishParts.nRPart;
		var tailD = preyDimS[nRPart - 1];
		var headD = preyDimS[0];
		var tailSegmentRadius = Math.min(tailD.x, tailD.y) / 2 * prey.size;
		var headDSegmentRadius = Math.min(headD.x, headD.y) / 2 * prey.size;
		var eatWhole = headDSegmentRadius < mouthRadius;
		var dis;
		var intersect = false;
		var totalFish = 1 + ((state.lake && state.lake.otherFishId) ? state.lake.otherFishId.length : 0);
		var debugBiteTwoFish = !!(state.debugEnabled && predator === state.myFish && totalFish === 2);
		if (mouthRadius <= tailSegmentRadius) {
			if (debugBiteTwoFish) {
				state.debugFishBite = {
					mouthRadius: mouthRadius,
					tailSegmentRadius: tailSegmentRadius,
					headDSegmentRadius: headDSegmentRadius,
					eatWhole: eatWhole,
					dis: null,
					eatFishDistanceFactor: cfg.eatFishDistanceFactor,
					intersect: false
				};
			}
			return;
		}
		if (eatWhole) {
			dis = Math.sqrt(
				Math.pow(predator.mounth.x - prey.mounth.x, 2) + 
				Math.pow(predator.mounth.y - prey.mounth.y, 2)
			);
			intersect = dis < cfg.eatFishDistanceFactor * mouthRadius + headDSegmentRadius;
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
			intersect = dis < cfg.eatFishDistanceFactor * mouthRadius + tailSegmentRadius;
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
		if (debugBiteTwoFish) {
			state.debugFishBite = {
				mouthRadius: mouthRadius,
				tailSegmentRadius: tailSegmentRadius,
				headDSegmentRadius: headDSegmentRadius,
				eatWhole: eatWhole,
				dis: dis,
				eatFishDistanceFactor: cfg.eatFishDistanceFactor,
				intersect: intersect
			};
		}
		if (dis < cfg.chaseDistanceFactor * predator.size) {
			this.look_target = (predator === this) ? { x: prey.fin.x, y: prey.fin.y } : { x: predator.mounth.x, y: predator.mounth.y };
			this.updatePupils();
			fP.mounth.scaleX = 2.2;
			fP.mounth.scaleY = 1.5;
			this._mouthOpen = true;
		}
	};

	Fish.prototype.eat = function(obj) {
		var fP = this.fishParts;
		var lake = state.lake;
		var lakeStage = state.lakeStage;
		if (!obj.active) return;
		var pos = obj.localToLocal(0, 0, lakeStage);
		var dis = Math.sqrt(Math.pow(this.mounth.x - pos.x, 2) + Math.pow(this.mounth.y - pos.y, 2));
		var mouthRadius = cfg.mouthSizeFactor * this.size;
		var foodRadius = obj.size;
		var intersect = dis < cfg.eatFoodDistanceFactor * mouthRadius + foodRadius;
		if (intersect) {
			var canSwallowWhole = mouthRadius > foodRadius;
			var biteCap = mouthRadius * cfg.foodBiteMouthRatio;
			var consumed = canSwallowWhole ? foodRadius : Math.min(foodRadius, biteCap);
			this.addLifeGain(consumed, "food");
			var remainder = foodRadius - consumed;
			var halfLake = cfg.lakeSize / 2;
			var foodSpawnRadius = cfg.foodSpawnRadius;
			if (remainder <= cfg.foodSizeMin + 1e-9 || remainder < 1e-8) {
				var newSize = cfg.foodSizeMin + Math.random() * (cfg.foodSizeMax - cfg.foodSizeMin);
				var lx = lake.x + (Math.random() * 2 - 1) * foodSpawnRadius;
				var ly = lake.y + (Math.random() * 2 - 1) * foodSpawnRadius;
				lx = Math.max(-halfLake + 1, Math.min(halfLake - 1, lx));
				ly = Math.max(-halfLake + 1, Math.min(halfLake - 1, ly));
				obj.activate(newSize, lx, ly);
			} else {
				obj.resizeTo(remainder);
				if (!canSwallowWhole) {
					obj.vCX = Math.sin(this.ctp[0]) * this.velt / 20;
					obj.vCY = -Math.cos(this.ctp[0]) * this.velt / 20;
				}
			}
		}
		if (dis < cfg.chaseDistanceFactor * this.size) {
			this.look_target = { x: pos.x, y: pos.y };
			this.updatePupils();
			fP.mounth.scaleX = 2.2;
			fP.mounth.scaleY = 1.5;
			this._mouthOpen = true;
		}
	};

	Fish.prototype.update = function(dt, lake) {
		var fP = this.fishParts;

		var fishLifeStart = cfg.fishLifeStart;
		var fishLifeEnd = cfg.fishLifeEnd;
		var lakeScaleStart = cfg.lakeScaleStart;
		var lakeScaleEnd = cfg.lakeScaleEnd;
		var fishSizeStart = cfg.fishSizeStart;
		var fishSizeEnd = cfg.fishSizeEnd;


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
		this.acct = (this.vel2 * 45 + this.acc2 * 4 *(this.size / cfg.fishSizeStart)) / 10.0 - this.velt * ((1 - this.fsp * 0.5) + this.ssp * 4) * 0.4 ;
		this.velt = this.acct * dt + this.velt;
		var maxSpeed = cfg.fishMaxSpeed * (this.size / cfg.fishSizeStart);
		if (this.velt > maxSpeed) this.velt = maxSpeed;
		if (this.velt < 0) this.velt = 0;
		this.pos.x += Math.sin(this.ctp[0]) * this.velt * dt;
		this.pos.y += -Math.cos(this.ctp[0]) * this.velt * dt;
		var halfLake = cfg.lakeSize / 2;
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

		

		this.life -= dt * (1 + this.scale * (fishLifeStart / fishLifeEnd - 1));
		this.time += dt;
		if(this.life > this.maxLife) {
			var growthMul = Math.max(1, this.gainWeight || 1);
			var timeToDouble = cfg.timeToDouble / growthMul;
			var sizeQ = Math.pow(this.size, 3);
			var x = timeToDouble / Math.log(2) * Math.log(sizeQ / Math.pow(cfg.fishSizeStart, 3));
			var y = Math.pow(cfg.fishSizeStart,3) * Math.exp(Math.log(2) / timeToDouble * (x + dt));
			this.size = Math.min(Math.pow(y, 1/3), cfg.fishSizeEnd);
		}else{
			this.lifeGain = this.life;
			this.gainWeight = 1;
		}

		this.scale = (this.size - fishSizeStart) /(fishSizeEnd - fishSizeStart);
		this.lakeScale = 1.0/(1.0/lakeScaleStart * (1 - this.scale) + this.scale * 1.0/lakeScaleEnd);

		var num = Math.pow(this.size, 3) * 100;
		if (num > this.max_weight) this.max_weight = num;
		var weightStr = num < 0.1 ? (num * 1000).toFixed(1) + " g" : num < 0.5 ? Math.ceil(num * 1000) + " g" : num < 10 ? num.toFixed(2) + " kg" : num < 100 ? num.toFixed(1) + " kg" : Math.ceil(num) + " kg";
		if (state.myFish === this) {
			this.infoName.text = this.name || "Fish";
			this.infoWeight.text = weightStr;
			this.refreshLocalLifeBar(dt);
		}

		var targetSpread = ( - (this.ssp || 0) + (this.fsp || 0)) * 20;
		this.finSpreadLateral += (targetSpread - this.finSpreadLateral) * 0.05;

		fP.mounth.scaleX = 1;
		fP.mounth.scaleY = 1;
		this.look_target = null;
		this.updatePupils();

		state.bg.graphics.clear();
		var halfLake = cfg.lakeSize / 2;
		var ls = state.myFish.lakeScale;
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

		this.set(this.ctp, this.pos, this.size, createjs.Graphics.getHSL(this.color, this.life / this.maxLife * 200 - 100, 50), lake);
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

	function parseHueFromColorStr(str) {
		if (!str || typeof str !== "string") return null;
		var m = str.match(/hsla?\(\s*(\d+)/);
		if (m) return parseInt(m[1], 10);
		/* fallback: formato "hsl(H,S,L)" come nel costruttore */
		if (str.length > 4) {
			var n = parseInt(str.substr(4).split(",")[0], 10);
			if (!isNaN(n) && n >= 0 && n <= 360) return n;
		}
		return null;
	}

	Fish.prototype.set = function(ctp, pos, size, colorStr, lake, name, colorHue) {
		var fP = this.fishParts;
		var myFish = state.myFish;
		var stage = state.stage;
		if (name !== undefined) this.name = name || "Fish";
		/* Remoti: sempre _targetCtp / _displayCtp così il tick (smoothing) non usa angoli
		   congelati quando myFish è null (leaderboard / spettatore). */
		if (this !== myFish) {
			this._targetCtp = ctp.slice();
			this._colorStr = colorStr;
			var h = (typeof colorHue === "number" && colorHue >= 0 && colorHue <= 360) ? colorHue : parseHueFromColorStr(colorStr);
			if (h !== null && !isNaN(h)) this.color = h;
			if (!this._displayCtp) this._displayCtp = ctp.slice();
			this.drawFish(this._displayCtp, colorStr);
			if (ctp.length === 0) {
				this.die();
				return;
			}
			if (ctp.length !== fP.nRPart) {
				fP.nRPart = ctp.length;
				for (var i = 0; i < ctp.length; i++) fP.cont[i].visible = true;
				for (; i < fP.nPart; i++) fP.cont[i].visible = false;
			}
		} else {
			this.drawFish(ctp, colorStr);
		}
		/* Posizione nome/frecce: aggiornata ogni frame in updateRemotePlayerLabels (dopo interpolazione). */
		if (myFish && this !== myFish) {
			this.nameLabel.text = this.name || "Fish";
			this.nameLabel.color = colorStr;
			this.arrowLabel.text = this.name || "Fish";
			this.arrowLabel.color = colorStr;
			this.arrow.graphics.clear();
			this.arrow.graphics.beginFill(colorStr).lineTo(-5, 12.5).bezierCurveTo(-5, 12, 0, 8, 5, 12.2).lineTo(0, 0).endFill();
			this.arrow.scaleX = 1.5;
			this.arrow.scaleY = 1.5;
		} else if (this !== myFish) {
			this.arrow.visible = false;
			this.arrowLabel.visible = false;
			this.nameLabel.visible = false;
		}
		/* Solo il pesce locale: i remoti restano su x/y da advanceOtherFish (stesso con o senza myFish). */
		if (this === myFish) {
			this.fishParts.cont[0].x = pos.x;
			this.fishParts.cont[0].y = pos.y;
			this.updateMouthFin();
		}
		if (typeof size === "number" && isFinite(size) && size > 0) {
			this.size = size;
		}
		this.fishParts.cont[0].scaleX = size;
		this.fishParts.cont[0].scaleY = size;
	};

	Fish.prototype.updateMouthFin = function() {
		var fP = this.fishParts;
		this.mounth = fP.cont[0].localToLocal(0, -30, state.lakeStage);
		this.lastfin = fP.cont[fP.nRPart - 1];
		var d = fP.dimS[fP.nRPart - 1];
		this.fin = this.lastfin.children[0].localToLocal(d.x / 2, d.y / 2, state.lakeStage);
	};

	/** Nome/frecce sullo stage seguono la posizione interpolata del pesce (non il solo tick di rete). */
	Fish.prototype.updateRemotePlayerLabels = function(myFish, lake) {
		if (!myFish || this === myFish) return;
		var stage = state.stage;
		var fP = this.fishParts;
		var root = fP.cont[0];
		if (!root) return;
		var ls = myFish.lakeScale;
		var bordo = { x: stage.canvas.width / 2, y: stage.canvas.height / 2 };
		var p = { x: (root.x - lake.x) * ls, y: (root.y - lake.y) * ls };
		var ang = Math.atan2(p.x, -p.y);
		var colorStr = this._colorStr || "#ffffff";
		var sm = cfg.otherFishSmooth;
		var useLerp = sm > 0 && sm < 1;
		this.arrow.x = Math.max(-bordo.x, Math.min(bordo.x, p.x));
		this.arrow.y = Math.max(-bordo.y, Math.min(bordo.y, p.y));
		if (Math.abs(p.x) < bordo.x && Math.abs(p.y) < bordo.y) {
			this.arrow.visible = false;
			this.arrowLabel.visible = false;
			this.nameLabel.visible = true;
			this.nameLabel.text = this.name || "Fish";
			this.nameLabel.color = colorStr;
			var headPt = root.localToLocal(50, 50, stage);
			if (useLerp && this._uiNameNear) {
				this.nameLabel.x += (headPt.x - this.nameLabel.x) * sm;
				this.nameLabel.y += (headPt.y - this.nameLabel.y) * sm;
			} else {
				this.nameLabel.x = headPt.x;
				this.nameLabel.y = headPt.y;
			}
			this._uiNameNear = true;
			this._uiArrowNear = false;
		} else {
			this.arrow.visible = true;
			this.arrowLabel.visible = true;
			this.nameLabel.visible = false;
			this.arrowLabel.text = this.name || "Fish";
			this.arrowLabel.color = colorStr;
			this.arrow.rotation = ang / Math.PI * 180;
			var offset = 22;
			var tAx = this.arrow.x + offset * Math.sin(ang);
			var tAy = this.arrow.y - offset * Math.cos(ang);
			if (useLerp && this._uiArrowNear) {
				this.arrowLabel.x += (tAx - this.arrowLabel.x) * sm;
				this.arrowLabel.y += (tAy - this.arrowLabel.y) * sm;
			} else {
				this.arrowLabel.x = tAx;
				this.arrowLabel.y = tAy;
			}
			this._uiArrowNear = true;
			this._uiNameNear = false;
		}
	};

	Fish.prototype.die = function() {
		state.stage.removeChild(this.arrow);
		state.stage.removeChild(this.arrowLabel);
		state.stage.removeChild(this.nameLabel);
		if (this.lifeBarBg) state.stage.removeChild(this.lifeBarBg);
		if (this.lifeBarFill) state.stage.removeChild(this.lifeBarFill);
		if (this.growthBarBg) state.stage.removeChild(this.growthBarBg);
		if (this.growthBarFill) state.stage.removeChild(this.growthBarFill);
		state.stage.removeChild(this.infoName);
		state.stage.removeChild(this.infoWeight);
		state.stage.removeChild(this.infoGrowthArrow);
		state.stage.removeChild(this.infoGainMul);
		state.lakeStage.removeChild(this.fishParts.cont[0]);
		this.alive = false;
	};

	Fish.prototype.layoutLocalHud = function() {
		if (state.myFish !== this) return;
		var stage = state.stage;
		var hx = (stage.canvas.width / 2) - 12;
		var hy = -(stage.canvas.height / 2) + 10;
		this.infoName.x = hx;
		this.infoName.y = hy;
		this.infoWeight.x = hx;
		this.infoWeight.y = hy + 22;
		this.positionLifeBarBesideName(hx, hy);
		this.positionGrowthHudBesideWeight(hx, hy);
	};

	Fish.prototype.positionLifeBarBesideName = function(hx, hy) {
		if (!this.lifeBarBg || !this.lifeBarFill) return;
		var w = this._lifeBarW;
		var gap = this._lifeBarGap;
		var nw = (typeof this.infoName.getMeasuredWidth === "function")
			? this.infoName.getMeasuredWidth()
			: (this.infoName.getBounds ? this.infoName.getBounds().width : 80);
		nw = Math.max(nw, 4);
		var barLeft = hx - gap - nw - w;
		var barTop = hy + 4;
		this.lifeBarBg.x = barLeft;
		this.lifeBarBg.y = barTop;
		this.lifeBarFill.x = barLeft;
		this.lifeBarFill.y = barTop;
	};

	Fish.prototype.positionGrowthHudBesideWeight = function(hx, hy) {
		var weightW = (typeof this.infoWeight.getMeasuredWidth === "function")
			? this.infoWeight.getMeasuredWidth()
			: (this.infoWeight.getBounds ? this.infoWeight.getBounds().width : 70);
		weightW = Math.max(weightW, 6);
		var right = hx - weightW - 8;
		var rowY = hy + 22;
		var gapArrowBar = 3;
		var gapArrowMul = 4;
		var gapMulBar = 8;
		if (this.infoGrowthArrow) {
			this.infoGrowthArrow.x = right;
			this.infoGrowthArrow.y = rowY;
			right -= 16;
		}
		if (this.growthBarBg && this.growthBarFill) {
			var gw = this._growthBarW || 54;
			var gh = this._growthBarH || 6;
			var barLeft = right - gw - gapMulBar + 10;
			var barTop = rowY + Math.max(1, Math.floor((12 - gh) / 2)) + 2;
			this.growthBarBg.x = barLeft;
			this.growthBarBg.y = barTop;
			this.growthBarFill.x = barLeft;
			this.growthBarFill.y = barTop;
			right = barLeft - gapArrowMul;
		}
		if (this.infoGainMul) {
			this.infoGainMul.x = right;
			this.infoGainMul.y = rowY;
		}
	};

	Fish.prototype.refreshLocalLifeBar = function(dt) {
		if (!this.lifeBarBg || !this.lifeBarFill) return;
		var w = this._lifeBarW;
		var h = this._lifeBarH;
		var cap = Math.max(1e-6, this.maxLife);
		var growing = this.life > this.maxLife;
		var ratio = growing ? 1 : Math.max(0, Math.min(1, this.life / cap));
		if (this.life >= cap - 1e-4) {
			ratio = 1;
		}
		var fillW = ratio >= 1 ? w : Math.max(0, ratio * w);
		if (fillW > 0 && fillW < 1) {
			fillW = 1;
		}

		var hx = (state.stage.canvas.width / 2) - 12;
		var hy = -(state.stage.canvas.height / 2) + 10;
		this.positionLifeBarBesideName(hx, hy);
		this.positionGrowthHudBesideWeight(hx, hy);

		var gBg = this.lifeBarBg.graphics;
		var gFill = this.lifeBarFill.graphics;
		gBg.clear();
		gFill.clear();
		gBg.beginFill("rgba(0,24,40,0.55)").drawRoundRect(0, 0, w, h, 3).endFill();
		gBg.beginStroke("rgba(120,200,255,0.35)").setStrokeStyle(1).drawRoundRect(0, 0, w, h, 3).endStroke();

		var timeMs = (typeof createjs !== "undefined" && createjs.Ticker) ? createjs.Ticker.getTime() : (this.time * 1000);
		var tSec = timeMs / 1000;
		if (fillW > 0) {
			var fx = w - fillW;
			var heat = Math.pow(Math.max(0, Math.min(1, 1 - ratio)), 1.15);
			var grad = lifeBarPaletteGradient(heat, tSec);
			gFill.beginLinearGradientFill(
				grad.colors,
				grad.ratios,
				fx, 0,
				fx + fillW, 0
			).drawRoundRect(fx, 0, fillW, h, 2).endFill();
		}

		/* Glow solo con vita oltre maxLife; decade fino a zero quando life → maxLife (stesso valore). */
		var excessLife = this.life - this.maxLife;
		var glowFadeWindow = 22;
		var glowStrength = excessLife > 0 ? Math.min(1, excessLife / glowFadeWindow) : 0;
		glowStrength = glowStrength * glowStrength;
		if (glowStrength > 0.004) {
			var pulse = 0.78 + 0.22 * Math.sin(tSec * 6.283 * 1.2);
			this.lifeBarFill.alpha = 1 + (pulse - 1) * glowStrength;
			var bgPulse = 0.75 + 0.2 * Math.sin(tSec * 6.283 * 1.2 + 0.4);
			this.lifeBarBg.alpha = 1 + (bgPulse - 1) * glowStrength;
			var glowPulse = 0.5 + 0.5 * Math.sin(tSec * 6.283 * 1.1);
			var glowAlpha = glowStrength * (0.5 + 0.4 * glowPulse);
			var glowBlur = glowStrength * (8 + 16 * (0.5 + 0.5 * Math.sin(tSec * 6.283 * 1.4)));
			if (glowBlur < 0.35 || glowAlpha < 0.02) {
				this.lifeBarFill.shadow = null;
			} else {
				this.lifeBarFill.shadow = new createjs.Shadow(
					"rgba(255, 248, 210, " + glowAlpha.toFixed(3) + ")",
					0,
					0,
					glowBlur
				);
			}
		} else {
			this.lifeBarFill.alpha = 1;
			this.lifeBarBg.alpha = 1;
			this.lifeBarFill.shadow = null;
		}

		var growCap = Math.max(1e-6, cfg.growingTime || 0);
		var growExcess = Math.max(0, this.life - this.maxLife);
		var growRatio = Math.max(0, Math.min(1, growExcess / growCap));
		var showGrowArrow = growExcess > 1e-4;
		var mulValue = Math.max(1, Math.floor(this.gainWeight || 1));
		var showGainMul = mulValue > 1;
		if (mulValue !== this._lastGainMulShown) {
			if (mulValue > 1) {
				this._gainMulPulseT = 0.28;
			}
			this._lastGainMulShown = mulValue;
		}
		if (this._gainMulPulseT > 0) {
			this._gainMulPulseT = Math.max(0, this._gainMulPulseT - (dt || 0));
		}
		var pulseArrow = 0.5 + 0.5 * Math.sin(tSec * 6.283 * 1.6);
		if (this.infoGrowthArrow) {
			this.infoGrowthArrow.visible = showGrowArrow;
			this.infoGrowthArrow.alpha = showGrowArrow ? (0.55 + 0.45 * pulseArrow) : 0;
			this.infoGrowthArrow.scaleX = this.infoGrowthArrow.scaleY = showGrowArrow ? (0.9 + 0.22 * pulseArrow) : 1;
		}
		if (this.infoGainMul) {
			this.infoGainMul.visible = showGainMul;
			this.infoGainMul.text = showGainMul ? ("x" + mulValue) : "";
			if (showGainMul) {
				var pulseProg = 1 - (this._gainMulPulseT / 0.28);
				pulseProg = Math.max(0, Math.min(1, pulseProg));
				var bump = Math.sin(pulseProg * Math.PI);
				this.infoGainMul.alpha = 0.9 + 0.1 * bump;
				this.infoGainMul.scaleX = this.infoGainMul.scaleY = 1 + 0.26 * bump;
			} else {
				this.infoGainMul.alpha = 0;
				this.infoGainMul.scaleX = this.infoGainMul.scaleY = 1;
			}
		}
		if (this.growthBarBg && this.growthBarFill) {
			var g2Bg = this.growthBarBg.graphics;
			var g2Fill = this.growthBarFill.graphics;
			var gw = this._growthBarW || 54;
			var gh = this._growthBarH || 6;
			g2Bg.clear();
			g2Fill.clear();
			if (showGrowArrow) {
				this.growthBarBg.visible = true;
				this.growthBarFill.visible = true;
				g2Bg.beginFill("rgba(50,14,14,0.52)").drawRoundRect(0, 0, gw, gh, 3).endFill();
				g2Bg.beginStroke("rgba(255,190,130,0.55)").setStrokeStyle(1).drawRoundRect(0, 0, gw, gh, 3).endStroke();
				var fill2W = growRatio > 0 ? Math.max(1, Math.round(gw * growRatio)) : 0;
				if (fill2W > 0) {
					/* Scarica da sinistra a destra: il pieno resta ancorato a destra. */
					var fill2X = gw - fill2W;
					g2Fill.beginLinearGradientFill(
						["#ef4444", "#f97316", "#f59e0b"],
						[0, 0.6, 1],
						fill2X, 0, fill2X + fill2W, 0
					).drawRoundRect(fill2X, 0, fill2W, gh, 2).endFill();
				}
				var p2 = 0.75 + 0.25 * pulseArrow;
				this.growthBarFill.alpha = p2;
			} else {
				this.growthBarBg.visible = false;
				this.growthBarFill.visible = false;
			}
		}
		this.lifeBarFill.scaleX = 1;
		this.lifeBarFill.scaleY = 1;
	};

	function rgbToHex(r, g, b) {
		r = Math.max(0, Math.min(255, Math.round(r)));
		g = Math.max(0, Math.min(255, Math.round(g)));
		b = Math.max(0, Math.min(255, Math.round(b)));
		return "#" + ("0" + r.toString(16)).slice(-2) + ("0" + g.toString(16)).slice(-2) + ("0" + b.toString(16)).slice(-2);
	}

	/**
	 * Onda sinusoidale in RGB lungo la barra: sin(ωt + k·u) fa scorrere creste/valle da un capo all'altro.
	 * heat 0 = blu↔verde; heat 1 = rosso↔arancio.
	 */
	function lifeBarPaletteGradient(heat, tSec) {
		var nSeg = 3;
		var sick = Math.pow(Math.max(0, Math.min(1, heat)), 0.92);
		var omega = 1;
		var k = Math.PI * 5;

		/* Ancore RGB: l'onda interpola tra i due estremi di ogni scala */
		var hBr = 14, hBg = 92, hBb = 218;
		var hGr = 52, hGg = 202, hGb = 118;
		var sRr = 188, sRg = 36, sRb = 42;
		var sOr = 252, sOg = 118, sOb = 38;

		var colors = [];
		var ratios = [];
		for (var i = 0; i <= nSeg; i++) {
			var u = i / nSeg;
			var angH = tSec * omega + u * k;
			var wh = 0.5 + 0.5 * Math.sin(angH);
			var angS = tSec * omega * 0.95 + u * k + 1.05;
			var ws = 0.5 + 0.5 * Math.sin(angS);
			var hr = hBr + (hGr - hBr) * wh;
			var hg = hBg + (hGg - hBg) * wh;
			var hb = hBb + (hGb - hBb) * wh;
			var sr = sRr + (sOr - sRr) * ws;
			var sg = sRg + (sOg - sRg) * ws;
			var sb = sRb + (sOb - sRb) * ws;
			var r = hr + (sr - hr) * sick;
			var g = hg + (sg - hg) * sick;
			var b = hb + (sb - hb) * sick;
			colors.push(rgbToHex(r, g, b));
			ratios.push(u);
		}
		return { colors: colors, ratios: ratios };
	}

	Fish.prototype.setAlive = function(val) {
		if (val > 0) {
			this.life = cfg.fishOtherLife;
			this.alive = true;
		} else {
			this.life += val;
			if (this.life < 0) this.die();
		}
		return this.alive;
	};

	window.Fish = Fish;
}(window));
