const canvas = document.querySelector('#space');
const ctx = canvas.getContext('2d');
class Vec2d {
    constructor({x,y}) {
        this.x = x;
        this.y = y;
        this.dist = null;
    }
    diff(other) {
        return new Vec2d(this)._sub(other);
    }
    sum(other) {
        return new Vec2d(this)._add(other);
    }
    _sub(other) {
        this.x -= other.x;
        this.y -= other.y;
        return this;
    }
    _add(other) {
        this.x += other.x;
        this.y += other.y;
        return this;
    }
    calcDist() {
        this.dist = Math.sqrt(this.x*this.x + this.y*this.y);
        return this.dist;
    }
    getMultiplied(factor) {
        return new Vec2d({
            x: this.x * factor,
            y: this.y * factor,
            dist: this.dist ? this.dist * factor : null
        });
    }
    getNormalized() {
        return this.getMultiplied(1 / this.dist);
    }
}
class Game {
    constructor() {
        this.sprites= [];
        this.spriteHash = {};
        this.lastUpdate = Date.now();
        this.keyboard = {};
        this.camera = null;
        this.setup = () => {};
    }
    init(setupCallback) {
        let self = this;
        this.setup = setupCallback;
        this.setup();
        document.addEventListener('keydown', (e) => self.onKeyDown(e));
        document.addEventListener('keyup', (e) => self.onKeyUp(e));
        this.requestFrame();
    }
    onKeyDown(e) {
        this.keyboard[e.code] = true;
    }
    onKeyUp(e) {
        this.keyboard[e.code] = false;
    }
    keyPressed(code) {
        return this.keyboard[code];
    }
    setCamera(camera) {
        this.camera = camera;
    }
    updateAndRender() {
        let now = Date.now();
        let delta = (now - this.lastUpdate)/1000;
        this.lastUpdate = now;
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        this.cleanupSprites();
        this.updateSprites(delta);
        if(this.camera) {
            this.camera.update(delta);
        }
        if(this.camera) {
            this.camera.transformToCamera();
        }
        this.renderSprites();
        if(this.camera) {
            this.camera.resetTransformation();
        }
        this.requestFrame();
    }
    requestFrame() {
        requestAnimationFrame(() => {this.updateAndRender()});
    }
    addSprite(sprite, hashKey) {
        return this.addSpriteToLayer(sprite, 0, hashKey);
    }
    addSpriteToLayer(sprite, layer, hashKey) {
        sprite.game = this;
        if(!this.sprites[layer]) {
            this.sprites[layer] = [];
        }
        this.sprites[layer].push(sprite);
        if(hashKey) {
            if(!this.spriteHash[hashKey]) {
                this.spriteHash[hashKey] = [];
            }
            this.spriteHash[hashKey].push(sprite);
        }
        return sprite;
    }
    cleanupSprites() {
        this.sprites.forEach((layer,idx) => {
            this.sprites[idx] = layer.filter(sprite => sprite.ttl > 0);
        });
    }
    updateSprites(delta) {
        this.sprites.forEach(layer => {
            layer.forEach(sprite => sprite.update(delta));
        });
    }
    renderSprites() {
        this.sprites.forEach(layer => {
            layer.forEach(sprite => sprite.render(this.camera));
        });
    }
}
class Camera {
    constructor({x,y, follow}) {
        this.pos = new Vec2d({
            x: x || canvas.width / 2,
            y: y || canvas.height / 2
        });
        this.follow = follow;
    }
    update(delta) {
        if(this.follow) {
            this.pos.x = this.follow.pos.x;
            this.pos.y = this.follow.pos.y;
        }
    }
    transformToCamera() {
        ctx.save()
        ctx.translate(
            -(this.pos.x - canvas.width/2),
            -(this.pos.y - canvas.height/2)
        );
    }
    resetTransformation() {
        ctx.restore();
    }
}
class Sprite {
    constructor({x, y, w, h, pos, dPos, rect, ttl, origin, color, game}) {
        this.pos = new Vec2d(pos || {x:x, y:y});
        this.rect = new Vec2d(rect || {x:w, y:h});
        this.origin = new Vec2d(origin || this.rect.getMultiplied(.5));
        this.dPos = new Vec2d(dPos || {x:0, y:0});
        this.ttl = ttl || Infinity;
        this.color = color || '#ffffff';
        this.game = game;
    }
    update(delta) {
        this.ttl -= delta;
    }
    render() {}
}
class Planet extends Sprite {
    constructor(obj) {
        super(obj);
        let {r} = obj;
        this.radius = r;
    }
    render() {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.beginPath();
        ctx.fillStyle = '#222222';
        ctx.arc(0, 0, this.radius * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
        ctx.beginPath();
        ctx.fillStyle = this.color;
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
        ctx.restore();
    }
}

class Customer extends Sprite {
    constructor(obj) {
        let {planetFrom, planetTo} = obj;
        obj.x = planetFrom.pos.x;
        obj.y = planetFrom.pos.y;
        super(obj);
        this.planetFrom = planetFrom;
        this.planetTo = planetTo;
        this.radius = 10;
        this.boarded = null;
    }
    update(delta) {
        super.update(delta);
        if(this.boarded) {
            this.pos.x = this.boarded.pos.x;
            this.pos.y = this.boarded.pos.y;
        }
    }
    render() {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.beginPath();
        ctx.fillStyle = '#ffffff';
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
        ctx.beginPath();
        ctx.fillStyle = '#ff0000';
        ctx.arc(0, 0, this.radius -2, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = '#ffffff99';
        ctx.moveTo(this.pos.x, this.pos.y);
        ctx.lineTo(this.planetTo.pos.x, this.planetTo.pos.y);
        ctx.stroke();
        ctx.restore();
    }
}

class Particle extends Sprite {
    constructor(obj) {
        super(obj);
        this.rot = obj.rot || 0;
        this.dRot = obj.dRot || 0;
        this.resize = obj.resize || 1;
    }
    update(delta) {
        super.update(delta);
        this.pos.x += this.dPos.x * delta;
        this.pos.y += this.dPos.y * delta;
        if(this.resize != 1) {
            this.rect = this.rect.getMultiplied(1 + (this.resize -1) * delta);
        }
        this.rot += this.dRot;
    }
    render() {
        ctx.save();
        ctx.beginPath();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.rot);
        ctx.fillStyle = this.color || '#ffffff';
        ctx.fillRect(-this.origin.x, -this.origin.y, this.rect.x, this.rect.y);
        ctx.closePath();
        ctx.restore();
    }
}
class Junk extends Sprite {
    constructor(obj) {
        super(obj);
        this.dPos = obj.dPos || new Vec2d({
            x: Math.random()*50 - 25,
            y: Math.random()*50 - 25
        });
        this.rot = 0;
        this.dRot = Math.random() * 0.1 - 0.05;
        this.isDebris = obj.isDebris || false;
    }
    update(delta) {
        super.update(delta);
        this.pos.x += this.dPos.x * delta;
        this.pos.y += this.dPos.y * delta;
        this.rot += this.dRot;
    }
    render() {
        ctx.save();
        ctx.beginPath();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.rot);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-this.origin.x, -this.origin.y, this.rect.x, this.rect.y);
        ctx.closePath();
        ctx.restore();
    }
}
class Player extends Sprite {
    
