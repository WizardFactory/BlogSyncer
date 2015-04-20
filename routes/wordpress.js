/**
 *
 * Created by aleckim on 2014. 5. 15..
 */

"use strict";

var router = require('express').Router();
var passport = require('passport');
var request = require('../controllers/requestEx');

var blogBot = require('./../controllers/blogbot');
var userMgr = require('./../controllers/userManager');
var svcConfig = require('../models/svcConfig.json');

var clientConfig = svcConfig.Wordpress;
var wordpressStrategy = require('passport-wordpress').Strategy;
var WORDPRESS_API_URL = "https://public-api.wordpress.com/rest/v1";
var WORDPRESS_PROVIDER = "Wordpress";

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

passport.use(new wordpressStrategy({
        clientID: clientConfig.clientID,
        clientSecret: clientConfig.clientSecret,
        callbackURL: svcConfig.svcURL+"/wordpress/authorized",
        passReqToCallback : true
    },
    function(req, accessToken, refreshToken, profile, done) {
        var providerId;
        var provider;
//        log.debug("accessToken:" + accessToken);
//        log.debug("refreshToken:" + refreshToken);
//        log.debug("profile:"+JSON.stringify(profile));

        //if user didn't set blog for oauth, token_site_id set to false
        if (profile._json.token_site_id) {
            providerId = profile._json.token_site_id;
        }
        else {
            log.error("token site id was not set!");
            providerId = profile._json.primary_blog;
        }

        provider = {
            "providerName":profile.provider,
            "accessToken":accessToken,
            "refreshToken":refreshToken,
            "providerId":providerId.toString(), //it is not user id(it's blog_id)
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
    passport.authenticate('wordpress')
);

router.get('/authorized',
    passport.authenticate('wordpress', { failureRedirect: '/#signin' }),
    function(req, res) {
        // Successful authentication, redirect home.
        log.info('Successful!');
        res.redirect('/#');
    }
);

router.get('/me', function (req, res) {
    var userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }

    userMgr._findProviderByUserId(userId, WORDPRESS_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err);
            return res.status(500).send(err);
        }

        var apiUrl = WORDPRESS_API_URL+"/me";
        log.debug(apiUrl);

        _requestGet(apiUrl, provider.accessToken, function(err, response, body) {
            if(err) {
                log.error(err);
                return res.status(err.statusCode).send(err);
            }

            log.debug(body);
            res.send(body);
        });
    });
});

router.get('/bot_bloglist', function (req, res) {
    var userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":WORDPRESS_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    if (req.query.providerid === false) {
        var error = new Error("User didn't have blog!");
        log.error(error, meta);
        res.status(404).send(error);    //404 Not Found
        res.redirect("/#/signin");
        return;
    }

    var providerId = req.query.providerid;

    userMgr._findProviderByUserId(userId, WORDPRESS_PROVIDER, providerId, function (err, user, provider) {

        var apiUrl = WORDPRESS_API_URL+"/sites/"+provider.providerId;
        log.debug(apiUrl);

        _requestGet(apiUrl, provider.accessToken, function(err, response, body) {
            if(err) {
                log.error(err, meta);
                return res.status(err.statusCode).send(err);
            }
            var blogId;
            var blogTitle;
            var blogUrl;

            try {
                blogId = body.ID.toString();
                blogTitle = body.name;
                blogUrl = body.URL;
            }
            catch(e) {
                log.error(e, meta);
                log.error(body, meta);
                return res.statusCode(500).send(e);
            }

            var sendData = {};

            sendData.provider = provider;
            sendData.blogs = [];
            sendData.blogs.push({"blog_id":blogId, "blog_title":blogTitle, "blog_url":blogUrl});

            /*
             { "provider":object, "blogs":
             [ {"blog_id":"12", "blog_title":"wzdfac", "blog_url":"wzdfac.iptime.net"},
             {"blog_id":"12", "blog_title":"wzdfac", "blog_url":"wzdfac.iptime.net"} ] },
             */
            res.send(sendData);
        });
    });
});

