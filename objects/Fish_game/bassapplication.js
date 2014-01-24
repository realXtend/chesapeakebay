
var isServer = server.IsRunning();

if (isServer)
{  
    server.UserConnected.connect(ServerHandleUserConnected);
    server.UserDisconnected.connect(ServerHandleUserDisconnected);
}
else
{
    //var inputMapper = me.GetOrCreateComponentRaw('EC_InputMapper');
    //inputMapper.SetTemporary(true);
    //inputMapper.contextPriority = 102;
}



function ServerHandleUserConnected(connectionID, username)
{
    // Create entity and run script
    
    var avatarEntityName = 'Avatar' + connectionID;
    var avatarEntity = scene.CreateEntityRaw(scene.NextFreeId(), ['EC_Script', 'EC_Placeable', 'EC_RigidBody', 'EC_Mesh', 'EC_AnimationController', 'EC_VolumeTrigger']);
    
    avatarEntity.SetTemporary(false);
    avatarEntity.SetName(avatarEntityName);
    avatarEntity.SetDescription(username);
    
    // Script
    var script = avatarEntity.GetComponentRaw('EC_Script');
    script.type = 'js';
    script.runOnLoad = true;
    var r = script.scriptRef;
    r.ref = 'D:\\Antti\\lvm\\bassavatar.js';
    script.scriptRef = r;
    
    scene.EmitEntityCreatedRaw(avatarEntity);
    print(avatarEntityName + ' created');
}



function ServerHandleUserDisconnected(connectionID)
{
    var avatarEntityName = 'Avatar' + connectionID;
    var entityID = scene.GetEntityByNameRaw(avatarEntityName).Id;
    scene.RemoveEntityRaw(entityID);
}