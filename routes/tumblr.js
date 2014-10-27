/**
 * Created by aleckim on 2014. 7. 5..
 */

var User = require('../models/userdb');

var express = require('express');
var passport = require('passport');
var tumblr = require('tumblr.js');

var TumblrStrategy = require('passport-tumblr').Strategy;
var blogBot = require('./blogbot');

var router = express.Router();

var svcConfig = require('../models/svcConfig.json');
var clientConfig = svcConfig.tumblr;

var log = require('winston');

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

function _updateOrCreateUser(req, provider, callback) {
    User.findOne({'providers.providerName':provider.providerName
            , 'providers.providerId': provider.providerId},
        function (err, user) {
            var p;
            var isNewProvider = false;

            if (err) {
                return callback(err);
            }

            // if there is a user id already but no token (user was linked at one point and then removed)
            if (user) {
                log.debug("Found user of pName="+provider.providerName+",pId="+provider.providerId);
                p = user.findProvider("tumblr");
                if (p.accessToken !== provider.accessToken) {
                    p.accessToken = provider.accessToken;
                    p.refreshToken = provider.refreshToken;
                    user.save (function(err) {
                        if (err)
                            return callback(err);

                        return callback(null, user, isNewProvider);
                    });
                }
                else {
                    return callback(null, user, isNewProvider);
                }
            }
            else {
                isNewProvider = true;

                if (req.user) {
                    User.findById(req.user._id, function (err, user) {
                        if (err) {
                            log.error(err);
                            return callback(err);
                        }
                        if (!user) {
                            log.error("Fail to get user id="+req.user._id);
                            log.error(err);
                            return callback(err);
                        }
                        // if there is no provider, add to User
                        user.providers.push(provider);
                        user.save(function(err) {

                            if (err) {
                                return callback(err);
                            }

                            return callback(null, user, isNewProvider);
                        });
                    });
                }
                else {
                    // if there is no provider, create new user
                    var newUser = new User();
                    newUser.providers = [];

                    newUser.providers.push(provider);
                    newUser.save(function(err) {
                        if (err)
                            return callback(err);

                        return callback(null, newUser, isNewProvider);
                    });
                }
            }
        } );
}

