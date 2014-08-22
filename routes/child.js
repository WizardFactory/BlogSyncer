
var blogbot = require('./blogbot');
var socketio = require('socket.io');
var io;
var blog_socket;

send_run_event = function () {
   console.log('called send_run_event');
   process.send('runEvent');
};

open_child_socket = function (port) {
    console.log('open_child_socket port='+port);
    io =socketio.listen(port);
    blog_socket = io
    .of('/blog')
    .on('connection', function (socket) {
        console.log('blog: connection');
        socket.on('blog', function (data) {
            if (data.msg == 'getSites') {
                console.log('recv msg =' + data.msg);
                var sites = blogbot.getSites();
                socket.emit('sites', sites);
            }
        });
    });
};

process.on('message', function (m, server) {
    console.log(m);
    console.log(m.msg);

    if (m.msg === 'start') {
        open_child_socket(m.port);
        blogbot.start(m.user);
        //console.log(this);
        this.intarval = setInterval(send_run_event, 1000*60); //1 min
    }
    else if (m.msg === 'stop') {
        blogbot.stop();
        clearInterval(this.intarval);
    }
    else if (m.msg === 'findOrCreate') {
        blogbot.findOrCreate(m.user);
    }
    else if (m.msg == 'runEvent') {
        blogbot.getandpush();
    }
    else if (m.msg == 'getSites') {
        var sites = blogbot.getSites(m.user);
        console.log(server);
        server.end(sites);
    }
    else {
        console.log("unknown message " + m.msg);
    }
});

process.on('close', function (code, signal) {
    console.log('child(user.id='+blogbot.user.id+') process terminated due to receipt of signal '+signal);
    //it need to close port
});

