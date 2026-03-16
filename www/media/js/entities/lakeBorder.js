"use strict";

(function (window) {
	var cfg = window.FishbowlConfig || { LAKE_SIZE: 10000 };

	/**
	 * Bordo del lago: linea che identifica i confini come vetro di un acquario.
	 * Disegna un rettangolo ai bordi di LAKE_SIZE.
	 */
	function LakeBorder() {
		this.shape = new createjs.Shape();
		this.innerLineShape = new createjs.Shape();
	}

	LakeBorder.prototype.draw = function(lake, lakeSize, fish) {
		var g = this.shape.graphics;
		g.clear();

		var half = (cfg.LAKE_SIZE || 10000) / 2;
		var left = -half;
		var right = half;
		var top = -half;
		var bottom = half;

		// Effetto vetro: linea semi-trasparente con leggero highlight
		var glassColor = "rgba(255,255,255,0.2)";
		var glassHighlight = "rgba(255,255,255,0.35)";
		var thickness = 3 / lakeSize;

		g.setStrokeStyle(thickness);
		g.beginStroke(glassColor);
		g.drawRect(left, top, right - left, bottom - top);
		g.endStroke();

		// Bordo interno più sottile per effetto vetro
		var inset = thickness * 2;
		g.setStrokeStyle(thickness * 0.5);
		g.beginStroke(glassHighlight);
		g.drawRect(left + inset, top + inset, (right - left) - inset * 2, (bottom - top) - inset * 2);
		g.endStroke();

		// Linea grigia interna (sotto il pesce): limite di movimento, più fine
		var ig = this.innerLineShape.graphics;
		ig.clear();
		if (fish && fish.size) {
			var fishMargin = fish.size * 120;
			var innerHalf = Math.max(0, half - fishMargin);
			if (innerHalf > 0) {
				ig.setStrokeStyle(thickness * 0.4);
				ig.beginStroke("rgba(136,136,153,0.5)");
				ig.drawRect(-innerHalf, -innerHalf, innerHalf * 2, innerHalf * 2);
				ig.endStroke();
			}
		}
	};

	window.LakeBorder = LakeBorder;
}(window));
