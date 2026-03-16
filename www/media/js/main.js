"use strict";

(function (window) {
	var gameImages = [
		{ src: "media/image/alga.svg", id: "a1", dimX: 411, dimY: 294, type: createjs.LoadQueue.IMAGE },
		{ src: "media/image/alga2.svg", id: "a2", dimX: 411, dimY: 294, type: createjs.LoadQueue.IMAGE },
		{ src: "media/image/a.png", id: "a", dimX: 9, dimY: 12, type: createjs.LoadQueue.IMAGE }
	];

	var loader = new createjs.LoadQueue(false);
	loader.addEventListener("complete", onImagesLoaded);
	loader.loadManifest(gameImages);

	function onImagesLoaded() {
		var socket = window.FishbowlSocket;
		var game = window.FishbowlGame;
		var network = window.FishbowlNetwork;

		network.setup(socket);
		game.init(socket, loader);
	}
}(window));
