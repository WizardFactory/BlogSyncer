/**
 * Created by aleckim on 2014. 7. 5..
 */

"use strict";

var router = require('express').Router();
var passport = require('passport');

var blogBot = require('./../controllers/blogbot');
var userMgr = require('./../controllers/userManager');
var svcConfig = require('../models/svcConfig.json');

var clientConfig = svcConfig.tumblr;
var TumblrStrategy = require('passport-tumblr').Strategy;
var tumblr = require('tumblr.js');
var TUMBLR_PROVIDER = "tumblr";

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

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

        var provider= {
            "providerName":profile.provider,
            "token":token,
            "tokenSecret":tokenSecret,
            "providerId":profile.username.toString(),
            "displayName":profile.username
        };

        userMgr._updateOrCreateUser(req, provider, function(err, user, isNewProvider, delUser) {
            if (err) {
                log.error("Fail to get user");
                return done(err);
            }

            if (delUser) {
                blogBot.combineUser(user, delUser);
                userMgr._combineUser(user, delUser, function(err) {
                    if (err) {
                        return done(err);
                    }
                });
            }

            if (isNewProvider) {
                if (!blogBot.isStarted(user)) {
                    blogBot.start(user);
                }
                else {
                    blogBot.findOrCreate(user);
                }
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

router.get('/info', function (req, res) {
    var userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":TUMBLR_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    userMgr._findProviderByUserId(userId, TUMBLR_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            return res.status(500).send(err);
        }

        var client = tumblr.createClient({
            consumer_key: clientConfig.clientID,
            consumer_secret: clientConfig.clientSecret,
            token: provider.token,
            token_secret: provider.tokenSecret
        });

        client.userInfo(function(error, response, body) {
            if (error) {
                log.error(error, meta);
                return res.status(404).send(error);
            }

            log.debug(body, meta);
            return res.send(body);
        });
    });
});

router.get('/posts/:blogName', function (req, res) {
    var userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":TUMBLR_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var blogName = req.params.blogName;

    userMgr._findProviderByUserId(userId, TUMBLR_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            return res.status(500).send(err);
        }

        var client = tumblr.createClient({
            consumer_key: clientConfig.clientID,
            consumer_secret: clientConfig.clientSecret,
            token: provider.token,
            token_secret: provider.tokenSecret
        });

        client.posts(blogName, function (error, response) {
            if (error) {
                log.error(error, meta);
                return res.status(400).send(error);
            }
            log.debug(response, meta);
            res.send(response);
        });
    });
});

router.get('/bot_bloglist', function (req, res) {
    var userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":TUMBLR_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var providerId = req.query.providerid;

    userMgr._findProviderByUserId(userId, TUMBLR_PROVIDER, providerId, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            return res.status(500).send(err);
        }

        var client = tumblr.createClient({
            consumer_key: clientConfig.clientID,
            consumer_secret: clientConfig.clientSecret,
            token: provider.token,
            token_secret: provider.tokenSecret
        });

        client.userInfo(function (error, response) {
            if (error) {
                log.error(error, meta);
                return res.status(400).send(error);
            }
            //log.debug(response, meta);

            var send_data = {};
            send_data.provider = provider;
            send_data.blogs = [];

            try {
                var blogs = response.user.blogs;
                log.debug('blogs length=' + blogs.length, meta);

                for (var i = 0; i < blogs.length; i+=1) {
                    send_data.blogs.push({"blog_id": blogs[i].name, "blog_title": blogs[i].title,
                                            "blog_url": blogs[i].url});
                }
            }
            catch(e) {
                log.error(e, meta);
                log.error(response, meta);
                return res.status(500).send(e);
            }

            res.send(send_data);
        });
    });
});

