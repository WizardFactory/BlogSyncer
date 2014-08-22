/**
 *
 * Created by aleckim on 2014. 5. 15..
 */

var userdb = require('../models/userdb');

var express = require('express');
var passport = require('passport');
var request = require('request');
var WordpressStrategy = require('passport-wordpress').Strategy;
var childm = require('./childmanager');

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
            "providerId":profile._json.token_site_id, //it is not user id
            "displayName":profile.displayName
        };

        var user = userdb.findOrCreate(req.user, provider);
        childm.sendMessage(user, 'findOrCreate');

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

getUserId = function (req) {
    var userid = 0;

    if (req.user) {
        userid = req.user.id;
    }
    else if (req.query.userid)
    {
       //this request form child process;
       userid = req.query.userid;
    }

    return userid;
};

router.get('/me', function (req, res) {
    var user_id = getUserId(req);
    if (user_id == 0) {
        var errorMsg = 'You have to login first!';
        console.log(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }

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
});

router.get('/posts/:blog_id', function (req, res) {
    var user_id = getUserId(req);
    if (user_id == 0) {
        var errorMsg = 'You have to login first!';
        console.log(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }

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
});

router.get('/bot_bloglist', function (req, res) {

    console.log("Wordpress: "+ req.url + ' : this is called by bot');

    var user_id = getUserId(req);
    if (user_id == 0) {
        var errorMsg = 'You have to login first!';
        console.log(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }

    var p = userdb.findProviderId(user_id, req.query.providerid);

    var api_url = API_WORDPRESS_COM+"/sites/"+p.providerId;

    console.log(api_url);

    request.get(api_url, {
        json: true,
        headers: {
            "authorization": "Bearer " + p.accessToken
        }
    }, function (err, response, data) {
        //console.log(data);
        var blog_id = data.ID;
        var blog_title = data.name;
        var blog_url = data.URL;
        var send_data = {};
        send_data.provider = p;
        send_data.blogs = [];
        send_data.blogs.push({"blog_id":blog_id, "blog_title":blog_title, "blog_url":blog_url});
        /*
         { "provider":object, "blogs":
         [ {"blog_id":12, "blog_title":"wzdfac", "blog_url":"wzdfac.iptime.net"},
         {"blog_id":12, "blog_title":"wzdfac", "blog_url":"wzdfac.iptime.net"} ] },
         */
        res.send(send_data);
    });
});

router.get('/synclists', function (req, res) {
    var user_id = getUserId(req);
    if (user_id == 0) {
        var errorMsg = 'You have to login first!';
        console.log(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }

    var p = userdb.findProvider(user_id, "Wordpress");
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
});

module.exports = router;

