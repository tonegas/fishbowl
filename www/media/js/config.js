"use strict";

(function (global) {
	var cfg = {
		// Dimensione del mondo del lago (lato del quadrato in coordinate di gioco).
		// I bordi sono a ±lakeSize/2; incide su dove alghe e cibo possono stare.
		lakeSize: 10000,

		// Scala iniziale della “camera” sul lago (CreateJS: scale del lakeStage all’inizio).
		// Valori più alti = zoom più ravvicinato sul pesce piccolo; tipicamente accoppiato a fishStartSize.
		lakeStartSize: 10,

		// Scala finale del lago quando il pesce è cresciuto (fine curva di crescita / zoom out).
		// Più è basso, più il mondo appare lontano a fine partita.
		lakeEndSize: 0.5,

		// Quanti frammenti di cibo generare all’avvio del lago sul client.
		// Più sono, più denso è il campo nutrizionale (impatto su CPU e gameplay).
		foodCount: 1000,

		// Raggio (in unità mondo) intorno al centro del lago dove viene distribuito il cibo.
		// Oltre questa distanza dal centro il cibo viene riposizionato verso il giocatore.
		foodSpawnRadius: 500,

		// Dimensione minima di un pezzo di cibo nel mondo (scala coerente con fishStartSize).
		// Cibo più piccolo è più difficile da vedere ma può essere mangiato dai piccoli.
		foodSizeMin: 0.01,

		// Dimensione massima di un pezzo di cibo; i valori effettivi sono casuali tra min e max.
		// Cibo grande dà più opportunità di crescita ma richiede bocca abbastanza grande.
		foodSizeMax: 0.50,

		// Moltiplicatore del raggio della bocca rispetto alla size del pesce (collisioni mangiare/predare).
		// Più è alto, più facile intercettare prede e cibo a parità di dimensione visiva.
		mouthSizeFactor: 5,

		// Distanza massima (in unità di gioco) a cui un pesce “insegue” un’altra preda per il morso.
		// Valori alti rendono gli scontri tra pesci più frequenti a distanza.
		chaseDistanceFactor: 100,

		// Vita iniziale del tuo pesce, in secondi di simulazione (fish.update fa life -= dt; dt è in secondi).
		// Finché il tutorial blocca la simulazione (simDt = 0) la vita non scende; non sono tick del Ticker.
		fishInitialLife: 2 * 60,

		// Durata (in secondi di simulazione) della fase in cui il pesce può crescere fino alla taglia finale.
		// Dopo questo tempo size_time smette di avanzare verso fishEndSize / lakeEndSize.
		fishEndLife: 20 * 60,

		// Velocità massima del pesce locale (saturazione del velt in fish.update).
		// Più è alta, più reattivo e veloce è il controllo a parità di size.
		fishMaxSpeed: 60,

		// Quanta vita recuperi mangiando cibo (scalata in base al rapporto dimensione cibo/pesce).
		// Valori alti rendono il recupero per fame molto generoso.
		fishLifeGainFromFood: 5,

		// Vita guadagnata quando mangi un altro pesce (scalata come sopra).
		// Di solito molto più alto del cibo per premiare i combattimenti riusciti.
		fishLifeGainFromFish: 50,

		// Taglia iniziale del pesce nel mondo (coerente con lakeStartSize per la size a schermo).
		// È il punto di partenza della curva di crescita verso fishEndSize.
		fishStartSize: 0.04,

		// Taglia finale massima del pesce nel mondo dopo una crescita completa.
		// Insieme a lakeEndSize determina quanto grande appare il pesce a fine scala.
		fishEndSize: 2.0,

		// Rapporto usato per capire se la preda intera entra in bocca (predazione “intera”).
		// Influenza la logica eatWhole / dimensioni relative testa-coda.
		wholeFishSizeRatio: 10,

		// “Vita” degli altri pesci lato client per setAlive (secondi prima che spariscano senza aggiornamenti).
		// Serve a rimuovere entità remote stale dalla scena.
		fishOtherLife: 10,

		// Ritardo artificiale in millisecondi prima di applicare gli update di rete (solo debug/latenza simulata).
		// 0 = nessun ritardo; valori > 0 ritardano fish_to_client / fish_batch sul client.
		virtualDelay: 0,

		// Path URL di Socket.IO lato client (deve combaciare con come monti il server).
		// Cambialo se proxy o reverse path non usano il default /socket.io/.
		socketIoPath: "/socket.io/",

		// Intervallo in ms tra un broadcast “fish_batch” quando ci sono molti pesci sul server.
		// Solo sopra batchFishThreshold; riduce il numero di messaggi singoli.
		batchIntervalMs: 20,

		// Soglia: con almeno così tanti pesci il server passa a invio a batch periodico invece che emit per pesce.
		// Sotto soglia ogni stato viene inviato come singolo fish_to_client.
		batchFishThreshold: 4,

		// Fattore 0–1 per smussare posizione e angoli degli altri pesci sul client (interpolazione).
		// 1 = nessuno smoothing; valori bassi = movimento più morbido ma più “in ritardo” visivo.
		otherFishSmooth: 0.25,

		// Numero di alghe decorative generate nel layout del lago (condiviso server → client).
		// Più alghe = più carico di rendering ma scenario più ricco.
		algaeCount: 150,

		// Lato del quadrato in cui il server sorteggia la posizione iniziale (e preview spettatore).
		// Coordinate in [-range/2, +range/2] per x e y rispetto al centro mondo.
		playerSpawnRange: 1000,

		// Distanza in pixel/schermo tra le linee dell’effetto superficie dell’acqua.
		// Valori piccoli = linee più fitte e pattern più denso.
		waterSurfaceLineSpacing: 100,

		// Quante linee ondulate disegna la superficie dell’acqua (profondità dell’effetto).
		// Aumenta il costo di draw ma rende l’acqua più “viva”.
		waterSurfaceLineCount: 10,

		// Lunghezza orizzontale delle singole linee d’acqua in unità di disegno.
		// Insieme allo spacing definisce quanto ampia appare l’onda sullo schermo.
		waterLineLengthX: 250,

		// Spessore minimo delle linee d’acqua (linee lontane o sottili).
		// Usato nella variazione spessore lungo la linea.
		waterLineThicknessMin: 0.1,

		// Spessore massimo delle linee d’acqua (parti più marcate dell’onda).
		// Dà contrasto visivo rispetto a waterLineThicknessMin.
		waterLineThicknessMax: 5.0,

		// Massimo delta tempo (secondi) usato in un singolo frame di simulazione (acqua, altri pesci, fisica locale).
		// Evita salti enormi dopo pause tab; oltre questo valore il mondo avanza a step fissi per frame.
		maxFrameDt: 0.1
	};

	if (typeof module !== "undefined" && module.exports) {
		// Porta TCP su cui Node ascolta (argomento da riga di comando, default 9999).
		// Esempio: node fish_server.js 3000
		cfg.port = parseInt(process.argv[2], 10) || 9999;

		// Se presente --debug abilita flag lato server (es. invio debugEnabled al client su new_fish).
		// Utile per tasti cheat e pannello ritardo rete in sviluppo.
		cfg.debugEnabled = process.argv.indexOf("--debug") !== -1;
		module.exports = cfg;
	}
	if (typeof window !== "undefined") {
		// Copia dei valori di cfg con chiavi MAIUSCOLI: è ciò che leggono game.js, fish.js, network.js, ecc.
		// Non duplicare numeri qui: aggiungi solo la riga di mapping quando introduci una nuova chiave in cfg.
		window.FishbowlConfig = {
			LAKE_SIZE: cfg.lakeSize,
			FOOD_COUNT: cfg.foodCount,
			FOOD_SPAWN_HALF: cfg.foodSpawnRadius,
			FOOD_SPAWN_RADIUS: cfg.foodSpawnRadius,
			FOOD_SIZE_MIN: cfg.foodSizeMin,
			FOOD_SIZE_MAX: cfg.foodSizeMax,
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
			FISH_OTHER_LIFE: cfg.fishOtherLife,
			VIRTUAL_DELAY: cfg.virtualDelay,
			SOCKET_IO_PATH: cfg.socketIoPath,
			OTHER_FISH_SMOOTH: cfg.otherFishSmooth,
			WATER_LINE_SPACING: cfg.waterSurfaceLineSpacing,
			WATER_LINE_COUNT: cfg.waterSurfaceLineCount,
			WATER_LINE_LENGTH_X: cfg.waterLineLengthX,
			WATER_LINE_THICKNESS_MIN: cfg.waterLineThicknessMin,
			WATER_LINE_THICKNESS_MAX: cfg.waterLineThicknessMax,
			MAX_FRAME_DT: cfg.maxFrameDt
		};
		// Stato runtime del client (canvas, lago, pesce locale, sessione). Non sono tuning di gameplay.
		// I valori iniziali null/false vengono sostituiti quando carichi il gioco e ti connetti al server.
		window.Fishbowl = {
			stage: null,
			lakeStage: null,
			bg: null,
			lake: null,
			myFish: null,
			playerName: null,
			lastLeaderboardName: null,
			loader: null,
			debugEnabled: false,
			gameGeneration: 0,
			localPlayActive: false,
			spectatorLakeScale: null
		};
	}
}(typeof window !== "undefined" ? window : global));
