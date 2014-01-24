
engine.IncludeFile('D:\\Antti\\lvm\\vector.js');
engine.IncludeFile("D:\\Antti\\lvm\\wandererAi.js");

const SCHOOL_DIAMETER = 5.0;
const SYSTEM_COUNT = 5;
const SYSTEM_DIAMETER = 2.0;

var isServer = server.IsRunning();

var School = AiWanderer.extend({
    init: function() {
        this._super();
        
        this.pos_ = new Vector3df();
        this.velocity_ = new Vector3df();
        this.systems_ = [];
        
        
        if(isServer) {
            // Server init
            this.maxSpeed_ = 0.3;
            this.maxSteer_ = 0.001;
        
            var volumes = this.GetTriggerVolumes('PlanktonVolume');
            if(volumes.length < 1) {
                print('Couldn\'t add plankton school: PlanktonVolume not found');
                scene.RemoveEntity(me.Id);
                return;
            }
            this.volume_ = volumes[0];
            // Get volume size and pos
            var volumeEntity = this.volume_.GetParentEntity();
            var volumeBody = volumeEntity.GetComponentRaw('EC_RigidBody');
            var volumePlaceable = volumeEntity.GetComponentRaw('EC_Placeable');
            if(!volumeBody) {
                print('Couldn\'t add plankton school: PlanktonVolume has no RigidBody component');
                scene.RemoveEntity(me.Id);
                return;
            }
            if(!volumePlaceable) {
                print('Couldn\'t add plankton school: PlanktonVolume has no Placeable component');
                scene.RemoveEntity(me.Id);
                return;
            }
            var volumeTm = volumePlaceable.transform;
            
            this.volumePos_ = volumeTm.pos;
            this.volumeSize_ = volumeBody.size;
            
            this.pos_ = new Vector3df();
            this.pos_.x = this.volumePos_.x + (Math.random()-0.5)*this.volumeSize_.x;
            this.pos_.y = this.volumePos_.y + (Math.random()-0.5)*this.volumeSize_.y;
            this.pos_.z = this.volumePos_.z + (Math.random()-0.5)*this.volumeSize_.z;
            
            this.targetPos_ = new Vector3df();
            this.UpdateTarget();
            
            
            var rigidbody = me.rigidbody;
            var transform = this.placeable_.transform;

            transform.pos = this.pos_;
            
            var sizeVec = new Vector3df();
            sizeVec.x = SCHOOL_DIAMETER;
            sizeVec.y = SCHOOL_DIAMETER;
            sizeVec.z = SCHOOL_DIAMETER;
            
            rigidbody.mass = 0;
            rigidbody.shapeType = 0;
            rigidbody.size = sizeVec;
            
            this.placeable_.transform = transform;
            
        
            this.CreateSystems();
            frame.Updated.connect(this, this.ServerUpdateSchool);
        }
        else {
            // Client init
            //this.ClientUpdateSchool(0);
            //frame.Updated.connect(this, this.ClientUpdateSchool);
            
        }
    
        
        
        
 
    },
    
    ServerUpdateSchool: function(dt) {
        var tm = this.placeable_.transform;
        
        if(GetDistance(this.pos_, this.targetPos_) < 1.0) {
            this.UpdateTarget();
        }
        
        var steer = this.GetSteer();
        this.velocity_ = VectorSum(this.velocity_, steer);
        
        var delta = VectorMult(this.velocity_, dt);
        
        this.pos_ = VectorSum(this.pos_, delta);
        tm.pos = this.pos_;
        this.placeable_.transform = tm;
        
        var velocityComponent = me.GetComponentRaw('EC_DynamicComponent', 'velocity');
        // Vector3df attribute didnt work
        velocityComponent.SetAttribute('x', this.velocity_.x);
        velocityComponent.SetAttribute('y', this.velocity_.y);
        velocityComponent.SetAttribute('z', this.velocity_.z);
    },
    
    ClientUpdateSchool: function(dt) {
        // Retrieve velocity
        var velocityComponent = me.GetComponentRaw('EC_DynamicComponent', 'velocity');
        this.velocity_.x = velocityComponent.GetAttribute('x');
        this.velocity_.y = velocityComponent.GetAttribute('y');
        this.velocity_.z = velocityComponent.GetAttribute('z');
        
        // And position
        var tm = this.placeable_.transform;
        this.pos_ = tm.pos;
    },
    
    CreateSystems: function() {
        for(var i = 0; i < SYSTEM_COUNT; i++) {
            var systemPos = new Vector3df();
            systemPos.x = this.pos_.x + (Math.random()-0.5)*SCHOOL_DIAMETER;
            systemPos.y = this.pos_.y + (Math.random()-0.5)*SCHOOL_DIAMETER;
            systemPos.z = this.pos_.z + (Math.random()-0.5)*SCHOOL_DIAMETER;
            
            var system = new System(systemPos);
            this.systems_.push(system);
        }
    },
    
    GetAction: function() {
        //print('getAction');
        var action = {
            time: 10,
            minTime: 1,
            maxTime: 2,
            name: 'Walk',
            type: 'walk',
            loop: true
        }
        return action;
    },
    
    WalkTo: function(dt) {
        // Update systems
        for(var i in this.systems_) {
            var system = this.systems_[i];
            if(system.alive) {
                system.UpdateVelocity(this.pos_, this.velocity_, this.systems_);
                system.Update(dt);
            }
            else {
                //print(i+' dead');
            }
            
        }
       
    },
    
    UpdateInternals: function(dt) {
        //print('UpdateInternals');
    },
    
    UpdateTarget: function() {
        this.targetPos_.x = this.volumePos_.x + (Math.random()-0.5)*this.volumeSize_.x;
        this.targetPos_.y = this.volumePos_.y + (Math.random()-0.5)*this.volumeSize_.y;
        this.targetPos_.z = this.volumePos_.z + (Math.random()-0.5)*this.volumeSize_.z;
    },
    
    GetSteer: function() {
        var steer = null;
        var desired = VectorSub(this.targetPos_, this.pos_);
        var distance = GetMagnitude(desired);
        if(distance > 0) {
            desired = GetUnitVector(desired);
            desired = VectorMult(desired, this.maxSpeed_);
            
            steer = VectorSub(desired, this.velocity_);
            steer = GetLimitedVector(steer, this.maxSteer_);
        }
        else {
            steer = new Vector3df();
        }
        return steer;
    }
    
});

