engine.IncludeFile('D:\\Antti\\lvm\\vector.js');
print('Boxavatar.js running');

var is_server = server.IsRunning();
var own_avatar = false;
var mouse_sensitivity_x = 0.3;
var mouse_sensitivity_y = 0.2;

const DASH_DURATION = 1.0;
const DASH_COOLDOWN = 4.0;

var can_dash        = true;
var dashing         = false;
var direction       = new Vector3df();

const TURNINGSPEED = 40.0;
const MAXSPEED = 4.0;
const STEERING = 0.5;

const ACCELERATION = 3.0;

var speed = 0;

var score = 0.0;

delayed = frame.DelayedExecute(0.2);
delayed.Triggered.connect(function() {
    if (is_server) {
        ServerInitialize();
        print('Server side Boxavatar initialized');
    }
    else {
        ClientInitialize();
        print('Client side Boxavatar initialized');
    }
});

function ServerInitialize()
{
    // Placeable
    var placeable = me.placeable;
    var transform = placeable.transform;
    
    var pos = new Vector3df();
    pos.x = 42.0;
    pos.y = 31.0;
    pos.z = 0.0;

    transform.pos = pos;
    placeable.transform = transform;

    // Mesh
    var mesh = me.mesh
    
    var m = mesh.meshRef;
    m.ref = 'file://stripedbass2.mesh';
    mesh.meshRef = m;
    
    m = mesh.skeletonRef;
    m.ref = 'file://stripedbass2.skeleton';
    mesh.skeletonRef = m;
    
    mesh.meshMaterial = 'file://stripedbass2.material';
    
    var meshTm = mesh.nodeTransformation;
    meshTm.rot.z = 90;
    mesh.nodeTransformation = meshTm;
    
    var trigger = me.volumetrigger
    trigger.EntityEnter.connect(EntityEnter);
    trigger.EntityLeave.connect(EntityLeave);
    
    var rigidbody = me.rigidbody
    
    var sizeVec = new Vector3df();
    sizeVec.z = 1.0;// 0.3;
    sizeVec.x = 1.0;//0.3;
    sizeVec.y = 1.0;//0.3;
    rigidbody.mass = 3;
    rigidbody.linearFactor = new Vector3df();
    rigidbody.angularFactor = new Vector3df();
    rigidbody.shapeType = 0; // Box?
    rigidbody.size = sizeVec;
    var zeroVec = new Vector3df();
    rigidbody.angularFactor = zeroVec; // Set zero angular factor so that body stays upright
    rigidbody.GetPhysicsWorld().Updated.connect(ServerUpdatePhysics);
    
    frame.Updated.connect(ServerUpdate);

    // Connect actions
    me.Action("Move").Triggered.connect(ServerHandleMove);
    me.Action("Stop").Triggered.connect(ServerHandleStop);
    me.Action("Rotate").Triggered.connect(ServerHandleRotate);
    me.Action("StopRotate").Triggered.connect(ServerHandleStopRotate);
    me.Action("Dash").Triggered.connect(ServerHandleDash);
    
    me.Action("MouseLookX").Triggered.connect(ServerHandleMouseX);
    me.Action("MouseLookY").Triggered.connect(ServerHandleMouseY);
    
    print(me.GetName() + " ready to go");
    
    ServerUpdateAnimationState();
    UpdateAnimation();
}

function ServerUpdate(dt)
{
    var placeable = me.placeable;
    var rigidbody = me.rigidbody;
    
    // Turn
    if(direction.y != 0) {
        var rot = new Vector3df();
        rot.z = TURNINGSPEED*direction.y*dt;
        rigidbody.Rotate(rot);
    }

    // Move
    if(direction.x != 0) {
        if(!dashing && speed < MAXSPEED)
            speed += ACCELERATION*dt;
        else if(!dashing && speed > MAXSPEED)
            speed -= ACCELERATION*dt;
        else if(dashing)
            speed += ACCELERATION*2*dt;
        
    }
    else {
        speed -= ACCELERATION*dt;
    }
    if(speed < 0)
        speed = 0;
    
    var velocity = new Vector3df();
    velocity.x = speed;
    
    delta = VectorMult(velocity, dt);
    
    delta = placeable.GetRelativeVector(delta);
    var transform = placeable.transform;
    transform.pos = VectorSum(transform.pos, delta);
    placeable.transform = transform;
    
    UpdateAnimation();
   
}


function ServerUpdatePhysics(dt)
{
    EatFood(dt);
}


