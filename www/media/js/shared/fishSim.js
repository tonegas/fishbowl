"use strict";

/**
 * FishSim: stato + simulazione di un pesce. Niente CreateJS, niente window.
 * mounth/fin (coordinate mondo di bocca/coda) sono campi del sim ma vengono
 * scritti dalla view ad ogni frame via FishView.updateMouthFin(). In futuro
 * (server autoritativo) la sim li ricalcolerà analiticamente da pos/ctp/size.
 */
(function (root) {
	function getCfg() {
		return (typeof window !== "undefined" && window.FishbowlConfig)
			? window.FishbowlConfig
			: (typeof require === "function" ? require("../config.js") : null);
	}

	function FishSim(id, pos, ctp, name, colorHue) {
		var cfg = getCfg();
		this.id = id;
		this.name = name || "Fish";
		this.pos = { x: pos.x, y: pos.y };
		this.velt = 0;
		this.acct = 0;
		this.ctp = ctp.slice();
		this.ctv = [];
		this.cta = [];
		for (var k = 0; k < ctp.length; k++) { this.ctv.push(0); this.cta.push(0); }
		this.color = (typeof colorHue === "number" && colorHue >= 0 && colorHue <= 360) ? colorHue : 0;
		this.mounth = { x: pos.x, y: pos.y };
		this.fin = { x: pos.x, y: pos.y };

		this.time = 0;
		this.maxLife = cfg.fishLifeStart;
		this.life = cfg.fishLifeStart;
		this.lifeGain = this.life;
		this.gainWeight = 1;
		this.size = cfg.fishSizeStart;
		this.lakeScale = cfg.lakeScaleStart;
		this.scale = 0;
		this.max_weight = Math.pow(this.size, 3) * 100;
		this.alive = true;
		this.look_target = null;
		this.left = this.right = this.up = this.down = false;
		this.sp = this.fsp = this.ssp = 0;
		this._mouthOpen = false;

		/* Geometria condivisa tra sim e view: la sim la usa per bite (raggi testa/coda), la view per il disegno. */
		this.nPart = 5;
		this.nRPart = ctp.length;
		this.dim = [60, 60, 50, 30, 35];
		this.dimS = [{ x: 50, y: 109 }, { x: 33, y: 109 }, { x: 19, y: 84 }, { x: 11, y: 44 }, { x: 6, y: 43 }];
	}

	FishSim.prototype.addLifeGain = function(consumedSize, gainType) {
		var cfg = getCfg();
		var gain = (consumedSize / this.size) * (gainType === "fish" ? cfg.fishLifeGainFromFish : cfg.fishLifeGainFromFood);
		this.life += gain;
		if (this.life > this.maxLife + cfg.growingTime) {
			this.life = this.maxLife + cfg.growingTime;
		}
		this.lifeGain += gain;
		this.gainWeight = Math.min(cfg.maxGainWeight, Math.max(1, Math.floor(this.lifeGain / Math.max(1e-6, this.maxLife))));
	};

	FishSim.prototype.bite = function(predator, prey) {
		var cfg = getCfg();
		var mouthRadius = cfg.mouthSizeFactor * predator.size;
		var preyDimS = prey.dimS;
		var nRPart = prey.nRPart;
		var tailD = preyDimS[nRPart - 1];
		var headD = preyDimS[0];
		var tailSegmentRadius = Math.min(tailD.x, tailD.y) / 2 * prey.size;
		var headDSegmentRadius = Math.min(headD.x, headD.y) / 2 * prey.size;
		var eatWhole = headDSegmentRadius < mouthRadius;
		var dis;
		var intersect = false;
		var state = (typeof window !== "undefined") ? window.Fishbowl : null;
		var totalFish = 1 + ((state && state.lake && state.lake.otherFishId) ? state.lake.otherFishId.length : 0);
		var debugBiteTwoFish = !!(state && state.debugEnabled && predator === state.mySim && totalFish === 2);
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
					prey.alive = false;
				}
			}
		} else if (nRPart > 2 && tailSegmentRadius < mouthRadius) {
			dis = Math.sqrt(
				Math.pow(predator.mounth.x - prey.fin.x, 2) +
				Math.pow(predator.mounth.y - prey.fin.y, 2)
			);
			intersect = dis < cfg.eatFishDistanceFactor * mouthRadius + tailSegmentRadius;
			if (intersect) {
				prey.nRPart -= 1;
				if (prey === this) {
					this.life -= 15;
					this.ctp.splice(prey.nRPart);
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
			this._mouthOpen = true;
		}
	};

	FishSim.prototype.eat = function(foodSim) {
		var cfg = getCfg();
		if (!foodSim.active) return;
		var dis = Math.sqrt(Math.pow(this.mounth.x - foodSim.x, 2) + Math.pow(this.mounth.y - foodSim.y, 2));
		var mouthRadius = cfg.mouthSizeFactor * this.size;
		var foodRadius = foodSim.size;
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
				var lx = this.pos.x + (Math.random() * 2 - 1) * foodSpawnRadius;
				var ly = this.pos.y + (Math.random() * 2 - 1) * foodSpawnRadius;
				lx = Math.max(-halfLake + 1, Math.min(halfLake - 1, lx));
				ly = Math.max(-halfLake + 1, Math.min(halfLake - 1, ly));
				foodSim.activate(newSize, lx, ly);
			} else {
				foodSim.resizeTo(remainder);
				if (!canSwallowWhole) {
					foodSim.vCX = Math.sin(this.ctp[0]) * this.velt / 20;
					foodSim.vCY = -Math.cos(this.ctp[0]) * this.velt / 20;
				}
			}
		}
		if (dis < cfg.chaseDistanceFactor * this.size) {
			this.look_target = { x: foodSim.x, y: foodSim.y };
			this._mouthOpen = true;
		}
	};

	FishSim.prototype.update = function(dt, lake) {
		var cfg = getCfg();
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

		this.sp = this.left ? -6 : (this.right ? 6 : 0);
		this.fsp = this.up ? 1 : 0;
		this.ssp = this.down ? 1 : 0;

		this.cta[0] = this.sp * (1 + this.ssp * 0.7) - this.ctv[0] * 2;
		this.ctv[0] = this.cta[0] * dt + this.ctv[0];
		this.ctp[0] = this.ctv[0] * dt + this.ctp[0];
		var ctat = this.cta[0];
		var ctvt = this.ctv[0];
		var ctata = 0, ctvta = 0;
		for (var i = 1; i < this.nRPart; i++) {
			this.cta[i] = -ctat * 2 - ctvt * 5 - this.ctv[i] * 12 - this.ctp[i] * 35 * (1 + this.ssp * 1.05);
			ctat += this.cta[i];
			ctvt += this.ctv[i];
			this.ctv[i] = this.cta[i] * dt + this.ctv[i];
			this.ctp[i] = this.ctv[i] * dt + this.ctp[i];
			ctata += Math.abs(this.cta[i]);
			ctvta += Math.abs(this.ctv[i]);
		}

		var avgVel = ctvta / this.nPart;
		var avgAcc = ctata / this.nPart;
		this.acct = (avgVel * 45 + avgAcc * 4 * (this.size / fishSizeStart)) / 10.0 - this.velt * ((1 - this.fsp * 0.5) + this.ssp * 4) * 0.4;
		this.velt = this.acct * dt + this.velt;
		var maxSpeed = cfg.fishMaxSpeed * (this.size / fishSizeStart);
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

		lake.ax = (this.pos.x - lake.x) * 3 - lake.vx * 2;
		lake.ay = (this.pos.y - lake.y) * 3 - lake.vy * 2;
		lake.vx = lake.ax * dt + lake.vx;
		lake.vy = lake.ay * dt + lake.vy;
		lake.x = lake.vx * dt + lake.x;
		lake.y = lake.vy * dt + lake.y;
		lake.x = Math.max(-halfLake, Math.min(halfLake, lake.x));
		lake.y = Math.max(-halfLake, Math.min(halfLake, lake.y));

		this.life -= dt * (1 + this.scale * (fishLifeStart / fishLifeEnd - 1));
		this.time += dt;
		if (this.life > this.maxLife) {
			var growthMul = Math.max(1, this.gainWeight || 1);
			var timeToDouble = cfg.timeToDouble / growthMul;
			var sizeQ = Math.pow(this.size, 3);
			var x = timeToDouble / Math.log(2) * Math.log(sizeQ / Math.pow(fishSizeStart, 3));
			var y = Math.pow(fishSizeStart, 3) * Math.exp(Math.log(2) / timeToDouble * (x + dt));
			this.size = Math.min(Math.pow(y, 1 / 3), fishSizeEnd);
		} else {
			this.lifeGain = this.life;
			this.gainWeight = 1;
		}

		this.scale = (this.size - fishSizeStart) / (fishSizeEnd - fishSizeStart);
		this.lakeScale = 1.0 / (1.0 / lakeScaleStart * (1 - this.scale) + this.scale * 1.0 / lakeScaleEnd);

		var num = Math.pow(this.size, 3) * 100;
		if (num > this.max_weight) this.max_weight = num;

		this.look_target = null;
		return this.alive;
	};

	FishSim.prototype.setAlive = function(val) {
		var cfg = getCfg();
		if (val > 0) {
			this.life = cfg.fishOtherLife;
			this.alive = true;
		} else {
			this.life += val;
			if (this.life < 0) this.alive = false;
		}
		return this.alive;
	};

	if (typeof module !== "undefined" && module.exports) {
		module.exports = FishSim;
	}
	if (typeof window !== "undefined") {
		window.FishSim = FishSim;
	}
}(typeof window !== "undefined" ? window : global));
