
var blogBot = require('./blogbot');
var socketIo = require('socket.io');
var io;
var blogSocket;

var log = require('winston');

send_run_event = function (child_process) {
   //log.debug('called send_run_event');
   //log.debug(child_process);
   //var msg_object = {"msg":'runEvent'};
   //child_process.send(msg_object);
   blogBot.task();
};

open_child_socket = function (port) {
    log.debug('open_child_socket port='+port);
    io =socketIo.listen(port);
    blogSocket = io
    .of('/blog')
    .on('connection', function (socket) {
        log.debug('blog: connection');
        socket.on('blog', function (data) {
            if (data.msg == 'getSites') {
                log.debug('recv msg =' + data.msg);
                var sites = blogBot.getSites(data.user);
                socket.emit('sites', sites);
            }
            else if(data.msg == 'getPosts') {
                log.debug('recv msg =' + data.msg);
                blogBot.getPosts(socket, data.user);
            }
            else if(data.msg == 'getComments') {
                log.debug('recv msg =' + data.msg + " postIDs = "+data.post_ids.length);
                blogBot.getComments(socket, data.user, data.post_ids);
            }
            else if(data.msg == 'get_reply_count') {
                log.debug('recv msg =' + data.msg + " post_ids = " + data.post_ids.length);
                for (var i=0;i<data.post_ids.length;i++) {
                   log.debug('get reply count post_ids='+data.post_ids[i]);
                   blogBot.get_reply_count(socket, data.user, data.post_ids[i]);
                }
            }
            else if (data.msg == 'getHistories') {
                log.debug('recv msg =' + data.msg);
                blogBot.getHistorys(socket, data.user);
            }
            else if (data.msg == 'addGroup') {
                log.debug('recv msg =' + data.msg);
                blogBot.addGroup(data.user, data.group);
            }
            else if (data.msg == 'setGroups') {
                log.debug('recv msg =' + data.msg);
                blogBot.setGroups(data.user, data.groups);
            }
            else if (data.msg == 'getGroups') {
                log.debug('recv msg =' + data.msg);
                var groups = blogBot.getGroups(data.user);
                socket.emit('groups', {"groups":groups});
            }
        });
    });
};

process.on('message', function (m, server) {
    log.debug(m);
    //log.debug(m.msg);

    if (m.msg === 'start') {
        if (io == undefined) {
            open_child_socket(m.port);
        }
        blogBot.start(m.user);
        //log.debug(this);
        this.intarval = setInterval(send_run_event, 1000*30, this); //1 min
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
//        log.debug(server);
//        server.end(sites);
//    }
    else {
        log.debug("unknown message " + m.msg);
    }
});

process.on('close', function (code, signal) {
    log.debug('child() process terminated due to receipt of signal '+signal);
    //it need to close port
});

