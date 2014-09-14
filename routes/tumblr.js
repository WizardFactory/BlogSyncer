/**
 * Created by aleckim on 2014. 7. 5..
 */

var userdb = require('../models/userdb');

var express = require('express');
var passport = require('passport');
var tumblr = require('tumblr');

var TumblrStrategy = require('passport-tumblr').Strategy;
var childm = require('./childmanager');

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

        var user = userdb.findOrCreate(req.user, provider);
        childm.sendMessage(user, 'findOrCreate');

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

router.get('/info', function (req, res) {
    var user_id = getUserId(req);
    if (user_id == 0) {
        var errorMsg = 'You have to login first!';
        console.log(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }

    var p = userdb.findProvider(user_id, "tumblr");
    var oauth = {
        consumer_key: TUMBLR_CONSUMER_KEY,
        consumer_secret: TUMBLR_CONSUMER_SECRET,
        token: p.token,
        token_secret: p.tokenSecret
    };

    var user = new tumblr.User(oauth);

    user.info(function(error, response) {
        if (error) {
            throw new Error(error);
        }
        console.log(response.user);
        res.send(response.user);
    });

    return;
});

router.get('/posts/:blogName', function (req, res) {
    var user_id = getUserId(req);
    if (user_id == 0) {
        var errorMsg = 'You have to login first!';
        console.log(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }

    var p = userdb.findProvider(user_id, "tumblr");
    var oauth = {
        consumer_key: TUMBLR_CONSUMER_KEY,
        consumer_secret: TUMBLR_CONSUMER_SECRET,
        token: p.token,
        token_secret: p.tokenSecret
    };

    var blog_name = req.params.blogName;

    var blog = new tumblr.Blog(blog_name, oauth);

    blog.text(function(error, response) {
        if (error) {
            throw new Error(error);
        }
        console.log(response.posts);
        res.send(response.posts);
    });
});

router.get('/bot_bloglist', function (req, res) {

    console.log(req.url + ' : this is called by bot');

    var user_id = getUserId(req);
    if (user_id == 0) {
        var errorMsg = 'You have to login first!';
        console.log(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }

    var p = userdb.findProvider(user_id, "tumblr");
    var oauth = {
        consumer_key: TUMBLR_CONSUMER_KEY,
        consumer_secret: TUMBLR_CONSUMER_SECRET,
        token: p.token,
        token_secret: p.tokenSecret
    };

    var user = new tumblr.User(oauth);

    user.info(function(error, response) {
        if (error) {
            throw new Error(error);
        }
        console.log(response.user);

        var send_data = {};
        send_data.provider = p;
        send_data.blogs = [];

        var blogs = response.user.blogs;
        console.log('blogs length=' + blogs.length);

        for (var i=0;i<blogs.length;i++) {
            send_data.blogs.push({"blog_id":blogs[i].name, "blog_title":blogs[i].title, "blog_url":blogs[i].url});
        }

        res.send(send_data);
    });
});

router.get('/bot_posts/:blog_id/:offset', function (req, res) {
    console.log("tumblr: "+ req.url + ' : this is called by bot');

    var user_id = getUserId(req);
    if (user_id == 0) {
        var errorMsg = 'You have to login first!';
        console.log(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }

    var blog_id = req.params.blog_id;
    var offset = req.params.offset;
    var p = userdb.findProvider(user_id, "tumblr");
    var oauth = {
        consumer_key: TUMBLR_CONSUMER_KEY,
        consumer_secret: TUMBLR_CONSUMER_SECRET,
        token: p.token,
        token_secret: p.tokenSecret
    };

    var blog_url = blog_id + '.tumblr.com';
    var blog = new tumblr.Blog(blog_url, oauth);
    var start_index = offset.split("-")[0];
    console.log('offset=' + start_index);
    blog.posts({offset: start_index}, function(error, response) {
        if (error) {
            throw new Error(error);
        }
        //console.log(response);

        var send_data = {};
        send_data.provider_name = 'tumblr';
        send_data.blog_id = response.posts[0].blog_name;
        send_data.post_count = response.posts.length;
        send_data.posts = [];

        for (var i = 0; i<response.posts.length; i++) {
            var raw_post = response.posts[i];
            var send_post = {};
            send_post.title = raw_post.title;
            send_post.modified = raw_post.date;
            send_post.id = raw_post.id;
            send_post.url = raw_post.post_url;
            //tumblr does not support categories
//            send_post.categories = [];
//            for (var j=0;j<raw_post.categories.length;j++) {
//                send_post.categories.push(raw_post.categories[j]);
//            }
            send_post.tags = [];
            for (var j=0;j<raw_post.tags.length;j++) {
                send_post.tags.push(raw_post.tags[j]);
            }
//            console.log('tags-send');
//            console.log(send_post.tags);

            send_data.posts.push(send_post);
        }
        res.send(send_data);
    });
});

router.get('/bot_post_count/:blog_id', function (req, res) {

    console.log("tumblr: "+ req.url + ' : this is called by bot');

    var user_id = getUserId(req);
    if (user_id == 0) {
        var errorMsg = 'You have to login first!';
        console.log(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }

    var blog_id = req.params.blog_id;
    var p = userdb.findProvider(user_id, "tumblr");
    var oauth = {
        consumer_key: TUMBLR_CONSUMER_KEY,
        consumer_secret: TUMBLR_CONSUMER_SECRET,
        token: p.token,
        token_secret: p.tokenSecret
    };

    var blog_url = blog_id + '.tumblr.com';
    var blog = new tumblr.Blog(blog_url, oauth);

    blog.info(function(error, response) {
        if (error) {
            throw new Error(error);
        }
        //console.log(response);
        var send_data = {};
        send_data.provider_name = 'tumblr';
        send_data.blog_id = response.blog.name;
        send_data.post_count = response.blog.posts;

        res.send(send_data);
    });

    return;
 });

module.exports = router;
