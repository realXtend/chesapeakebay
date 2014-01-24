engine.IncludeFile('D:\\Antti\\lvm\\vector.js');
engine.IncludeFile("D:\\Antti\\lvm\\wandererAi.js");

const SLOW_SWIM_SPEED = 1.5;
const MEDIUM_SWIM_SPEED = 2.0;

const MAX_SPEED = 3.0;
const PURSUING_SPEED = 5.0;

const ANIM_FADE_TIME = 0.25;

function Guard() {
    this.currentAnimState_ = '';
    
    if(server.IsRunning()) {
        this.velocity_ = new Vector3df();
        this.maxSpeed_ = 3.0;
        this.maxSteer_ = 0.01;
        this.maxPursuingDistance_ = 10.0;
        this.maxPursuingSpeed_ = 5.0;
        this.maxPursuingSteer_ = 0.05;

        this.placeable_ = me.placeable;
        this.velocity_.x = 1;
        this.target_ = null;
        this.pursuing_ = false;
        this.pursuingTarget_ = false;
        this.turning_ = 0;
        
        this.school_ = scene.GetEntityByNameRaw('School');
        
        frame.Updated.connect(this, this.serverUpdate);
    }
    else {
        // Client init
        frame.Updated.connect(this, this.clientUpdate);
        print('Guard client init');
    }
    
}


Guard.prototype.serverUpdate = function(dt) {
    var tm = this.placeable_.transform

    if(!this.prey_) {
        // Try to find new prey to chase if there's currently none
        this.prey_ = this.getPrey();
    }
    
    // Are we are pursuing something
    if(this.prey_) {
        var preyPlaceable = this.prey_.placeable;
        var preyTransform = preyPlaceable.transform;
        // Get distance to prey
        var distance = GetDistance(preyTransform.pos, tm.pos);
        // Check prey's position
        if(this.canEatPrey()) {
            this.eatPrey();
            this.prey_ = null;
            this.target_ = null;
        }
        else if(distance < this.maxPursuingDistance_) {
            //print('pursuing prey');
            this.target_ = preyTransform.pos; 
        }
        // Prey is already too far, stop chasing
        else {
            print('lost prey');
            this.prey_ = null;
            this.target_ = null;
        }
    }
    else { // We are not currently pursuing prey so we have to do something else
        if(this.target_) {
            // We have some random target, check if we are there yet
            var distance = GetDistance(this.target_, tm.pos);
            if(distance < 1.0) {
                this.target_ = null;
            }
        }
        else {
            // Get new target and set cruising speed
            this.target_ = this.getWanderingTarget();
            this.maxSpeed_ = 1+Math.random()*(MAX_SPEED-1);
            // TODO: Dont get new target. Instead stay still?
        }
    }
    
    this.updateVelocity(dt);
    this.updateOrientation(dt);
    this.updatePosition(dt);
    
    this.updateAnimationState(dt);
    this.updateAnimation(dt);
}

Guard.prototype.canEatPrey = function() {
    if(!this.prey_)
        return false;
    
    // Just for testing
    var preyPl = this.prey_.placeable;
    var preyTm = preyPl.transform;
    var tm = this.placeable_.transform;
    var distance = GetDistance(preyTm.pos, tm.pos);
    if(distance < 1.0)
        return true;
    else
        return false;
}

Guard.prototype.eatPrey = function() {
    print('Ate u!');
}

Guard.prototype.clientUpdate = function(dt) { 
    this.updateAnimation(dt);
}

Guard.prototype.getPrey = function() {
    // TODO: 
    // This is just for testing
    var playerEntity = scene.GetEntityByNameRaw('Avatar1');
    if(!playerEntity)
        return null;
        
    var playerPlaceable = playerEntity.placeable;
    
    var playerTransform =  playerPlaceable.transform;
    var playerPos = playerTransform.pos;
    
    var tm = this.placeable_.transform;
    
    var distance = GetDistance(tm.pos, playerPos);
    if (distance < 10.0) {
        return playerEntity;
    }
    
    return null;
}

Guard.prototype.getWanderingTarget = function() {
    var schoolPlaceable = this.school_.placeable;
    var schoolTransform = schoolPlaceable.transform;
    var schoolPos = schoolTransform.pos;
    
    var target = schoolPos;
    target.x += (Math.random()-0.5)*20.0;
    target.y += (Math.random()-0.5)*20.0;
    
    return target;
} 

