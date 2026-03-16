"use strict";

var fs = require("fs");
var path = require("path");

var DECOR_TYPES = ["a1", "a2"];
var ALGAE_IMAGES = { a1: "alga.svg", a2: "alga2.svg" };

function getAlgaeDimensions() {
	var imagesDir = path.join(__dirname, "..", "www", "media", "image");
	var maxW = 0, maxH = 0;
	for (var id in ALGAE_IMAGES) {
		var filePath = path.join(imagesDir, ALGAE_IMAGES[id]);
		try {
			var content = fs.readFileSync(filePath, "utf8");
			var wMatch = content.match(/width="([\d.]+)"/);
			var hMatch = content.match(/height="([\d.]+)"/);
			if (wMatch) maxW = Math.max(maxW, parseFloat(wMatch[1]));
			if (hMatch) maxH = Math.max(maxH, parseFloat(hMatch[1]));
		} catch (e) {
			// fallback se il file non esiste
		}
	}
	return { width: maxW || 411, height: maxH || 294 };
}

var _algaeDim = null;
function algaeDimensions() {
	if (!_algaeDim) _algaeDim = getAlgaeDimensions();
	return _algaeDim;
}

function createLake(config) {
	var count = config.algaeCount;
	var lakeSize = config.lakeSize;
	var half = lakeSize / 2;
	var dim = algaeDimensions();
	var list = [];
	for (var i = 0; i < count; i++) {
		var s = Math.random() * 1.3;
		var maxX = half - dim.width * s; 
		var maxY = half - dim.height * s;
		var minX = -half + dim.width * s;
		var minY = -half + dim.height * s;
		var x = minX + Math.random() * Math.max(0, maxX - minX);
		var y = minY + Math.random() * Math.max(0, maxY - minY);
		list[i] = {
			s: s,
			x: x,
			y: y,
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
