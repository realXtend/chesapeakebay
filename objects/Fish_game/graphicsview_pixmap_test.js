print("importing qt");
engine.ImportExtension("qt.core");
engine.ImportExtension("qt.gui");
print("making QGraphicsView");

radar_scene = new QGraphicsScene();
pixitem = radar_scene.addPixmap(new QPixmap("/etc/alternatives/emacs-32x32.png"));

radar_w = 200;
radar_h = 200;
radar_range = 100;
radar_scene.setSceneRect(0, 0, radar_w, radar_h);

radar_view = new QGraphicsView();
radar_view.setScene(radar_scene);
radar_view.show();

// x_dir = 1
// y_dir = 2
// i = 0
// function update_callback(frametime) {
//     i++;

//     p = pixitem.pos();
//     x = p.x();
//     y = p.y();
//     if (x > radar_w || x < 0)
// 	x_dir = -x_dir;
//     if (y > radar_h || y < 0)
// 	y_dir = -y_dir;

//     print(x, y);
//     pixitem.setPos(x+x_dir, y+y_dir);
// }

//frame.Updated.connect(update_callback);

radar_refresh_interval = .05;

tracked_entity_name = "FreeLookCamera";

function update_radar() {
    call_later(radar_refresh_interval, update_radar);
    pos = scene.GetEntityByNameRaw("FreeLookCamera").placeable.transform.pos;
    //print("tracked entity pos", pos.x, pos.y, pos.z);
    pixitem.setPos(pos.x/radar_range * radar_w, pos.y/radar_range * radar_h);
}

function call_later(delay, fun) {
    frame.DelayedExecute(delay, fun).Triggered.connect(fun);
}

call_later(.1, update_radar);
