/**
 * Created by aleckim on 2014. 7. 5..
 */

var userdb = require('../models/userdb');

var express = require('express');
var passport = require('passport');
var TumblrStrategy = require('passport-tumblr').Strategy;

var router = express.Router();

var TUMBLR_CONSUMER_KEY = "bYI8NrFCwVUI5JLm2Zq0XfhKEczy85xr5jcYR8PpgjsEumIvog";
var TUMBLR_CONSUMER_SECRET = "OCFgDboa9bgNtr4lZvxDiMMgXigiNdJyTSkHNdd1lDdwDq8TBU";

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

passport.use(new TumblrStrategy({
        consumerKey: TUMBLR_CONSUMER_KEY,
        consumerSecret: TUMBLR_CONSUMER_SECRET,
        callbackURL: "http://www.justwapps.com/tumblr/authorized",
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

        var user = {};

        if (req.user) {
            user = userdb.addProvider(req.user.id, provider);
            console.log("add new provider");
            console.log("user:" + JSON.stringify(user));
        }
        else {
            user = userdb.findUserByProvider(provider);
            if (user == null) {
                user = userdb.addUser(provider);
            }
            console.log("user:" + JSON.stringify(user));

        }

        process.nextTick(function () {
            return done(null, user);
        });
    }
));

router.get('/authorize',
    passport.authenticate('tumblr')
);

router.get('/authorized',
    passport.authenticate('tumblr', { failureRedirect: '/#signin' }),
    function(req, res) {
        // Successful authentication, redirect home.
        console.log('Successful!');
        res.redirect('/#');
    }
);

module.exports = router;
