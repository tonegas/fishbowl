"use strict";

var DECOR_TYPES = ["a1", "a2"];

function createLake(config) {
	var count = config.algaeCount || 1000;
	var range = config.algaeSpawnRange || 10000;
	var list = [];
	for (var i = 0; i < count; i++) {
		list[i] = {
			s: Math.random(),
			x: Math.random() * range,
			y: Math.random() * range,
			r: Math.random() * Math.PI * 2,
			t: DECOR_TYPES[Math.floor(Math.random() * DECOR_TYPES.length)],
			c: Math.ceil(Math.random() * 360)
		};
	}
	return { list: list, N: count };
}

module.exports = {
	createLake: createLake
};
