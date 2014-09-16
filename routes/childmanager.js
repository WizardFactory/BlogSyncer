/**
 * Created by aleckim on 2014. 8. 17..
 */

var childP = require('child_process');

function childmanager() {

};

childmanager.childs = [];
/*
       [
        {process,
        port
        users = []},
        {}
       ]
*/

childmanager.createChild = function (user) {

    console.log('childmanager: create child of user='+user.id);

    var child;
    if (this.childs.length == 0) {
        console.log('childmanager: create child process of user='+user.id);
        child = {};
        child.process = childP.fork('./routes/child.js');
        //we have to change to use random port.
        child.port = 20149;
        child.users = [];
        var msg_object = {"msg":'start', "user":user, "port":child.port};
        child.process.send(msg_object);
        child.users.push(user);
        this.childs.push(child);
    }
    else {
        console.log('childmanager: register user='+user.id+' to child process');
        //use only 1 child process we will extend for multi child processes.
        //get available process to add child
        child = this.childs[0];
        child.users.push(user);
        var msg_object = {"msg":'start', "user":user, "port":child.port};
        child.process.send(msg_object);
    }

    return;
};

childmanager.destroyChild = function(user) {
    var child = {};

    for(var i=0; i<this.childs.length; i++) {
       if (this.childs[i].user.id === user.id) {
           child = this.childs[i];
           break;
       }
    }

    child.kill();
};

childmanager.sendMessage = function(user, message) {
    console.log('childmanager: send msg by user=' + user.id + ' message='+message);

    var child;
    var len = this.childs.length;
    var i;
    var j;

    console.log('childmanager: childs.len='+len);
    for(i=0; i<len; i++) {
        for (j=0; j<this.childs[i].users.length; j++) {
            if (this.childs[i].users[j].id === user.id) {
                console.log('Found child index='+i);
                child = this.childs[i];
                break;
            }
        }
    }

    if (i == len) {
        var msg = 'Fail to find process of userid='+user.id;
        console.log (msg);
        this.createChild(user);
        child = this.childs[0];
    }

    console.log('child msg='+message+' user.id = '+user.id + ' port='+child.port);
    var msg_object = {"msg": message, "user": user, "port": child.port};

    child.process.send(msg_object);

    return child.port;
};

childmanager.get_child_port = function (user) {
    var child = {};
    var len = this.childs.length;
    var i, j;

    console.log('childmanager: childs.len='+len);
    for(i=0; i<len; i++) {
        for (j=0; j<this.childs[i].users.length; j++) {
            if (this.childs[i].users[j].id === user.id) {
                console.log('Found child index='+i + ' users='+j);
                child = this.childs[i];
                break;
            }
        }
    }

    if (i == len) {
        var msg = 'Fail to find process of userid='+id;
        console.log (msg);
        return -1;
    }

    console.log('child_manager child_port=', child.port);

    return child.port;
};

module.exports = childmanager;
