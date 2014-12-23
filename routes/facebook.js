/**
 * Created by aleckim on 2014. 7. 14..
 */

// load up the user model
var UserDb = require('../models/userdb');

var express = require('express');
var passport = require('passport');
var request = require('request');
var FacebookStrategy = require('passport-facebook').Strategy;
var blogBot = require('./blogbot');
var router = express.Router();

var svcConfig = require('../models/svcConfig.json');
var clientConfig = svcConfig.facebook;

var log = require('winston');

var FACEBOOK_API_URL = "https://graph.facebook.com";

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

function _updateOrCreateUser(req, provider, callback) {
    UserDb.findOne({'providers.providerName':provider.providerName
            , 'providers.providerId': provider.providerId},
        function (err, user) {
            var p;
            var isNewProvider = false;

            if (err) {
                return callback(err);
            }

            // if there is a user id already but no token (user was linked at one point and then removed)
            if (user) {
                log.debug("Found user of pName="+provider.providerName+",pId="+provider.providerId);
                p = user.findProvider("facebook");
                if (p.accessToken !== provider.accessToken) {
                    p.accessToken = provider.accessToken;
                    p.refreshToken = provider.refreshToken;
                    user.save (function(err) {
                        if (err)
                            return callback(err);

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
                    var newUser = new UserDb();
                    newUser.providers = [];

                    newUser.providers.push(provider);
                    newUser.save(function(err) {
                        if (err)
                            return callback(err);

                        return callback(null, newUser, isNewProvider);
                    });
                }
            }
        } );
}

passport.use(new FacebookStrategy({
        clientID: clientConfig.clientID,
        clientSecret: clientConfig.clientSecret,
        callbackURL: svcConfig.svcURL + "/facebook/authorized",
        passReqToCallback : true
    },
    function(req, accessToken, refreshToken, profile, done) {
//        log.debug("accessToken:" + accessToken);
//        log.debug("refreshToken:" + refreshToken);
//        log.debug("profile:" + JSON.stringify(profile));

        var provider = {
            "providerName": profile.provider,
            "accessToken": accessToken,
            "refreshToken": refreshToken,
            "providerId": profile.id.toString(),
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
                else {
                    blogBot.findOrCreate(user);
                }
            }

            process.nextTick(function () {
                return done(null, user);
            });
        });
    }
));

router.get('/authorize',
    passport.authenticate('facebook')
);

router.get('/authorized',
    passport.authenticate('facebook', { failureRedirect: '/#signin' }),
    function(req, res) {
        // Successful authentication, redirect home.
        log.debug('Successful!');
        res.redirect('/#');
    }
);

/**
 *
 * @param req
 * @returns {number}
 */
getUserId = function (req) {
    var userid = 0;

    if (req.user) {
        userid = req.user._id;
    }
    else if (req.query.userid)
    {
        //this request form child process;
        userid = req.query.userid;
    }

    return userid;
};

function _getUserID(req) {
    var userid = 0;

    if (req.user) {
        userid = req.user._id;
    }
    else if (req.query.userid)
    {
        //this request form child process;
        userid = req.query.userid;
    }

    return userid;
}

function _checkError(err, response, body) {
    if (err) {
        log.debug(err);
        return err;
    }
    if (response.statusCode >= 400) {
        var err = body.meta ? body.meta.msg : body.error;
        var errStr = 'API error: ' + response.statusCode + ' ' + err;
        log.debug(errStr);
        return new Error(errStr);
    }
}

function _requestGet(url, accessToken, callback) {
    request.get(url, {
        json: true,
        headers: {
            "authorization": "Bearer " + accessToken
        }
    }, function (err, response, body) {
        callback(err, response, body);
    });
}

router.get('/me', function (req, res) {
    var user_id = _getUserID(req);
    if (user_id == 0) {
        var errorMsg = 'You have to login first!';
        log.debug(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }

    User.findById(user_id, function (err, user) {
        var p;
        var api_url;

        p = user.findProvider("facebook");

        api_url = FACEBOOK_API_URL+"/me";
        log.debug(api_url);

        _requestGet(api_url, p.accessToken, function(err, response, body) {
            var hasError = _checkError(err, response, body);
            if (hasError !== undefined) {
                res.send(hasError);
                return;
            }
            log.debug(body);
            res.send(body);
        });
    });
});


router.get('/bot_bloglist', function (req, res) {

    log.debug("facebook: "+ req.url + ' : this is called by bot');

    var userId = _getUserID(req);

    if (userId == 0) {
        var errorMsg = 'You have to login first!';
        log.debug(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }

    if (req.query.providerid == false) {
        var errorMsg = 'User:'+userId+' didnot have blog!';
        log.debug(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }

    User.findById(userId, function (err, user) {
        var p;
        var apiUrl;

        p = user.findProvider("facebook", req.query.providerid);

        apiUrl = FACEBOOK_API_URL+"/"+p.providerId+"/accounts";
        log.debug(apiUrl);

        _requestGet(apiUrl, p.accessToken, function(err, response, body) {
            var hasError = _checkError(err, response, body);
            if (hasError !== undefined) {
                res.send(hasError);
                return;
            }

            //log.debug(body);

            var sendData = {};
            sendData.provider = p;
            sendData.blogs = [];

            for (var i = 0; i  < body.data.length; i+=1) {
                var item = body.data[i];

                var pageId = item.id;
                var pageName = item.name;
                var pageLink;

                apiUrl = FACEBOOK_API_URL+"/"+pageId;
                log.debug(apiUrl);

                _requestGet(apiUrl, p.accessToken, function(err, response, pageBody) {
                    var hasError = _checkError(err, response, pageBody);
                    if (hasError !== undefined) {
                        res.send(hasError);
                        return;
                    }
                    pageLink = pageBody.link;
                    log.debug(pageLink);
                });
                sendData.blogs.push({"blog_id":pageId, "blog_title":pageName, "blog_url":pageLink});
            }

            log.debug(sendData);
            res.send(sendData);
        });
    });
});

module.exports = router;
