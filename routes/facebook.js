/**
 * Created by aleckim on 2014. 7. 14..
 */

var userdb = require('../models/userdb');

var express = require('express');
var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;

var router = express.Router();

var FACEBOOK_CLIENT_ID = "1447794722165916";
var FACEBOOK_CLIENT_SECRET = "adf699b010b780c8808b3ebeb755e5ab";

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

passport.use(new FacebookStrategy({
        clientID: FACEBOOK_CLIENT_ID,
        clientSecret: FACEBOOK_CLIENT_SECRET,
        callbackURL: "http://www.justwapps.com/facebook/authorized",
        passReqToCallback : true
    },
    function(req, accessToken, refreshToken, profile, done) {
//        console.log("accessToken:" + accessToken);
//        console.log("refreshToken:" + refreshToken);
//        console.log("profile:" + JSON.stringify(profile));

        var provider = {
            "providerName": profile.provider,
            "accessToken": accessToken,
            "refreshToken": refreshToken,
            "providerId": profile.id,
            "displayName": profile.displayName
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
    passport.authenticate('facebook')
);

router.get('/authorized',
    passport.authenticate('facebook', { failureRedirect: '/#signin' }),
    function(req, res) {
        // Successful authentication, redirect home.
        console.log('Successful!');
        res.redirect('/#');
    }
);

module.exports = router;