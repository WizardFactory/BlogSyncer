/**
 * Created by aleckim on 2014. 7. 14..
 */

var userdb = require('../models/userdb');

var express = require('express');
var passport = require('passport');
var request = require('request');
var FacebookStrategy = require('passport-facebook').Strategy;
var childm = require('./childmanager');

var router = express.Router();

var FACEBOOK_CLIENT_ID = "1447794722165916";
var FACEBOOK_CLIENT_SECRET = "adf699b010b780c8808b3ebeb755e5ab";
var API_FACEBOOK_COM = "https://graph.facebook.com";

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

        var user = userdb.findOrCreate(req.user, provider);
        childm.sendMessage(user, 'findOrCreate');

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

router.get('/me', function (req, res) {
    if (!req.user) {
        var errorMsg = 'You have to login first!';
        console.log(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
    }
    else {
        var p = userdb.findProvider(req.user.id, "facebook");

        var api_url = API_FACEBOOK_COM+"/me";

        console.log(api_url);

        request.get(api_url, {
                json: true,
                headers: {
                    "authorization": "Bearer " + p.accessToken
                }
            }, function (err, response, data) {
                console.log(data);
                res.send(data);
        });
    }
});

module.exports = router;
