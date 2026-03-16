"use strict";

(function (window) {
	function Food(size, x, y, c) {
		this.initialize(size, x, y, c);
	}
	Food.prototype = new createjs.Shape();
	Food.prototype.Shape_initialize = Food.prototype.initialize;
	Food.prototype.initialize = function(size, x, y, c) {
		x = typeof x !== "undefined" ? x : 0;
		y = typeof y !== "undefined" ? y : 0;
		c = typeof c !== "undefined" ? createjs.Graphics.getHSL(c, 100, 50) : "pink";
		this.Shape_initialize();
		this.activate(size, x, y, c);
	};
	Food.prototype.getShape = function(size, c) {
		var angle = 0;
		var radius = size;
		this.vCX = 0;
		this.vCY = 0;
		this.size = size;
		this.hit = size;
		this.bounds = 0;
		this.graphics.clear();
		this.graphics.moveTo(0, size);
		this.rotation = 0;
		this.graphics.beginFill(c);
		while (angle < Math.PI * 2 - 0.5) {
			angle += 0.25 + (Math.random() * 100) / 500;
			radius = size + (size / 2 * Math.random());
			this.graphics.lineTo(Math.sin(angle) * radius, Math.cos(angle) * radius);
			if (radius > this.bounds) this.bounds = radius;
			this.hit = (this.hit + radius) / 2;
		}
		this.graphics.closePath().endFill();
	};
	Food.prototype.activate = function(size, x, y, c) {
		c = typeof c !== "undefined" ? c : "pink";
		this.getShape(size, c);
		this.spin = (Math.random() + 0.9) * 2;
		this.x = x;
		this.y = y;
		this.myx = this.x;
		this.myy = this.y;
		this.active = true;
	};
	Food.prototype.update = function(event, x, y) {
		this.rotation += this.spin;
		this.vX = Math.sin(this.rotation / 7) / 5 + this.vCX;
		this.vY = Math.cos(this.rotation / 7) / 5 + this.vCY;
		this.myx += this.vX;
		this.myy += this.vY;
		this.vCX /= 1.01;
		this.vCY /= 1.01;
		this.x = this.myx;
		this.y = this.myy;
	};

	window.Food = Food;
}(window));