router.get('/bot_post_count/:blog_id', function (req, res) {
    var userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":TUMBLR_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var blog_id = req.params.blog_id;

    userMgr._findProviderByUserId(userId, TUMBLR_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            return res.status(500).send(err);
        }

        var client = tumblr.createClient({
            consumer_key: clientConfig.clientID,
            consumer_secret: clientConfig.clientSecret,
            token: provider.token,
            token_secret: provider.tokenSecret
        });

        client.blogInfo(blog_id, function(error, response) {
            if (error) {
                log.error(error, meta);
                res.status(400).send(error);
                return;
            }
            var send_data = {};
            send_data.provider_name = TUMBLR_PROVIDER;
            try {
                send_data.blog_id = response.blog.name;
                send_data.post_count = response.blog.posts;
            }
            catch(e) {
                log.error(e, meta);
                log.error(response, meta);
                return res.status(500).send(e);
            }

            res.send(send_data);
        });
    });
 });

/**
 *
 * @param posts
 * @param raw_posts
 * @param is_body
 * @param after
 * @private
 */
function _pushPostsFromTumblr(posts, raw_posts, is_body, after) {

    for (var i = 0; i<raw_posts.length; i+=1) {
        var raw_post = raw_posts[i];

        var post_date = new Date(raw_post.date);
        var after_date = new Date(after);
        if (post_date < after_date) {
            //log.debug('post(' + raw_post.id + ') is before');
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
        for (var j=0; j<raw_post.tags.length; j+=1) {
            send_post.tags.push(raw_post.tags[j]);
        }
//            log.debug('tags-send');
//            log.debug(send_post.tags);

        switch (raw_post.type) {
            case "text":
                send_post.title = raw_post.title;
                if (is_body) {
                    send_post.content = raw_post.body;
                }
                break;
            case "photo":
                send_post.title = raw_post.caption;
                if (is_body) {
                    send_post.content = raw_post.photos; //it's no complete
                }
                break;
            case "quote":
                if (raw_post.text) {
                    send_post.title = raw_post.text;
                }
                else if (raw_post.source_title) {
                    send_post.title = raw_post.source_title;
                }
                if (is_body) {
                    send_post.content = raw_post.source;
                }
                break;
            case "link":
                send_post.title = raw_post.title;
                if (is_body) {
                    send_post.content = "url : "+raw_post.url+" description : " + raw_post.description;
                }
                break;
            case "chat":
                send_post.title = raw_post.title;
                if (is_body) {
                    send_post.content = raw_post.body;
                }
                break;
            case "audio":
                if (raw_post.caption) {
                    send_post.title = raw_post.caption;
                }
                else if (raw_post.source_title) {
                    send_post.title = raw_post.source_title;
                }
                if (is_body) {
                    send_post.content = raw_post.player;
                }
                break;
            case "video":
                if (raw_post.caption) {
                    send_post.title = raw_post.caption;
                }
                else if (raw_post.source_title) {
                    send_post.title = raw_post.source_title;
                }
                if (is_body) {
                    send_post.content = raw_post.player[0].embed_code;
                }
                break;
            case "answer":
                send_post.title = raw_post.question;
                if (is_body) {
                    send_post.content = raw_post.answer;
                }
                break;
            default:
                log.debug('Fail to get type ' + raw_post.type);
                break;
        }
        send_post.replies = [];
        posts.push(send_post);
    }
}

router.get('/bot_posts/:blog_id', function (req, res) {
    var userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":TUMBLR_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var blog_id = req.params.blog_id;
    var offset = req.query.offset;
    var after = req.query.after;

    userMgr._findProviderByUserId(userId, TUMBLR_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            return res.status(400).send(err);
        }

        var client = tumblr.createClient({
            consumer_key: clientConfig.clientID,
            consumer_secret: clientConfig.clientSecret,
            token: provider.token,
            token_secret: provider.tokenSecret
        });

        var options;
        if (offset) {
            var start_index = offset.split("-")[0];
            log.debug('offset=' + start_index, meta);
            options = {offset: start_index};
        }

        client.posts(blog_id, options, function (error, response) {
            if (error) {
                log.error(error, meta);
                res.status(400).send(error);
                return;
            }

            var send_data = {};
            send_data.provider_name = TUMBLR_PROVIDER;
            send_data.post_count = 0;
            send_data.posts = [];
            try{
                send_data.blog_id = response.blog.name;
                _pushPostsFromTumblr(send_data.posts, response.posts, false, after);
            }
            catch(e) {
                log.error(e, meta);
                log.error(response, meta);
                return res.status(400).send(e);
            }

            send_data.post_count = send_data.posts.length;
            res.send(send_data);
        });
    });
});