router.get('/bot_post_count/:blog_id', function (req, res) {
    var userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":WORDPRESS_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var blogId = req.params.blog_id;

    userMgr._findProviderByUserId(userId, WORDPRESS_PROVIDER, blogId, function (err, user, provider) {

        var apiUrl = WORDPRESS_API_URL+"/sites/"+blogId;

        log.debug(apiUrl, meta);

        _requestGet(apiUrl, provider.accessToken, function(err, response, body) {
            if(err) {
                log.error(err, meta);
                return res.status(err.statusCode).send(err);
            }
            log.debug("post count=" + body.post_count, meta);

            var sendData = {};
            try {
                sendData.provider_name = WORDPRESS_PROVIDER;
                sendData.blog_id = body.ID.toString();
                sendData.post_count = body.post_count;
            }
            catch(e) {
                log.error(e, meta);
                log.error(body, meta);
                return res.status(500).send(e);
            }
            res.send(sendData);
        });
    });
 });

router.get('/bot_posts/:blog_id', function (req, res) {
    var userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":WORDPRESS_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var blogId = req.params.blog_id;
    var offSet = req.query.offset;
    var after = req.query.after;

    userMgr._findProviderByUserId(userId, WORDPRESS_PROVIDER, blogId, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            return res.status(500).send(err);
        }

        var apiUrl = WORDPRESS_API_URL+"/sites/"+blogId;
        var isExtended = false;
        apiUrl += "/posts";
        apiUrl += "?";
        if (offSet) {
            apiUrl += "offset=" + offSet;
            isExtended = true;
        }
        if (after) {
            if (isExtended) {
                apiUrl += "&";
            }
            apiUrl += "after=" + after;
        }

//        log.debug(apiUrl);

        _requestGet(apiUrl, provider.accessToken, function(err, response, body) {
            if(err) {
                log.error(err, meta);
                return res.status(err.statusCode).send(err);
            }

            var sendData = {};
            sendData.provider_name = WORDPRESS_PROVIDER;
            sendData.blog_id = blogId;

            try {
                sendData.post_count = body.posts.length;
                sendData.posts = [];

                for (var i = 0; i<body.posts.length; i+=1) {
                    var rawPost = body.posts[i];
                    var postDate = new Date(rawPost.modified);
                    var afterDate = new Date(after);
                    if (postDate < afterDate) {
                        //log.debug('post is before');
                        continue;
                    }
                    var sendPost = {};
                    sendPost.title = rawPost.title;
                    sendPost.modified = rawPost.modified;
                    sendPost.id = rawPost.ID.toString();
                    sendPost.url = rawPost.URL;
                    sendPost.categories = [];
                    sendPost.tags = [];

                    if (rawPost.categories) {
                        var categoryArr = Object.keys(rawPost.categories);
                        for (var j=0; j<categoryArr.length; j+=1) {
                            sendPost.categories.push(categoryArr[j]);
                        }
                    }
                    if (rawPost.tags) {
                        var tagArr = Object.keys(rawPost.tags);
                        for (var h=0; h<tagArr.length; h+=1) {
                            sendPost.tags.push(tagArr[h]);
                        }
                    }
                    sendData.posts.push(sendPost);
                }
            }
            catch(e) {
                log.error(e, meta);
                log.error(body, meta);
                return res.status(500).send(e);
            }

            res.send(sendData);
        });
    });
});

router.get('/bot_posts/:blog_id/:post_id', function (req, res) {
    var userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":WORDPRESS_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var blogId = req.params.blog_id;

    userMgr._findProviderByUserId(userId, WORDPRESS_PROVIDER, blogId, function (err, user, provider) {
        var postId;
        var apiUrl;

        postId = req.params.post_id;
        apiUrl = WORDPRESS_API_URL+"/sites/"+blogId;
        apiUrl += "/posts";
        apiUrl += "/" + postId;

        log.debug(apiUrl, meta);

        _requestGet(apiUrl, provider.accessToken, function(err, response, body) {
            if(err) {
                log.error(err, meta);
                return res.status(err.statusCode).send(err);
            }

            //log.debug(data);
            var sendData = {};
            sendData.provider_name = WORDPRESS_PROVIDER;
            sendData.blog_id = blogId;
            sendData.posts = [];

            try {
                var rawPost = body;
                var sendPost = {};
                sendPost.title = rawPost.title;
                sendPost.modified = rawPost.modified;
                sendPost.id = rawPost.ID;
                sendPost.url = rawPost.URL;
                sendPost.categories = [];
                sendPost.tags = [];
                if (rawPost.categories) {
                    var categoryArr = Object.keys(rawPost.categories);
                    for (var j = 0; j < categoryArr.length; j += 1) {
                        sendPost.categories.push(categoryArr[j]);
                    }
                }
                if (rawPost.tags) {
                    var tagArr = Object.keys(rawPost.tags);
                    for (var h = 0; h < tagArr.length; h += 1) {
                        sendPost.tags.push(tagArr[h]);
                    }
                }
                sendPost.content = rawPost.content;
                sendPost.replies = [];
                sendPost.replies.push({"comment_count": rawPost.comment_count});
                sendPost.replies.push({"like_count": rawPost.like_count});
                sendData.posts.push(sendPost);
            }
            catch(e) {
                log.error(e, meta);
                log.error(body, meta);
                return res.status(500).send(e);
            }

            res.send(sendData);
        });
    });
});

