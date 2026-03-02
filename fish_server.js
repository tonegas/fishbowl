var http = require('http'),
	url = require("url"),
	path = require("path"),
	fs = require("fs"),
	sqlite3 = require('sqlite3').verbose();
	port = process.argv[2] || 9999;

var dbPath = path.join(__dirname, 'fish_leaderboard.db');
var db = new sqlite3.Database(dbPath);
db.run("CREATE TABLE IF NOT EXISTS leaderboard (name TEXT, max_weight REAL, created_at INTEGER DEFAULT (strftime('%s','now')))");



var app=http.createServer(function(request, response) {
  var uri = '/www'+ url.parse(request.url).pathname
    , filename = path.join(process.cwd(), uri);

  fs.exists(filename, function(exists) {
  console.log(filename);
  console.log(uri);
    if(!exists) {
      response.writeHead(404, {"Content-Type": "text/plain"});
      response.write("404 Not Found\n");
      response.end();
      return;
    }
	
    if (fs.statSync(filename).isDirectory()) filename += 'fish.html';

    fs.readFile(filename, "binary", function(err, file) {
      if(err) {
        response.writeHead(500, {"Content-Type": "text/plain"});
        response.write(err + "\n");
        response.end();
        return;
      }

      var type = path.extname(filename);
      if(type==='.js'){
          response.writeHead(200,{"Content-Type": "application/javascript"});
          response.write(file, "binary");
          response.end();
      }else if(type==='.html'){
    	  response.writeHead(200);
          response.write(file, "binary");
          response.end();
      }else if (type=='.png'){
    	  response.writeHead(200,{"Content-Type": "image/png"});
          response.write(file, "binary");
          response.end();
      }else if (type=='.svg'){
    	  response.writeHead(200,{"Content-Type": "image/svg+xml"});
          response.write(file, "binary");
          response.end();
      }
    });
  });
}).listen(parseInt(port, 10));


var io = require('socket.io')(app, { log: false });
var n=1;
var usedNames = {};

var fObject = {};
fObject.list = [];
fObject.N = 1000;
list = ["a1","a2"];
for(var i=0;i<fObject.N;i++){
	fObject.list[i] = {};
	fObject.list[i].s = Math.random();
	fObject.list[i].x = Math.random()*10000;
	fObject.list[i].y = Math.random()*10000;
	fObject.list[i].r = Math.random()*Math.PI*2;
	fObject.list[i].t = list[Math.ceil(Math.random()*2)-1];
	fObject.list[i].c = Math.ceil(Math.random()*360);
}

io.sockets.on('connection', function(socket) {
    socket.playerName = null;
    socket.on('register_name', function(data) {
        var name = (data.name || "").trim().substring(0, 12);
        if (!name) return;
        var key = name.toLowerCase();
        if (usedNames[key]) {
            socket.emit("name_rejected");
        } else {
            usedNames[key] = true;
            socket.playerName = name;
            socket.emit("name_accepted");
        }
    });
    socket.on('disconnect', function() {
        if (socket.playerName) {
            delete usedNames[socket.playerName.toLowerCase()];
        }
    });
    socket.on('canvas_to_server', function(data) {
        io.sockets.emit("canvas_to_client",data);
    });
    socket.on('fish_to_server', function(data) {
        io.sockets.emit("fish_to_client",data);
    });
    socket.on('new_fish', function(data) {
        if (!socket.playerName) return;
        socket.emit("new_fish_id",{id : n,pos: {x:Math.random()*1000,y:Math.random()*1000},fobj:fObject});
        n+=1;
    });
    function sendLeaderboard(sock) {
        var s = sock || socket;
        db.all("SELECT name, MAX(max_weight) as max_weight FROM leaderboard GROUP BY name ORDER BY max_weight DESC LIMIT 20", [], function(err, rows) {
            if (err) {
                console.error("Leaderboard error:", err);
                s.emit("leaderboard", []);
                return;
            }
            s.emit("leaderboard", rows || []);
        });
    }
    socket.on('fish_death', function(data) {
        var name = (data.name || socket.playerName || "").trim();
        var max_weight = parseFloat(data.max_weight) || 0;
        if (name && max_weight >= 0) {
            db.run("INSERT INTO leaderboard (name, max_weight) VALUES (?, ?)", [name, max_weight], function(err) {
                if (err) console.error("Insert error:", err);
                sendLeaderboard(socket);
            });
        } else {
            sendLeaderboard(socket);
        }
    });
    socket.on('leaderboard_request', function() {
        sendLeaderboard(socket);
    });
});
