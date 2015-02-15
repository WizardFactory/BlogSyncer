/**
 * Created by aleckim on 2014. 7. 19..
 */

var router = require('express').Router();
var passport = require('passport');
var request = require('request');
var url = require('url');

var blogBot = require('./blogbot');
var userMgr = require('./userManager');
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
    "use strict";
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    "use strict";
    done(null, obj);
});

passport.use(new TwitterStrategy({
        consumerKey: clientConfig.clientID,
        consumerSecret: clientConfig.clientSecret,
        callbackURL: svcConfig.svcURL+"/twitter/authorized",
        passReqToCallback : true
    },
    function(req, token, tokenSecret, profile, done) {
        "use strict";
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
        "use strict";
        // Successful authentication, redirect home.
        log.debug('Successful!');
        res.redirect('/#');
    }
);

router.get('/bot_bloglist', function (req, res) {
    "use strict";
    log.debug("Twitter : "+ req.url + ' : this is called by bot');
    var errorMsg;
    var userId = userMgr._getUserId(req, res);
    var providerId;
    if (!userId) {
        return;
    }

    providerId = req.query.providerid;

    if (providerId === false) {
        errorMsg = 'User:'+userId+' did not have blog!';
        log.debug(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }

    userMgr._findProviderByUserId(userId, TWITTER_PROVIDER, providerId, function (err, user, provider) {
        var api_url;

        if (err) {
            log.error("Fail to find provider");
            log.error(err.toString());
            return res.send(err);
        }

        api_url = TWITTER_API_URL + "/users/show.json?screen_name=" + provider.providerId;
        // instantiate Twit module
        //var twitter = new Twit(twitConfig);
        //var twit = new twitter(twitConfig);

        //userTimeline(p, req, res);

        objOAuth.get(api_url, provider.token, provider.tokenSecret, function (error, data) {
            var result;
            if(error) {
                result = {error: error};
                res.send(result);
                return;
            } else {
                result = JSON.parse(data);
            }

            log.debug(result);

            var blog_id = result.id;
            var blog_title = result.name;
            var blog_url = result.url;
            var send_data = {};

            send_data.provider = provider;
            send_data.blogs = [];
            send_data.blogs.push({"blog_id":blog_id, "blog_title":blog_title, "blog_url":blog_url});

            res.send(send_data);
        });
    });
});

router.get('/bot_post_count/:blog_id', function (req, res) {
    "use strict";
    log.debug("Twitter: "+ req.url + ' : this is called by bot');

    var userId = userMgr._getUserId(req, res);
    var providerId;
    if (!userId) {
        return;
    }

    providerId = req.query.providerid;

    userMgr._findProviderByUserId(userId, TWITTER_PROVIDER, providerId, function (err, user, provider) {
        var api_url;

        if (err) {
            log.error("Fail to find provider");
            log.error(err.toString());
            return res.send(err);
        }

        api_url = TWITTER_API_URL + "/users/show.json?screen_name=" + provider.providerId;

        log.debug(api_url);
        objOAuth.get(api_url, provider.token, provider.tokenSecret, function (error, data) {
            var result;
            var send_data = {};

            if(error) {
                result = {error: error};
                res.send(result);
                return;
            } else {
                result = JSON.parse(data);
            }

            log.debug(result);

            send_data.provider_name = TWITTER_PROVIDER;
            send_data.blog_id = result.id;
            send_data.post_count = result.statuses_count;

            log.debug(result.statuses_count);

            res.send(send_data);
        });
    });
});

router.get('/bot_posts/:blog_id', function (req, res) {
    "use strict";
    var meta = {};
    var userId = userMgr._getUserId(req, res);

    meta.cName = "twitter";
    meta.fName = "/bot_posts/:blog_id";
    meta.userId = userId;
    //meta.providerName = providerName;

    var provider_id;
    var blogId;
    if (!userId) {
        return;
    }

    provider_id = req.query.providerid;
    //log.debug("provider_id : " + provider_id, meta);
    blogId = req.params.blog_id;

    userMgr._findProviderByUserId(userId, TWITTER_PROVIDER, provider_id, function (err, user, provider) {
        var blog_id = req.params.blog_id;
        var last_id = req.query.offset;
        var after = req.query.after;
        // https://dev.twitter.com/rest/public/timelines
        // use max_id for twit offset in twitter
        var lastCnt = 0;
        var count = 0;
        var api_url;

        if (err) {
            log.error("Fail to find provider");
            log.error(err.toString());
            return res.send(err);
        }

        count = 20;
        log.debug(provider, meta );
        api_url = TWITTER_API_URL+"/statuses/user_timeline.json?screen_name="+ provider.providerId + "&count=" + count;
        //api_url = TWITTER_API_URL+"/statuses/user_timeline.json?screen_name="+ provider_id + "&count=" + count;

        if (last_id) {
            api_url += "&";
            api_url += "max_id=" + last_id;
        }

        log.debug(api_url);

        objOAuth.get(api_url, provider.token, provider.tokenSecret, function (error, response, body) {
            var result = [];
            var resultVal;

            var hasError = _checkError(err, response, body);
            if (hasError) {
                res.send(hasError);
                return;
            }

            result = JSON.parse(response);
            //log.debug(result);

            if(!result.length) {
                log.debug("result is empty !!!");
                return;
            }

            var send_data = {};
            var i = 0;

            send_data.provider_name = TWITTER_PROVIDER;
            send_data.blog_id = blog_id;
            send_data.posts = [];

            for (i = 0; i < result.length; i++) {
                var raw_post = result[i];
                if (after) {
                    var post_date = new Date(raw_post.created_at);
                    var after_date = new Date(after);

                    if (post_date < after_date) {
                        //log.debug('post is before');
                        continue;
                    }
                }

                var send_post = {};
                send_post.title = raw_post.text;
                send_post.modified = raw_post.created_at;
                send_post.id = raw_post.id;
                send_post.url = raw_post.url;
                send_post.categories = [];
                send_post.tags = [];
                send_post.content = raw_post.content;

                log.debug(send_post);

                send_data.posts.push(send_post);

                send_data.stopReculsive = false;
            }

            send_data.post_count = send_data.posts.length;

            if(!after)
            {
                if(!(send_data.posts[i-1])) {
                    log.debug("posts is undefined !!!");
                    return;
                }

                if( (last_id == send_data.posts[i-1].id) &&
                    (result.length == 1) ) {
                    log.debug("stop Reculsive!!!!!");
                    send_data.stopReculsive = true;
                }
            }

            res.send(send_data);
        });
    });
});

router.get('/bot_posts/:blog_id/:post_id', function (req, res) {
    "use strict";
    log.debug("Twitter : "+ req.url + ' : this is called by bot');
    var userId;
    var logStr;
    logStr = "/bot_posts/:blog_id/:post_id";

    userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }

    var provider_id = req.query.providerid;
    userMgr._findProviderByUserId(userId, TWITTER_PROVIDER, provider_id, function (err, user, provider) {
        var blog_id = req.params.blog_id;
        var post_id = req.params.post_id;
        var last_id = req.query.offset;
        var after = req.query.after;
        // https://dev.twitter.com/rest/public/timelines
        // use max_id for twit offset in twitter
        var lastCnt = 0;
        var count = 0;
        var api_url;

        if (err) {
            log.error("Fail to find provider");
            log.error(err.toString());
            return res.send(err);
        }

        // use count(1) with user_timeline for retweet and like counting
        count = 1;

        api_url = TWITTER_API_URL+"/statuses/user_timeline.json?screen_name="+ provider.providerId +
            "&count=" + count + "&max_id=" + post_id;

        //log.debug(api_url);

        objOAuth.get(api_url, provider.token, provider.tokenSecret, function (error, response, body) {
            var result = [];
            var resultVal;

            var hasError = _checkError(err, response, body);
            if (hasError) {
                res.send(hasError);
                return;
            }

            result = JSON.parse(response);
            //log.debug(result);

            if(!result.length) {
                log.debug("result is empty !!!");
                return;
            }

            var send_data = {};
            var i = 0;

            send_data.provider_name = TWITTER_PROVIDER;
            send_data.blog_id = blog_id;
            send_data.posts = [];

            for (i = 0; i < result.length; i++) {
                var raw_post = result[i];
                if (after) {
                    var post_date = new Date(raw_post.created_at);
                    var after_date = new Date(after);

                    if (post_date < after_date) {
                        //log.debug('post is before');
                        continue;
                    }
                }

                var send_post = {};
                send_post.title = raw_post.text;
                send_post.modified = raw_post.created_at;
                send_post.id = raw_post.id;
                send_post.url = raw_post.url;
                send_post.categories = [];
                send_post.tags = [];
                send_post.content = raw_post.content;
                send_post.replies = [];
                send_post.replies.push({"retweet_count":raw_post.retweet_count});
                send_post.replies.push({"like_count":raw_post.favorite_count});

                //log.debug(send_post);

                send_data.posts.push(send_post);

                send_data.stopReculsive = false;
            }

            send_data.post_count = send_data.posts.length;

            if(!(send_data.posts[i-1])) {
                log.debug("posts is undefined !!!");
                return;
            }

            if( (last_id == send_data.posts[i-1].id) &&
                (result.length == 1) ) {
                log.debug("stop Reculsive!!!!!");
                send_data.stopReculsive = true;
            }

            res.send(send_data);
        });
    });
});

function _makeNewPost(body) {
    "use strict";
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
    "use strict";
    var blogId;
    var meta = {};
    var userId = userMgr._getUserId(req, res);
    var provider_id;

    meta.cName = "twitter";
    meta.fName = "/bot_posts/:blog_id";
    meta.userId = userId;
    meta.providerName = TWITTER_PROVIDER;

    log.debug(req.url, meta);

    if (!userId) {
        return;
    }

    blogId = req.params.blog_id;
    provider_id = req.query.providerid;

    userMgr._findProviderByUserId(userId, TWITTER_PROVIDER, provider_id, function (err, user, provider) {
        var newPost = _makeNewPost(req.body);
        var encodedPost = encodeURIComponent(newPost.content);

        //log.debug(encodedPost, meta);

        var provider_id = req.query.providerid;
        var blog_id = req.params.blog_id;
        var api_url = TWITTER_API_URL+"/statuses/update.json?status=" + encodedPost;

        //log.debug(logStr + api_url);

        objOAuth.post(api_url, provider.token, provider.tokenSecret, newPost, 'application/json', function (error, response, body) {

            var hasError = _checkError(err, response, body);
            if (hasError) {
                res.send(hasError);
                return;
            }
            //add post info
            var send_data = {};
            send_data.provider_name = TWITTER_PROVIDER;
            send_data.blog_id = blog_id;
            send_data.posts = [];
            var send_post = {};
            var raw_post = body;
            send_post.title = raw_post.title;
            send_post.modified = raw_post.modified;
            send_post.id = raw_post.ID;
            send_post.url = raw_post.URL;
            send_post.categories = [];
            send_post.tags = [];
            var j=0;
            if (raw_post.categories) {
                var category_arr = Object.keys(raw_post.categories);
                for (j=0; j<category_arr.length; j++) {
                    send_post.categories.push(category_arr[j]);
                }
//                log.debug('category-raw');
//                log.debug(category_arr);
//                log.debug('category-send');
//                log.debug(send_post.categories);
            }
            if (raw_post.tags) {
                var tag_arr = Object.keys(raw_post.tags);
                for (j=0; j<tag_arr.length; j++) {
                    send_post.tags.push(tag_arr[j]);
                }
//                log.debug('tag-raw');
//                log.debug(tag_arr);
//                log.debug('tags-send');
//                log.debug(send_post.tags);
            }
            //send_post.content = raw_post.content;
            send_data.posts.push(send_post);
            log.debug(send_data, meta);
            res.send(send_data);
        });
    });
});

router.get('/bot_comments/:blogID/:postID', function (req, res) {
    "use strict";
    log.debug("[bot_comments]" + req.url );
    log.debug("twitter is not comments feature !!!!");

    return;
});

function _checkError(err, response, body) {
    "use strict";
    if (err) {
        log.debug(err);
        return err;
    }
    if (response.statusCode >= 400) {
        var errData = body.meta ? body.meta.msg : body.error;
        var errStr = 'API error: ' + response.statusCode + ' ' + errData;
        log.debug(errStr);
        return new Error(errStr);
    }
}

function _requestGet(url, accessToken, callback) {
    "use strict";
    request.get(url, {
        json: true,
        headers: {
            "authorization": "Bearer " + accessToken
        }
    }, function (err, response, body) {
        callback(err, response, body);
    });
}

module.exports = router;

