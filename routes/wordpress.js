/**
 *
 * Created by aleckim on 2014. 5. 15..
 */

var userdb = require('../models/userdb');

var express = require('express');
var passport = require('passport');
var WordpressStrategy = require('passport-wordpress').Strategy;

var router = express.Router();

var WORDPRESS_CLIENT_ID = "35169";
var WORDPRESS_CLIENT_SECRET = "giyzfEzoqkuwmjxuWT5Tz7E16NtKkud0zT4otmX9xNDH4AJE6mc3U5dGepYrPd5A";

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

passport.use(new WordpressStrategy({
        clientID: WORDPRESS_CLIENT_ID,
        clientSecret: WORDPRESS_CLIENT_SECRET,
        callbackURL: "http://www.justwapps.com/wordpress/authorized",
        passReqToCallback : true
    },
    function(req, accessToken, refreshToken, profile, done) {
//        console.log("accessToken:" + accessToken);
//        console.log("refreshToken:" + refreshToken);
//        console.log("profile:"+JSON.stringify(profile));
        var provider = {
            "providerName":profile.provider,
            "accessToken":accessToken,
            "refreshToken":refreshToken,
            "providerId":profile._json.ID,
            "displayName":profile.displayName
        };

        var user = userdb.findOrCreate(req.user, provider);

        process.nextTick(function () {
            return done(null, user);
        });
    }
));

router.get('/authorize',
    passport.authenticate('wordpress')
);

router.get('/authorized',
    passport.authenticate('wordpress', { failureRedirect: '/#signin' }),
    function(req, res) {
        // Successful authentication, redirect home.
        console.log('Successful!');
        res.redirect('/#');
    }
);

module.exports = router;

