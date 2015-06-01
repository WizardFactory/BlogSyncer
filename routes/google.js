/**
 * Created by aleckim on 2014. 7. 19..
 */

"use strict";

var router = require('express').Router();
var passport = require('passport');
var request = require('../controllers/requestEx');

var blogBot = require('./../controllers/blogBot');
var userMgr = require('./../controllers/userManager');
var botFormat = require('../models/botFormat');
var bC = require('../controllers/blogConvert');

var svcConfig = require('../models/svcConfig.json');

var clientConfig = svcConfig.google;
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var GOOGLE_API_URL = "https://www.googleapis.com";
var GOOGLE_PROVIDER = "google";

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

passport.use(new GoogleStrategy({
        clientID: clientConfig.clientID,
        clientSecret: clientConfig.clientSecret,
        callbackURL: svcConfig.svcURL + "/google/authorized",
        passReqToCallback : true
    },
    function(req, accessToken, refreshToken, params, profile, done) {
        var meta = {"cName": GOOGLE_PROVIDER, "fName":"passport.use" };

        //log.debug("accessToken:" + accessToken, meta);
        //log.debug("refreshToken:" + refreshToken, meta);
        //log.debug("params:"+JSON.stringify(params), meta);
        //log.debug("profile:" + JSON.stringify(profile), meta);

        //It's not correct information. but I confirmed by /blogger/v3/users/self"
        var providerId = "g"+profile.id;

        var provider = new botFormat.ProviderOauth2(profile.provider, providerId.toString(), profile.displayName,
                    accessToken, refreshToken, userMgr.makeTokenExpireTime(params.expires_in));

        userMgr.updateOrCreateUser(req, provider, function(err, user, isNewProvider, delUser) {
            if (err) {
                log.error("Fail to get user", meta);
                return done(err);
            }

            if (delUser) {
                blogBot.combineUser(user, delUser);
                userMgr.combineUser(user, delUser, function(err) {
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
    passport.authenticate('google', { scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/plus.login',
        'https://www.googleapis.com/auth/blogger'],
        accessType: 'offline', approvalPrompt: 'force'})
);

router.get('/authorized',
    passport.authenticate('google', { failureRedirect: '/#signin' }),
    function(req, res) {
        var meta = {"cName": GOOGLE_PROVIDER, "url":req.url };

        // Successful authentication, redirect home.
        log.debug("Successful!", meta);
        res.redirect('/#');
    }
);

router.get('/info', function (req, res) {
    var userId = userMgr.getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":GOOGLE_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var apiUrl = GOOGLE_API_URL + "/blogger/v3/users";
    apiUrl += "/self";
    log.info("apiUrl="+apiUrl, meta);

    userMgr.findProviderByUserId(userId, GOOGLE_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            return res.status(500).send(err);
        }

        _requestGet(apiUrl, provider.accessToken, function (err, response, body) {
            if (err) {
                log.error(err, meta);
                return res.status(err.statusCode).send(err);
            }
            log.debug(body, meta);
            res.send(body);
        });
    });
});

router.get('/bot_bloglist', function (req, res) {
    var userId = userMgr.getUserId(req);
    if (!userId) {
        return;
    }
    var meta = {"cName":GOOGLE_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var providerId = req.query.providerid;
    var apiUrl = GOOGLE_API_URL + "/blogger/v3/users";
    apiUrl += "/self";
    apiUrl += "/blogs";
    log.info("apiUrl="+apiUrl, meta);


    userMgr.findProviderByUserId(userId, GOOGLE_PROVIDER, providerId, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            return res.status(500).send(err);
        }

        _requestGet(apiUrl, provider.accessToken, function (err, response, body) {
            if (err) {
                log.error(err, meta);
                return res.status(err.statusCode).send(err);
            }

            var botBlogList = new botFormat.BotBlogList(provider);
            try {
                var items = body.items;
                log.debug("items length=" + items.length, meta);

                for (var i = 0; i < items.length; i+=1) {
                    var botBlog = new botFormat.BotBlog(items[i].id, items[i].name, items[i].url);
                    botBlogList.blogs.push(botBlog);
                }
            }
            catch(e) {
                log.error(e, meta);
                log.error(body, meta);
                return res.status(500).send(e);
            }

            res.send(botBlogList);
        });
    });
});

router.get('/bot_post_count/:blog_id', function (req, res) {
    var userId = userMgr.getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":GOOGLE_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var blogId = req.params.blog_id;
    var apiUrl = GOOGLE_API_URL + "/blogger/v3";
    apiUrl += "/blogs";
    apiUrl += "/"+blogId;
    log.info("apiUrl="+apiUrl, meta);

    userMgr.findProviderByUserId(userId, GOOGLE_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            return res.status(500).send(err);
        }

        _requestGet(apiUrl, provider.accessToken, function (err, response, body) {
            if (err) {
                log.error(err, meta);
                return res.status(err.statusCode).send(err);
            }
            var botPostCount;

            try {
                botPostCount = new botFormat.BotPostCount(GOOGLE_PROVIDER, body.id, body.posts.totalItems);
            }
            catch(e) {
                log.error(e, meta);
                log.error(body, meta);
                return res.status(500).send(e);
            }
            log.info("post_count="+botPostCount.post_count, meta);
            res.send(botPostCount);
        });
    });
});

router.get('/bot_posts/:blog_id', function (req, res) {
    var userId = userMgr.getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":GOOGLE_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var blogId = req.params.blog_id;
    var offset = req.query.offset;
    var after = req.query.after;
    var nextPageToken = req.query.nextPageToken;
    var count;  //maxResults
    var hasOptionalParameters = false;

    if (offset) {
        count = offset.split("-")[1];
        hasOptionalParameters = true;
    }
    if (after) {
        hasOptionalParameters = true;
    }
    if (nextPageToken) {
        hasOptionalParameters = true;
    }

    var apiUrl = GOOGLE_API_URL + "/blogger/v3";
    apiUrl += "/blogs";
    apiUrl += "/" + blogId;
    apiUrl += "/posts";
    if (hasOptionalParameters) {
        apiUrl += "?";
    }
    if (count) {
        apiUrl += "maxResults="+count;
        apiUrl += "&";
    }
    if (after) {
        apiUrl += "startDate="+after;
        apiUrl += "&";
    }
    if (nextPageToken) {
        apiUrl += "pageToken="+nextPageToken;
        apiUrl += "&";
    }

    /* &에 대한 예외처리를 안하기 위해서 추가함. */
    apiUrl += "status=live";
    log.info("apiUrl=" + apiUrl, meta);

    userMgr.findProviderByUserId(userId, GOOGLE_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            return res.status(500).send(err);
        }

        _requestGet(apiUrl, provider.accessToken, function (err, response, body) {
            if (err) {
                log.error(err, meta);
                return res.status(err.statusCode).send(err);
            }

            var botPostList = new botFormat.BotPostList(GOOGLE_PROVIDER, blogId, body.nextPageToken);

            try {
                if (!body.items) {
                    return res.send(botPostList);
                }
                for (var i = 0; i<body.items.length; i+=1) {
                    var item = body.items[i];

                    var botPost = new botFormat.BotTextPost(item.id, " ", item.updated, item.url, item.title, [],
                                item.labels);
                    botPostList.posts.push(botPost);
                }
            }
            catch(e) {
                log.error(e, meta);
                log.error(body, meta);
                return res.status(500).send(e);
            }

            res.send(botPostList);
        });
    });
});