    constructor(obj) {
        super({...obj, w :50, h:20});
        this.dPos.x = 0;
        this.dPos.y = 0;
        this.rot = 0;
        this.thrustDirectionStrength = 200;
        this.maxSpeed = 300;
        this.customer = null;
    }

    update(delta) {
        let thrustDirection = new Vec2d({x:Math.cos(this.rot), y:Math.sin(this.rot)});
        let thrustDirection90Left = new Vec2d({x:thrustDirection.y, y:-thrustDirection.x});
        let thrustDirection90Right = new Vec2d({x:-thrustDirection.y, y:thrustDirection.x});
        let landed = false;
        let landedPlanet = null;
        if(this.game.spriteHash.planet) {
            let explodeSensors = [
                this.pos.sum(thrustDirection.getMultiplied(55-this.origin.x)), // nose
                this.pos.sum(thrustDirection90Left.getMultiplied(5 + this.origin.y)).sum(thrustDirection.getMultiplied(30-this.origin.x)), // left front fin
                this.pos.sum(thrustDirection90Right.getMultiplied(5 + this.origin.y)).sum(thrustDirection.getMultiplied(30-this.origin.x)), // right front fin
                this.pos.sum(thrustDirection90Left.getMultiplied(5 + this.origin.y)).sum(thrustDirection.getMultiplied(2-this.origin.x)), // left back fin
                this.pos.sum(thrustDirection90Right.getMultiplied(5 + this.origin.y)).sum(thrustDirection.getMultiplied(2-this.origin.x)), // right back fin
            ];
            let gear = this.pos.sum(thrustDirection.getMultiplied(-this.origin.x));

            this.game.spriteHash.planet.forEach(planet => {
                let distance = planet.pos.diff(this.pos);
                let dist = distance.calcDist();
                if(dist < planet.radius * 4) {
                    this.dPos._add(distance.getNormalized());
                }
                let exploded = false;
                explodeSensors.forEach(sensor => {
                    let sensorDistance = planet.pos.diff(sensor).calcDist();
                    if(sensorDistance <= planet.radius) {
                        exploded = true;
                    }
                });

                if(exploded) {
                    this.ttl = 0;
                    for(let i = 0; i <20; i++) {
                        this.game.addSprite(new Particle({
                            pos: this.pos.sum(new Vec2d({x:Math.random()*50 - 25, y:Math.random()*20 - 10})),
                            rect: {x:Math.random()*5+2, y:Math.random()*5+2},
                            dPos: {x:Math.random()*50 - 25, y:Math.random()*50 - 25},
                            dRot: Math.random()*0.2-0.11,
                            ttl: Math.random()*2+1,
                            isDebris: true
                        }), "debris");
                    }
                    if(this.customer) {
                        this.customer.ttl = 2;
                    }
                    setTimeout(()=> {
                        this.game.setup();
                    }, 1000);
                }
                let gearDistance = planet.pos.diff(gear).calcDist();
                if(gearDistance <= planet.radius && !exploded) {
                    landed = true;
                    landedPlanet = planet;
                }
            });
        }
        if(this.game.keyPressed("ArrowUp")) {
            this.dPos._add(thrustDirection.getMultiplied(delta * this.thrustDirectionStrength));
            let particleDir = thrustDirection.getMultiplied(-40)._add(this.dPos);
            particleDir.x = particleDir.x + Math.random()*20 - 10;
            particleDir.y = particleDir.y + Math.random()*20 - 10;
            this.game.addSprite(new Particle({
                pos: this.pos.sum(thrustDirection.getMultiplied(-15)),
                rect: {x:8, y:8},
                dPos: particleDir,
                ttl: Math.random()*2+1,
                color: '#ffff00',
                resize: 0.4
            }), "debris");
            landed = false;
        }
        if(this.game.keyPressed("ArrowDown")) {
            //this.dPos.y += 3;
        }
        if(this.game.keyPressed("ArrowLeft")) {
            if(!landed) {
                this.rot -= 0.02;
            }
        }
        if(this.game.keyPressed("ArrowRight")) {
            if(!landed) {
                this.rot += 0.02;
            }
        }
        let speed = this.dPos.calcDist();
        if(speed > this.maxSpeed) {
            this.dPos = this.dPos.getMultiplied(this.maxSpeed / speed);
        }
        
        if(!landed) {
            this.pos.x += this.dPos.x * delta;
            this.pos.y += this.dPos.y * delta;
        } else {
            this.dPos.x = 0;
            this.dPos.y = 0;
            if(!this.customer) {
                let customer = this.game.spriteHash.customer.find(customer => customer.planetFrom === landedPlanet);
                if(customer) {
                    customer.boarded = this;
                    this.customer = customer;
                }
            } else {
                if(this.customer.planetTo === landedPlanet) {
                    this.customer.ttl = 0;
                    this.customer.boarded = null;
                    this.customer = null;
                    
                    // add cash
                }
            }
        }
    }
    render() {
        ctx.save();
        ctx.beginPath();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.rot);
        ctx.fillStyle = '#aaaaaa';
        ctx.fillRect(-this.origin.x, -this.origin.y, 40, 20);
        ctx.moveTo(30-this.origin.x, -5-this.origin.y);
        ctx.lineTo(35-this.origin.x, -this.origin.y);
        ctx.lineTo(40-this.origin.x, -this.origin.y);
        ctx.lineTo(50-this.origin.x, -5);
        ctx.lineTo(55-this.origin.x, 0);
        ctx.lineTo(50-this.origin.x, 5);
        ctx.lineTo(40-this.origin.x, this.origin.y);
        ctx.lineTo(35-this.origin.x, this.origin.y);
        ctx.lineTo(30-this.origin.x, 5+this.origin.y);
        ctx.fill();
        ctx.moveTo(-this.origin.x+2, -5 - this.origin.y);
        ctx.lineTo(20-this.origin.x,0);
        ctx.lineTo(-this.origin.x+2, 5 + this.origin.y);
        ctx.fill();
        ctx.closePath();
        ctx.restore();
    }
}
let space = new Game();