passport.use(new TumblrStrategy({
        consumerKey: clientConfig.clientID,
        consumerSecret: clientConfig.clientSecret,
        callbackURL: svcConfig.svcURL+"/tumblr/authorized",
        passReqToCallback : true
    },
    function(req, token, tokenSecret, profile, done) {
//        log.debug("token:" + token); // 인증 이후 auth token을 출력할 것이다.
//        log.debug("token secret:" + tokenSecret); // 인증 이후 auto token secret을 출력할 것이다.
//        log.debug("profile:" + JSON.stringify(profile));
        var provider = {
            "providerName":profile.provider,
            "token":token,
            "tokenSecret":tokenSecret,
            "providerId":profile.username,
            "displayName":profile.username
        };

        _updateOrCreateUser(req, provider, function(err, user, isNewProvider) {
            if (err) {
                log.error("Fail to get user ");
                return done(err);
            }

            if (isNewProvider) {
                if (!blogBot.isStarted(user)) {
                    blogBot.start(user);
                }
                blogBot.findOrCreate(user);
            }

            process.nextTick(function () {
                return done(null, user);
            });
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
        log.debug('Successful!');
        res.redirect('/#');
    }
);

function _getUserId(req) {
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
}

router.get('/info', function (req, res) {
    var user_id = _getUserId(req);
    if (user_id == 0) {
        var errorMsg = 'You have to login first!';
        log.debug(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }

    User.findById(user_id, function (err, user) {
        var p;
        var client;

        p = user.findProvider("tumblr");

        client = tumblr.createClient({
            consumer_key: clientConfig.clientID,
            consumer_secret: clientConfig.clientSecret,
            token: p.token,
            token_secret: p.tokenSecret
        });

        client.userInfo(function(error, data) {
            if (error) {
                //throw new Error(error);
                res.send(error);
                return;
            }
            log.debug(data);
            res.send(data);
        });
    });
});

router.get('/posts/:blogName', function (req, res) {
    var user_id = _getUserId(req);
    if (user_id == 0) {
        var errorMsg = 'You have to login first!';
        log.debug(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }

    User.findById(user_id, function (err, user) {
        var p;
        var client;
        var blogName;

        p = user.findProvider("tumblr");

        client = tumblr.createClient({
            consumer_key: clientConfig.clientID,
            consumer_secret: clientConfig.clientSecret,
            token: p.token,
            token_secret: p.tokenSecret
        });

        blogName = req.params.blogName;

        client.posts(blogName, function (error, response) {
            if (error) {
                //throw new Error(error);
                res.send(error);
                return;
            }
            log.debug(response);
            res.send(response);
        });
    });
});

router.get('/bot_bloglist', function (req, res) {

    log.debug(req.url + ' : this is called by bot');

    var user_id = _getUserId(req);
    if (user_id == 0) {
        var errorMsg = 'You have to login first!';
        log.debug(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }

    User.findById(user_id, function (err, user) {
        var p;
        var client;

        p = user.findProvider("tumblr");

        client = tumblr.createClient({
            consumer_key: clientConfig.clientID,
            consumer_secret: clientConfig.clientSecret,
            token: p.token,
            token_secret: p.tokenSecret
        });

        client.userInfo(function (error, response) {
            var send_data;
            var blogs;
            var i;

            if (error) {
                //throw new Error(error);
                res.send(error);
                return;
            }
            //log.debug(response);

            send_data = {};
            send_data.provider = p;
            send_data.blogs = [];

            blogs = response.user.blogs;
            log.debug('blogs length=' + blogs.length);

            for (i = 0; i < blogs.length; i++) {
                send_data.blogs.push({"blog_id": blogs[i].name, "blog_title": blogs[i].title, "blog_url": blogs[i].url});
            }

            res.send(send_data);
        });
    });
});

router.get('/bot_post_count/:blog_id', function (req, res) {

    log.debug("tumblr: "+ req.url + ' : this is called by bot');

    var user_id = _getUserId(req);
    if (user_id == 0) {
        var errorMsg = 'You have to login first!';
        log.debug(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }

    User.findById(user_id, function (err, user) {
        var p;
        var client;
        var blog_id;

        p = user.findProvider("tumblr");

        blog_id = req.params.blog_id;

        client = tumblr.createClient({
            consumer_key: clientConfig.clientID,
            consumer_secret: clientConfig.clientSecret,
            token: p.token,
            token_secret: p.tokenSecret
        });

        client.blogInfo(blog_id, function(error, response) {
            if (error) {
                //throw new Error(error);
                res.send(error);
                return;
            }
            //log.debug(response);
            var send_data = {};
            send_data.provider_name = 'tumblr';
            send_data.blog_id = response.blog.name;
            send_data.post_count = response.blog.posts;

            res.send(send_data);
        });
    });
 });

push_posts_from_tumblr = function(posts, raw_posts, is_body, after) {
    var i;
    var raw_post;
    var post_date;
    var after_date;
    var send_post;
    var j;

    for (i = 0; i<raw_posts.length; i++) {
        raw_post = raw_posts[i];

        post_date = new Date(raw_post.date);
        after_date = new Date(after);
        if (post_date < after_date) {
            //log.debug('post(' + raw_post.id + ') is before');
            continue;
        }

        send_post = {};
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
        for (j=0; j<raw_post.tags.length; j++) {
            send_post.tags.push(raw_post.tags[j]);
        }
//            log.debug('tags-send');
//            log.debug(send_post.tags);

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
                log.debug('Fail to get type ' + raw_post.type);
                break;
        }
        send_post.replies = [];
        posts.push(send_post);
    }
};

router.get('/bot_posts/:blog_id', function (req, res) {
    var user_id;
    var errorMsg;

    log.debug("tumblr: "+ req.url + ' : this is called by bot');

    user_id = _getUserId(req);
    if (user_id == 0) {
        errorMsg = 'You have to login first!';
        log.debug(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }

    User.findById(user_id, function (err, user) {
        var p;
        var client;
        var options;

        var blog_id = req.params.blog_id;
        var offset = req.query.offset;
        var after = req.query.after;
        var start_index;

        p = user.findProvider("tumblr");

        client = tumblr.createClient({
            consumer_key: clientConfig.clientID,
            consumer_secret: clientConfig.clientSecret,
            token: p.token,
            token_secret: p.tokenSecret
        });

        if (offset != undefined) {
            start_index = offset.split("-")[0];
            log.debug('offset=' + start_index);
            options = {offset: start_index};
        }

        client.posts(blog_id, options, function (error, response) {
            var send_data = {};

            if (error) {
                //throw new Error(error);
                res.send(error);
                return;
            }
            //log.debug(response);

            send_data.provider_name = 'tumblr';
            send_data.blog_id = response.posts[0].blog_name;
            send_data.post_count = 0;
            send_data.posts = [];
            push_posts_from_tumblr(send_data.posts, response.posts, false, after);
            send_data.post_count = send_data.posts.length;

            res.send(send_data);
        });
    });
});

router.get('/bot_posts/:blog_id/:post_id', function (req, res) {
    var user_id;
    var errorMsg;

    log.debug("tumblr: "+ req.url + ' : this is called by bot');

    user_id = _getUserId(req);
    if (user_id == 0) {
        errorMsg = 'You have to login first!';
        log.debug(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }

    User.findById(user_id, function (err, user) {
        var p;
        var client;

        var blog_id = req.params.blog_id;
        var post_id = req.params.post_id;
        var options;

        p = user.findProvider("tumblr");

        client = tumblr.createClient({
            consumer_key: clientConfig.clientID,
            consumer_secret: clientConfig.clientSecret,
            token: p.token,
            token_secret: p.tokenSecret
        });

        options = {id: post_id};

        client.posts(blog_id, options, function (error, response) {
            var send_data = {};

            if (error) {
                //throw new Error(error);
                res.send(error);
                return;
            }
            //log.debug(response);

            send_data.provider_name = 'tumblr';
            send_data.blog_id = response.posts[0].blog_name;
            send_data.post_count = 0;
            send_data.posts = [];

            push_posts_from_tumblr(send_data.posts, response.posts, true, 0);
            send_data.post_count = send_data.posts.length;

            res.send(send_data);
        });
    });
});

router.post('/bot_posts/new/:blog_id', function (req, res) {
    var user_id;
    var errorMsg;

    log.debug("tumblr: "+ req.url + ' : this is called by bot');

    user_id = _getUserId(req);
    if (user_id == 0) {
        errorMsg = 'You have to login first!';
        log.debug(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }

    User.findById(user_id, function (err, user) {
        var p;
        var client;

        var blog_id = req.params.blog_id;
        var options = {};

        p = user.findProvider("tumblr");

        client = tumblr.createClient({
            consumer_key: clientConfig.clientID,
            consumer_secret: clientConfig.clientSecret,
            token: p.token,
            token_secret: p.tokenSecret
        });

        if (req.body.content) {
            options.body = req.body.content;
        }
        else {
            log.debug("Fail to get content");
            res.send("Fail to get content");
            return;
        }

        if (req.body.title) {
            options.title = req.body.title;
        }

        if (req.body.tags) {
            options.tags = req.body.tags;
        }

        client.text(blog_id, options, function (error, response) {
            var options;

            if (error) {
                //throw new Error(error);
                res.send(error);
                return;
            }
            log.debug(response);
            options = response;

            client.posts(blog_id, options, function (error, response) {
                var send_data;

                if (error) {
                    //throw new Error(error);
                    res.send(error);
                    return;
                }
                //log.debug(response);

                send_data = {};
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
});

//router.get('/bot_comments/:blogID/:postID', function (req, res) {
//    log.debug(req.url);
//    var userID = _getUserID(req);
//    if (userID == 0) {
//        var errorMsg = 'You have to login first!';
//        log.debug(errorMsg);
//        res.send(errorMsg);
//        res.redirect("/#/signin");
//        return;
//    }
//
//    var blog_id = req.params.blog_id;
//    var post_id = req.params.post_id;
//
//    var p = userdb.findProvider(userID, "tumblr");
//    var client = tumblr.createClient({
//        consumer_key: clientConfig.clientID,
//        consumer_secret: clientConfig.clientSecret,
//        token: p.token,
//        token_secret: p.tokenSecret
//    });
//});

 module.exports = router;
