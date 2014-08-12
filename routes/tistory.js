/**
 * Created by aleckim on 2014. 7. 20..
 */

var userdb = require('../models/userdb');

var request = require('request');

var express = require('express');
var passport = require('passport');
var TistoryStrategy = require('passport-tistory').Strategy;

var router = express.Router();

var TISTORY_CLIENT_ID = "790c21e5390770f3463d9b428fab8622";
var TISTORY_CLIENT_SECRET = "790c21e5390770f3463d9b428fab86225dff8f624e5d52c94ce86e2eb85a106696450c6e";
var API_TISTORY_COM = "https://www.tistory.com/apis/";

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
        console.log("accessToken:" + accessToken);
        console.log("refreshToken:" + refreshToken);
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

router.get('/info', function (req, res) {
    if (!req.user) {
        var errorMsg = 'You have to login first!';
        console.log(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
    }
    else {
        var p = userdb.findProvider(req.user.id, "tistory");

        var api_url = API_TISTORY_COM+"blog/info?access_token="+ p.accessToken+"&output=json";

        console.log(api_url);
        request.get(api_url, function (err, response, data) {
            console.log(data);
            res.send(data);
        });
    }
});

router.get('/post/list/:simpleName', function (req, res) {
    if (!req.user) {
        var errorMsg = 'You have to login first!';
        console.log(errorMsg);
        res.redirect("/#/signin");
    }
    else {
        var p = userdb.findProvider(req.user.id, "tistory");
        var blog_name = req.params.simpleName;
        var api_url = API_TISTORY_COM+"post/list?access_token="+ p.accessToken;
        api_url = api_url + "&targetUrl=" + blog_name;
        api_url = api_url + "&output=json";

        console.log(api_url);
        request.get(api_url, function (err, response, data) {
            console.log(data);
            res.send(data);
        });
    }
});

module.exports = router;
