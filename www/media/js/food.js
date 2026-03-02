(function (window) {

	function Food(size,x,y,c) {
		this.initialize(size,x,y,c);
	}
	

	
	var p = Food.prototype = new createjs.Shape();

	Food.LRG_ROCK = 40;
	Food.MED_ROCK = 20;
	Food.SML_ROCK = 10;

	p.bounds;
	p.hit;
	p.size;
	p.spin;
	p.score;

	p.vX;		//velocity X
	p.vY;		//velocity Y
	p.vCX;
	p.vCY;

	p.active;

	p.Shape_initialize = p.initialize;

	p.initialize = function (size,x,y,c) {
		x = typeof x !== 'undefined' ? x : 400-Math.random()*800+lake.x;
		y = typeof y !== 'undefined' ? y : 400-Math.random()*800+lake.y;
		c = typeof c !== 'undefined' ? createjs.Graphics.getHSL(c, 100, 50) : "pink";
		this.Shape_initialize();
		this.activate(size,x,y,c);
	};

	p.getShape = function (size,c) {
		
		var angle = 0;
		var radius = size;
		
		this.vCX = 0;
		this.vCY = 0;

		this.size = size;
		this.hit = size;
		this.bounds = 0;

		this.graphics.clear();
		this.graphics.moveTo(0, size);
		this.rotation = 0;
		this.graphics.beginFill(c);
		while (angle < (Math.PI * 2 - .5)) {
			angle += .25 + (Math.random() * 100) / 500;
			radius = size + (size / 2 * Math.random());
			this.graphics.lineTo(Math.sin(angle) * radius, Math.cos(angle) * radius);

			if (radius > this.bounds) {
				this.bounds = radius;
			}	//furthest point

			this.hit = (this.hit + radius) / 2;
		}

		this.graphics.closePath().endFill();
	};

	p.activate = function (size,x,y,c) {
		this.getShape(size,c);

		this.spin = (Math.random() + 0.9 ) * 2;
		this.x = x;
		this.y = y;
		this.myx = this.x;
		this.myy = this.y;
		this.active = true;
	};

	p.update = function (event,x,y) {
		this.rotation += this.spin;
		this.vX = Math.sin(this.rotation/7)/5 + this.vCX;
		this.vY = Math.cos(this.rotation/7)/5 + this.vCY;
		this.myx += this.vX;
		this.myy += this.vY;
		this.vCX /= 1.01;
		this.vCY /= 1.01;
		this.x = this.myx;
		this.y = this.myy;
	};

	p.hitPoint = function (tX, tY) {
		return this.hitRadius(tX, tY, 0);
	};

	p.hitRadius = function (tX, tY, tHit) {
		if (tX - tHit > this.x + this.hit) {
			return -1;
		}
		if (tX + tHit < this.x - this.hit) {
			return -1;
		}

		if (tY - tHit > this.y + this.hit) {
			return -1;
		}

		if (tY + tHit < this.y - this.hit) {
			return -1;
		}
		
		if (this.hit + tHit > Math.sqrt(Math.pow(Math.abs(this.x - tX), 2) + Math.pow(Math.abs(this.y - tY), 2))){
			if (tHit < this.hit){
				return 0;
			}else{
				return (tHit-this.hit);
			}
		}else{
			return -1;				
		}
	};


	window.Food = Food;

}(window));