function EatFood(dt)
{
    var volumetrigger = me.volumetrigger;
    for(var i = 0; i < volumetrigger.GetNumEntitiesInside(); i++) {
        var entity = volumetrigger.GetEntityInside(i);
        if(entity.GetName() == 'System') {
            //print(volumetrigger.GetEntityInsidePercent(entity));
            score += dt*1.0;
        }
    }
    //print(score);
}

function EntityEnter(entity) 
{
    print('enter: '+entity.GetName());
}

function EntityLeave(entity)
{
    print('leave: '+entity.GetName());
}

function ServerHandleMouseX(param)
{
    var move = parseInt(param);
    var rigidbody = me.rigidbody;
    var rotateVec = new Vector3df();
    rotateVec.z = -mouse_sensitivity_x * move;
    rigidbody.Rotate(rotateVec);
    
}

function ServerHandleMouseY(param)
{
    var move = parseInt(param);
    var rigidbody = me.rigidbody;
    var placeable = me.placeable;
    
    var rotateVec = new Vector3df();
    
    rotateVec.y = -mouse_sensitivity_y * move;
    rigidbody.Rotate(rotateVec);
    
    var tm = placeable.transform;
    if(tm.rot.y > 20)
        tm.rot.y = 20;
    else if(tm.rot.y < -20)
        tm.rot.y = -20;
    else
        return;
    
    // Limit rot
    placeable.transform = tm;
}

function ServerHandleMove(param)
{
    //print('ServerHandleMove: '+param);
    if (param == "forward" && direction.x != 1)
        direction.x = 1;
    //else if(param == "up" && direction.z != 1)
    //    direction.z = 1;
    //else if(param == "down" && direction.z != -1)
    //    direction.z = -1;
    else
        return;
    ServerUpdateAnimationState();
        
}

function ServerHandleStop(param)
{
    //print('stop: '+param);
    if (param == "forward" && direction.x == 1)
        direction.x = 0;
    //else if(param == "up" && direction.z == 1)
    //    direction.z = 0;
    //else if(param == "down" && direction.z == -1)
    //    direction.z = 0;
    else
        return;
    ServerUpdateAnimationState();
}

function ServerHandleRotate(param)
{
    //print('rotate: '+param);
    if(param == "left" && direction.y != 1)
        direction.y = 1;
    else if(param == "right" && direction.y != -1)
        direction.y = -1;
    else
        return;
    ServerUpdateAnimationState();
}

function ServerHandleStopRotate(param)
{
    //print('stoprotate: '+param);
    if(param == "left" && direction.y == 1)
        direction.y = 0;
    else if(param == "right" && direction.y == -1)
        direction.y = 0;
    else
        return;
    ServerUpdateAnimationState();
}

function ServerUpdateAnimationState() 
{
    //print('ServerUpdateAnimationState');
    
    var animationcontroller = me.animationcontroller;
    
    if(direction.y > 0) {
        animationcontroller.animationState = 'turn left';
    }
    else if(direction.y < 0) {
        animationcontroller.animationState = 'turn right';
    }
    
    else if(direction.x > 0 && !dashing) {
        animationcontroller.animationState = 'move';
    }
    else if(direction.x > 0 && dashing) {
        animationcontroller.animationState = 'dash';
    }
    else {
        animationcontroller.animationState = 'idle';
    }  
}

function ServerHandleDash()
{
    //print('ServerHandleDash');
    if(can_dash) {
        dashing  = true;
        can_dash = false;
            
        var dash_duration = frame.DelayedExecute(DASH_DURATION);
        dash_duration.Triggered.connect(function() {
            dashing = false;
            ServerUpdateAnimationState();
        });
        
        var dash_cooldown = frame.DelayedExecute(DASH_COOLDOWN);
        dash_cooldown.Triggered.connect(function() {
            can_dash = true;
        });
        ServerUpdateAnimationState();
    }
}


function ClientInitialize()
{
    if (me.GetName() == "Avatar" + client.GetConnectionID())
    {
        own_avatar = true;
        
        ClientCreateInputMapper();
        ClientCreateFishCamera();
    }
    frame.Updated.connect(ClientUpdate);
}

function ClientCreateFishCamera()
{
    if (scene.GetEntityByNameRaw("FishCamera") != null)
        return;

    var cameraentity = scene.CreateEntityRaw(scene.NextFreeIdLocal(), ['EC_OgreCamera', 'EC_Placeable']);
    cameraentity.SetName("FishCamera");
    cameraentity.SetTemporary(true);
    
    var camera = cameraentity.ogrecamera;
    var placeable = cameraentity.placeable;

    camera.AutoSetPlaceable();
    camera.SetActive();
    print('Fish camera created');
}

