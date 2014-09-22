/**
 * Created by aleckim on 2014. 7. 5..
 */

var userdb = require('../models/userdb');

var express = require('express');
var passport = require('passport');
var tumblr = require('tumblr.js');

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
//    var oauth = {
//        consumer_key: TUMBLR_CONSUMER_KEY,
//        consumer_secret: TUMBLR_CONSUMER_SECRET,
//        token: p.token,
//        token_secret: p.tokenSecret
//    };
//    var user = new tumblr.User(oauth);
//
//    user.info(function(error, response) {
//        if (error) {
//            throw new Error(error);
//        }
//        console.log(response.user);
//        res.send(response.user);
//    });

    var client = tumblr.createClient({
        consumer_key: TUMBLR_CONSUMER_KEY,
        consumer_secret: TUMBLR_CONSUMER_SECRET,
        token: p.token,
        token_secret: p.tokenSecret
    });

    client.userInfo(function(error, data) {
        if (error) {
            //throw new Error(error);
            res.send(error);
            return;
        }
        console.log(data);
        res.send(data);
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
    var client = tumblr.createClient({
        consumer_key: TUMBLR_CONSUMER_KEY,
        consumer_secret: TUMBLR_CONSUMER_SECRET,
        token: p.token,
        token_secret: p.tokenSecret
    });

    var blog_name = req.params.blogName;

    client.posts(blog_name, function(error, response) {
        if (error) {
            //throw new Error(error);
            res.send(error);
            return;
        }
        console.log(response);
        res.send(response);
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
    var client = tumblr.createClient({
        consumer_key: TUMBLR_CONSUMER_KEY,
        consumer_secret: TUMBLR_CONSUMER_SECRET,
        token: p.token,
        token_secret: p.tokenSecret
    });

    client.userInfo(function(error, response) {
        if (error) {
            //throw new Error(error);
            res.send(error);
            return;
        }
        //console.log(response);

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

    var client = tumblr.createClient({
        consumer_key: TUMBLR_CONSUMER_KEY,
        consumer_secret: TUMBLR_CONSUMER_SECRET,
        token: p.token,
        token_secret: p.tokenSecret
    });

    client.blogInfo(blog_id, function(error, response) {
        if (error) {
            //throw new Error(error);
            res.send(error);
            return;
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

push_posts_from_tumblr = function(posts, raw_posts, is_body, after) {

    for (var i = 0; i<raw_posts.length; i++) {
        var raw_post = raw_posts[i];

        var post_date = new Date(raw_post.date);
        var after_date = new Date(after);
        if (post_date < after_date) {
            //console.log('post(' + raw_post.id + ') is before');
            continue;
        }

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

        switch (raw_post.type) {
            case "text":
                send_post.title = raw_post.title;
                if (is_body)
                    send_post.content = raw_post.body;
                break;
            case "photo":
                send_post.title = raw_post.caption;
                if (is_body)
                    send_post.content = raw_post.photos; //it's no complete
                break;
                break;
            case "quote":
                if (raw_post.text) {
                    send_post.title = raw_post.text;
                }
                else if (raw_post.source_title) {
                    send_post.title = raw_post.source_title;
                }
                if (is_body)
                    send_post.content = raw_post.source;
                break;
            case "link":
                send_post.title = raw_post.title;
                if (is_body)
                    send_post.content = "url : raw_post.url"+" description : " + raw_post.description;
                break;
            case "chat":
                send_post.title = raw_post.title;
                if (is_body)
                    send_post.content = raw_post.body;
                break;
            case "audio":
                if (raw_post.caption) {
                    send_post.title = raw_post.caption;
                }
                else if (raw_post.source_title) {
                    send_post.title = raw_post.source_title;
                }
                if (is_body)
                    send_post.content = raw_post.player;
                break;
            case "video":
                if (raw_post.caption) {
                    send_post.title = raw_post.caption;
                }
                else if (raw_post.source_title) {
                    send_post.title = raw_post.source_title;
                }
                if (is_body)
                    send_post.content = raw_post.player[0].embed_code;
                break;
            case "answer":
                send_post.title = raw_post.question;
                if (is_body)
                    send_post.content = raw_post.answer;
                break;
            default:
                console.log('Fail to get type ' + raw_post.type);
                break;
        }
        send_post.replies = [];
        posts.push(send_post);
    }
};

router.get('/bot_posts/:blog_id', function (req, res) {
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
    var offset = req.query.offset;
    var after = req.query.after;
    var p = userdb.findProvider(user_id, "tumblr");

    var client = tumblr.createClient({
        consumer_key: TUMBLR_CONSUMER_KEY,
        consumer_secret: TUMBLR_CONSUMER_SECRET,
        token: p.token,
        token_secret: p.tokenSecret
    });

    var options;
    if (offset != undefined) {
        var start_index = offset.split("-")[0];
        console.log('offset=' + start_index);
        options = {offset: start_index};
    }

    client.posts(blog_id, options, function(error, response) {
        if (error) {
            //throw new Error(error);
            res.send(error);
            return;
        }
        //console.log(response);

        var send_data = {};
        send_data.provider_name = 'tumblr';
        send_data.blog_id = response.posts[0].blog_name;
        send_data.post_count = 0;
        send_data.posts = [];
        push_posts_from_tumblr(send_data.posts, response.posts, false, after);
        send_data.post_count = send_data.posts.length;

        res.send(send_data);
    });
});

router.get('/bot_posts/:blog_id/:post_id', function (req, res) {
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
    var post_id = req.params.post_id;

    var p = userdb.findProvider(user_id, "tumblr");
    var client = tumblr.createClient({
        consumer_key: TUMBLR_CONSUMER_KEY,
        consumer_secret: TUMBLR_CONSUMER_SECRET,
        token: p.token,
        token_secret: p.tokenSecret
    });

    var options = {id: post_id};

    client.posts(blog_id, options, function(error, response) {
        if (error) {
            //throw new Error(error);
            res.send(error);
            return;
        }
        //console.log(response);

        var send_data = {};
        send_data.provider_name = 'tumblr';
        send_data.blog_id = response.posts[0].blog_name;
        send_data.post_count = 0;
        send_data.posts = [];

        push_posts_from_tumblr(send_data.posts, response.posts, true, 0);
        send_data.post_count = send_data.posts.length;

        res.send(send_data);
    });
});

router.post('/bot_posts/new/:blog_id', function (req, res) {
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

    var client = tumblr.createClient({
        consumer_key: TUMBLR_CONSUMER_KEY,
        consumer_secret: TUMBLR_CONSUMER_SECRET,
        token: p.token,
        token_secret: p.tokenSecret
    });

    var options = {};

    if (req.body.content) {
        options.body =  req.body.content;
    }
    else {
       console.log("Fail to get content");
       res.send("Fail to get content");
       return;
    }

    if (req.body.title) {
        options.title = req.body.title;
    }

    if (req.body.tags) {
        options.tags=req.body.tags;
    }

    client.text(blog_id, options, function(error, response) {
        if (error) {
            //throw new Error(error);
            res.send(error);
            return;
        }
        console.log(response);
        var options = response;

        client.posts(blog_id, options, function(error, response) {
            if (error) {
                //throw new Error(error);
                res.send(error);
                return;
            }
            //console.log(response);

            var send_data = {};
            send_data.provider_name = 'tumblr';
            send_data.blog_id = response.posts[0].blog_name;
            send_data.post_count = 0;
            send_data.posts = [];

            push_posts_from_tumblr(send_data.posts, response.posts, false, 0);
            send_data.post_count = send_data.posts.length;

            res.send(send_data);
        });
    });
});

module.exports = router;
