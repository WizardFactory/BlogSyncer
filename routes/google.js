/**
 * Created by aleckim on 2014. 7. 19..
 */

"use strict";

var router = require('express').Router();
var passport = require('passport');
var request = require('../controllers/requestEx');

var blogBot = require('./../controllers/blogbot');
var userMgr = require('./../controllers/userManager');
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
    function(req, accessToken, refreshToken, profile, done) {
        var meta = {"cName": GOOGLE_PROVIDER, "fName":"passport.use" };

//        log.debug("accessToken:" + accessToken, meta);
//        log.debug("refreshToken:" + refreshToken, meta);
//        log.debug("profile:" + JSON.stringify(profile), meta);

        //It's not correct information. but I confirmed by /blogger/v3/users/self"
        var providerId = "g"+profile.id;

        var provider = {
            "providerName": profile.provider,
            "accessToken": accessToken,
            "refreshToken": refreshToken,
            "providerId": providerId.toString(),
            "displayName": profile.displayName
        };

        userMgr._updateOrCreateUser(req, provider, function(err, user, isNewProvider, delUser) {
            if (err) {
                log.error("Fail to get user", meta);
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
    var userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":GOOGLE_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var apiUrl = GOOGLE_API_URL + "/blogger/v3/users";
    apiUrl += "/self";
    log.info("apiUrl="+apiUrl, meta);

    userMgr._findProviderByUserId(userId, GOOGLE_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            return res.status(500).send(err);
        }

        _requestGet(apiUrl, provider.accessToken, function (err, response, body) {
            if (err) {
                if (err.statusCode === 401) {
                    //update access token from refresh token;
                    _updateAccessToken(user, provider);
                }
                log.error(err, meta);
                return res.status(err.statusCode).send(err);
            }
            log.debug(body, meta);
            res.send(body);
        });
    });
});

