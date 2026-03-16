"use strict";

(function (window) {
	var cfg = window.FishbowlConfig || { LAKE_SIZE: 10000, FOOD_COUNT: 200 };

	function Lake() {
		this.dimX = cfg.LAKE_SIZE;
		this.dimY = cfg.LAKE_SIZE;
		this.x = 0;
		this.y = 0;
		this.vx = 0;
		this.vy = 0;
		this.ax = 0;
		this.ay = 0;
		this.otherFish = [];
		this.otherFishId = [];
		this.mObject = [];
		this.mObjectN = cfg.FOOD_COUNT;
		this.fObject = {};
	}

	window.Lake = Lake;
}(window));
