/**
 *
 * Created by aleckim on 2014. 5. 15..
 */

var userdb = require('../models/userdb');

var express = require('express');
var passport = require('passport');
var request = require('request');
var WordpressStrategy = require('passport-wordpress').Strategy;

var router = express.Router();

var WORDPRESS_CLIENT_ID = "35169";
var WORDPRESS_CLIENT_SECRET = "giyzfEzoqkuwmjxuWT5Tz7E16NtKkud0zT4otmX9xNDH4AJE6mc3U5dGepYrPd5A";
var API_WORDPRESS_COM = "https://public-api.wordpress.com/rest/v1";

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
        console.log("profile:"+JSON.stringify(profile));
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

router.get('/me', function (req, res) {
    if (!req.user) {
       console.log('You have to login first!');
       res.send('You have to login first!');
    }
    else {
        var p = userdb.findProvider(req.user.id, "Wordpress");
        var api_url = API_WORDPRESS_COM+"/me";
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

router.get('/posts/:blog_id', function (req, res) {
    if (!req.user) {
       console.log('You have to login first!');
       res.send('You have to login first!');
    }
    else {
        var p = userdb.findProvider(req.user.id, "Wordpress");
        var blog_id = req.params.blog_id;

        var api_url = API_WORDPRESS_COM+"/sites/"+blog_id+"/posts";

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

router.get('/synclists', function (req, res) {
    if (!req.user) {
       console.log('You have to login first!');
       res.send('You have to login first!');
    }
    else {
        var p = userdb.findProvider(req.user.id, "Wordpress");
        var blog_id = 64797719;
        var api_url = API_WORDPRESS_COM+"/sites/"+blog_id+"/posts";

        //console.log(api_url);

        request.get(api_url, {
           json: true,
           headers: {
               "authorization": "Bearer " + p.accessToken
           }
        }, function (err, response, data) {
            //console.log(data);

            var posts = [];
            for (var i = 0; i<data.posts.length; i++)
            {
                var post = {
                   ID:data.posts[i].ID,
                   title:data.posts[i].title,
                   modified:data.posts[i].modified,
                   URL:data.posts[i].URL
                };
                posts.push(post);
            }
            console.log(posts);
            res.send(posts);
        });
    }
});

module.exports = router;

