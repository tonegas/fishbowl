"use strict";

/**
 * FoodView: rendering CreateJS del cibo. Possiede una createjs.Shape interna
 * e specchia stato/posizione/dimensione di un FoodSim.
 */
(function (window) {
	function FoodView(sim) {
		this.sim = sim;
		this.shape = new createjs.Shape();
		this.fillColor = "pink";
		this._lastSize = -1;
		this.sync();
	}

	FoodView.prototype.redraw = function() {
		var size = this.sim.size;
		var g = this.shape.graphics;
		g.clear();
		g.moveTo(0, size);
		g.beginFill(this.fillColor);
		var angle = 0;
		while (angle < Math.PI * 2 - 0.5) {
			angle += 0.25 + (Math.random() * 100) / 500;
			var radius = size + (size / 2 * Math.random());
			g.lineTo(Math.sin(angle) * radius, Math.cos(angle) * radius);
		}
		g.closePath().endFill();
		this._lastSize = size;
	};

	FoodView.prototype.sync = function() {
		var sim = this.sim;
		if (this._lastSize !== sim.size) {
			this.redraw();
		}
		this.shape.x = sim.x;
		this.shape.y = sim.y;
		this.shape.rotation = sim.rotation;
		this.shape.visible = sim.active;
	};

	window.FoodView = FoodView;
}(window));
