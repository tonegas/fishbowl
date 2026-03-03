var socketio = io.connect(window.location.host || "127.0.0.1:9999");

var stage;
var gameimage = [
                 {src:"media/image/alga.svg",id:"a1",dimX:411,dimY:294, type:createjs.LoadQueue.IMAGE},
                 {src:"media/image/alga2.svg",id:"a2",dimX:411,dimY:294, type:createjs.LoadQueue.IMAGE},
                 {src:"media/image/a.png", id:"a", dimX:9, dimY:12,type:createjs.LoadQueue.IMAGE}
                 ];
var loader = new createjs.LoadQueue(false);
loader.addEventListener("complete", imageIsLoaded);
loader.loadManifest(gameimage);

var key = new Kibo();

var myFish, lake, lake_stage, bg, playerName;

var bmp;

function Lake(){
	this.dimX=10000;
	this.dimY=10000;
	this.x=0;
	this.y=0;
	this.vx=0;
	this.vy=0;
	this.ax=0;
	this.ay=0;
	this.otherFish=[];
	this.otherFishId=[];
	this.mObject=[];
	this.mObjectN = 200;
	this.fObject={};
}

(function (window) {

	function Algae(size,x,y,r,t) {
		this.initialize(size,x,y,r,t);
	}
	var p = Algae.prototype = new createjs.Bitmap();
	
	// constructor:
	p.Algae_initialize = p.initialize;	//unique to avoid overiding base class

	p.initialize = function (size,x,y,r,t) {
		this.Algae_initialize(); // super call
		this.image = loader.getResult(t);
		this.image.style.color = "#F00";
		this.image.style.backgroundColor = "#F00";
		this.x = x;
		this.y = y;
		this.rotation = r/Math.PI*180;
		this.scaleX=size;
		this.scaleY=size;
	};
    
	window.Algae = Algae;

}(window));

