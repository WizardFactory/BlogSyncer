
var blogBot = require('./blogbot');
var socketIo = require('socket.io');
var io;
var blogSocket;

send_run_event = function (child_process) {
   //console.log('called send_run_event');
   //console.log(child_process);
   //var msg_object = {"msg":'runEvent'};
   //child_process.send(msg_object);
   blogBot.task();
};

open_child_socket = function (port) {
    console.log('open_child_socket port='+port);
    io =socketIo.listen(port);
    blogSocket = io
    .of('/blog')
    .on('connection', function (socket) {
        console.log('blog: connection');
        socket.on('blog', function (data) {
            if (data.msg == 'getSites') {
                console.log('recv msg =' + data.msg);
                var sites = blogBot.getSites(data.user);
                socket.emit('sites', sites);
            }
            else if(data.msg == 'getPosts') {
                console.log('recv msg =' + data.msg);
                blogBot.getPosts(socket, data.user);
            }
            else if(data.msg == 'getComments') {
                console.log('recv msg =' + data.msg + " postIDs = "+data.post_ids.length);
                blogBot.getComments(socket, data.user, data.post_ids);
            }
            else if(data.msg == 'get_reply_count') {
                console.log('recv msg =' + data.msg + " post_ids = " + data.post_ids.length);
                for (var i=0;i<data.post_ids.length;i++) {
                   console.log('get reply count post_ids='+data.post_ids[i]);
                   blogBot.get_reply_count(socket, data.user, data.post_ids[i]);
                }
            }
            else if (data.msg == 'getHistories') {
                console.log('recv msg =' + data.msg);
                blogBot.getHistorys(socket, data.user);
            }
        });
    });
};

process.on('message', function (m, server) {
    console.log(m);
    //console.log(m.msg);

    if (m.msg === 'start') {
        if (io == undefined) {
            open_child_socket(m.port);
        }
        blogBot.start(m.user);
        //console.log(this);
        this.intarval = setInterval(send_run_event, 1000*20, this); //1 min
    }
    else if (m.msg === 'stop') {
        blogBot.stop(m.user);
        clearInterval(this.intarval);
    }
    else if (m.msg === 'findOrCreate') {
        blogBot.findOrCreate(m.user);
    }
//    else if (m.msg == 'runEvent') {
//        blogBot.task();
//    }
//    else if (m.msg == 'getSites') {
//        var sites = blogBot.getSites(m.user);
//        console.log(server);
//        server.end(sites);
//    }
    else {
        console.log("unknown message " + m.msg);
    }
});

process.on('close', function (code, signal) {
    console.log('child() process terminated due to receipt of signal '+signal);
    //it need to close port
});

