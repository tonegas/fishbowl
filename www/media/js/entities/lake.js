"use strict";

(function (window) {
	var cfg = window.FishbowlConfig;

	function Lake() {
		this.dimX = cfg.lakeSize;
		this.dimY = cfg.lakeSize;
		this.x = 0;
		this.y = 0;
		this.vx = 0;
		this.vy = 0;
		this.ax = 0;
		this.ay = 0;
		this.otherFish = [];
		this.otherFishId = [];
		this.mObject = [];
		this.mObjectN = cfg.foodCount;
		this.fObject = {};
	}

	window.Lake = Lake;
}(window));
