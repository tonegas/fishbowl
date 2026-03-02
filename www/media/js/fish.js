function Fish(id,pos,ctp,color_str,name){
	this.id=id;
	this.name = name || "Fish";

	this.start_pos={x:pos.x,y:pos.y};
	this.pos={x:pos.x,y:pos.y};
	this.vel={x:0,y:0};
	this.velt=0;
	this.acc={x:0,y:0};
	this.acct=0;
	this.ctp=ctp;
	this.ctv=new Array(ctp.length+1).join('0').split('').map(parseFloat);
	this.cta=new Array(ctp.length+1).join('0').split('').map(parseFloat);

	this.color=color_str.substr(4).split(',')[0]*1;
	this.mounth={x:0,y:0};
	this.fin={x:0,y:0};

	var time_to_stop = 20*60;
	var start_life = 3*60;
	var stop_life = 1*60;
	var start_lake_size = 10;
	var end_lake_size = 0.5;
	var start_fish_size = 0.4/start_lake_size;
	var end_fish_size = 1.2/end_lake_size;
	var start_screen_size = start_fish_size*start_lake_size;
	var end_screen_size = end_fish_size*end_lake_size;


	this.time=0;
	this.max_life=start_life;
	this.life=start_life;
	this.over=0;
	this.size_time=0;
	this.size=start_fish_size;
	this.lake_size=start_lake_size;
	this.screen_size=start_screen_size;
	this.max_weight=Math.pow(this.size,3)*100;
	this.alive=true;
	this.look_target=null;
	this.info;

	//Movimento
	this.left=false;
	this.right=false;
	this.up=false;
	this.down=false;
	this.nextPos=false;

	this.sp=0;
	this.fsp=0;
	this.ssp=0;

	this.update=update;
	this.set=set;
	this.bite=bite;
	this.die=die;
	this.setAlive=setAlive;
	this.eat=eat;
	this.drawFish=drawFish;
	this.updatePupils=updatePupils;

	this.fishParts={
			nPart:5,
			nRPart:5,
			dim:[60,60,50,30,35],
			dimS:[{x:50,y:109},{x:33,y:109},{x:19,y:84},{x:11,y:44},{x:6,y:43}],
			fin:[],
			mounth:null,
			part:[],
			cont:[],
	};
	var fP = this.fishParts;
	var fish = this;

	var myColor = new createjs.ColorMatrix();
	myColor.adjustColor(0, 0, 0, this.color-180);

	var mySaturation = new createjs.ColorMatrix();
	mySaturation.adjustColor(0, 0, 100, 0);

	var colorFilter = new createjs.ColorMatrixFilter(myColor);
	var saturationFilter = new createjs.ColorMatrixFilter(mySaturation);

	for(var i=fP.nPart-1;i>=0;i--){
		fP.part[i] = new createjs.Shape();
		fP.part[i].regX = fP.dimS[i].x/2;
		fP.part[i].regY = fP.dimS[i].y-fP.dim[i]-5;
		if(i<fP.nPart-1){
			fP.cont[i] = new createjs.Container();
			fP.cont[i].addChild(fP.part[i]);
			fP.cont[i].addChild(fP.cont[i+1]);
		}else{
			fP.cont[i] = new createjs.Container();
			fP.cont[i].addChild(fP.part[i]);
		}
		fP.cont[i].y=0;
		if(i>0){
			fP.cont[i].y=fP.dim[i-1];
		}
	}

	var lfin = new createjs.Shape();
	lfin.regX = fP.dimS[0].x/2-3;
	lfin.regY = 10;
	lfin.graphics.beginFill(createjs.Graphics.getHSL(this.color, 50, 60)).bezierCurveTo(0,0,10,40,-20,40).endFill();
	lfin.rotation = 0;
	fP.fin[0]=lfin;
	fP.cont[0].addChild(lfin);
	
	var rfin = new createjs.Shape();
	rfin.regX = -fP.dimS[0].x/2+3;
	rfin.regY = 10;
	rfin.graphics.beginFill(createjs.Graphics.getHSL(this.color, 50, 60)).bezierCurveTo(0,0,-10,40,20,40).endFill();
	rfin.rotation = 0;
	fP.fin[1]=rfin;
	fP.cont[0].addChild(rfin);
	
	var dfin = new createjs.Shape();
	dfin.regX = 0;
	dfin.regY = 8;
	dfin.x = 0;
	dfin.y = -10;
	dfin.graphics.beginFill(createjs.Graphics.getHSL(this.color, 50, 60)).bezierCurveTo(0,0,-15,25,0,60).closePath().endFill();
	dfin.graphics.beginFill(createjs.Graphics.getHSL(this.color, 50, 60)).bezierCurveTo(0,0,15,25,0,60).closePath().endFill();
	fP.dfin = dfin;
	fP.cont[0].addChild(dfin);
	
	var mounth = new createjs.Shape();
	mounth.regX = 0;
	mounth.regY = 0;
	mounth.x = 0;
	mounth.y = -40;
	mounth.graphics.beginFill("#AA5555").drawEllipse(-5,-5,10,5).endFill();
	fP.mounth=mounth;
	fP.cont[0].addChild(mounth);
	
	fP.cont[0].scaleX = this.size;
	fP.cont[0].scaleY = this.size;
	fP.cont[0].x = this.start_pos.x;
	fP.cont[0].y = this.start_pos.y;
	lake_stage.addChildAt(fP.cont[0],0);
	
	
	var eye = new createjs.Shape();
	eye.graphics.beginFill(createjs.Graphics.getHSL(this.color, 50, 70)).drawCircle(-15, -30, 8);
	eye.graphics.beginFill(createjs.Graphics.getHSL(this.color, 50, 70)).drawCircle(15, -30, 8);
	fP.cont[0].addChild(eye);
	var pupilL = new createjs.Shape();
	pupilL.graphics.beginFill('#000000').drawCircle(0, 0, 3);
	pupilL.regX = pupilL.regY = 0;
	pupilL.x = -15;
	pupilL.y = -30;
	fP.pupilL = pupilL;
	fP.cont[0].addChild(pupilL);
	var pupilR = new createjs.Shape();
	pupilR.graphics.beginFill('#000000').drawCircle(0, 0, 3);
	pupilR.regX = pupilR.regY = 0;
	pupilR.x = 15;
	pupilR.y = -30;
	fP.pupilR = pupilR;
	fP.cont[0].addChild(pupilR);

	this.nameLabel = new createjs.Text(this.name || "Fish", "8px Arial", "#ffffff");
	this.nameLabel.alpha = 0.75;
	this.nameLabel.textAlign = "center";
	this.nameLabel.visible = false;
	stage.addChild(this.nameLabel);

	this.arrow = new createjs.Shape();
	this.arrow.graphics.beginFill(createjs.Graphics.getHSL(this.color, 50, 60)).lineTo(-5,12.5).bezierCurveTo(-5,12,0,8,5,12.2).lineTo(0,0).endFill();
	this.arrow.visible = false;
	stage.addChild(this.arrow);
	this.arrowLabel = new createjs.Text("", "8px Arial", "#ffffff");
	this.arrowLabel.visible = false;
	this.arrowLabel.textAlign = "center";
	this.arrowLabel.alpha = 0.9;
	stage.addChild(this.arrowLabel);
	
	this.info = new createjs.Text("", "bold 24px Arial", "#000000");
	this.info.textAlign = "right";
	this.info.x = (stage.canvas.width/2) - 12;
	this.info.y = -(stage.canvas.height/2) + 8;
	stage.addChild(this.info);

	this.set(this.ctp,this.pos,this.size,createjs.Graphics.getHSL(this.color, this.life/this.max_life*200-100, 50),lake);

	function updatePupils(){
		var eyeL = {x: -15, y: -30}, eyeR = {x: 15, y: -30};
		var maxOff = 4;
		var lerpFactor = 0.18;
		var targetLX = eyeL.x, targetLY = eyeL.y, targetRX = eyeR.x, targetRY = eyeR.y;
		if(this.look_target && fP.pupilL && lake_stage){
			var pt = lake_stage.localToLocal(this.look_target.x, this.look_target.y, fP.cont[0]);
			var dxL = pt.x - eyeL.x, dyL = pt.y - eyeL.y;
			var lenL = Math.sqrt(dxL*dxL + dyL*dyL) || 1;
			var offL = Math.min(maxOff, lenL);
			targetLX = eyeL.x + (dxL/lenL)*offL;
			targetLY = eyeL.y + (dyL/lenL)*offL;
			var dxR = pt.x - eyeR.x, dyR = pt.y - eyeR.y;
			var lenR = Math.sqrt(dxR*dxR + dyR*dyR) || 1;
			var offR = Math.min(maxOff, lenR);
			targetRX = eyeR.x + (dxR/lenR)*offR;
			targetRY = eyeR.y + (dyR/lenR)*offR;
		}
		if(fP.pupilL){
			fP.pupilL.x += (targetLX - fP.pupilL.x) * lerpFactor;
			fP.pupilL.y += (targetLY - fP.pupilL.y) * lerpFactor;
			fP.pupilR.x += (targetRX - fP.pupilR.x) * lerpFactor;
			fP.pupilR.y += (targetRY - fP.pupilR.y) * lerpFactor;
		}
	}
 
	function bite(predator,prey){
		if(predator.size*2 > prey.size){
			var dis = Math.sqrt(Math.pow(Math.abs(predator.mounth.x-prey.fin.x), 2) + Math.pow(Math.abs(predator.mounth.y-prey.fin.y), 2));
			if(dis < predator.size*15){
				if(prey.fishParts.nRPart > 2){
					prey.fishParts.nRPart -= 1;
					prey.lastfin.visible = false;
					if(prey===this){
						this.life-=15;
						this.ctp=this.ctp.splice(0,prey.fishParts.nRPart);
					}else{
						this.life+=(prey.size/this.size)*40;
						if(this.life>=this.max_life){
							this.over+=(this.life-this.max_life)/2;
							this.life=this.max_life;
						}
					}
				}else{
					if(predator.size > prey.size){
						if(prey===this){
							this.alive=false;
						}else{
							this.life+=(prey.size/this.size)*40;
							if(this.life>=this.max_life){
								this.over+=(this.life-this.max_life)/2;
								this.life=this.max_life;
							}
						}
					}
				}
			}else if(dis < predator.size*600){
				this.look_target = (predator === this) ? {x: prey.fin.x, y: prey.fin.y} : {x: predator.mounth.x, y: predator.mounth.y};
				this.updatePupils();
				if(dis < predator.size*150){
					fP.mounth.scaleX = 2.2;
					fP.mounth.scaleY = 1.5;
				}
			}
		}
	}
 
	function eat(obj){
		if(obj.active){
			var pos = obj.localToLocal(0,0,lake_stage);
			var dis = Math.sqrt(Math.pow(Math.abs(this.mounth.x-pos.x), 2) + Math.pow(Math.abs(this.mounth.y-pos.y), 2));
			if(this.size*10 > obj.size){
				if(dis < this.size*15 + obj.size){
					this.life+=(obj.size/(this.size*10))*20;
					if(this.life>=this.max_life){
						this.over+=(this.life-this.max_life)/2;
						this.life=this.max_life;
					}
					obj.activate(Math.random()*0.5+0.02);
				}else if(dis < this.size*360 + 4*obj.size){
					this.look_target = {x: pos.x, y: pos.y};
					this.updatePupils();
					if(dis < this.size*90 + obj.size){
						fP.mounth.scaleX = 2.2;
						fP.mounth.scaleY = 1.5;
					}
				}
			}else{
				if(dis < this.size*15 + obj.size){
					obj.vCX = Math.sin(this.ctp[0])*this.velt/20;
					obj.vCY = -Math.cos(this.ctp[0])*this.velt/20;
				}
			}
			
		}
	}
 
	function update(dt,lake){
		if(this.life>0 && this.alive==true){
			this.life-=dt;
			if(!this.nextPos){
				if(this.left){this.sp=-6;}else{if(this.right){this.sp=6;}else{this.sp=0;}}
				if(this.up){this.fsp=1;}else{this.fsp=0;}
				if(this.down){this.ssp=1;}else{this.ssp=0;}
			}else{
				if(this.ctp[0]-Math.atan2(this.nextPos.x-this.pos.x,-this.nextPos.y-this.pos.y)<0){
					this.sp=6;
				}else{
					this.sp=-6;
				}
				this.fps=0;
				this.ssp=0;
			}

			this.fishParts.cont[0].regY=-(this.velt/10);

			this.cta[0] = this.sp*(1+this.ssp*0.7) - this.ctv[0]*2;
			this.ctv[0] = this.cta[0]*dt+this.ctv[0];
			this.ctp[0] = this.ctv[0]*dt+this.ctp[0];
			var ctat = this.cta[0];
			var ctvt = this.ctv[0];
			var ctata = 0;
			var ctvta = 0;
			var ctpta = 0;
			for(var i=1;i<this.fishParts.nRPart;i++){
				this.cta[i] = - ctat*2 - ctvt*5 - this.ctv[i]*12 - this.ctp[i]*35*(1+this.ssp*1.05);
				ctat+=this.cta[i];
				ctvt+=this.ctv[i];
				this.ctv[i] = this.cta[i]*dt+this.ctv[i];
				this.ctp[i] = this.ctv[i]*dt+this.ctp[i];
				ctata+=Math.abs(this.cta[i]);
				ctvta+=Math.abs(this.ctv[i]);
				ctpta+=Math.abs(this.ctp[i]);
			}

			this.pos2 = (ctata/this.fishParts.nPart);
			this.vel2 = (ctvta/this.fishParts.nPart);
			this.acc2 = (ctata/this.fishParts.nPart);
			this.acct = ((this.pos2*0+this.vel2*45+this.acc2*4)/this.lake_size-this.velt*((1-this.fsp*0.5)+this.ssp*4)*0.4);
			this.velt = this.acct*dt + this.velt;
			if(this.velt>600/this.lake_size){
				this.velt=600/this.lake_size;
			}
			this.pos.x=Math.sin(this.ctp[0])*this.velt*dt+this.pos.x;
			this.pos.y=-Math.cos(this.ctp[0])*this.velt*dt+this.pos.y;
			this.acct = 0;

			if(!this.nextPos){
				lake.ax=(this.pos.x-lake.x)*3-lake.vx*2;
				lake.ay=(this.pos.y-lake.y)*3-lake.vy*2;
				lake.vx=lake.ax*dt+lake.vx;
				lake.vy=lake.ay*dt+lake.vy;
				lake.x=lake.vx*dt+lake.x;
				lake.y=lake.vy*dt+lake.y;
			}
			if (this.time<time_to_stop){
				this.time+=dt; 
			}else{
				this.time=time_to_stop;
			}
			this.max_life=(stop_life-start_life)/time_to_stop*this.time+start_life;
			if(this.size_time < this.over){
				if(this.size_time < time_to_stop){
					this.size_time+=dt;
				}else{
					this.size_time=time_to_stop;
				}
			}
			this.screen_size=(end_screen_size-start_screen_size)/time_to_stop*this.size_time+start_screen_size;
			this.lake_size=(end_lake_size-start_lake_size)/time_to_stop*this.size_time+start_lake_size;
			this.size = this.screen_size/this.lake_size;
			var num = Math.pow(this.size,3)*100;
			if(num > this.max_weight) this.max_weight = num;
			var weightStr;
			if(num < 0.1){
				weightStr = (num*1000).toFixed(1) + " g";
			}else if(num < 0.5){
				weightStr = Math.ceil(num*1000) + " g";
			}else if(num < 10){
				weightStr = num.toFixed(2) + " kg";
			}else if(num < 100){
				weightStr = num.toFixed(1) + " kg";
			}else{
				weightStr = Math.ceil(num) + " kg";
			}
			this.info.text = (this.name || "Fish") + " (" + weightStr + ")";
			fP.mounth.scaleX = 1;
			fP.mounth.scaleY = 1;
			this.look_target = null;
			this.updatePupils();
			bg.graphics.clear();
			bg.graphics.beginLinearGradientFill(["#77F","#113"], [0, 1], 0, -10000-lake.y*myFish.lake_size,0, 10000-lake.y*myFish.lake_size).drawRect(-stage.x, -stage.y, stage.canvas.width, stage.canvas.height).endFill();
			this.set(this.ctp,this.pos,this.size,createjs.Graphics.getHSL(this.color, this.life/this.max_life*200-100, 50),lake);
			lake_stage.regX=lake.x;
			lake_stage.regY=lake.y;
			return this.alive;
		}else{
			this.alive=false;
			return this.alive;
		}
	}
	
	function drawFish(ctp,color_str){
		var finColor = createjs.Graphics.getHSL(fish.color, 50, 60);
		for(var i=0;i < ctp.length;i++){
			var fillColor = (i === ctp.length-1) ? finColor : color_str;
			fP.part[i].graphics.clear()
			.beginFill(fillColor)
			.drawEllipse(0,0,fP.dimS[i].x,fP.dimS[i].y)
			.endFill();
			fP.cont[i].rotation = ctp[i]/Math.PI*180;
		}
		if(ctp.length > 1){
			var finOsc = ctp[1]/Math.PI*180 * 0.5;
			if(fP.dfin) fP.dfin.rotation = -finOsc * 1.2;
			if(fP.fin[0]) fP.fin[0].rotation = finOsc;
			if(fP.fin[1]) fP.fin[1].rotation = finOsc;
		}
	}

	function set(ctp,pos,size,color_str,lake,name){
		if(name !== undefined) this.name = name || "Fish";
		this.drawFish(ctp,color_str);
		if(myFish && !(this===myFish)){
			if(ctp.length>0){
				if(ctp.length != fP.nRPart){
					fP.nRPart = ctp.length;
					for(var i=0;i < ctp.length;i++){
						fP.cont[i].visible = true;
					}
					for(;i < fP.nPart;i++){
						fP.cont[i].visible = false;
					}
				}
				var bordo = {x:(stage.canvas.width/2),y:(stage.canvas.height/2)};
				var p = {x:0,y:0};
				p.x = (pos.x-lake.x)*myFish.lake_size;
				p.y = (pos.y-lake.y)*myFish.lake_size;
				var ang = Math.atan2(p.x, -p.y);
				if(p.x > bordo.x){
					this.arrow.x = bordo.x;
				}else if(p.x < -bordo.x){
					this.arrow.x = -bordo.x;
				}else{
					this.arrow.x = p.x;
				}
				if(p.y > bordo.y){
					this.arrow.y = bordo.y;
				}else if(p.y < -bordo.y){
					this.arrow.y = -bordo.y;
				}else{
					this.arrow.y = p.y;
				}
				if(Math.abs(p.x) < bordo.x && Math.abs(p.y)<bordo.y){
					this.arrow.visible = false;
					this.arrowLabel.visible = false;
					this.nameLabel.visible = true;
					this.nameLabel.text = this.name || "Fish";
					this.nameLabel.color = color_str;
					var headPt = fP.cont[0].localToLocal(50, 50, stage);
					this.nameLabel.x = headPt.x;
					this.nameLabel.y = headPt.y;
				}else{
					this.arrow.visible = true;
					this.arrowLabel.visible = true;
					this.nameLabel.visible = false;
					this.arrowLabel.text = this.name || "Fish";
					this.arrowLabel.color = color_str;
					this.arrow.graphics.clear();
					this.arrow.graphics.beginFill(color_str).lineTo(-5,12.5).bezierCurveTo(-5,12,0,8,5,12.2).lineTo(0,0).endFill();
					this.arrow.scaleX = 1.5;
					this.arrow.scaleY = 1.5;
					this.arrow.rotation = ang/Math.PI*180;
					var offset = 22;
					this.arrowLabel.x = this.arrow.x + offset * Math.sin(ang);
					this.arrowLabel.y = this.arrow.y - offset * Math.cos(ang);
				}
			}else{
				this.die();
				return;
			}
		}
		this.fishParts.cont[0].x = pos.x;
		this.fishParts.cont[0].y = pos.y;
		this.size = size;
		this.fishParts.cont[0].scaleX = size;
		this.fishParts.cont[0].scaleY = size;
		this.mounth = this.fishParts.cont[0].localToLocal(0,-30,lake_stage);
		this.lastfin = fP.cont[fP.nRPart-1];
		var d = fP.dimS[fP.nRPart-1];
		this.fin = this.lastfin.children[0].localToLocal(d.x/2, d.y/2, lake_stage);
	}

	function die(){
		stage.removeChild(this.arrow);
		stage.removeChild(this.arrowLabel);
		stage.removeChild(this.nameLabel);
		stage.removeChild(this.info);
		lake_stage.removeChild(this.fishParts.cont[0]);
		this.alive=false;
	}

	function setAlive(val){
		if(val > 0){
			this.life = 2;
			this.alive = true;
		}else{
			this.life += val;
			if(this.life < 0){
				this.die();
			}
		}
		return this.alive;
	}
}