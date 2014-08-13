/**
 * Created by aleckim on 2014. 7. 19..
 */

var userdb = require('../models/userdb');

var express = require('express');
var passport = require('passport');
var request = require('request');
var KakaoStrategy = require('passport-kakao').Strategy;

var router = express.Router();

var KAKAO_CLIENT_ID = "d76e3616d42d5a2507183f717aff6579";
var API_KAKAO_COM = "https://kapi.kakao.com";

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

passport.use(new KakaoStrategy({
        clientID: KAKAO_CLIENT_ID,
        callbackURL: "http://www.justwapps.com/kakao/authorized",
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
            "displayName": profile.username
        };

        var user = userdb.findOrCreate(req.user, provider);

        process.nextTick(function () {
            return done(null, user);
        });
    }
));

router.get('/authorize',
    passport.authenticate('kakao')
);

router.get('/authorized',
    passport.authenticate('kakao', { failureRedirect: '/#signin' }),
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
        var p = userdb.findProvider(req.user.id, "kakao");

        var api_url = API_KAKAO_COM+"/v1/user/me";

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

router.get('/mystories', function (req, res) {
    if (!req.user) {
        var errorMsg = 'You have to login first!';
        console.log(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
    }
    else {
        var p = userdb.findProvider(req.user.id, "kakao");

        var api_url = API_KAKAO_COM+"/v1/api/story/mystories";

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
