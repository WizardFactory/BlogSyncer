/**
 * Created by aleckim on 2014. 7. 20..
 */

var userdb = require('../models/userdb');

var express = require('express');
var passport = require('passport');
var TistoryStrategy = require('passport-tistory').Strategy;

var router = express.Router();

var TISTORY_CLIENT_ID = "790c21e5390770f3463d9b428fab8622";
var TISTORY_CLIENT_SECRET = "790c21e5390770f3463d9b428fab86225dff8f624e5d52c94ce86e2eb85a106696450c6e";

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

passport.use(new TistoryStrategy({
        clientID: TISTORY_CLIENT_ID,
        clientSecret: TISTORY_CLIENT_SECRET,
        callbackURL: "http://www.justwapps.com/tistory/authorized",
        passReqToCallback : true
    },
    function(req, accessToken, refreshToken, profile, done) {
//        console.log("accessToken:" + accessToken);
//        console.log("refreshToken:" + refreshToken);
        console.log("profile:" + JSON.stringify(profile));

        var provider = {
            "providerName": 'tistory',
            "accessToken": accessToken,
            "refreshToken": refreshToken,
            "providerId": profile.userId,
            "displayName": profile.item.nickname
        };

        var user = userdb.findOrCreate(req.user, provider);

        process.nextTick(function () {
            return done(null, user);
        });
    }
));

router.get('/authorize',
    passport.authenticate('tistory')
);

router.get('/authorized',
    passport.authenticate('tistory', { failureRedirect: '/#signin' }),
    function(req, res) {
        // Successful authentication, redirect home.
        console.log('Successful!');
        res.redirect('/#');
    }
);

module.exports = router;