router.get('/bot_posts/:blog_id/:post_id', function (req, res) {
    var userId = userMgr.getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":GOOGLE_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var blogId = req.params.blog_id;
    var postId = req.params.post_id;

    var apiUrl = GOOGLE_API_URL + "/blogger/v3";
        apiUrl += "/blogs";
        apiUrl += "/" + blogId;
        apiUrl += "/posts";
        apiUrl += "/" + postId;

        log.debug("apiUrl=" + apiUrl, meta);

    userMgr.findProviderByUserId(userId, GOOGLE_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            return res.status(500).send(err);
        }

        _requestGet(apiUrl, provider.accessToken, function (err, response, body) {
            if (err) {
                log.error(err, meta);
                return res.status(err.statusCode).send(err);
            }

            var botPostList = new botFormat.BotPostList(GOOGLE_PROVIDER, blogId);

            try {
                var item = body;
                var botPost = new botFormat.BotTextPost(item.id, item.content, item.updated, item.url, item.title, [],
                            item.labels, [{"comment_count":item.replies.totalItems}]);
                botPostList.posts.push(botPost);
            }
            catch(e) {
                log.error(e, meta);
                log.error(body, meta);
                return res.status(500).send(e);
            }

            res.send(botPostList);
        });
    });
});

router.get('/bot_comments/:blogId/:postId', function (req, res) {
    var userId = userMgr.getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":GOOGLE_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var blogId = req.params.blogId;
    var postId = req.params.postId;
    var apiUrl = GOOGLE_API_URL + "/blogger/v3";
    apiUrl += "/blogs";
    apiUrl += "/" + blogId;
    apiUrl += "/posts";
    apiUrl += "/" + postId;
    apiUrl += "/comments";

    log.debug("apiUrl=" + apiUrl, meta);

    userMgr.findProviderByUserId(userId, GOOGLE_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            return res.status(500).send(err);
        }

        _requestGet(apiUrl, provider.accessToken, function (err, response, body) {
            if (err) {
                log.error(err, meta);
                return res.status(err.statusCode).send(err);
            }

            var botCommentList = new botFormat.BotCommentList(provider.providerName, blogId, postId);

            try {
                for(var i=0; i<body.items.length; i+=1) {
                    var item = body.items[i];
                    var comment = new botFormat.BotComment(item.content, item.selfLink, item.updated);
                    botCommentList.comments.push(comment);
                }
            }
            catch(e) {
                log.error(e, meta);
                log.error(body, meta);
                return res.status(500).send(e);
            }

            res.send(botCommentList);
        });
    });
});

