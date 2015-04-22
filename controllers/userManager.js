/**
 * Created by skywlrl on 14. 12. 28..
 */

var UserDb = require('../models/userdb');

/**
 *
 * @constructor
 */
function UserMgr() {
}

/***
 *
 * @param req
 * @param provider
 * @param callback
 * @private
 */
UserMgr._updateOrCreateUser = function (req, provider, callback) {
    "use strict";
    var meta = {};

    meta.cName = "UserMgr";
    meta.fName = "_updateOrCreateUser";
    meta.providerName = provider.providerName;
    meta.providerId = provider.providerId;

    UserDb.findOne({'providers.providerName':provider.providerName, 'providers.providerId': provider.providerId},
        function (err, user) {
            var p;
            var isNewProvider = false;
            var reqUser, newUser;

            if (err) {
                return callback(err);
            }

            // if there is a user id already but no token (user was linked at one point and then removed)
            if (user) {
                log.debug("Found user="+user._id, meta);

                p = user.findProvider(provider.providerName);
                if (!p) {
                    log.error("Fail to get provider="+provider.providerName, meta);
                    log.error(err.toString(), meta);
                    return callback(err);
                }

                if (req.user && (req.user._id !== user._id && req.user._id.toString() !== user._id.toString())) {
                    UserDb.findById(req.user._id, function (err, reqUser) {
                        if (err) {
                            log.error(err.toString(), meta);
                            return callback(err);
                        }
                        if (!reqUser) {
                            log.error("Fail to get user id=" + req.user._id, meta);
                            log.error(err.toString(), meta);
                            return callback(err);
                        }

                        if (p.accessToken !== provider.accessToken) {
                            p.accessToken = provider.accessToken;
                            p.refreshToken = provider.refreshToken;
                            user.save (function(err) {
                                if (err) {
                                    return callback(err);
                                }
                                return callback(null, reqUser, isNewProvider, user);
                            });
                        } else {
                            return callback(null, reqUser, isNewProvider, user);
                        }
                    });
                }
                else {
                    if (p.accessToken !== provider.accessToken) {
                        p.accessToken = provider.accessToken;
                        p.refreshToken = provider.refreshToken;
                        user.save (function(err) {
                            if (err) {
                                return callback(err);
                            }
                            return callback(null, user, isNewProvider);
                        });
                    } else {
                        return callback(null, user, isNewProvider);
                    }
                }
            }
            else {
                isNewProvider = true;

                if (req.user) {
                    UserDb.findById(req.user._id, function (err, reqUser) {
                        if (err) {
                            log.error(err.toString(), meta);
                            return callback(err);
                        }
                        if (!reqUser) {
                            log.error("Fail to get user id="+req.user._id, meta);
                            log.error(err.toString(), meta);
                            return callback(err);
                        }
                        // if there is no provider, add to user
                        reqUser.providers.push(provider);
                        reqUser.save(function(err) {
                            if (err) {
                                return callback(err);
                            }
                            return callback(null, reqUser, isNewProvider);
                        });
                    });
                }
                else {
                    // if there is no provider, create new user
                    newUser = new UserDb();
                    newUser.providers = [];
                    newUser.providers.push(provider);
                    newUser.save(function(err) {
                        if (err) {
                            return callback(err);
                        }
                        return callback(null, newUser, isNewProvider);
                    });
                }
            }
        }
    );
};

/**
 *
 * @param user
 * @param delUser
 * @returns {*}
 * @private
 */
UserMgr._combineUser = function (user, delUser, callback) {
    "use strict";
    var meta = {};

    meta.cName = "UserMgr";
    meta.fName = "_combineUser";

    user.providers = user.providers.concat(delUser.providers);
    delUser.remove(function (err) {
        if (err) {
            log.error("Fail to remove user", meta);
            return callback(err);
        }

        user.save(function (err) {
            if (err) {
                return callback(err);
            }
            return callback(null);
        });
    });
};

/**
 *
 * @param req
 * @param res
 * @returns {*}
 * @private
 */
UserMgr._getUserId = function (req, res) {
    "use strict";
    var userId;
    var errorMsg;
    var meta = {};

    meta.cName = "UserMgr";
    meta.fName = "_getUserId";

    if (req.user) {
        userId = req.user._id;
    }
    else if (req.query.userid) {
        //this request form child process;
        userId = req.query.userid;
    }
    else {
        errorMsg = 'You have to login first!';
        log.debug(errorMsg, meta);
        if (res) {
            res.send(errorMsg);
            res.redirect("/#/signin");
        }
    }
    return userId;
};

/**
 *
 * @param userId
 * @param providerName
 * @param callback
 * @returns {*}
 * @private
 */
UserMgr._findProviderByUserId = function (userId, providerName, providerId, callback) {
    "use strict";
    var meta = {};

    meta.cName = "UserMgr";
    meta.fName = "_findProviderByUserId";
    meta.userId = userId;
    meta.providerName = providerName;

    UserDb.findById(userId, function (err, user) {
        if (err || !user) {
            log.error("Fail to find user", meta);
            return callback(err);
        }

        var provider = user.findProvider(providerName, providerId);
        if (!provider) {
            var error = new Error("Fail to find provider");
            log.error(error, meta);
            return callback(error);
        }

        callback(null, user, provider);
    });
};

/**
 *
 * @param userId
 * @param providerName
 * @param callback
 * @returns {*}
 * @private
 */
UserMgr._findUsers = function (callback) {
    "use strict";
    var meta = {};

    meta.cName = "UserMgr";
    meta.fName = "_findUsers";

    UserDb.find({}, function(err, users) {
        if (err) {
            log.error("Fail to find of users", meta);
            return callback(err);
        }

        return callback(null, users);
    });
};

module.exports = UserMgr;