let planet1 = space.addSprite(new Planet({x:600,y:300,r:80, color:'#00aa00'}), "planet");
let planet2 = space.addSprite(new Planet({x:-50,y:600,r:80, color:'#00aa00'}), "planet");
//space.addSprite(new Planet({x:1200,y:200,r:70}), "planet");
let customer = space.addSpriteToLayer(new Customer({planetFrom: planet1, planetTo: planet2}), 2,"customer");
for(let i = 0; i < 500; i++) {
    space.addSprite(new Junk({
        x:Math.floor(Math.random()*canvas.width * 10),
        y:Math.floor(Math.random()*canvas.height * 10),
        w:Math.floor(Math.random()*5)+2,
        h:Math.floor(Math.random()*5)+2,
        dPos:new Vec2d({x:0,y:0})
    }), "junk");
}


space.init(() => {
    let player = new Player({x:200,y:200});
    let camera = new Camera({follow: player});
    space.addSpriteToLayer(player, 1, "player");
    space.setCamera(camera);
});



let handleResize = () => {
    let docElem = document.documentElement;
    let body = document.getElementsByTagName('body')[0];
    let width = window.innerWidth || docElem.clientWidth || body.clientWidth;
    let height = window.innerHeight|| docElem.clientHeight|| body.clientHeight;

    let canvas = document.querySelector('canvas');
    canvas.width = width-30;
    canvas.height = height-30;
} 
window.addEventListener('resize', handleResize);
handleResize();