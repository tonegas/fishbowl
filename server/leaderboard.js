"use strict";

var path = require("path");
var sqlite3 = require("sqlite3").verbose();

var dbPath = path.join(__dirname, "..", "fish_leaderboard.db");
var db = new sqlite3.Database(dbPath);

db.run("CREATE TABLE IF NOT EXISTS leaderboard (name TEXT, max_weight REAL, created_at INTEGER DEFAULT (strftime('%s','now')))");

function insertScore(name, maxWeight, callback) {
	db.run("INSERT INTO leaderboard (name, max_weight) VALUES (?, ?)", [name, maxWeight], function(err) {
		if (err) console.error("Insert error:", err);
		if (callback) callback();
	});
}

function getTopScores(limit, callback) {
	var n = limit || 20;
	db.all("SELECT name, MAX(max_weight) as max_weight FROM leaderboard GROUP BY name ORDER BY max_weight DESC LIMIT ?", [n], function(err, rows) {
		if (err) {
			console.error("Leaderboard error:", err);
			callback([]);
			return;
		}
		callback(rows || []);
	});
}

module.exports = {
	insertScore: insertScore,
	getTopScores: getTopScores
};
