/**
 * Created by aleckim on 2014. 7. 19..
 */

var userdb = require('../models/userdb');

var express = require('express');
var passport = require('passport');
var TwitterStrategy = require('passport-twitter').Strategy;
var childm = require('./childmanager');

var router = express.Router();

var svcConfig = require('../models/svcConfig.json');
var clientConfig = svcConfig.twitter;

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

passport.use(new TwitterStrategy({
        consumerKey: clientConfig.clientID,
        consumerSecret: clientConfig.clientSecret,
        callbackURL: svcConfig.svcURL+"/twitter/authorized",
        passReqToCallback : true
    },
    function(req, token, tokenSecret, profile, done) {
//        console.log("token:" + token); // 인증 이후 auth token을 출력할 것이다.
//        console.log("token secret:" + tokenSecret); // 인증 이후 auto token secret을 출력할 것이다.
//        console.log("profile:" + JSON.stringify(profile));
        var provider = {
            "providerName":profile.provider,
            "token":token,
            "tokenSecret":tokenSecret,
            "providerId":profile.username,
            "displayName":profile.username
        };

        var user = userdb.findOrCreate(req.user, provider);
        childm.sendMessage(user, 'findOrCreate');

        process.nextTick(function () {
            return done(null, user);
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
        console.log('Successful!');
        res.redirect('/#');
    }
);

module.exports = router;

