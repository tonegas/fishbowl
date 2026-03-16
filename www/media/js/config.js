"use strict";

(function (global) {
	var cfg = {
		lakeSize: 5000,
		foodCount: 5000,
		foodSpawnRadius: 1000,
		mouthSizeFactor: 7,
		chaseDistanceFactor: 100,
		fishInitialLife: 60 * 3,
		fishMinLife: 60 * 1,
		fishLifeDecayDuration: 20 * 60,
		startLakeSize: 10,
		fishStartSize: 0.04,
		algaeCount: 500,
		algaeSpawnRange: 5000,
		playerSpawnRange: 100
	};

	if (typeof module !== "undefined" && module.exports) {
		cfg.port = parseInt(process.argv[2], 10) || 9999;
		module.exports = cfg;
	}
	if (typeof window !== "undefined") {
		window.FishbowlConfig = {
			LAKE_SIZE: cfg.lakeSize,
			FOOD_COUNT: cfg.foodCount,
			FOOD_SPAWN_HALF: cfg.foodSpawnRadius,
			MOUTH_SIZE_FACTOR: cfg.mouthSizeFactor,
			CHASE_DISTANCE_FACTOR: cfg.chaseDistanceFactor,
			FISH_INITIAL_LIFE: cfg.fishInitialLife,
			FISH_MIN_LIFE: cfg.fishMinLife,
			FISH_LIFE_DECAY_DURATION: cfg.fishLifeDecayDuration,
			START_LAKE_SIZE: cfg.startLakeSize,
			FISH_START_SIZE: cfg.fishStartSize
		};
		window.Fishbowl = {
			stage: null,
			lakeStage: null,
			bg: null,
			lake: null,
			myFish: null,
			playerName: null,
			loader: null
		};
	}
}(typeof window !== "undefined" ? window : global));
