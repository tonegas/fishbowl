"use strict";

/**
 * FishView: rendering CreateJS di un FishSim. Possiede tutti i Shape/Container,
 * HUD, label e bandiere di smoothing/network mirror per il pesce remoto.
 */
(function (window) {
	var cfg = window.FishbowlConfig;
	var state = window.Fishbowl;

	function colorStrFromSim(sim) {
		return createjs.Graphics.getHSL(sim.color, sim.life / sim.maxLife * 200 - 100, 50);
	}

	function FishView(sim, isLocal) {
		this.sim = sim;
		this.isLocal = !!isLocal;

		this.fishParts = {
			fin: [],
			mounth: null,
			part: [],
			cont: []
		};
		this._displayCtp = null;
		this._targetCtp = null;
		this._colorStr = null;
		this._lastPos = null;
		this._lastVelocity = null;
		this._uiNameNear = false;
		this._uiArrowNear = false;
		this._lastGainMulShown = 1;
		this._gainMulPulseT = 0;
		this.finSpreadLateral = 0;

		this._buildShapes();
		this.sync(0);
	}

	FishView.prototype._buildShapes = function() {
		var sim = this.sim;
		var fP = this.fishParts;
		var stage = state.stage;
		var lakeStage = state.lakeStage;

		for (var i = sim.nPart - 1; i >= 0; i--) {
			fP.part[i] = new createjs.Shape();
			fP.part[i].regX = sim.dimS[i].x / 2;
			fP.part[i].regY = sim.dimS[i].y - sim.dim[i] - 5;
			fP.cont[i] = new createjs.Container();
			if (i < sim.nPart - 1) fP.cont[i].addChild(fP.cont[i + 1]);
			fP.cont[i].addChild(fP.part[i]);
			fP.cont[i].y = i > 0 ? sim.dim[i - 1] : 0;
		}

		var finColor = createjs.Graphics.getHSL(sim.color, 50, 60);
		fP.fin[0] = new createjs.Shape();
		fP.fin[0].regX = sim.dimS[0].x / 2 - 3; fP.fin[0].regY = 10;
		fP.fin[0].graphics.beginFill(finColor).bezierCurveTo(0, 0, 10, 40, -20, 40).endFill();
		fP.cont[0].addChild(fP.fin[0]);
		fP.fin[1] = new createjs.Shape();
		fP.fin[1].regX = -sim.dimS[0].x / 2 + 3; fP.fin[1].regY = 10;
		fP.fin[1].graphics.beginFill(finColor).bezierCurveTo(0, 0, -10, 40, 20, 40).endFill();
		fP.cont[0].addChild(fP.fin[1]);
		fP.dfin = new createjs.Shape();
		fP.dfin.regX = 0; fP.dfin.regY = 8; fP.dfin.x = 0; fP.dfin.y = -10;
		fP.dfin.graphics.beginFill(finColor).bezierCurveTo(0, 0, -15, 25, 0, 60).closePath().endFill();
		fP.dfin.graphics.beginFill(finColor).bezierCurveTo(0, 0, 15, 25, 0, 60).closePath().endFill();
		fP.cont[0].addChild(fP.dfin);
		fP.mounth = new createjs.Shape();
		fP.mounth.x = 0; fP.mounth.y = -40;
		fP.mounth.graphics.beginFill("#AA5555").drawEllipse(-5, -5, 10, 5).endFill();
		fP.cont[0].addChild(fP.mounth);

		fP.cont[0].scaleX = sim.size; fP.cont[0].scaleY = sim.size;
		fP.cont[0].x = sim.pos.x; fP.cont[0].y = sim.pos.y;
		lakeStage.addChildAt(fP.cont[0], 0);

		var eyeColor = createjs.Graphics.getHSL(sim.color, 50, 70);
		var eye = new createjs.Shape();
		eye.graphics.beginFill(eyeColor).drawCircle(-15, -30, 8);
		eye.graphics.beginFill(eyeColor).drawCircle(15, -30, 8);
		fP.cont[0].addChild(eye);
		fP.pupilL = new createjs.Shape();
		fP.pupilL.graphics.beginFill("#000000").drawCircle(0, 0, 3);
		fP.pupilL.x = -15; fP.pupilL.y = -30;
		fP.cont[0].addChild(fP.pupilL);
		fP.pupilR = new createjs.Shape();
		fP.pupilR.graphics.beginFill("#000000").drawCircle(0, 0, 3);
		fP.pupilR.x = 15; fP.pupilR.y = -30;
		fP.cont[0].addChild(fP.pupilR);

		this.nameLabel = new createjs.Text(sim.name || "Fish", "600 9px Fredoka,Arial,sans-serif", "#ffffff");
		this.nameLabel.alpha = 0.9;
		this.nameLabel.textAlign = "center";
		this.nameLabel.visible = false;
		this.nameLabel.shadow = new createjs.Shadow("rgba(0,24,48,0.92)", 0, 1, 2);
		stage.addChild(this.nameLabel);

		this.arrow = new createjs.Shape();
		this.arrow.graphics.beginFill(finColor).lineTo(-5, 12.5).bezierCurveTo(-5, 12, 0, 8, 5, 12.2).lineTo(0, 0).endFill();
		this.arrow.visible = false;
		stage.addChild(this.arrow);

		this.arrowLabel = new createjs.Text("", "600 9px Fredoka,Arial,sans-serif", "#eaf6ff");
		this.arrowLabel.visible = false;
		this.arrowLabel.textAlign = "center";
		this.arrowLabel.alpha = 0.92;
		this.arrowLabel.shadow = new createjs.Shadow("rgba(0,24,48,0.92)", 0, 1, 2);
		stage.addChild(this.arrowLabel);

		var hudRight = (stage.canvas.width / 2) - 12;
		var hudTop = -(stage.canvas.height / 2) + 10;
		this.infoName = new createjs.Text("", "600 15px Fredoka,Arial,sans-serif", "#eaf6ff");
		this.infoName.textAlign = "right";
		this.infoName.x = hudRight;
		this.infoName.y = hudTop;
		this.infoName.visible = this.isLocal;
		this.infoName.shadow = new createjs.Shadow("rgba(0,28,48,0.88)", 0, 1, 3);
		this.infoWeight = new createjs.Text("", "500 12px Fredoka,Arial,sans-serif", "#7dd3fc");
		this.infoWeight.textAlign = "right";
		this.infoWeight.x = hudRight;
		this.infoWeight.y = hudTop + 22;
		this.infoWeight.visible = this.isLocal;
		this.infoWeight.shadow = new createjs.Shadow("rgba(0,28,48,0.88)", 0, 1, 3);
		this.infoGrowthArrow = new createjs.Text("↑", "700 12px Fredoka,Arial,sans-serif", "#fef3c7");
		this.infoGrowthArrow.textAlign = "right";
		this.infoGrowthArrow.visible = false;
		this.infoGrowthArrow.shadow = new createjs.Shadow("rgba(0,28,48,0.88)", 0, 1, 3);
		this.infoGainMul = new createjs.Text("", "700 11px Fredoka,Arial,sans-serif", "#fef3c7");
		this.infoGainMul.textAlign = "right";
		this.infoGainMul.visible = false;
		this.infoGainMul.shadow = new createjs.Shadow("rgba(0,28,48,0.88)", 0, 1, 3);
		if (this.isLocal) {
			this._lifeBarW = 148;
			this._lifeBarH = 7;
			this._lifeBarGap = 8;
			this.lifeBarBg = new createjs.Shape();
			this.lifeBarFill = new createjs.Shape();
			this._growthBarW = 54;
			this._growthBarH = 6;
			this.growthBarBg = new createjs.Shape();
			this.growthBarFill = new createjs.Shape();
			this.growthBarBg.visible = false;
			this.growthBarFill.visible = false;
			stage.addChild(this.lifeBarBg);
			stage.addChild(this.lifeBarFill);
			stage.addChild(this.growthBarBg);
			stage.addChild(this.growthBarFill);
		}
		stage.addChild(this.infoName);
		stage.addChild(this.infoWeight);
		stage.addChild(this.infoGrowthArrow);
		stage.addChild(this.infoGainMul);
	};

	FishView.prototype.drawFish = function(ctp, colorStr) {
		var sim = this.sim;
		var fP = this.fishParts;
		var finColor = createjs.Graphics.getHSL(sim.color, 50, 60);
		var n = ctp.length;
		for (var i = 0; i < n; i++) {
			var fillColor = (i === n - 1) ? finColor : colorStr;
			fP.part[i].graphics.clear().beginFill(fillColor).drawEllipse(0, 0, sim.dimS[i].x, sim.dimS[i].y).endFill();
			fP.cont[i].rotation = ctp[i] / Math.PI * 180;
		}
		if (n > 1) {
			var finOsc = ctp[1] / Math.PI * 180 * 0.5;
			var spread = this.finSpreadLateral || 0;
			fP.dfin.rotation = -finOsc * 1.2;
			fP.fin[0].rotation = finOsc - spread;
			fP.fin[1].rotation = finOsc + spread;
		}
	};

	FishView.prototype.updatePupils = function() {
		var sim = this.sim;
		var fP = this.fishParts;
		var eyeL = { x: -15, y: -30 };
		var eyeR = { x: 15, y: -30 };
		var maxOff = 4;
		var lerpFactor = 0.18;
		var targetLX = eyeL.x, targetLY = eyeL.y, targetRX = eyeR.x, targetRY = eyeR.y;
		if (sim.look_target) {
			var pt = state.lakeStage.localToLocal(sim.look_target.x, sim.look_target.y, fP.cont[0]);
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
		fP.pupilL.x += (targetLX - fP.pupilL.x) * lerpFactor;
		fP.pupilL.y += (targetLY - fP.pupilL.y) * lerpFactor;
		fP.pupilR.x += (targetRX - fP.pupilR.x) * lerpFactor;
		fP.pupilR.y += (targetRY - fP.pupilR.y) * lerpFactor;
	};

	/** Allinea cont[0] a sim.pos/size e ricalcola mounth/fin. Chiamato prima di eat/bite per coordinate fresche dello stesso frame. */
	FishView.prototype.syncTransform = function() {
		var sim = this.sim;
		var fP = this.fishParts;
		if (this.isLocal) {
			fP.cont[0].x = sim.pos.x;
			fP.cont[0].y = sim.pos.y;
		}
		fP.cont[0].scaleX = sim.size;
		fP.cont[0].scaleY = sim.size;
		fP.cont[0].regY = -(sim.velt / 10);
		this.updateMouthFin();
	};

	FishView.prototype.updateMouthFin = function() {
		var sim = this.sim;
		var fP = this.fishParts;
		sim.mounth = fP.cont[0].localToLocal(0, -30, state.lakeStage);
		var lastIdx = sim.nRPart - 1;
		if (lastIdx < 0) return;
		var d = sim.dimS[lastIdx];
		var lastPart = fP.cont[lastIdx].children[0];
		if (lastPart) {
			sim.fin = lastPart.localToLocal(d.x / 2, d.y / 2, state.lakeStage);
		}
	};

	FishView.prototype.sync = function(dt) {
		var sim = this.sim;
		var fP = this.fishParts;

		this.syncTransform();

		var targetSpread = (-(sim.ssp || 0) + (sim.fsp || 0)) * 20;
		this.finSpreadLateral += (targetSpread - this.finSpreadLateral) * 0.05;

		for (var i = 0; i < sim.nPart; i++) {
			fP.cont[i].visible = (i < sim.nRPart);
		}

		var ctpForDraw, colorStr;
		if (this.isLocal) {
			ctpForDraw = sim.ctp;
			colorStr = colorStrFromSim(sim);
		} else {
			if (!this._displayCtp) this._displayCtp = sim.ctp.slice();
			ctpForDraw = this._displayCtp;
			colorStr = this._colorStr || colorStrFromSim(sim);
		}
		this.drawFish(ctpForDraw, colorStr);

		fP.mounth.scaleX = sim._mouthOpen ? 2.2 : 1;
		fP.mounth.scaleY = sim._mouthOpen ? 1.5 : 1;
		this.updatePupils();

		if (this.isLocal) {
			var num = Math.pow(sim.size, 3) * 100;
			var weightStr = num < 0.1 ? (num * 1000).toFixed(1) + " g" : num < 0.5 ? Math.ceil(num * 1000) + " g" : num < 10 ? num.toFixed(2) + " kg" : num < 100 ? num.toFixed(1) + " kg" : Math.ceil(num) + " kg";
			this.infoName.text = sim.name || "Fish";
			this.infoWeight.text = weightStr;
			this.refreshLocalLifeBar(dt || 0);
		}
	};

	FishView.prototype.setRemoteSnapshot = function(ctp, pos, size, colorStr, name, colorHue) {
		var sim = this.sim;
		var fP = this.fishParts;
		if (name !== undefined) sim.name = name || "Fish";
		this._targetCtp = ctp.slice();
		this._colorStr = colorStr;
		var h = (typeof colorHue === "number" && colorHue >= 0 && colorHue <= 360) ? colorHue : parseHueFromColorStr(colorStr);
		if (h !== null && !isNaN(h)) sim.color = h;
		if (!this._displayCtp) this._displayCtp = ctp.slice();
		if (ctp.length === 0) {
			this.die();
			return;
		}
		sim.nRPart = ctp.length;
		sim.ctp = ctp.slice();
		this.drawFish(this._displayCtp, colorStr);
		if (typeof size === "number" && isFinite(size) && size > 0) {
			sim.size = size;
		}
		fP.cont[0].scaleX = sim.size;
		fP.cont[0].scaleY = sim.size;
		this.nameLabel.text = sim.name || "Fish";
		this.nameLabel.color = colorStr;
		this.arrowLabel.text = sim.name || "Fish";
		this.arrowLabel.color = colorStr;
		this.arrow.graphics.clear();
		this.arrow.graphics.beginFill(colorStr).lineTo(-5, 12.5).bezierCurveTo(-5, 12, 0, 8, 5, 12.2).lineTo(0, 0).endFill();
		this.arrow.scaleX = 1.5;
		this.arrow.scaleY = 1.5;
	};

	/** Nome/frecce sullo stage seguono la posizione interpolata del pesce. */
	FishView.prototype.updateRemotePlayerLabels = function(myView, lake) {
		if (!myView || this === myView) return;
		var stage = state.stage;
		var fP = this.fishParts;
		var root = fP.cont[0];
		if (!root) return;
		var ls = myView.sim.lakeScale;
		var bordo = { x: stage.canvas.width / 2, y: stage.canvas.height / 2 };
		var p = { x: (root.x - lake.x) * ls, y: (root.y - lake.y) * ls };
		var ang = Math.atan2(p.x, -p.y);
		var colorStr = this._colorStr || "#ffffff";
		/* otherFishSmooth: 0 = snap (off), 1 = smoothing massimo. Fattore di lerp = (1 - smooth). */
		var lerp = 1 - cfg.otherFishSmooth;
		var useLerp = lerp > 0 && lerp < 1;
		this.arrow.x = Math.max(-bordo.x, Math.min(bordo.x, p.x));
		this.arrow.y = Math.max(-bordo.y, Math.min(bordo.y, p.y));
		if (Math.abs(p.x) < bordo.x && Math.abs(p.y) < bordo.y) {
			this.arrow.visible = false;
			this.arrowLabel.visible = false;
			this.nameLabel.visible = true;
			this.nameLabel.text = this.sim.name || "Fish";
			this.nameLabel.color = colorStr;
			var headPt = root.localToLocal(50, 50, stage);
			if (useLerp && this._uiNameNear) {
				this.nameLabel.x += (headPt.x - this.nameLabel.x) * lerp;
				this.nameLabel.y += (headPt.y - this.nameLabel.y) * lerp;
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
			this.arrowLabel.text = this.sim.name || "Fish";
			this.arrowLabel.color = colorStr;
			this.arrow.rotation = ang / Math.PI * 180;
			var offset = 22;
			var tAx = this.arrow.x + offset * Math.sin(ang);
			var tAy = this.arrow.y - offset * Math.cos(ang);
			if (useLerp && this._uiArrowNear) {
				this.arrowLabel.x += (tAx - this.arrowLabel.x) * lerp;
				this.arrowLabel.y += (tAy - this.arrowLabel.y) * lerp;
			} else {
				this.arrowLabel.x = tAx;
				this.arrowLabel.y = tAy;
			}
			this._uiArrowNear = true;
			this._uiNameNear = false;
		}
	};

	FishView.prototype.die = function() {
		var stage = state.stage;
		var self = this;
		[this.arrow, this.arrowLabel, this.nameLabel,
		 this.lifeBarBg, this.lifeBarFill, this.growthBarBg, this.growthBarFill,
		 this.infoName, this.infoWeight, this.infoGrowthArrow, this.infoGainMul]
			.forEach(function(child) { if (child) stage.removeChild(child); });
		if (state.lakeStage && self.fishParts.cont[0]) {
			state.lakeStage.removeChild(self.fishParts.cont[0]);
		}
		this.sim.alive = false;
	};

	FishView.prototype.layoutLocalHud = function() {
		if (!this.isLocal) return;
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

	FishView.prototype.positionLifeBarBesideName = function(hx, hy) {
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

	FishView.prototype.positionGrowthHudBesideWeight = function(hx, hy) {
		var weightW = (typeof this.infoWeight.getMeasuredWidth === "function")
			? this.infoWeight.getMeasuredWidth()
			: (this.infoWeight.getBounds ? this.infoWeight.getBounds().width : 70);
		weightW = Math.max(weightW, 6);
		var right = hx - weightW - 8;
		var rowY = hy + 22;
		this.infoGrowthArrow.x = right;
		this.infoGrowthArrow.y = rowY;
		right -= 16;
		if (this.growthBarBg) {
			var gw = this._growthBarW;
			var gh = this._growthBarH;
			var barLeft = right - gw - 8 + 10;
			var barTop = rowY + Math.max(1, Math.floor((12 - gh) / 2)) + 2;
			this.growthBarBg.x = barLeft;
			this.growthBarBg.y = barTop;
			this.growthBarFill.x = barLeft;
			this.growthBarFill.y = barTop;
			right = barLeft - 4;
		}
		this.infoGainMul.x = right;
		this.infoGainMul.y = rowY;
	};

	FishView.prototype.refreshLocalLifeBar = function(dt) {
		if (!this.lifeBarBg || !this.lifeBarFill) return;
		var sim = this.sim;
		var w = this._lifeBarW;
		var h = this._lifeBarH;
		var cap = Math.max(1e-6, sim.maxLife);
		var growing = sim.life > sim.maxLife;
		var ratio = growing ? 1 : Math.max(0, Math.min(1, sim.life / cap));
		if (sim.life >= cap - 1e-4) {
			ratio = 1;
		}
		var fillW = ratio >= 1 ? w : Math.max(0, ratio * w);
		if (fillW > 0 && fillW < 1) fillW = 1;

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

		var timeMs = (typeof createjs !== "undefined" && createjs.Ticker) ? createjs.Ticker.getTime() : (sim.time * 1000);
		var tSec = timeMs / 1000;
		if (fillW > 0) {
			var fx = w - fillW;
			var heat = Math.pow(Math.max(0, Math.min(1, 1 - ratio)), 1.15);
			var grad = lifeBarPaletteGradient(heat, tSec);
			gFill.beginLinearGradientFill(grad.colors, grad.ratios, fx, 0, fx + fillW, 0).drawRoundRect(fx, 0, fillW, h, 2).endFill();
		}

		/* Glow solo con vita oltre maxLife. */
		var excessLife = sim.life - sim.maxLife;
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
				this.lifeBarFill.shadow = new createjs.Shadow("rgba(255, 248, 210, " + glowAlpha.toFixed(3) + ")", 0, 0, glowBlur);
			}
		} else {
			this.lifeBarFill.alpha = 1;
			this.lifeBarBg.alpha = 1;
			this.lifeBarFill.shadow = null;
		}

		var growCap = Math.max(1e-6, cfg.growingTime || 0);
		var growExcess = Math.max(0, sim.life - sim.maxLife);
		var growRatio = Math.max(0, Math.min(1, growExcess / growCap));
		var showGrowArrow = growExcess > 1e-4;
		var mulValue = Math.max(1, Math.floor(sim.gainWeight || 1));
		var showGainMul = mulValue > 1;
		if (mulValue !== this._lastGainMulShown) {
			if (mulValue > 1) this._gainMulPulseT = 0.28;
			this._lastGainMulShown = mulValue;
		}
		if (this._gainMulPulseT > 0) {
			this._gainMulPulseT = Math.max(0, this._gainMulPulseT - (dt || 0));
		}
		var pulseArrow = 0.5 + 0.5 * Math.sin(tSec * 6.283 * 1.6);
		this.infoGrowthArrow.visible = showGrowArrow;
		this.infoGrowthArrow.alpha = showGrowArrow ? (0.55 + 0.45 * pulseArrow) : 0;
		this.infoGrowthArrow.scaleX = this.infoGrowthArrow.scaleY = showGrowArrow ? (0.9 + 0.22 * pulseArrow) : 1;
		this.infoGainMul.visible = showGainMul;
		this.infoGainMul.text = showGainMul ? ("x" + mulValue) : "";
		if (showGainMul) {
			var pulseProg = Math.max(0, Math.min(1, 1 - (this._gainMulPulseT / 0.28)));
			var bump = Math.sin(pulseProg * Math.PI);
			this.infoGainMul.alpha = 0.9 + 0.1 * bump;
			this.infoGainMul.scaleX = this.infoGainMul.scaleY = 1 + 0.26 * bump;
		} else {
			this.infoGainMul.alpha = 0;
			this.infoGainMul.scaleX = this.infoGainMul.scaleY = 1;
		}
		var g2Bg = this.growthBarBg.graphics;
		var g2Fill = this.growthBarFill.graphics;
		var gw = this._growthBarW;
		var gh = this._growthBarH;
		g2Bg.clear();
		g2Fill.clear();
		if (showGrowArrow) {
			this.growthBarBg.visible = true;
			this.growthBarFill.visible = true;
			g2Bg.beginFill("rgba(50,14,14,0.52)").drawRoundRect(0, 0, gw, gh, 3).endFill();
			g2Bg.beginStroke("rgba(255,190,130,0.55)").setStrokeStyle(1).drawRoundRect(0, 0, gw, gh, 3).endStroke();
			var fill2W = growRatio > 0 ? Math.max(1, Math.round(gw * growRatio)) : 0;
			if (fill2W > 0) {
				var fill2X = gw - fill2W;
				g2Fill.beginLinearGradientFill(["#ef4444", "#f97316", "#f59e0b"], [0, 0.6, 1], fill2X, 0, fill2X + fill2W, 0).drawRoundRect(fill2X, 0, fill2W, gh, 2).endFill();
			}
			this.growthBarFill.alpha = 0.75 + 0.25 * pulseArrow;
		} else {
			this.growthBarBg.visible = false;
			this.growthBarFill.visible = false;
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

	/** Onda sinusoidale RGB lungo la barra. heat 0 = blu↔verde; heat 1 = rosso↔arancio. */
	function lifeBarPaletteGradient(heat, tSec) {
		var nSeg = 3;
		var sick = Math.pow(Math.max(0, Math.min(1, heat)), 0.92);
		var omega = 1;
		var k = Math.PI * 5;
		var hBr = 14, hBg = 92, hBb = 218;
		var hGr = 52, hGg = 202, hGb = 118;
		var sRr = 188, sRg = 36, sRb = 42;
		var sOr = 252, sOg = 118, sOb = 38;
		var colors = [];
		var ratios = [];
		for (var i = 0; i <= nSeg; i++) {
			var u = i / nSeg;
			var wh = 0.5 + 0.5 * Math.sin(tSec * omega + u * k);
			var ws = 0.5 + 0.5 * Math.sin(tSec * omega * 0.95 + u * k + 1.05);
			var hr = hBr + (hGr - hBr) * wh;
			var hg = hBg + (hGg - hBg) * wh;
			var hb = hBb + (hGb - hBb) * wh;
			var sr = sRr + (sOr - sRr) * ws;
			var sg = sRg + (sOg - sRg) * ws;
			var sb = sRb + (sOb - sRb) * ws;
			colors.push(rgbToHex(hr + (sr - hr) * sick, hg + (sg - hg) * sick, hb + (sb - hb) * sick));
			ratios.push(u);
		}
		return { colors: colors, ratios: ratios };
	}

	function parseHueFromColorStr(str) {
		if (!str || typeof str !== "string") return null;
		var m = str.match(/hsla?\(\s*(\d+)/);
		if (m) return parseInt(m[1], 10);
		if (str.length > 4) {
			var n = parseInt(str.substr(4).split(",")[0], 10);
			if (!isNaN(n) && n >= 0 && n <= 360) return n;
		}
		return null;
	}

	window.FishView = FishView;
}(window));
