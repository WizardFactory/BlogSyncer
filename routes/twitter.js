/**
 * Created by aleckim on 2014. 7. 19..
 */

var UserDb = require('../models/userdb');

var express = require('express');
var passport = require('passport');
var TwitterStrategy = require('passport-twitter').Strategy;
var blogBot = require('./blogbot');

var router = express.Router();

var svcConfig = require('../models/svcConfig.json');
var clientConfig = svcConfig.twitter;

var log = require('winston');

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
                p = user.findProvider("twitter");
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

passport.use(new TwitterStrategy({
        consumerKey: clientConfig.clientID,
        consumerSecret: clientConfig.clientSecret,
        callbackURL: svcConfig.svcURL+"/twitter/authorized",
        passReqToCallback : true
    },
    function(req, token, tokenSecret, profile, done) {
//        log.debug("token:" + token); // 인증 이후 auth token을 출력할 것이다.
//        log.debug("token secret:" + tokenSecret); // 인증 이후 auto token secret을 출력할 것이다.
//        log.debug("profile:" + JSON.stringify(profile));
        var provider = {
            "providerName":profile.provider,
            "token":token,
            "tokenSecret":tokenSecret,
            "providerId":profile.username.toString(),
            "displayName":profile.username
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
    passport.authenticate('twitter')
);

router.get('/authorized',
    passport.authenticate('twitter', { failureRedirect: '/#signin' }),
    function(req, res) {
        // Successful authentication, redirect home.
        log.debug('Successful!');
        res.redirect('/#');
    }
);

module.exports = router;