function ClientUpdate(dt)
{
    if (own_avatar)
    {
        ClientUpdateFishCamera(dt);
    }
    UpdateAnimation();
}


function ClientUpdateFishCamera()
{
    var cameraentity = scene.GetEntityByNameRaw("FishCamera");
    if (cameraentity == null)
        return;
    var cameraplaceable = cameraentity.placeable;
    var avatarplaceable = me.placeable;

    var cameratransform = cameraplaceable.transform;
    var avatartransform = avatarplaceable.transform;
    var offsetVec = new Vector3df();
    offsetVec.x = -5.0;
    offsetVec = avatarplaceable.GetRelativeVector(offsetVec);
    cameratransform.pos = VectorSum(avatartransform.pos, offsetVec);
    // Note: this is not nice how we have to fudge the camera rotation to get it to show the right things
    cameratransform.rot.x = 90 - avatartransform.rot.y;
    cameratransform.rot.z = avatartransform.rot.z - 90;

    cameraplaceable.transform = cameratransform;
}

function ClientCreateInputMapper()
{
    // Create a nonsynced inputmapper
    var inputmapper = me.GetOrCreateComponentRaw("EC_InputMapper", 2, false);
    inputmapper.contextPriority = 101;
    inputmapper.takeMouseEventsOverQt = true;
    inputmapper.modifiersEnabled = false;
    inputmapper.executionType = 2; // Execute actions on server

    inputmapper.RegisterMapping("W", "Move(forward)", 1);
    inputmapper.RegisterMapping("A", "Rotate(left)", 1);
    inputmapper.RegisterMapping("D", "Rotate(right))", 1);

    inputmapper.RegisterMapping("W", "Stop(forward)", 3);
    inputmapper.RegisterMapping("A", "StopRotate(left)", 3);
    inputmapper.RegisterMapping("D", "StopRotate(right))", 3);
    
    inputmapper.RegisterMapping("Space", "Dash()", 1);
    inputmapper.RegisterMapping("Space", "Dash()", 3);
  
}


function UpdateAnimation() {
    var animationcontroller = me.animationcontroller;
    if(animationcontroller == null)
        return;
        
    var state = animationcontroller.animationState;
    //print(state);
    if(state == 'idle' || state == 'move') {
        if(animationcontroller.IsAnimationActive('Turning_L'))
            animationcontroller.StopAnim('Turning_L', 0.2);
        if(animationcontroller.IsAnimationActive('Turning_R'))
            animationcontroller.StopAnim('Turning_R', 0.2);
            
        if(!animationcontroller.IsAnimationActive('Walk', false))
            animationcontroller.EnableAnimation('Walk', true, 0.2);      
    }
    
    else if(state == 'turn left') {
        if(animationcontroller.IsAnimationActive('Walk'))
            animationcontroller.StopAnim('Walk', 0.2);
        if(!animationcontroller.IsAnimationActive('Turning_L'))
            animationcontroller.EnableAnimation('Turning_L', true, 0.2);    
    }
    
    else if(state == 'turn right') {
        if(animationcontroller.IsAnimationActive('Walk'))
            animationcontroller.StopAnim('Walk', 0.2);
        if(!animationcontroller.IsAnimationActive('Turning_R'))
            animationcontroller.EnableAnimation('Turning_R', true, 0.2);
    }
    
    else if(state == 'dash') {
        if(!animationcontroller.IsAnimationActive('Walk', false))
            animationcontroller.EnableAnimation('Walk', true, 0.1, false);
        //animationcontroller.SetAnimationWeight('swim', 1.2);
        //animationcontroller.SetAnimationSpeed('swim', 1.7);
    }
}


function Steer(target, location, slowDown) {
    var steer = null;
    var desired = VectorSub(target, location);
    var distance = GetMagnitude(desired);
    if(distance > 0) {
        desired = GetUnitVector(desired);
        if(slowDown) {
            if( distance < 1 ) {
                desired = VectorMult(desired, SPEED*(distance/1));
            }
            else {
                desired = VectorMult(desired, SPEED);
            }
        }
        else {
            desired = VectorMult(desired, SPEED);
        }
        steer = VectorSub(desired, velocity);
        steer = GetLimitedVector(steer, STEERING);
    }
    else {
        steer = new Vector3df();
    }
    return steer;
}