////// System //////

function System(startPos) {
    this.maxSpeed = Math.random()+0.3;//1.5;
    this.maxSteer = 0.005;
    this.separation = Math.random()+4;//2.0;

    this.alive = true;
    this.pos = startPos;
    this.velocity = new Vector3df();

    this.entity = scene.CreateEntityRaw(scene.NextFreeId(), ['EC_Placeable', 'EC_ParticleSystem', 'EC_RigidBody', 'EC_Mesh']);
    this.entity.SetName('System');
        
    var systemPlaceable = this.entity.placeable;
    var systemTransform = systemPlaceable.transform;
    systemTransform.pos = startPos;
    systemPlaceable.transform = systemTransform;
    
    var particleSystem = this.entity.particlesystem;
    var r = particleSystem.particleRef;
    r.ref = 'file://plankton2.particle';
    particleSystem.particleRef = r;
    
    
    var systemBody = this.entity.rigidbody;
    systemBody.mass = 1;                        // To make body non-static, but
    systemBody.linearFactor = new Vector3df();  // not affected by any forces
    systemBody.angularFactor = new Vector3df(); //
    systemBody.shapeType = 0;
    var systemSize = new Vector3df();
    systemSize.x = SYSTEM_DIAMETER;
    systemSize.y = SYSTEM_DIAMETER;
    systemSize.z = SYSTEM_DIAMETER;
    systemBody.size = systemSize;
    
    this.entity.Action('Die').Triggered.connect(this, this.Die);
    scene.EmitEntityCreatedRaw(this.entity);
    
}

System.prototype.Update = function(dt) {
    var delta = VectorMult(this.velocity, dt);
    this.pos = VectorSum(this.pos, delta);     
    
    var placeable = this.entity.placeable;
    var tm = placeable.transform;
    tm.pos = this.pos;
    placeable.transform = tm;
}

System.prototype.UpdateVelocity = function(schoolPos, schoolVelocity, systems) {
    var steer = new Vector3df();
    try {
        steer = VectorSum(steer, VectorMult(this.GetSeparateSteer(systems), 1.8));
        steer = VectorSum(steer, VectorMult(this.GetCohesionSteer(schoolPos), 1.5));
        steer = VectorSum(steer, this.GetAlignSteer(schoolVelocity));
        steer = GetLimitedVector(steer, this.maxSteer);
        
        this.velocity = GetLimitedVector(VectorSum(this.velocity, steer), this.maxSpeed);
    }
    catch(e) {
        print(e.message);
    }
}

//
System.prototype.GetCohesionSteer = function(schoolPos) {
    var pos = this.pos;
    var velocity = this.velocity;

    var steer = null;
    var desired = VectorSub(schoolPos, pos);
    var distance = GetMagnitude(desired);
    if(distance > 0) {
        desired = GetUnitVector(desired);
        desired = VectorMult(desired, this.maxSpeed);

        steer = VectorSub(desired, velocity);
        steer = GetLimitedVector(steer, this.maxSteer);
    }
    else {
        steer = new Vector3df();
    }
    return steer;
}

System.prototype.GetAlignSteer = function(schoolVel) {
    var pos = this.pos;
    var velocity = schoolVel;
    
    var steer = velocity;
    if( GetMagnitude(steer) > 0 ) {
        steer = GetUnitVector(steer);
        steer = VectorMult(steer, this.maxSpeed);
        steer = VectorSub(steer, velocity);
        steer = GetLimitedVector(steer, this.maxSteer);
    }
    return steer;
}

System.prototype.GetSeparateSteer = function(systems) {
    var pos = this.pos;
    var velocity = this.velocity;
    
    var steer = new Vector3df();
    var count = 0;
    for( var i in systems ) {
        var other = systems[i];
        var otherPos = other.pos;
        var dist = GetDistance(pos, otherPos);
        if( dist > 0 && dist < this.separation ) {
            var diff = VectorSub(pos, otherPos);
            diff = GetUnitVector(diff);
            diff = VectorDiv(diff, dist);
            steer = VectorSum(steer, diff);
            count += 1;
        }
    }
    if( count > 0 ) {
        steer = VectorDiv(steer, count);
    }
    if( GetMagnitude(steer) > 0 ) {
        steer = GetUnitVector(steer);
        steer = VectorMult(steer, this.maxSpeed);
        steer = VectorSub(steer, velocity);
        steer = GetLimitedVector(steer, this.maxSteer);
    }
    return steer;
}

System.prototype.Die = function() {
    this.alive = false;
}


if(true) {
    var p_ = new School;

    function Update(frametime) {
        //print("Call Update START");
        p_.Update(frametime);
        //print("Call Update END");
    }
    frame.Updated.connect(Update);
}