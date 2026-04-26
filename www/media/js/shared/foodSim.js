"use strict";

/**
 * FoodSim: stato + simulazione del cibo. Niente CreateJS, niente window.
 * In futuro pronto per essere richiesto da Node lato server.
 */
(function (root) {
	function getCfg() {
		return (typeof window !== "undefined" && window.FishbowlConfig) ? window.FishbowlConfig : null;
	}

	function FoodSim(size, x, y) {
		this.size = size;
		this.x = x;
		this.y = y;
		this.vCX = 0;
		this.vCY = 0;
		this.rotation = 0;
		this.spin = (Math.random() + 0.9) * 2;
		this.active = true;
		this.bounds = size * 1.5;
	}

	FoodSim.prototype.activate = function(size, x, y) {
		this.size = size;
		this.bounds = size * 1.5;
		this.x = x;
		this.y = y;
		this.vCX = 0;
		this.vCY = 0;
		this.spin = (Math.random() + 0.9) * 2;
		this.rotation = 0;
		this.active = true;
	};

	FoodSim.prototype.resizeTo = function(newSize) {
		var cfg = getCfg();
		this.size = Math.max(cfg.foodSizeMin, newSize);
		this.bounds = this.size * 1.5;
	};

	FoodSim.prototype.update = function(playerX, playerY) {
		var cfg = getCfg();
		this.rotation += this.spin;
		this.x += Math.sin(this.rotation / 7) / 5 + this.vCX;
		this.y += Math.cos(this.rotation / 7) / 5 + this.vCY;
		this.vCX /= 1.01;
		this.vCY /= 1.01;
		var halfLake = cfg.lakeSize / 2;
		var foodSpawnRadius = cfg.foodSpawnRadius;
		var margin = this.bounds || this.size || 1;
		var dx = this.x - playerX;
		var dy = this.y - playerY;
		if (dx * dx + dy * dy > foodSpawnRadius * foodSpawnRadius) {
			var angle = Math.random() * Math.PI * 2;
			this.x = playerX + Math.cos(angle) * (Math.random() * 0.5 + 0.5) * foodSpawnRadius;
			this.y = playerY + Math.sin(angle) * (Math.random() * 0.5 + 0.5) * foodSpawnRadius;
		}
		this.x = Math.max(-halfLake + margin, Math.min(halfLake - margin, this.x));
		this.y = Math.max(-halfLake + margin, Math.min(halfLake - margin, this.y));
	};

	if (typeof module !== "undefined" && module.exports) {
		module.exports = FoodSim;
	}
	if (typeof window !== "undefined") {
		window.FoodSim = FoodSim;
	}
}(typeof window !== "undefined" ? window : global));
