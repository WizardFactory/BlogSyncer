/**
 * Created by aleckim on 2014. 7. 11..
 */

var fs = require('fs');
var dbfilename = 'users.db';


function userdb() {

}

userdb.users = [];
/*
   [
        {
            "id":1,
            "providers": [
                {"providerName":"facebook", "accessToken":accessToken,"providerId":profile.id },
                {"providerName":"twitter", "data":"dummy2"}
            ]
        }
    ];
*/

userdb.init = function () {
  try {
    userdb.users = JSON.parse(fs.readFileSync(dbfilename)).user_db;
  }
  catch (e) {
    console.log(e);
    return false;
  }

  return true;
};

userdb.saveFile = function () {
  try {
    fs.writeFile(dbfilename, JSON.stringify({"user_db":userdb.users}), function (err) {
        if (err) throw err;
        console.log('It\'s saved!');
    });
  }
  catch(e) {
      console.log(e);
      return false;
  }

  return true;
};

userdb.getUserCount = function () {
    return this.users.length;
};

userdb.getProviderCount = function (id) {
    var len = 0;
    for (var i=0; i<this.users.length; i++) {
        if (this.users[i].id == id) {
            len = this.users[i].providers.length;
            break;
        }
    }

    if (len == 0) {
        console.log("Fail to find id");
    }

    return len;
};

userdb.addUser = function (new_provider) {
    var totalCount = 0;
    var lastId = 0;

    totalCount = this.getUserCount();
    //console.log("total = " + totalCount);

    if (totalCount > 0) {
        lastId = this.users[totalCount - 1].id;
    }
    //console.log("lastId = " + lastId);
    lastId++;

    this.users.push({"id":lastId, "providers":[new_provider]});

    //this.saveFile();

    return this.users[totalCount];
};

userdb.removeUser = function (id) {
    for (var i = 0;i<this.getUserCount();i++) {
        if (this.users[i].id == id) {
            delete this.users[i];
            return true;
        }
    }

    console.log("Fail to find user");
    return false;
};

userdb.addProvider = function (id, new_provider) {
    var user = this.findUser(id);

    user.providers.push(new_provider);

    //this.saveFile();

    return user;
};

userdb.removeProvider = function (id, providerName) {

     for (var i=0; i<this.users.length; i++) {
        if (this.users[i].id == id) {
            for (var j=0; j<this.users[i].providers.length; j++) {
                if (this.users[i].providers[j].providerName == providerName) {
                    delete this.users[i].providers[j];
                    return true;
                }
            }

            console.log("There is id, but fail to find provider by providerName");
        }
    }

    console.log("Fail to find provider by providerName");

    return false;
};

userdb.findUser = function (id) {
    //console.log("Find user = " + id);

    for (var i=0; i<this.users.length; i++) {

        if (this.users[i].id == id) {

            //console.log(this.users[i]);

            return this.users[i];
        }
    }

    console.log("Fail to find user by id");
    return null;
};

userdb.findUserByProvider = function (provider) {
    for (var i=0; i<this.users.length; i++) {
        for (var j=0; j<this.users[i].providers.length; j++) {
            if (this.users[i].providers[j].providerName == provider.providerName
                && this.users[i].providers[j].providerId == provider.providerId) {
                return this.users[i];
            }
        }
    }

    console.log("Fail to find user by provider");
    return null;
};

userdb.findProvider = function (id, providerName) {
    //console.log("Find id= " + id + " provider= " + provider);

    for (var i=0; i<this.users.length; i++) {
        if (this.users[i].id == id) {
            for (var j=0; j<this.users[i].providers.length; j++) {
                if (this.users[i].providers[j].providerName == providerName) {
                    return this.users[i].providers[j];
                }
            }

            console.log("There is id, but fail to find provider by provider");
        }
    }

    console.log("Fail to find provider by providerName");

    return null;
};

userdb.findOrCreate = function (req_user, provider) {
    var user = {};

    if (req_user) {
        user = userdb.findUserByProvider(provider);
        if (user == null) {
            user = userdb.addProvider(req_user.id, provider);
            console.log("add new provider");
            console.log("user:" + JSON.stringify(user));
        }
        else {
            console.log("Already has provider") ;
        }
    }
    else {
        user = userdb.findUserByProvider(provider);
        if (user == null) {
            user = userdb.addUser(provider);
        }
        console.log("user:" + JSON.stringify(user));
    }

    return user;
};

module.exports = userdb;


