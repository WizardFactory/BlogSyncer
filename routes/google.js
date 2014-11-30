/**
 * Created by aleckim on 2014. 7. 19..
 */

var express = require('express');
var passport = require('passport');
var request = require('request');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var log = require('winston');

var UserDb = require('../models/userdb');
var blogBot = require('./blogbot');

var router = express.Router();
var svcConfig = require('../models/svcConfig.json');
var clientConfig = svcConfig.google;

var GOOGLE_API_URL = "https://www.googleapis.com";

passport.serializeUser(function(user, done) {
    "use strict";
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    "use strict";
    done(null, obj);
});

/***
 *
 * @param req
 * @param provider
 * @param callback
 * @private
 */
function _updateOrCreateUser(req, provider, callback) {
    "use strict";
    UserDb.findOne({'providers.providerName':provider.providerName,
            'providers.providerId': provider.providerId},
        function (err, user) {
            var p;
            var isNewProvider = false;
            var newUser;

            if (err) {
                return callback(err);
            }

            // if there is a user id already but no token (user was linked at one point and then removed)
            if (user) {
                log.debug("Found user of pName="+provider.providerName+",pId="+provider.providerId);
                p = user.findProvider("google");
                if (p.accessToken !== provider.accessToken) {
                    p.accessToken = provider.accessToken;
                    p.refreshToken = provider.refreshToken;
                    user.save (function(err) {
                        if (err) {
                            return callback(err);
                        }

                        return callback(null, user, isNewProvider);
                    });
                }
                else {
                    return callback(null, user, isNewProvider);
                }
            }
            else {
                isNewProvider = true;

                if (req.user) {
                    UserDb.findById(req.user._id, function (err, user) {
                        if (err) {
                            log.error(err);
                            return callback(err);
                        }
                        if (!user) {
                            log.error("Fail to get user id="+req.user._id);
                            log.error(err);
                            return callback(err);
                        }
                        // if there is no provider, add to User
                        user.providers.push(provider);
                        user.save(function(err) {

                            if (err) {
                                return callback(err);
                            }

                            return callback(null, user, isNewProvider);
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
        } );
}

passport.use(new GoogleStrategy({
        clientID: clientConfig.clientID,
        clientSecret: clientConfig.clientSecret,
        callbackURL: svcConfig.svcURL + "/google/authorized",
        passReqToCallback : true
    },
    function(req, accessToken, refreshToken, profile, done) {
        "use strict";
        var providerId;
        var provider;

//        log.debug("accessToken:" + accessToken);
//        log.debug("refreshToken:" + refreshToken);
//        log.debug("profile:" + JSON.stringify(profile));

        //It's not correct information. but I confirmed by /blogger/v3/users/self"
        providerId = "g"+profile.id;

        provider = {
            "providerName": profile.provider,
            "accessToken": accessToken,
            "refreshToken": refreshToken,
            "providerId": providerId.toString(),
            "displayName": profile.displayName
        };

        _updateOrCreateUser(req, provider, function(err, user, isNewProvider) {
            if (err) {
                log.error("Fail to get user ");
                return done(err);
            }

            if (isNewProvider) {
                if (!blogBot.isStarted(user)) {
                    blogBot.start(user);
                }
                blogBot.findOrCreate(user);
            }

            process.nextTick(function () {
                return done(null, user);
            });
        });
    }
));

router.get('/authorize',
    passport.authenticate('google', { scope: [
        'https://www.googleapis.com/auth/plus.login',
        'https://www.googleapis.com/auth/blogger'] })
);

router.get('/authorized',
    passport.authenticate('google', { failureRedirect: '/#signin' }),
    function(req, res) {
        "use strict";
        // Successful authentication, redirect home.
        log.debug('Successful!');
        res.redirect('/#');
    }
);

/**
 *
 * @param req
 * @param res
 * @returns {*}
 * @private
 */
function _getUserId(req, res) {
    "use strict";
    var userId;
    var errorMsg;

    if (req.user) {
        userId = req.user._id;
    }
    else if (req.query.userid) {

        //this request form child process;
        userId = req.query.userid;
    }
    else {
        errorMsg = 'You have to login first!';
        log.debug(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
    }
    return userId;
}

/**
 *
 * @param url
 * @param accessToken
 * @param callback
 * @private
 */
function _requestGet(url, accessToken, callback) {
    "use strict";

    request.get(url, {
        json: true,
        headers: {
            "authorization": "Bearer " + accessToken
        }
    }, function (err, response, body) {
        callback(err, response, body);
    });
}

/**
 *
 * @param err
 * @param response
 * @param body
 * @returns {*}
 * @private
 */
function _checkError(err, response, body) {
    "use strict";
    var bodyErr;
    var errStr;

    if (err) {
        log.debug(err);
        return err;
    }
    if (response.statusCode >= 400) {
        errStr = 'google API error: ' + response.statusCode + ' ' + body.message;
        log.error(body);
        log.error(errStr);
        return new Error(errStr);
    }
}

router.get('/info', function (req, res) {
    "use strict";
    var userId;

    userId = _getUserId(req, res);
    if (!userId) {
        return;
    }

    UserDb.findById(userId, function (err, user) {
        var p;
        var errMsg;
        var apiUrl;

        if (err) {
            log.error("Fail to find user id="+userId);
            log.error(err);
            res.send(err);
            return;
        }
        if (!user) {
            log.error("Fail to get user id="+userId);
            log.error(err);
            res.send(err);
            return;
        }

        p = user.findProvider("google");
        if (!p) {
            errMsg = "Fail to get google  user id="+userId;
            log.error(errMsg);
            res.send(errMsg);
            return;
        }

        apiUrl = GOOGLE_API_URL + "/blogger/v3/users";
        apiUrl += "/self";

        log.info("apiUrl="+apiUrl);
        _requestGet(apiUrl, p.accessToken, function (err, response, body) {
            var hasError = _checkError(err, response, body);
            if (hasError) {
                res.send(hasError);
                return;
            }
            log.debug(body);
            res.send(body);
        });
    });
});

router.get('/bot_bloglist', function (req, res) {
    "use strict";
    var userId;

    log.debug(req.url);

    userId = _getUserId(req);
    if (!userId) {
        return;
    }

    UserDb.findById(userId, function (err, user) {
        var p;
        var apiUrl;
        var sendData = {};

        if (err) {
            log.error(err);
            res.send(err);
            return;
        }
        if (!user) {
            log.error("Fail to get user id="+userId);
            log.error(err);
            res.send(err);
            return;
        }

        p = user.findProvider("google");
        if (!p) {
            log.error("Fail to find provider google");
            res.send("Fail to find provider google");
            return;
        }

        apiUrl = GOOGLE_API_URL + "/blogger/v3/users";
        apiUrl += "/self";
        apiUrl += "/blogs";
        log.info("apiUrl="+apiUrl);

        _requestGet(apiUrl, p.accessToken, function (err, response, body) {
            var items;
            var i;
            var hasError = _checkError(err, response, body);
            if (hasError) {
                res.send(hasError);
                return;
            }

            log.debug(body);
            res.send(body);

            sendData.provider = p;
            //log.debug(p);

            sendData.blogs = [];

            items = body.items;
            log.debug('items length=' + items.length);

            for (i = 0; i < items.length; i+=1) {
                sendData.blogs.push({"blog_id": items[i].id, "blog_title": items[i].name, "blog_url": items[i].url});
            }
            /*
             { "provider":object, "blogs":
             [ {"blog_id":12, "blog_title":"wzdfac", "blog_url":"wzdfac.iptime.net"},
             {"blog_id":12, "blog_title":"wzdfac", "blog_url":"wzdfac.iptime.net"} ] },
             */
            res.send(sendData);
        });
    });
});

router.get('/bot_post_count/:blog_id', function (req, res) {
    "use strict";
    var userId;
    var blogId;

    userId = _getUserId(req, res);
    if (!userId) {
        return;
    }

    blogId = req.params.blog_id;

    UserDb.findById(userId, function (err, user) {
        var p;
        var apiUrl;

        if (err) {
            log.error(err);
            res.send(err);
            return;
        }
        if (!user) {
            log.error("Fail to get user id="+userId);
            log.error(err);
            res.send(err);
            return;
        }

        p = user.findProvider("google");
        if (!p) {
            log.error("Fail to find provider google");
            res.send("Fail to find provider google");
            return;
        }

        apiUrl = GOOGLE_API_URL + "/blogger/v3";
        apiUrl += "/blogs";
        apiUrl += "/"+blogId;
        log.info("apiUrl="+apiUrl);

        _requestGet(apiUrl, p.accessToken, function (err, response, body) {
            var hasError;
            var sendData;

            hasError = _checkError(err, response, body);
            if (hasError) {
                res.send(hasError);
                return;
            }

            sendData = {};
            sendData.provider_name = 'google';
            sendData.blog_id = body.id;
            sendData.post_count = body.posts.totalItems;
            res.send(sendData);
        });
    });
});

module.exports = router;
