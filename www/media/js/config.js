"use strict";

(function (global) {
	var cfg = {
		lakeSize: 10000,
		lakeStartSize: 10,
		lakeEndSize: 0.5,
		foodCount: 1000,
		foodSpawnRadius: 1000,
		mouthSizeFactor: 7,
		chaseDistanceFactor: 100,
		fishInitialLife: 3 * 60,
		fishEndLife: 20 * 60,
		fishMaxSpeed: 60,
		fishLifeGainFromFood: 5,
		fishLifeGainFromFish: 50,
		fishStartSize: 0.04,
		fishEndSize: 2.0,
		wholeFishSizeRatio: 10,
		algaeCount: 150,
		playerSpawnRange: 1000,
		waterSurfaceLineSpacing: 100,
		waterSurfaceLineCount: 10,
		waterLineLengthX: 250,
		waterLineThicknessMin: 0.1,
		waterLineThicknessMax: 5.0
	};

	if (typeof module !== "undefined" && module.exports) {
		cfg.port = parseInt(process.argv[2], 10) || 9999;
		cfg.cheatEnabled = process.argv.indexOf("--cheat") !== -1;
		module.exports = cfg;
	}
	if (typeof window !== "undefined") {
		window.FishbowlConfig = {
			LAKE_SIZE: cfg.lakeSize,
			FOOD_COUNT: cfg.foodCount,
			FOOD_SPAWN_HALF: cfg.foodSpawnRadius,
			FOOD_SPAWN_RADIUS: cfg.foodSpawnRadius,
			MOUTH_SIZE_FACTOR: cfg.mouthSizeFactor,
			CHASE_DISTANCE_FACTOR: cfg.chaseDistanceFactor,
			FISH_INITIAL_LIFE: cfg.fishInitialLife,
			FISH_MAX_SPEED: cfg.fishMaxSpeed,
			FISH_LIFE_GAIN_FROM_FOOD: cfg.fishLifeGainFromFood,
			FISH_LIFE_GAIN_FROM_FISH: cfg.fishLifeGainFromFish,
			FISH_END_LIFE: cfg.fishEndLife,
			LAKE_START_SIZE: cfg.lakeStartSize,
			LAKE_END_SIZE: cfg.lakeEndSize,
			FISH_START_SIZE: cfg.fishStartSize,
			FISH_END_SIZE: cfg.fishEndSize,
			WHOLE_FISH_SIZE_RATIO: cfg.wholeFishSizeRatio,
			WATER_LINE_SPACING: cfg.waterSurfaceLineSpacing,
			WATER_LINE_COUNT: cfg.waterSurfaceLineCount,
			WATER_LINE_LENGTH_X: cfg.waterLineLengthX,
			WATER_LINE_THICKNESS_MIN: cfg.waterLineThicknessMin,
			WATER_LINE_THICKNESS_MAX: cfg.waterLineThicknessMax
		};
		window.Fishbowl = {
			stage: null,
			lakeStage: null,
			bg: null,
			lake: null,
			myFish: null,
			playerName: null,
			loader: null,
			cheatEnabled: false
		};
	}
}(typeof window !== "undefined" ? window : global));
