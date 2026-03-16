"use strict";

(function (window) {
	function Algae(size, x, y, r, t, loader) {
		this.initialize(size, x, y, r, t, loader);
	}
	Algae.prototype = new createjs.Bitmap();
	Algae.prototype.Algae_initialize = Algae.prototype.initialize;
	Algae.prototype.initialize = function(size, x, y, r, t, loader) {
		this.Algae_initialize();
		this.image = loader.getResult(t);
		this.image.style.color = "#F00";
		this.image.style.backgroundColor = "#F00";
		this.x = x;
		this.y = y;
		this.rotation = r / Math.PI * 180;
		this.scaleX = size;
		this.scaleY = size;
	};

	window.Algae = Algae;
}(window));