router.post('/bot_posts/new/:blog_id', function (req, res) {
    var userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":WORDPRESS_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var blogId = req.params.blog_id;

    userMgr._findProviderByUserId(userId, WORDPRESS_PROVIDER, blogId, function (err, user, provider) {
        var apiUrl = WORDPRESS_API_URL+"/sites/"+blogId +"/posts/new";
        log.debug(apiUrl, meta);

        request.postEx(apiUrl, {
            json: true,
            headers: {
                "authorization": "Bearer " + provider.accessToken
            },
            form: req.body
        }, function (err, response, body) {
            if(err) {
                log.error(err, meta);
                return res.status(err.statusCode).send(err);
            }

            //add post info
            var sendData = {};
            sendData.provider_name = WORDPRESS_PROVIDER;
            sendData.blog_id = blogId;
            sendData.posts = [];

            try {
                var rawPost = body;
                var sendPost = {};
                sendPost.title = rawPost.title;
                sendPost.modified = rawPost.modified;
                sendPost.id = rawPost.ID;
                sendPost.url = rawPost.URL;
                sendPost.categories = [];
                sendPost.tags = [];
                if (rawPost.categories) {
                    var categoryArr = Object.keys(rawPost.categories);
                    for (var j=0; j<categoryArr.length; j+=1) {
                        sendPost.categories.push(categoryArr[j]);
                    }
                }
                if (rawPost.tags) {
                    var tagArr = Object.keys(rawPost.tags);
                    for (var h=0; h<tagArr.length; h+=1) {
                        sendPost.tags.push(tagArr[h]);
                    }
                }
                sendData.posts.push(sendPost);
            }
            catch(e) {
                log.error(e, meta);
                log.error(body, meta);
                return res.status(500).send(e);
            }

            //log.debug(sendData);
            res.send(sendData);
        });
    });
});

router.get('/bot_comments/:blogID/:postID', function (req, res) {
    var userId = userMgr._getUserId(req);
    if (!userId) {
        return;
    }
    var meta = {"cName":WORDPRESS_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var blogId = req.params.blogID;
    var postId = req.params.postID;

    userMgr._findProviderByUserId(userId, WORDPRESS_PROVIDER, blogId, function (err, user, provider) {
        if (err) {
            log.error(err);
            return res.status(500).send(err);
        }

        var apiUrl = WORDPRESS_API_URL+"/sites/"+blogId;
        apiUrl += "/posts";
        apiUrl += "/" + postId;
        apiUrl += "/replies";

        log.debug(apiUrl, meta);

        _requestGet(apiUrl, provider.accessToken, function(err, response, body) {
            if(err) {
                log.error(err, meta);
                return res.status(err.statusCode).send(err);
            }

            var sendData = {};
            sendData.providerName = provider.providerName;
            sendData.blogID = blogId;
            sendData.postID = postId;

            try {
                sendData.found = body.found;
                sendData.comments = [];
                for(var i=0; i<body.found; i+=1) {
                    var comment = {};
                    comment.date = body.comments[i].date;
                    comment.URL = body.comments[i].short_URL;
                    comment.content = body.comments[i].content;
                    sendData.comments.push(comment);
                }
            }
            catch (e) {
                log.error(e, meta);
                log.error(body, meta);
                return res.status(500).send(e);
            }

            res.send(sendData);
        });
    });
});

/**
 *
 * @param url
 * @param accessToken
 * @param callback
 * @private
 */
function _requestGet(url, accessToken, callback) {
    request.getEx(url, {
        json: true,
        headers: {
            "authorization": "Bearer " + accessToken
        }
    }, function (err, response, body) {
        callback(err, response, body);
    });
}

module.exports = router;

