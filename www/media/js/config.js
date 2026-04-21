"use strict";

(function (global) {
	var cfg = {
		/* ---------- Mondo e camera ---------- */
		// Dimensione del mondo del lago (lato del quadrato in coordinate di gioco).
		// I bordi sono a ±lakeSize/2; incide su dove alghe e cibo possono stare.
		lakeSize: 10000,

		// Scala iniziale della “camera” sul lago (CreateJS: scale del lakeStage all’inizio).
		// Valori più alti = zoom più ravvicinato sul pesce piccolo; tipicamente accoppiato a fishSizeStart.
		lakeScaleStart: 10,

		// Scala finale della camera quando il pesce è cresciuto (fine curva di crescita / zoom out).
		// Più è basso, più il mondo appare lontano a fine partita.
		lakeScaleEnd: 0.5,

		// Numero di alghe decorative generate nel layout del lago (condiviso server → client).
		// Più alghe = più carico di rendering ma scenario più ricco.
		algaeCount: 150,

		// Lato del quadrato in cui il server sorteggia la posizione iniziale (e preview spettatore).
		// Coordinate in [-range/2, +range/2] per x e y rispetto al centro mondo.
		playerSpawnRange: 1000,

		/* ---------- Cibo ---------- */
		// Quanti frammenti di cibo generare all’avvio del lago sul client.
		// Più sono, più denso è il campo nutrizionale (impatto su CPU e gameplay).
		foodCount: 1000,

		// Raggio (in unità mondo) intorno al centro del lago dove viene distribuito il cibo.
		// Oltre questa distanza dal centro il cibo viene riposizionato verso il giocatore.
		foodSpawnRadius: 500,

		// Dimensione minima di un pezzo di cibo nel mondo (scala coerente con fishSizeStart).
		// Cibo più piccolo è più difficile da vedere ma può essere mangiato dai piccoli.
		foodSizeMin: 0.01,

		// Dimensione massima di un pezzo di cibo; i valori effettivi sono casuali tra min e max.
		// Cibo grande dà più opportunità di crescita ma richiede bocca abbastanza grande.
		foodSizeMax: 0.50,

		/* ---------- Pesce locale: movimento e combattimento ---------- */
		// DA RIVEDERE Massa in g del pesce iniziale
		fishSizeStart: Math.pow(0.005 / 100, 1/3),

		// DA RIVEDERE Massa in g del pesce finale
		fishSizeEnd: Math.pow(1000 / 100, 1/3),

		// Velocità massima del pesce locale (saturazione del velt in fish.update).
		// Più è alta, più reattivo e veloce è il controllo a parità di size.
		fishMaxSpeed: 60,

		// Moltiplicatore del raggio della bocca rispetto alla size del pesce (collisioni mangiare/predare).
		// Più è alto, più facile intercettare prede e cibo a parità di dimensione visiva.
		mouthSizeFactor: 5,

		// Da che distanza riesce a mangiare un altro pesce
		// Più è alto, più facile mangiare un altro pesce
		eatFishDistanceFactor: 5,

		// Da che distanza riesce a mangiare un altro pesce
		// Più è alto, più facile mangiare del cibo
		eatFoodDistanceFactor: 4,

		// Con cibo più grande della bocca: quanta "size" puoi mordere per frame (raggio bocca × questo valore).
		foodBiteMouthRatio: 0.05,

		// Distanza massima (in unità di gioco) a cui un pesce “insegue” un’altra preda per il morso.
		// Valori alti rendono gli scontri tra pesci più frequenti a distanza.
		chaseDistanceFactor: 100,

		// Rapporto usato per capire se la preda intera entra in bocca (predazione “intera”).
		// Influenza la logica eatWhole / dimensioni relative testa-coda.
		wholeFishSizeRatio: 10,

		/* ---------- Pesce locale: vita e crescita ---------- */
		// Periodo (secondi) in cui la massa del pesce raddoppia se la crescita è attiva (vedi fish.update: usa size³ e exp/ln).
		// Con fishSizeStart da 5 mg e crescita continua: timeToDouble = 204 → ~1 h per ~1000 g; timeToDouble = 408 → ~2 h.
		timeToDouble: 250,

		// Vita iniziale del tuo pesce, in secondi di simulazione (fish.update fa life -= dt; dt è in secondi).
		// Finché il tutorial blocca la simulazione (simDt = 0) la vita non scende; non sono tick del Ticker.
		fishLifeStart: 2 * 60,
		
		// DA RIVEDERE
		fishLifeEnd: 1 * 60,

		// Quanta vita recuperi mangiando cibo (scalata in base al rapporto dimensione cibo/pesce).
		// Valori alti rendono il recupero per fame molto generoso.
		fishLifeGainFromFood: 5,

		// Vita guadagnata quando mangi un altro pesce (scalata come sopra).
		// Di solito molto più alto del cibo per premiare i combattimenti riusciti.
		fishLifeGainFromFish: 50,

		/* ---------- Altri pesci (client) ---------- */
		// “Vita” degli altri pesci lato client per setAlive (secondi prima che spariscano senza aggiornamenti).
		// Serve a rimuovere entità remote stale dalla scena.
		fishOtherLife: 10,

		// Fattore 0–1 per smussare posizione e angoli degli altri pesci sul client (interpolazione).
		// 1 = nessuno smoothing; valori bassi = movimento più morbido ma più “in ritardo” visivo.
		otherFishSmooth: 0.1,

		/* ---------- Rete (server + client) ---------- */
		// Path URL di Socket.IO lato client (deve combaciare con come monti il server).
		// Cambialo se proxy o reverse path non usano il default /socket.io/.
		socketIoPath: "/socket.io/",

		// Intervallo in ms tra un broadcast “fish_batch” quando ci sono molti pesci sul server.
		// Solo sopra batchFishThreshold; riduce il numero di messaggi singoli.
		batchIntervalMs: 20,

		// Soglia: con almeno così tanti pesci il server passa a invio a batch periodico invece che emit per pesce.
		// Sotto soglia ogni stato viene inviato come singolo fish_to_client.
		batchFishThreshold: 5,

		// Ritardo artificiale in millisecondi prima di applicare gli update di rete (solo debug/latenza simulata).
		// 0 = nessun ritardo; valori > 0 ritardano fish_to_client / fish_batch sul client.
		virtualDelay: 0,

		/* ---------- Grafica: superficie acqua ---------- */
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

		/* ---------- Loop di gioco (client) ---------- */
		// Massimo delta tempo (secondi) usato in un singolo frame di simulazione (acqua, altri pesci, fisica locale).
		// Evita salti enormi dopo pause tab; oltre questo valore il mondo avanza a step fissi per frame.
		maxFrameDt: 0.05,

		// Porta TCP se l’argomento da riga di comando non è un numero valido (solo processo server Node).
		defaultServerPort: 9999
	};

	if (typeof module !== "undefined" && module.exports) {
		/* ---------- Processo server Node ---------- */
		var portArg = parseInt(process.argv[2], 10);
		cfg.port = (isNaN(portArg) || portArg < 1) ? cfg.defaultServerPort : portArg;

		// Se presente --debug abilita flag lato server (es. invio debugEnabled al client su new_fish).
		// Utile per tasti cheat e pannello ritardo rete in sviluppo.
		cfg.debugEnabled = process.argv.indexOf("--debug") !== -1;
		module.exports = cfg;
	}
	if (typeof window !== "undefined") {
		// Stesso oggetto cfg del server (camelCase); niente secondo dizionario di mapping.
		window.FishbowlConfig = cfg;
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
			savedLakeScale: null
		};
	}
}(typeof window !== "undefined" ? window : global));
