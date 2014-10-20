/**
 * Created by aleckim on 2014. 7. 14..
 */

// load up the user model
var User       = require('../models/userdb');

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
            "providerId": profile.id,
            "displayName": profile.displayName
        };

        if (req.user) {
            User.findOne({'providers.providerName':provider.providerName
                    , 'providers.providerId': provider.providerId},
                function (err, user) {

                    if (err) {
                        return done(err);
                    }

                    // if there is a user id already but no token (user was linked at one point and then removed)
                    if (user) {
                        return done(null, user);
                    }
                    else {
                        User.findById(req.user._id, function (err, user) {
                            if (err) {
                                log.error(err);
                                return done(err);
                            }
                            if (!user) {
                                log.error("Fail to get user id="+req.user._id);
                                log.error(err);
                                return done(err);
                            }
                            // if there is no provider, add to User
                            user.providers.push(provider);
                            user.save(function(err) {

                                if (err) {
                                    return done(err);
                                }

                                blogBot.findOrCreate(user);
                                return done(null, user);
                            });
                        });
                    }

                } );
        }
        else {
            User.findOne({'providers.providerName':provider.providerName,
                    'providers.providerId': provider.providerId},
                function (err, user) {

                    if (err) {
                        return done(err);
                    }

                    if (user) {
                        log.debug("Found user of pName="+provider.providerName+",pId="+provider.providerId);
                        blogBot.start(user);
                        blogBot.findOrCreate(user);
                        return done(null, user);
                    }
                    else {
                        // if there is no provider, create new user
                        var newUser = new User();
                        newUser.providers = [];

                        newUser.providers.push(provider);
                        newUser.save(function(err) {
                            if (err)
                                return done(err);

                            blogBot.start(newUser);
                            blogBot.findOrCreate(newUser);
                            return done(null, newUser);
                        });
                    }
                } );
        }
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

router.get('/me', function (req, res) {
    if (!req.user) {
        var errorMsg = 'You have to login first!';
        log.debug(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
    }
    else {
        var p = userdb.findProvider(req.user._id, "facebook");

        var api_url = FACEBOOK_API_URL+"/me";

        log.debug(api_url);

        request.get(api_url, {
                json: true,
                headers: {
                    "authorization": "Bearer " + p.accessToken
                }
            }, function (err, response, data) {
                log.debug(data);
                res.send(data);
        });
    }
});

module.exports = router;
