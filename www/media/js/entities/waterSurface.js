"use strict";

(function (window) {
	var cfg = window.FishbowlConfig || { LAKE_SIZE: 5000, WATER_LINE_SPACING: 25, WATER_LINE_COUNT: 12, WATER_LINE_LENGTH_X: 200, WATER_LINE_THICKNESS_MIN: 0.15, WATER_LINE_THICKNESS_MAX: 0.7 };

	/**
	 * Superficie dell'acqua con onde. Le linee seguono il pesce (centro vista).
	 */
	function WaterSurface() {
		this.time = 0;
		this.shape = new createjs.Shape();
		this.waves = [
			{ lambda: 80, a: 1.2, phi: 0 },
			{ lambda: 120, a: 0.8, phi: Math.PI / 3 },
			{ lambda: 60, a: 0.6, phi: Math.PI / 2 }
		];
		for (var i = 0; i < this.waves.length; i++) {
			var w = this.waves[i];
			w.k = 2 * Math.PI / w.lambda;
			w.omega = Math.sqrt(9.81 * w.k) * 0.35;
		}
		this.lineSpacing = cfg.WATER_LINE_SPACING;
		var totalLines = Math.max(1, cfg.WATER_LINE_COUNT);
		this.offsets = [];
		for (var i = 0; i < totalLines; i++) {
			this.offsets.push({
				dx: (Math.random() * 2 - 1) * this.lineSpacing,
				dy: (Math.random() * 2 - 1) * this.lineSpacing
			});
		}
	}

	WaterSurface.prototype.elevation = function(x, t) {
		var z = 0;
		for (var i = 0; i < this.waves.length; i++) {
			var w = this.waves[i];
			z += w.a * Math.sin(w.k * x - w.omega * t + w.phi);
		}
		return z;
	};

	WaterSurface.prototype.draw = function(lake, lakeSize, dt) {
		this.time += dt || 0.016;
		var g = this.shape.graphics;
		g.clear();

		var halfW = cfg.WATER_LINE_LENGTH_X / 2;
		var halfH = 5;
		var step = 5;
		var cx = lake.x;
		var cy = lake.y;
		var cw = (window.Fishbowl.stage && window.Fishbowl.stage.canvas) ? window.Fishbowl.stage.canvas.width : 800;
		var ch = (window.Fishbowl.stage && window.Fishbowl.stage.canvas) ? window.Fishbowl.stage.canvas.height : 800;
		var visibleExtentX = (cw / lakeSize) / 2;
		var visibleExtentY = (ch / lakeSize) / 2;

		for (var i = 0; i < this.offsets.length; i++) {
			var o = this.offsets[i];
			var baseX = o.dx;
			var baseY = o.dy;

			if (baseX + halfW < cx - visibleExtentX){
				o.dx = cx + visibleExtentX + halfW;
				o.dy += (Math.random() * 2 - 1) * this.lineSpacing;
			}
			else if (baseX - halfW > cx + visibleExtentX){
				o.dx = cx - visibleExtentX - halfW ;
				o.dy += (Math.random() * 2 - 1) * this.lineSpacing;
			}
			if (baseY + halfH < cy - visibleExtentY){
				o.dx += (Math.random() * 2 - 1) * this.lineSpacing;
				o.dy = cy + visibleExtentY + halfH ;
			}
			else if (baseY - halfH > cy + visibleExtentY){
				o.dx += (Math.random() * 2 - 1) * this.lineSpacing;
				o.dy = cy - visibleExtentY - halfH ;
			}

			baseX = o.dx;
			baseY = o.dy;

			var pts = [];
			for (var x = baseX - halfW; x <= baseX + halfW; x += step) {
				var z = this.elevation(x, this.time);
				pts.push({ x : x, y: baseY + z });
			}
			if (pts.length < 3) continue;

			var top = [], bot = [];
			for (var j = 0; j < pts.length; j++) {
				var px = pts[j].x, py = pts[j].y;
				var tMin = cfg.WATER_LINE_THICKNESS_MIN || 0.15;
				var tMax = cfg.WATER_LINE_THICKNESS_MAX || 0.7;
				var tVar = (0.5 + 0.5 * Math.sin(px * 0.08 + this.time) * Math.cos(py * 0.2 + this.time * 0.7));
				var distFromCenter = Math.abs(px - baseX);
				var taper = Math.max(0, 1 - distFromCenter / halfW);
				taper = taper * taper;
				var thickness = (tMin + (tMax - tMin) * tVar) * taper;
				var dx, dy;
				if (j === 0) {
					dx = pts[1].x - pts[0].x;
					dy = pts[1].y - pts[0].y;
				} else if (j === pts.length - 1) {
					dx = pts[j].x - pts[j - 1].x;
					dy = pts[j].y - pts[j - 1].y;
				} else {
					dx = pts[j + 1].x - pts[j - 1].x;
					dy = pts[j + 1].y - pts[j - 1].y;
				}
				var len = Math.sqrt(dx * dx + dy * dy) || 1;
				var nx = -dy / len;
				var ny = dx / len;
				var h = thickness / 2;
				top.push({ x: px + nx * h, y: py + ny * h });
				bot.push({ x: px - nx * h, y: py - ny * h });
			}

			var alpha = 0.12 + 0.08 * (0.5 + 0.5 * Math.sin((baseX + baseY) * 0.03 + this.time * 1.2));
			g.beginFill("rgba(255,255,255," + Math.min(0.22, alpha) + ")");
			g.moveTo(top[0].x, top[0].y);
			for (var k = 1; k < top.length; k++) g.lineTo(top[k].x, top[k].y);
			for (var k = bot.length - 1; k >= 0; k--) g.lineTo(bot[k].x, bot[k].y);
			g.closePath();
			g.endFill();
		}
	};

	window.WaterSurface = WaterSurface;
}(window));
