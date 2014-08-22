/**
 * Created by aleckim on 2014. 8. 17..
 */

var child_p = require('child_process');

function childmanager() {

};

childmanager.childs = [];
/*
        user,
        process,
        port
*/

childmanager.createChild = function (user) {

    console.log('childmanager: create child process of user='+user.id);

    var child = {};

    child.user = user;
    child.process = child_p.fork('./routes/child.js');
    //we have to change to use random port.
    child.port = 20149;

    this.childs.push(child);

    var msg_object = {"msg":'start', "user":user, "port":child.port};
    child.process.send(msg_object);
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

    var child = {};
    var len = this.childs.length;
    var i;

    console.log('childmanager: childs.len='+len);
    for(i=0; i<len; i++) {
        if (this.childs[i].user.id === user.id) {
            console.log('Found child index='+i);
            child = this.childs[i];
            break;
        }
    }

    if (i == len) {
        var msg = 'Fail to find process of userid='+id;
        console.log (msg);
        return -1;
    }

    console.log('child msg='+message+' user.id = '+child.user.id + ' port='+child.port);
    var msg_object = {"msg": message, "user": user, "port": child.port};

    child.process.send(msg_object);

    return child.port;
};

childmanager.get_child_port = function (user) {
    var child = {};
    var len = this.childs.length;
    var i;

    console.log('childmanager: childs.len='+len);
    for(i=0; i<len; i++) {
        if (this.childs[i].user.id === user.id) {
            console.log('Found child index='+i);
            child = this.childs[i];
            break;
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
