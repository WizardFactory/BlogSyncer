/**
 * Created by aleckim on 2014. 7. 19..
 */

"use strict";

var router = require('express').Router();
var passport = require('passport');
//var request = require('../controllers/requestEx');
var url = require('url');

var blogBot = require('./../controllers/blogbot');
var userMgr = require('./../controllers/userManager');
var svcConfig = require('../models/svcConfig.json');

var clientConfig = svcConfig.twitter;
var TwitterStrategy = require('passport-twitter').Strategy;
var TWITTER_API_URL = "https://api.twitter.com/1.1";
var TWITTER_PROVIDER = "twitter";

var OAuth = require('oauth').OAuth;
// global variable for object of OAuth
var objOAuth = new OAuth("https://api.twitter.com/oauth/request_token",
    "https://api.twitter.com/oauth/access_token",
    clientConfig.clientID,
    clientConfig.clientSecret,
    "1.0A",
    null,
    "HMAC-SHA1");

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

passport.use(new TwitterStrategy({
        consumerKey: clientConfig.clientID,
        consumerSecret: clientConfig.clientSecret,
        callbackURL: svcConfig.svcURL+"/twitter/authorized",
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
            "providerId":profile.username.toString(),
            "displayName":profile.displayName
        };

        userMgr._updateOrCreateUser(req, provider, function(err, user, isNewProvider, delUser) {
            if (err) {
                log.error("Fail to get user ");
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
    passport.authenticate('twitter')
);

router.get('/authorized',
    passport.authenticate('twitter', { failureRedirect: '/#signin' }),
    function(req, res) {
        // Successful authentication, redirect home.
        log.debug('Successful!');
        res.redirect('/#');
    }
);

router.get('/bot_bloglist', function (req, res) {
    var userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":TWITTER_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var providerId = req.query.providerid;
    if (providerId === false) {
        var error = new Error('User:'+userId+' did not have blog!');
        log.error(error, meta);
        res.status(500).send(error);
        res.redirect("/#/signin");
        return;
    }

    userMgr._findProviderByUserId(userId, TWITTER_PROVIDER, providerId, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            res.status(500).send(err);
            return;
        }

        var api_url = TWITTER_API_URL + "/users/show.json?screen_name=" + provider.providerId;

        objOAuth.get(api_url, provider.token, provider.tokenSecret, function (error, body, response) {
            if(error) {
                log.error(error, meta);
                log.error(response, meta);
                res.status(error.statusCode).send(error);
                return;
            }

            var blog_id;
            var blog_title;
            var blog_url;

            try{
                var result = JSON.parse(body);
                blog_id = result.id;
                blog_title = result.name;
                blog_url = result.url;
            }
            catch(e) {
                log.error(e, meta);
                log.error(body, meta);
                res.status(500).send(e);
            }

            var botBlogList = {};
            botBlogList.provider = provider;
            botBlogList.blogs = [];
            botBlogList.blogs.push({"blog_id": blog_id, "blog_title": blog_title, "blog_url": blog_url});

            res.send(botBlogList);
        });
    });
});

router.get('/bot_post_count/:blog_id', function (req, res) {
    var userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":TWITTER_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var providerId = req.query.providerid;

    userMgr._findProviderByUserId(userId, TWITTER_PROVIDER, providerId, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            res.status(500).send(err);
            return;
       }

        var api_url = TWITTER_API_URL + "/users/show.json?screen_name=" + provider.providerId;
        log.debug(api_url, meta);

        objOAuth.get(api_url, provider.token, provider.tokenSecret, function (error, body, response) {
            if(error) {
                log.error(error, meta);
                log.error(response, meta);
                res.status(error.statusCode).send(error);
                return;
            }

            var botPostCount = {};

            try {
                var result = JSON.parse(body);
                botPostCount.provider_name = TWITTER_PROVIDER;
                botPostCount.blog_id = result.id;
                botPostCount.post_count = result.statuses_count;
            }
            catch(e) {
                log.error(e, meta);
                log.error(body, meta);
                res.status(500).send(e);
                return;
            }

            res.send(botPostCount);
        });
    });
});

function _convertBotPosts(providerName, blogId) {
    return {"provider_name": providerName, "blog_id": blogId, "posts": []};
}

function _convertBotPost(raw_post) {
    var botPost = {};
    botPost.title = raw_post.text;
    botPost.modified = raw_post.created_at;

    //you have to use id_str NOT id
    botPost.id = raw_post.id_str;

    //twitter didn't have url
    botPost.categories = [];
    botPost.tags = [];

    //twitter didn't have content
    botPost.content = raw_post.text;
    botPost.replies = [];
    botPost.replies.push({"retweet_count": raw_post.retweet_count});
    botPost.replies.push({"like_count": raw_post.favorite_count});

    return botPost;
}