Guard.prototype.updateVelocity = function(dt) {
    var tm = this.placeable_.transform;
    if(this.target_ != null) {
        // Steer towards the target
        // TODO: Limit steering angle
        if(this.prey_) {
            // Chasing prey using pursuing speed and steer
            var steer = this.getSteer(tm.pos, this.target_, this.maxPursuingSteer_, this.maxPursuingSpeed_);
            this.velocity_ = GetLimitedVector(VectorSum(this.velocity_, steer), this.maxPursuingSpeed_);
        }
        else {
            // Wandering around
            var steer = this.getSteer(tm.pos, this.target_, this.maxSteer_, this.maxSpeed_, 1.5);
            this.velocity_ = GetLimitedVector(VectorSum(this.velocity_, steer), this.maxSpeed_);
        }
        
        var speed = GetMagnitude(this.velocity_);
        if(speed < 1.0) {
            // 
            this.velocity_ = VectorDiv(this.velocity_, speed);
        }
    }
    else { // 
        print('No target');
        var tmpTarget = tm.pos;
        tmpTarget.x += this.velocity_.x;
        tmpTarget.y += this.velocity_.y;
        var steer = this.getSteer(tm.pos, tmpTarget, true);
        this.velocity_ = GetLimitedVector(VectorSum(this.velocity_, steer), this.maxSpeed_);
    }
}
// Turns object to right direction and sets this.turning_ for animation
Guard.prototype.updateOrientation = function(dt) {
    var tm = this.placeable_.transform;
    var d = new Vector3df();
    d.x = 1; d.y = 0; d.z = 0;
    
    var rot = this.placeable_.GetRotationFromTo(d, this.velocity_);
    rot.x = 0;
    
    var delta = rot.z - tm.rot.z;
    
    if(delta > 0.1)
        this.turning_ = -1;
    else if(delta < -0.1)
        this.turning_ = 1;
    else 
        this.turning_ = 0;
    
    tm.rot = rot;
    this.placeable_.transform = tm;
}

Guard.prototype.updatePosition = function(dt) {
    var tm = this.placeable_.transform;
    tm.pos = VectorSum(tm.pos, VectorMult(this.velocity_, dt));
    this.placeable_.transform = tm;
}

Guard.prototype.updateAnimationState = function(dt) {
    var speed = GetMagnitude(this.velocity_);
    var state = null;

    if(this.turning_ == -1)
        state = 'turn left';
    else if(this.turning_ == 1)
        state = 'turn right';
    else if(speed < SLOW_SWIM_SPEED)
        state = 'swim slow';
    else if(speed < MEDIUM_SWIM_SPEED)
        state = 'swim medium';
    else
        state = 'swim fast';
        
    var animationcontroller = me.animationcontroller;
    animationcontroller.animationState = state;
}

Guard.prototype.updateAnimation = function(dt) {
    var animationcontroller = me.animationcontroller;
    var state = animationcontroller.animationState;
    if(state == this.currentAnimState_)
        return;
        
    if(state == 'swim slow' || state == 'swim medium' || state == 'swim fast') {
        if(animationcontroller.IsAnimationActive('Turning_L'))
            animationcontroller.StopAnim('Turning_L', ANIM_FADE_TIME);
        
        if(animationcontroller.IsAnimationActive('Turning_R'))
            animationcontroller.StopAnim('Turning_R', ANIM_FADE_TIME);
        
        if(!animationcontroller.IsAnimationActive('Walk'))
            animationcontroller.EnableAnimation('Walk', true, ANIM_FADE_TIME);
    }
    
    
    if(state == 'turn left') {
        animationcontroller.StopAllAnims(ANIM_FADE_TIME);
        animationcontroller.EnableAnimation('Turning_L', true, ANIM_FADE_TIME);
        animationcontroller.SetAnimationWeight('Turning_L', 0.6); 
    }
    else if(state == 'turn right') {
        animationcontroller.StopAllAnims(ANIM_FADE_TIME);
        animationcontroller.EnableAnimation('Turning_R', true, ANIM_FADE_TIME);
        animationcontroller.SetAnimationWeight('Turning_R', 0.6); 
    }
    else if(state == 'swim slow') {
        animationcontroller.SetAnimationSpeed('Walk', 0.3);
        animationcontroller.SetAnimationWeight('Walk', 0.6);    
    }
    else if(state == 'swim medium') {
        animationcontroller.SetAnimationSpeed('Walk', 0.4);
        animationcontroller.SetAnimationWeight('Walk', 0.7);
    }
    else if(state == 'swim fast') {
        animationcontroller.SetAnimationSpeed('Walk', 0.7);
        animationcontroller.SetAnimationWeight('Walk', 0.8);
    }
    
    this.currentAnimState_ = state;
}

Guard.prototype.getSteer = function(pos, target, maxSteer, maxSpeed, slowDownDistance) {
    var steer = null;
    
    var desired = VectorSub(target, pos);
    var distance = GetMagnitude(desired);
    if(distance > 0) {
        desired = GetUnitVector(desired);
        if(Math.cos(desired.x/desired.z) > 0.436) { // ~25 degree
            desired.z = desired.x/Math.acos(0.436);
            print('Steer limit');
        }
        
        if(slowDownDistance) {
            // Slowdown before reaching the target
            if( distance < slowDownDistance ) { 
                desired = VectorMult(desired, maxSpeed*(distance/slowDownDistance));
            }
            else {
                desired = VectorMult(desired, maxSpeed);
            }
        }
        else {
            desired = VectorMult(desired, maxSpeed);
        }
        steer = VectorSub(desired, this.velocity_);
        steer = GetLimitedVector(steer, maxSteer);
    }
    else {
        steer = new Vector3df();
    }
    return steer;
}


var g = new Guard();
