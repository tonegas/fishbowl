"use strict";

(function (window) {
	var state = window.Fishbowl;

	function formatWeight(w) {
		if (w < 0.1) return (w * 1000).toFixed(1) + " g";
		if (w < 0.5) return Math.ceil(w * 1000) + " g";
		if (w < 10) return w.toFixed(2) + " kg";
		if (w < 100) return w.toFixed(1) + " kg";
		return Math.ceil(w) + " kg";
	}

	function showLeaderboard(rows) {
		var list = document.getElementById("leaderboardList");
		list.innerHTML = "";
		if (!rows || rows.length === 0) {
			var li = document.createElement("li");
			li.textContent = "No scores yet";
			list.appendChild(li);
			document.getElementById("leaderboardOverlay").style.display = "flex";
			return;
		}
		var playerName = (state.playerName || "").trim().toLowerCase();
		var playerIndex = -1;
		for (var i = 0; i < rows.length; i++) {
			if ((rows[i].name || "").toLowerCase() === playerName) {
				playerIndex = i;
				break;
			}
		}
		var toShow = [];
		if (playerIndex < 0 || playerIndex < 10) {
			toShow = rows.slice(0, Math.min(10, rows.length));
		} else {
			var top5 = rows.slice(0, 5);
			var start = Math.max(5, playerIndex - 2);
			var end = Math.min(rows.length, playerIndex + 3);
			var around = rows.slice(start, end);
			toShow = top5.concat([{ separator: true }], around);
		}
		toShow.forEach(function(item) {
			if (item.separator) {
				var li = document.createElement("li");
				li.className = "separator";
				li.textContent = "...";
				list.appendChild(li);
				return;
			}
			var rank = rows.indexOf(item) + 1;
			var li = document.createElement("li");
			var rankSpan = document.createElement("span");
			rankSpan.className = "rank";
			rankSpan.textContent = rank + ".";
			var nameSpan = document.createElement("span");
			nameSpan.className = "name";
			nameSpan.textContent = (item.name || "").substring(0, 12);
			var weight = document.createElement("span");
			weight.className = "weight";
			weight.textContent = formatWeight(item.max_weight);
			li.appendChild(rankSpan);
			li.appendChild(nameSpan);
			li.appendChild(weight);
			list.appendChild(li);
		});
		document.getElementById("leaderboardOverlay").style.display = "flex";
	}

	function showLeaderboardLoading() {
		var list = document.getElementById("leaderboardList");
		list.innerHTML = "";
		var li = document.createElement("li");
		li.textContent = "Loading...";
		list.appendChild(li);
		document.getElementById("leaderboardOverlay").style.display = "flex";
	}

	function hideLeaderboard() {
		document.getElementById("leaderboardOverlay").style.display = "none";
	}

	function initNameOverlay(socket) {
		var nameInput = document.getElementById("playerNameInput");
		var nameError = document.getElementById("nameError");
		nameInput.value = "";
		nameError.textContent = "";
		nameInput.onkeydown = function(e) {
			if (e.keyCode === 13) {
				var name = nameInput.value.trim().substring(0, 12);
				if (name.length > 0) {
					nameError.textContent = "";
					state.playerName = name;
					socket.emit("register_name", { name: name });
				}
			}
		};
		nameInput.oninput = function() {
			if (nameInput.value.length > 12) {
				nameInput.value = nameInput.value.substring(0, 12);
			}
		};
		nameInput.focus();
	}

	window.FishbowlUI = {
		showLeaderboard: showLeaderboard,
		showLeaderboardLoading: showLeaderboardLoading,
		hideLeaderboard: hideLeaderboard,
		initNameOverlay: initNameOverlay,
		formatWeight: formatWeight
	};
}(window));