router.get('/bot_bloglist', function (req, res) {
    var userId = userMgr._getUserId(req);
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


    userMgr._findProviderByUserId(userId, GOOGLE_PROVIDER, providerId, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            return res.status(500).send(err);
        }

        _requestGet(apiUrl, provider.accessToken, function (err, response, body) {
            if (err) {
                if (err.statusCode === 401) {
                    //update access token from refresh token;
                    _updateAccessToken(user, provider);
                }
                log.error(err, meta);
                log.status(err.statusCode).send(err);
            }

            var sendData = {};
            sendData.provider = provider;
            sendData.blogs = [];

            try {
                var items = body.items;
                log.debug("items length=" + items.length, meta);

                for (var i = 0; i < items.length; i+=1) {
                    sendData.blogs.push({"blog_id": items[i].id, "blog_title": items[i].name, "blog_url": items[i].url});
                }
            }
            catch(e) {
                log.error(e, meta);
                log.error(body, meta);
                return res.status(500).send(e);
            }

            /*
             { "provider":object, "blogs":
             [ {"blog_id":12, "blog_title":"wzdfac", "blog_url":"wzdfac.iptime.net"},
             {"blog_id":12, "blog_title":"wzdfac", "blog_url":"wzdfac.iptime.net"} ] },
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
    var meta = {"cName":GOOGLE_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var blogId = req.params.blog_id;
    var apiUrl = GOOGLE_API_URL + "/blogger/v3";
    apiUrl += "/blogs";
    apiUrl += "/"+blogId;
    log.info("apiUrl="+apiUrl, meta);

    userMgr._findProviderByUserId(userId, GOOGLE_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            return res.status(500).send(err);
        }

        _requestGet(apiUrl, provider.accessToken, function (err, response, body) {
            if (err) {
                if (err.statusCode === 401) {
                    //update access token from refresh token;
                    _updateAccessToken(user, provider);
                }
                log.error(err, meta);
                return res.status(err.statusCode).send(err);
            }
            var sendData = {};
            sendData.provider_name = GOOGLE_PROVIDER;

            try {
                sendData.blog_id = body.id;
                sendData.post_count = body.posts.totalItems;
            }
            catch(e) {
                log.error(e, meta);
                log.error(body, meta);
                return res.status(500).send(e);
            }
            log.info("post_count="+sendData.post_count, meta);
            res.send(sendData);
        });
    });
});

router.get('/bot_posts/:blog_id', function (req, res) {
    var userId = userMgr._getUserId(req, res);
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

    userMgr._findProviderByUserId(userId, GOOGLE_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            return res.status(500).send(err);
        }

        _requestGet(apiUrl, provider.accessToken, function (err, response, body) {
            if(err) {
                if (err.statusCode === 401) {
                    //update access token from refresh token;
                    _updateAccessToken(user, provider);
                }
                log.error(err, meta);
                return res.status(err.statusCode).send(err);
            }

            var sendData = {};
            sendData.provider_name = GOOGLE_PROVIDER;
            sendData.blog_id = blogId;
            try {
                if (body.items) {
                    sendData.post_count = body.items.length;
                }
                else {
                    sendData.post_count = 0;
                }

                sendData.nextPageToken = body.nextPageToken;
                sendData.posts = [];

                for (var i = 0; i<sendData.post_count; i+=1) {
                    var item = body.items[i];
                    var sendPost = {};
                    sendPost.title = item.title;
                    sendPost.modified = item.updated;
                    sendPost.id = item.id;
                    sendPost.url = item.url;
                    sendPost.categories = [];
                    sendPost.tags = [];
                    if (item.labels) {
                        for (var j = 0; j < item.labels.length; j += 1) {
                            sendPost.tags.push(item.labels[j]);
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

    userMgr._findProviderByUserId(userId, GOOGLE_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            return res.status(500).send(err);
        }

        _requestGet(apiUrl, provider.accessToken, function (err, response, body) {
            if (err) {
                if (err.statusCode === 401) {
                    //update access token from refresh token;
                    _updateAccessToken(user, provider);
                }
                log.error(err, meta);
                return res.status(err.statusCode).send(err);
            }

            var sendData = {};
            sendData.provider_name = GOOGLE_PROVIDER;
            sendData.blog_id = blogId;
            sendData.post_count = 1;
            sendData.posts = [];

            try {
                var item = body;
                var sendPost = {};
                sendPost.title = item.title;
                sendPost.modified = item.updated;
                sendPost.id = item.id;
                sendPost.url = item.url;
                sendPost.categories = [];
                sendPost.tags = [];
                if (item.labels) {
                    for (var j=0; j<item.labels.length; j+=1) {
                        sendPost.tags.push(item.labels[j]);
                    }
                }
                sendPost.content = item.content;
                sendPost.replies = [];
                sendPost.replies.push({"comment_count":item.replies.totalItems});
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

router.get('/bot_comments/:blogId/:postId', function (req, res) {
    var userId = userMgr._getUserId(req, res);
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

    userMgr._findProviderByUserId(userId, GOOGLE_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            return res.status(500).send(err);
        }

        _requestGet(apiUrl, provider.accessToken, function (err, response, body) {
            if (err) {
                if (err.statusCode === 401) {
                    //update access token from refresh token;
                    _updateAccessToken(user, provider);
                }
                log.error(err, meta);
                return res.status(err.statusCode).send(err);
            }

            var sendData = {};
            sendData.providerName = provider.providerName;
            sendData.blogID = blogId;
            sendData.postID = postId;
            sendData.comments = [];

            try {
                sendData.found = body.items.length;
                for(var i=0; i<body.items.length; i+=1) {
                    var item = body.items[i];
                    var comment = {};
                    comment.date = item.updated;
                    comment.URL = item.selfLink;
                    comment.content = item.content;
                    sendData.comments.push(comment);
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

router.post('/bot_posts/new/:blog_id', function (req, res) {
    var userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":GOOGLE_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta) ;

    var blogId = req.params.blog_id;

    var apiUrl = GOOGLE_API_URL + "/blogger/v3";
    apiUrl += "/blogs";
    apiUrl += "/" + blogId;
    apiUrl += "/posts";
    log.info("apiUrl=" + apiUrl, meta);

    userMgr._findProviderByUserId(userId, GOOGLE_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            return res.status(500).send(err);
        }

        var newPost = {};
        newPost.kind = 'blogger#post';
        //newPost.blog = {};
        newPost.title = req.body.title;
        newPost.content = req.body.content;

        request.postEx(apiUrl, {
            json: true,
            headers: {
                "authorization": "Bearer " + provider.accessToken
            },
            body: newPost
        }, function (err, response, body) {
            if (err) {
                if (err.statusCode === 401) {
                    //update access token from refresh token;
                    _updateAccessToken(user, provider);
                }
                log.error(err, meta);
                return res.status(err.statusCode).send(err);
            }

            var sendData = {};
            sendData.provider_name = GOOGLE_PROVIDER;
            sendData.blog_id = blogId;
            sendData.post_count = 1;
            sendData.posts = [];

            try {
                var item = body;
                var sendPost = {};
                sendPost.title = item.title;
                sendPost.modified = item.updated;
                sendPost.id = item.id;
                sendPost.url = item.url;
                sendPost.categories = [];
                sendPost.tags = [];
                if (item.labels) {
                    for (var j = 0; j < item.labels.length; j += 1) {
                        sendPost.tags.push(item.labels[j]);
                    }
                }
                sendPost.replies = [];
                sendPost.replies.push({"comment_count":item.replies.totalItems});

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
 * @private
 * @bug 401에러 발생한 요청사항은 무시되어버림.
 */
function _updateAccessToken(user, provider) {
    var meta = {};
    meta.cName = GOOGLE_PROVIDER;
    meta.fName = "_updateAccessToken";
    meta.userId = user._id;

    var url =  GOOGLE_API_URL + "/oauth2/v3/token";

    var bodyInfo = {};
    bodyInfo.client_id = clientConfig.clientID;
    bodyInfo.client_secret = clientConfig.clientSecret;
    bodyInfo.refresh_token = provider.refreshToken;
    bodyInfo.grant_type = 'refresh_token';

    log.debug(" ", meta);

    request.postEx(url, {
        json: true,
        form: bodyInfo
    }, function (err, response, body) {
        if (err) {
            log.error(err, meta);
            return;
        }

        log.info(body, meta);
        provider.accessToken = body.access_token;
        user.save (function(err) {
            if (err) {
                log.error("Fail to save user info", meta);
            }
        });
    });
}

module.exports = router;