function imageIsLoaded(event){
	socketio.on("name_rejected", function() {
		document.getElementById("nameError").textContent = "Name already taken";
	});
	socketio.on("name_accepted", function() {
		document.getElementById("nameOverlay").style.display = "none";
		socketio.emit("new_fish", {});
	});
	function showLeaderboardOverlay(rows) {
		var list = document.getElementById("leaderboardList");
		list.innerHTML = "";
		if (rows && rows.length > 0) {
			rows.forEach(function(row, i) {
				var w = row.max_weight;
				var weightStr = w < 0.1 ? (w*1000).toFixed(1) + " g" :
					w < 0.5 ? Math.ceil(w*1000) + " g" :
					w < 10 ? w.toFixed(2) + " kg" :
					w < 100 ? w.toFixed(1) + " kg" : Math.ceil(w) + " kg";
				var name = (row.name || "").substring(0, 12);
				var li = document.createElement("li");
				var rank = document.createElement("span");
				rank.className = "rank";
				rank.textContent = (i+1) + ".";
				var nameSpan = document.createElement("span");
				nameSpan.className = "name";
				nameSpan.textContent = name;
				var weight = document.createElement("span");
				weight.className = "weight";
				weight.textContent = weightStr;
				li.appendChild(rank);
				li.appendChild(nameSpan);
				li.appendChild(weight);
				list.appendChild(li);
			});
		} else {
			var li = document.createElement("li");
			li.textContent = "No scores yet";
			list.appendChild(li);
		}
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
	socketio.on("leaderboard", function(rows) {
		showLeaderboardOverlay(rows);
	});
	document.getElementById("playAgainBtn").onclick = function() {
		document.getElementById("leaderboardOverlay").style.display = "none";
		socketio.emit("new_fish", {});
	};
	socketio.on("fish_to_client", function(data) {
		if(myFish && myFish.id!=data["id"]){
			var ok = 0;
			if(lake.otherFish[data['id']]){
				lake.otherFish[data['id']].set(data["ctp"],data["pos"],data["size"],data["color"],lake,data["name"]);
				lake.otherFish[data['id']].setAlive(1);
				ok=1;
			}
			if(ok==0){
				lake.otherFishId[lake.otherFishId.length]=data['id'];
				lake.otherFish[data['id']]=new Fish(data['id'],data["pos"],data["ctp"],data["color"],data["name"]||"Fish");
				lake.otherFish[data['id']].setAlive(1);
			}
		}
	});
	
	socketio.on("new_fish_id", function(data) {
		if(!myFish){
			stage.removeAllChildren();
			lake_stage.removeAllChildren();
			
			stage.addChild(lake_stage);
			
			var pos = data["pos"];
			lake = new Lake();
			lake.x = pos.x;
			lake.y = pos.y;


			lake.fObject = data['fobj'];
			for(var i=0;i < lake.fObject.N;i++){
				lake.fObject.list[i] = new Algae(lake.fObject.list[i].s,lake.fObject.list[i].x,lake.fObject.list[i].y,lake.fObject.list[i].r,lake.fObject.list[i].t);
				lake_stage.addChildAt(lake.fObject.list[i],0);
			}
			myFish = new Fish(data["id"],pos,[0,0,0,0,0],createjs.Graphics.getHSL(Math.ceil(Math.random()*360), 100, 50),playerName);
			for(var i=0;i < lake.mObjectN;i++){
				lake.mObject[i] = new Food(Math.random()*0.5+0.04);
				lake_stage.addChildAt(lake.mObject[i],0);
			}
			stage.addChildAt(bg,0);
		}
	});
	function sendFish() {
		socketio.emit("fish_to_server", {id:myFish.id, pos: myFish.pos, ctp: myFish.ctp, size:myFish.size, color:createjs.Graphics.getHSL(myFish.color, myFish.life/myFish.max_life*200-100, 50), name:playerName});
	}
	
	
	function init() {
		if (!createjs.Ticker.hasEventListener("tick")) { 
			createjs.Ticker.addEventListener("tick", tick);
		}    
		
		stage = new createjs.Stage("Lake");
		stage.enableDOMEvents(true);

		lake_stage = new createjs.Container();
		bg = new createjs.Shape();
	
		var nameInput = document.getElementById("playerNameInput");
		var nameError = document.getElementById("nameError");
		nameInput.value = "";
		nameError.textContent = "";
		nameInput.onkeydown = function(e) {
			if(e.keyCode === 13) {
				var name = nameInput.value.trim().substring(0, 12);
				if(name.length > 0) {
					nameError.textContent = "";
					playerName = name;
					socketio.emit("register_name", {name: name});
				}
			}
		};
		nameInput.oninput = function() {
			if(nameInput.value.length > 12) {
				nameInput.value = nameInput.value.substring(0, 12);
			}
		};
		nameInput.focus();
		
		resize();
		stage.update();
	}
	
	var timep;
	var count = 0;
	var dtTot = 0;
	function tick(event){
		dt = (timep !== undefined) ? (event.time-timep)/1000 : 0;
		if(count==50){
			count=1;
			dtTot=0;
		}
		dtTot+=dt;
		count+=1;
		if(myFish && dt<0.1){
			if(myFish.update(dt,lake)){
				sendFish();
				lake_stage.scaleX=myFish.lake_size;
				lake_stage.scaleY=myFish.lake_size;
				_.each(lake.mObject,function(obj){
					if(obj.size<myFish.size){
						lake_stage.removeChild(obj);
						lake.mObject = _.without(lake.mObject, _.findWhere(lake.mObject, obj));
					}else{
						obj.update(event,lake.x,lake.y);
						myFish.eat(obj);	
					}
				});
				var toRemove=[];
				for(var i=0;i<lake.otherFishId.length;i++){
					fish = lake.otherFish[lake.otherFishId[i]];
					myFish.bite(myFish,fish);
					myFish.bite(fish,myFish);
					if(fish.setAlive(-dt)==false){
						toRemove[toRemove.length]=lake.otherFishId[i];
					}
				}
				for(var i=0;i<toRemove.length;i++){
					lake.otherFish[toRemove[i]]=null;
				}
				lake.otherFishId=_.difference(lake.otherFishId,toRemove);
				if(myFish && !myFish.alive){
					myFish.ctp=[];
					sendFish();
					var max_weight = myFish.max_weight || 0;
					myFish.die();
					myFish=null;
					lake.x=0;
					lake.y=0;
					lake.vx=0;
					lake.vy=0;
					showLeaderboardLoading();
					socketio.emit("fish_death", {name: playerName, max_weight: max_weight});
				}
			}else{
				myFish.ctp=[];
				sendFish();
				var max_weight = myFish.max_weight || 0;
				myFish.die();
				myFish=null;
				lake.x=0;
				lake.y=0;
				lake.vx=0;
				lake.vy=0;
				showLeaderboardLoading();
				socketio.emit("fish_death", {name: playerName, max_weight: max_weight});
			}
			stage.update(event);
		}
		timep=event.time;
	}
	
	key.down('up', function() {
		if(myFish) myFish.up=true; return false;
	}).up('up', function() {
		if(myFish) myFish.up=false; return false;
	});
	
	key.down('down', function() {
		if(myFish) myFish.down=true; return false;
	}).up('down', function() {
		if(myFish) myFish.down=false; return false;
	});
	
	key.down('left', function() {
		if(myFish) myFish.left=true; return false;
	}).up('left', function() {
		if(myFish) myFish.left=false; return false;
	});
	
	key.down('right', function() {
		if(myFish) myFish.right=true; return false;
	}).up('right', function() {
		if(myFish) myFish.right=false; return false;
	});

	function resetKeys() {
		if (myFish) {
			myFish.left = false;
			myFish.right = false;
			myFish.up = false;
			myFish.down = false;
		}
	}
	window.addEventListener('blur', resetKeys, false);
	document.addEventListener('visibilitychange', function() {
		if (document.hidden) resetKeys();
	}, false);
	
	window.addEventListener('resize', resize, false);
	function resize() { 
		stage.canvas.width = window.innerWidth;
		stage.canvas.height = window.innerHeight; 
		if(myFish){
			myFish.info.x = (stage.canvas.width/2) - 12;
			myFish.info.y = -(stage.canvas.height/2) + 8;
		}
		stage.x = stage.canvas.width/2;
		stage.y = stage.canvas.height/2;
	}

	init();
};