router.post('/bot_posts/new/:blog_id', function (req, res) {
    var userId = userMgr.getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":GOOGLE_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta) ;

    var blogId = req.params.blog_id;
    var botPost = req.body;

    var apiUrl = GOOGLE_API_URL + "/blogger/v3";
    apiUrl += "/blogs";
    apiUrl += "/" + blogId;
    apiUrl += "/posts";
    log.info("apiUrl=" + apiUrl, meta);

    userMgr.findProviderByUserId(userId, GOOGLE_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            return res.status(500).send(err);
        }

        var newPost = {};

        newPost.kind = 'blogger#post';
       if (botPost.tags && botPost.tags.length > 0) {
            newPost.labels = botPost.tags;
        }
        if(botPost.title) {
            newPost.title = botPost.title;
        }
        else {
            newPost.title = bC.makeTitle(botPost);
        }
        newPost.content = bC.convertBotPostToTextContent(botPost);
        newPost.content = bC.convertNewLineToBreakTag(newPost.content);

        request.postEx(apiUrl, {
            json: true,
            headers: {
                "authorization": "Bearer " + provider.accessToken
            },
            body: newPost
        }, function (err, response, body) {
            if (err) {
                log.error(err, meta);
                return res.status(err.statusCode).send(err);
            }

            var botPostList = new botFormat.BotPostList(GOOGLE_PROVIDER, blogId);

            try {
                var rawPost = body;
                var botPost = new botFormat.BotTextPost(rawPost.id, " ", rawPost.updated, rawPost.url, rawPost.title, [],
                            rawPost.labels);
                botPostList.posts.push(botPost);
            }
            catch(e) {
                log.error(e, meta);
                log.error(body, meta);
                return res.status(500).send(e);
            }

            return res.send(botPostList);
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

/**
 *
 * @param user
 * @param provider
 * @param callback
 * @private
 */
function _updateAccessToken(user, provider, callback) {
    var url =  GOOGLE_API_URL + "/oauth2/v3/token";
    request.postEx(url, {
        json: true,
        form: {"client_id": clientConfig.clientID,
            "client_secret": clientConfig.clientSecret,
            "refresh_token": provider.refreshToken,
            "grant_type": 'refresh_token'
        }
    }, function (err, response, body) {
        if (err) {
            log.error(err);
            return callback(err);
        }

        log.info(body);
        var newProvider = userMgr.updateAccessToken(user, provider, body.access_token, body.refresh_token, body.expires_in);
        return callback(null, newProvider);
    });
}

router.post('/bot_posts/updateToken', function (req, res) {
    var userId = userMgr.getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":GOOGLE_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta) ;

    userMgr.findProviderByUserId(userId, GOOGLE_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            return res.status(500).send(err);
        }
        _updateAccessToken(user, provider, function (err, newProvider) {
            if (err) {
                log.error(err, meta);
                return res.status(err.statusCode).send(err);
            }
            res.send(newProvider);
        });
    });
});

module.exports = router;
