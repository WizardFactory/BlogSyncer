/**
 * Created by aleckim on 2014. 7. 11..
 */

/*
	Temporary work for mongodb.

	var mongoDB = require('mongoose'); // mongoose for mongodb

	// connect to mongoDB database on modulus.io
	mongoDB.connect('mongodb://localhost/user');
  
  // define Schema =================
  var UserSchema = new Schema({
    id : String, // key
    password : String, // key
    usingProviderCount : Number,
//  providers : [ProviderSchema]
  });

  var ProviderSchema = new Schema({
    id : String, // key
    providerName : String, // key
    accessToken : String,
//  providerId : Number // key?
  });
	// define model =================
	var UserDB = mongoose.model('User',UserSchema);
  var Provider = mongoose.model('Provider',ProviderSchema);
  
userdb.checkUserName = function () {
    UserDB.findOne({ id : req.body.loginid }, 'id', function(err, user) {
        if (err)
            console.log(err);
        else if (user)
            return true;

        return false;
    });
};

userdb.getUserCount = function () {
    UserDB.count({}, function( err, count){
        return count;
    });
};

userdb.getUserProviderCount = function (userId) {
    UserDB.findOne({ id : userId }, 'id', function(err, user) {
        return user.usingProviderCount;
    });
};

userdb.addUser = function (new_id, new_passwd) {
    UserDB.create({
        id : new_id,
        password : new_passwd,
        usingProviderCount : 0
    }, function(err, user) {
        if (user)
            return true;

        return false;
    });
};

userdb.removeUser = function (id) {
    UserDB.remove({
        _id : id,
    }, function(err, user) {
        if (user)
            return true;
        else
            return false;
    });
};

userdb.addProvider = function (userId, new_providerName) {
    Provider.findOne({ id : userId, providerName : new_providerName }, 'id', function(err, provider) {
        if (err) {
            console.log(err);
        } else if (provider) {
            console.log("DB Update!!");
            //  저장된 DB 가 있음. -> 기존항목 update
            Provider.update({id: userId,
                providerName: new_providerName,
            }, {id: userId,
                providerName: new_providerName,
                accessToken: "token1"
            }, {safe: true, upsert: true}, function (err) {
                if (err) {
                    console.log(err);
                } else {
                    return true;
                }
                return false;
            });
        }
        else {
            console.log("DB Add!!");
            // DB 에 없는 provider -> 신규 DB 추가
            Provider.create({
                id: userId,
                providerName: new_providerName,
                accessToken: "token"
            }, function (err, provider) {
                if (err)
                    console.log(err);
                else if (provider) {
                    // usingProvider Count 조정
                    UserDB.findOne({ id: userId }, 'id', function (err, user) {
                        if (err) {
                            console.log(err);
                        } else if (user) {
                            UserDB.update({id: userId},
                                {id: userId,
                                    password: user.password,
                                    usingProviderCount: user.usingProviderCount + 1
                                }, {safe: true, upsert: true}, function (err) {
                                    if (err) {
                                        console.log(err);
                                    } else {
                                        return true;
                                    }
                                    return false;
                                });
                        }
                        return false;
                    });
                }
            });
        }
    });
};

userdb.removeProvider = function (userId, removeProviderName) {
    Provider.remove({
        _id : userId, providerName : removeProviderName
    }, function(err, todo) {
        if (err){
            console.log(err);
            return false;
        }
        // usingProvider Count 조정
        UserDB.findOne({ id : userId }, 'id', function(err, user) {
            if (err) {
                console.log(err);
            } else if (user) {
                UserDB.update({id: userId},
                    {id: userId,
                        password : user.password,
                        usingProviderCount : user.usingProviderCount - 1
                    }, {safe: true, upsert: true}, function (err) {
                        if (err) {
                            console.log(err);
                        } else {
                            return true;
                        }
                        return false;
                    });
            }
            return false;
        });
    });
}

*/

var fs = require('fs');
var dbfilename = 'users.db';


function userdb() {

}

userdb.users = [];
/* users[] -> id, providers[] */
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

/* 동일한 provider를 여러개 가지는 경우 provider id로 찾아야 한다. by dhkim2 */
userdb.findProvider = function (id, providerName) {
    //console.log("Find id= " + id + " providerName= " + providerName);

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

userdb.findProviderId = function (id, providerId) {
    //console.log("Find id= " + id + " providerId= " + providerId);

    for (var i=0; i<this.users.length; i++) {
        if (this.users[i].id == id) {
            for (var j=0; j<this.users[i].providers.length; j++) {
                if (this.users[i].providers[j].providerId == providerId) {
                    return this.users[i].providers[j];
                }
            }

            console.log("There is id, but fail to find provider by provider");
        }
    }

    console.log("Fail to find provider by providerName");

    return null;
};

//it have to be moved controller

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

            console.log('userdb: createChild of user='+user.id);
        }
        console.log("user:" + JSON.stringify(user));
    }

    return user;
};

module.exports = userdb;