router.get('/bot_posts/:blog_id', function (req, res) {
    var userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":TWITTER_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var provider_id = req.query.providerid;
    var blog_id = req.params.blog_id;
    var last_id = req.query.offset;
    var after = req.query.after;

    userMgr._findProviderByUserId(userId, TWITTER_PROVIDER, provider_id, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            res.status(500).send(err);
            return;
        }

        log.debug(provider, meta);

        var count = 20;
        var api_url = TWITTER_API_URL+"/statuses/user_timeline.json?screen_name="+ provider.providerId +
                            "&count=" + count;
        if (last_id) {
            api_url += "&";
            api_url += "max_id=" + last_id;
        }

        log.debug(api_url, meta);

        objOAuth.get(api_url, provider.token, provider.tokenSecret, function (error, body, response) {
            if(error) {
                log.error(error, meta);
                log.error(response, meta);
                res.status(error.statusCode).send(error);
                return;
            }

            var result;
            try {
                result = JSON.parse(body);
            }
            catch(e) {
                log.error(e, meta);
                log.error(body, meta);
                res.status(500).send(e);
                return;
            }
            log.debug(result);

            if(!result.length) {
                error = new Error("result is empty!");
                log.error(error, meta);
                log.error(result, meta);
                res.status(500).send(error);
                return;
            }

            var send_data = _convertBotPosts(TWITTER_PROVIDER, blog_id);
            for (var i = 0; i < result.length; i += 1) {
                var raw_post = result[i];
                if (after) {
                    var post_date = new Date(raw_post.created_at);
                    var after_date = new Date(after);

                    if (post_date < after_date) {
                        //log.debug('post is before');
                        continue;
                    }
                }

                var send_post = _convertBotPost(raw_post);

                //log.debug(send_post);

                send_data.posts.push(send_post);

                send_data.stopReculsive = false;
            }

            send_data.post_count = send_data.posts.length;

            if(!after)
            {
                if(!(send_data.posts[i-1])) {
                    error = new Error("posts in undefined !!");
                    log.error(error, meta);
                    res.status(500).send(error);
                    return;
                }

                if( (last_id === send_data.posts[i-1].id.toString()) &&
                    (result.length === 1) ) {
                    log.debug("stop Recursive!!!!!", meta);
                    send_data.stopReculsive = true;
                }
            }

            res.send(send_data);
        });
    });
});

router.get('/bot_posts/:blog_id/:post_id', function (req, res) {
    var userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":TWITTER_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var blog_id = req.params.blog_id;
    var post_id = req.params.post_id;

    userMgr._findProviderByUserId(userId, TWITTER_PROVIDER, null, function (err, user, provider) {
        if (err) {
            log.error(err);
            res.status(500).send(err);
            return;
        }

        var api_url = TWITTER_API_URL + "/statuses/show/" + post_id + ".json";
        //log.debug(api_url, meta);

        objOAuth.get(api_url, provider.token, provider.tokenSecret, function (error, body, response) {

            if (error) {
                log.error(error, meta);
                log.error(response, meta);
                res.status(error.statusCode).send(error);
                return;
            }

            var send_data = _convertBotPosts(TWITTER_PROVIDER, blog_id);
            var send_post;
            try {
                var result = JSON.parse(body);
                send_post = _convertBotPost(result);
            }
            catch (e) {
                log.error(e, meta);
                log.error(body, meta);
                res.status(500).send(e);
                return;
            }
            send_data.posts.push(send_post);
            send_data.post_count = send_data.posts.length;

            res.send(send_data);
        });
    });
});

function _makeNewPost(body) {
    var newPost = {};

    newPost.content = "";

    if (body.title) {
        newPost.content += body.title +'\n';
    }
    if (body.content) {
        newPost.content += body.content;
    }

    log.debug(newPost);

    return newPost;
}

router.post('/bot_posts/new/:blog_id', function (req, res) {
    var userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":TWITTER_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var provider_id = req.query.providerid;
    var blog_id = req.params.blog_id;
    var newPost = _makeNewPost(req.body);
    var encodedPost = encodeURIComponent(newPost.content);

    userMgr._findProviderByUserId(userId, TWITTER_PROVIDER, provider_id, function (err, user, provider) {

        //log.debug(encodedPost, meta);

        var api_url = TWITTER_API_URL+"/statuses/update.json?status=" + encodedPost;
        objOAuth.post(api_url, provider.token, provider.tokenSecret, newPost, 'application/json', function (error, body, response) {
            if(error) {
                log.error(error, meta);
                log.error(response, meta);
                res.status(error.statusCode).send(error);
                return;
            }

            var send_data = _convertBotPosts(TWITTER_PROVIDER, blog_id);

            var send_post = {};
            var raw_post = body;

            try {
                send_post = _convertBotPost(raw_post);
            }
            catch (e) {
                log.error(e, meta);
                log.error(body, meta);
                res.status(500).send(e);
                return;
            }

            send_data.posts.push(send_post);
            log.debug(send_data, meta);
            res.send(send_data);
        });
    });
});

module.exports = router;