router.get('/bot_posts/:blog_id/:post_id', function (req, res) {
    var userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":TUMBLR_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var blog_id = req.params.blog_id;
    var post_id = req.params.post_id;

    userMgr._findProviderByUserId(userId, TUMBLR_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            return res.status(500).send(err);
        }

        var client = tumblr.createClient({
            consumer_key: clientConfig.clientID,
            consumer_secret: clientConfig.clientSecret,
            token: provider.token,
            token_secret: provider.tokenSecret
        });

        var options = {id: post_id};

        client.posts(blog_id, options, function (error, response) {
            var send_data = {};

            if (error) {
                log.error(error, meta);
                res.status(400).send(error);
                return;
            }
            //log.debug(response);

            send_data.provider_name = TUMBLR_PROVIDER;
            send_data.post_count = 0;
            send_data.posts = [];

            try {
                send_data.blog_id = response.blog.name;
                _pushPostsFromTumblr(send_data.posts, response.posts, true, 0);
            }
            catch(e) {
                log.error(e, meta);
                log.error(response, meta);
                return res.status(500).send(e);
            }
            send_data.post_count = send_data.posts.length;

            res.send(send_data);
        });
    });
});

router.post('/bot_posts/new/:blog_id', function (req, res) {
    var userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":TUMBLR_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var blog_id = req.params.blog_id;
    var options = {};

    if (req.body.content) {
        options.body = req.body.content;
    }
    else {
        var error = new Error("Fail to get content");
        log.error(error, meta);
        return res.status(400).send(error);
    }

    if (req.body.title) {
        options.title = req.body.title;
    }

    if (req.body.tags) {
        options.tags = req.body.tags;
    }

    //it's for link post
    if (req.body.description) {
        options.description = req.body.description;
    }

    var postType = req.query.postType;
    if (!postType) {
        log.notice("postType is undefined, so it set to text", meta);
        postType = "post";
    }

    userMgr._findProviderByUserId(userId, TUMBLR_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            return res.status(500).send(err);
        }

        var client = tumblr.createClient({
            consumer_key: clientConfig.clientID,
            consumer_secret: clientConfig.clientSecret,
            token: provider.token,
            token_secret: provider.tokenSecret
        });

        var postFunc;
        if (postType === "post") {
            postFunc = client.text;
        }
        else if (postType === "link") {
            postFunc = client.link;
        }
        else {
            //need to refactoring make a error object;
            var error = new Error("postType was undefined");
            log.error(error, meta);
            return res.status(500).send(error);
        }

        postFunc(blog_id, options, function (error, response) {
            if (error) {
                log.error(error, meta);
                return res.status(400).send(error);
            }

            //log.debug(response, meta);

            var options = response;

            client.posts(blog_id, options, function (error, response) {
                if (error) {
                    log.error(error, meta);
                    res.status(400).send(error);
                    return;
                }
                //log.debug(response);

                var send_data = {};
                send_data.provider_name = TUMBLR_PROVIDER;
                send_data.post_count = 0;
                send_data.posts = [];

                try {
                    send_data.blog_id = response.blog.name;
                    _pushPostsFromTumblr(send_data.posts, response.posts, false, 0);
                    send_data.post_count = send_data.posts.length;
                }
                catch(e) {
                    log.error(e, meta);
                    log.error(response, meta);
                    return res.status(500).send(e);
                }

                res.send(send_data);
            });
        });
    });
});

router.get('/bot_comments/:blogID/:postID', function (req, res) {
    var userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":TUMBLR_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var err = new Error("This api is not supported");
    log.notice(err, meta);
    res.status(404).send(err);
});

 module.exports = router;
