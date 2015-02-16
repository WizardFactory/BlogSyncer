/**
 * Created by aleckim on 2014. 7. 19..
 */

var router = require('express').Router();
var passport = require('passport');
var request = require('request');

var blogBot = require('./blogbot');
var userMgr = require('./userManager');
var svcConfig = require('../models/svcConfig.json');

var clientConfig = svcConfig.google;
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var GOOGLE_API_URL = "https://www.googleapis.com";
var GOOGLE_PROVIDER = "google";

passport.serializeUser(function(user, done) {
    "use strict";
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    "use strict";
    done(null, obj);
});

passport.use(new GoogleStrategy({
        clientID: clientConfig.clientID,
        clientSecret: clientConfig.clientSecret,
        callbackURL: svcConfig.svcURL + "/google/authorized",
        passReqToCallback : true
    },
    function(req, accessToken, refreshToken, profile, done) {
        "use strict";
        var providerId;
        var provider;
        var meta = {};

        meta.cName = "google";
        meta.fName = "passport.use";

//        log.debug("accessToken:" + accessToken, meta);
//        log.debug("refreshToken:" + refreshToken, meta);
//        log.debug("profile:" + JSON.stringify(profile), meta);

        //It's not correct information. but I confirmed by /blogger/v3/users/self"
        providerId = "g"+profile.id;

        provider = {
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
        "use strict";
        var meta = {};

        meta.cName = "google";
        meta.fName = "authorized";

        // Successful authentication, redirect home.
        log.debug("Successful!", meta);
        res.redirect('/#');
    }
);

router.get('/info', function (req, res) {
    "use strict";
    var userId;
    var meta = {};

    meta.cName = "google";
    meta.fName = "/info";

    userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }

    meta.userId = userId;

    userMgr._findProviderByUserId(userId, GOOGLE_PROVIDER, undefined, function (err, user, provider) {
        var apiUrl;

        if (err) {
            log.error("Fail to find provider", meta);
            log.error(err.toString(), meta);
            return res.send(err);
        }

        apiUrl = GOOGLE_API_URL + "/blogger/v3/users";
        apiUrl += "/self";

        log.info("apiUrl="+apiUrl, meta);
        _requestGet(apiUrl, provider.accessToken, function (err, response, body) {
            var hasError = _checkError(err, response, body);
            if (hasError) {
                res.statusCode = response.statusCode;
                res.send(hasError);
                if (response.statusCode === 401) {
                    //update access token from refresh token;
                    _updateAccessToken(user, provider);
                }
                return;
            }
            log.debug(body, meta);
            res.send(body);
        });
    });
});

router.get('/bot_bloglist', function (req, res) {
    "use strict";
    var userId;
    var providerId;
    var meta = {};

    meta.cName = "google";
    meta.fName = "/bog_bloglist";

    userId = userMgr._getUserId(req);
    if (!userId) {
        return;
    }
    meta.userId = userId;

    providerId = req.query.providerid;

    userMgr._findProviderByUserId(userId, GOOGLE_PROVIDER, providerId, function (err, user, provider) {
        var apiUrl;

        if (err) {
            log.error("Fail to find provider", meta);
            log.error(err.toString(), meta);
            return res.send(err);
        }

        apiUrl = GOOGLE_API_URL + "/blogger/v3/users";
        apiUrl += "/self";
        apiUrl += "/blogs";
        log.info("apiUrl="+apiUrl, meta);

        _requestGet(apiUrl, provider.accessToken, function (err, response, body) {
            var items;
            var i;
            var sendData = {};
            var hasError = _checkError(err, response, body);
            if (hasError) {
                res.statusCode = response.statusCode;
                res.send(hasError);
                if (response.statusCode === 401) {
                    //update access token from refresh token;
                    _updateAccessToken(user, provider);
                }
                return;
            }
            sendData.provider = provider;
            sendData.blogs = [];

            items = body.items;
            log.debug("items length=" + items.length, meta);

            for (i = 0; i < items.length; i+=1) {
                sendData.blogs.push({"blog_id": items[i].id, "blog_title": items[i].name, "blog_url": items[i].url});
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
    "use strict";
    var userId;
    var blogId;
    var meta = {};

    meta.cName = "google";
    meta.fName = "/bot_post_count";

    userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }

    meta.userId = userId;

    blogId = req.params.blog_id;
    meta.blogId = blogId;

    userMgr._findProviderByUserId(userId, GOOGLE_PROVIDER, undefined, function (err, user, provider) {
        var apiUrl;

        if (err) {
            log.error("Fail to find provider", meta);
            log.error(err.toString(), meta);
            return res.send(err);
        }

        apiUrl = GOOGLE_API_URL + "/blogger/v3";
        apiUrl += "/blogs";
        apiUrl += "/"+blogId;
        log.info("apiUrl="+apiUrl, meta);

        _requestGet(apiUrl, provider.accessToken, function (err, response, body) {
            var hasError;
            var sendData;

            hasError = _checkError(err, response, body);
            if (hasError) {
                res.statusCode = response.statusCode;
                res.send(hasError);
                if (response.statusCode === 401) {
                    //update access token from refresh token;
                    _updateAccessToken(user, provider);
                }
                return;
            }

            sendData = {};
            sendData.provider_name = GOOGLE_PROVIDER;
            sendData.blog_id = body.id;
            sendData.post_count = body.posts.totalItems;
            log.info("post_count="+sendData.post_count, meta);
            res.send(sendData);
        });
    });
});

router.get('/bot_posts/:blog_id', function (req, res) {
    "use strict";
    var userId;
    var blogId;
    var offset;
    var after;  //startDate
    var count;  //maxResults
    var nextPageToken;
    var hasOptionalParameters = false;
    var meta = {};

    meta.cName = "google";
    meta.fName = "/bot_posts";

    userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }
    meta.userId = userId;
    blogId = req.params.blog_id;
    meta.blogId = blogId;

    offset = req.query.offset;
    after = req.query.after;
    nextPageToken = req.query.nextPageToken;

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

    userMgr._findProviderByUserId(userId, GOOGLE_PROVIDER, undefined, function (err, user, provider) {
        var apiUrl;

        if (err) {
            log.error("Fail to find provider", meta);
            log.error(err.toString(), meta);
            return res.send(err);
        }

        apiUrl = GOOGLE_API_URL + "/blogger/v3";
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

        _requestGet(apiUrl, provider.accessToken, function (err, response, body) {
            var hasError;
            var sendData;
            var i;
            var sendPost;
            var item;
            var j;

            hasError = _checkError(err, response, body);
            if (hasError) {
                res.statusCode = response.statusCode;
                res.send(hasError);
                if (response.statusCode === 401) {
                    //update access token from refresh token;
                    _updateAccessToken(user, provider);
                }
                return;
            }

            sendData = {};
            sendData.provider_name = GOOGLE_PROVIDER;
            sendData.blog_id = blogId;

            if (body.items) {
                sendData.post_count = body.items.length;
            }
            else {
                sendData.post_count = 0;
            }

            sendData.nextPageToken = body.nextPageToken;
            sendData.posts = [];

            for (i = 0; i<sendData.post_count; i+=1) {
                item = body.items[i];
                sendPost = {};
                sendPost.title = item.title;
                sendPost.modified = item.updated;
                sendPost.id = item.id;
                sendPost.url = item.url;
                sendPost.categories = [];
                sendPost.tags = [];
                if (item.labels) {
                    for (j = 0; j < item.labels.length; j += 1) {
                        sendPost.tags.push(item.labels[j]);
                    }
                }
                sendData.posts.push(sendPost);
            }

            res.send(sendData);
        });
    });
});

router.get('/bot_posts/:blog_id/:post_id', function (req, res) {
    "use strict";
    var userId;
    var blogId;
    var postId;
    var meta = {};

    meta.cName = "google";
    meta.fName = "/bot_posts";

    userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }
    meta.userId = userId;
    blogId = req.params.blog_id;
    meta.blogId = blogId;
    postId = req.params.post_id;
    meta.postId = postId;

    userMgr._findProviderByUserId(userId, GOOGLE_PROVIDER, undefined, function (err, user, provider) {
        var apiUrl;

        if (err) {
            log.error("Fail to find provider", meta);
            log.error(err.toString(), meta);
            return res.send(err);
        }

        apiUrl = GOOGLE_API_URL + "/blogger/v3";
        apiUrl += "/blogs";
        apiUrl += "/" + blogId;
        apiUrl += "/posts";
        apiUrl += "/" + postId;

        log.info("apiUrl=" + apiUrl, meta);

        _requestGet(apiUrl, provider.accessToken, function (err, response, body) {
            var hasError;
            var sendData;
            var sendPost;
            var item;
            var j;

            hasError = _checkError(err, response, body);
            if (hasError) {
                res.statusCode = response.statusCode;
                res.send(hasError);
                if (response.statusCode === 401) {
                    //update access token from refresh token;
                    _updateAccessToken(user, provider);
                }
                return;
            }
            sendData = {};
            sendData.provider_name = GOOGLE_PROVIDER;
            sendData.blog_id = blogId;
            sendData.post_count = 1;
            sendData.posts = [];

            item = body;
            sendPost = {};
            sendPost.title = item.title;
            sendPost.modified = item.updated;
            sendPost.id = item.id;
            sendPost.url = item.url;
            sendPost.categories = [];
            sendPost.tags = [];
            if (item.labels) {
                for (j=0; j<item.labels.length; j+=1) {
                    sendPost.tags.push(item.labels[j]);
                }
            }
            sendPost.content = item.content;
            sendPost.replies = [];
            sendPost.replies.push({"comment_count":item.replies.totalItems});

            sendData.posts.push(sendPost);

            res.send(sendData);
        });
    });
});

router.get('/bot_comments/:blogId/:postId', function (req, res) {
    "use strict";
    var userId;
    var blogId;
    var postId;
    var meta = {};

    meta.cName = "google";
    meta.fName = "/bot_comments";
    userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }
    meta.userId = userId;
    blogId = req.params.blogId;
    meta.blogId = blogId;
    postId = req.params.postId;
    meta.postId = postId;

    userMgr._findProviderByUserId(userId, GOOGLE_PROVIDER, undefined, function (err, user, provider) {
        var apiUrl;

        if (err) {
            log.error("Fail to find provider", meta);
            log.error(err.toString(), meta);
            return res.send(err);
        }

        apiUrl = GOOGLE_API_URL + "/blogger/v3";
        apiUrl += "/blogs";
        apiUrl += "/" + blogId;
        apiUrl += "/posts";
        apiUrl += "/" + postId;
        apiUrl += "/comments";

        log.info("apiUrl=" + apiUrl, meta);

        _requestGet(apiUrl, provider.accessToken, function (err, response, body) {
            var hasError;
            var sendData;
            var comment;
            var item;
            var i;

            hasError = _checkError(err, response, body);
            if (hasError) {
                res.statusCode = response.statusCode;
                res.send(hasError);
                if (response.statusCode === 401) {
                    //update access token from refresh token;
                    _updateAccessToken(user, provider);
                }
                return;
            }

            sendData = {};
            sendData.providerName = provider.providerName;
            sendData.blogID = blogId;
            sendData.postID = postId;
            sendData.found = body.items.length;
            sendData.comments = [];

            comment = {};

            for(i=0; i<body.items.length; i+=1) {
                item = body.items[i];
                comment.date = item.updated;
                comment.URL = item.selfLink;
                comment.content = item.content;
                sendData.comments.push(comment);
            }

            res.send(sendData);
        });
    });
});

router.post('/bot_posts/new/:blog_id', function (req, res) {
    "use strict";
    var userId;
    var blogId;
    var meta = {};

    meta.cName = "google";
    meta.fName = "/bog_posts/new";

    userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }
    meta.userId = userId;
    blogId = req.params.blog_id;
    meta.blogId = blogId;

    userMgr._findProviderByUserId(userId, GOOGLE_PROVIDER, undefined, function (err, user, provider) {
        var apiUrl;
        var newPost;

        if (err) {
            log.error("Fail to find provider", meta);
            log.error(err.toString(), meta);
            return res.send(err);
        }

        apiUrl = GOOGLE_API_URL + "/blogger/v3";
        apiUrl += "/blogs";
        apiUrl += "/" + blogId;
        apiUrl += "/posts";

        log.info("apiUrl=" + apiUrl, meta);

        newPost = {};
        newPost.kind = 'blogger#post';
        //newPost.blog = {};
        newPost.title = req.body.title;
        newPost.content = req.body.content;

        request.post(apiUrl, {
            json: true,
            headers: {
                "authorization": "Bearer " + provider.accessToken
            },
            body: newPost
        }, function (err, response, body) {
            var hasError;
            var sendData;
            var sendPost;
            var item;
            var j;

            hasError = _checkError(err, response, body);
            if (hasError) {
                res.statusCode = response.statusCode;
                res.send(hasError);
                if (response.statusCode === 401) {
                    //update access token from refresh token;
                    _updateAccessToken(user, provider);
                }
                return;
            }

            sendData = {};
            sendData.provider_name = GOOGLE_PROVIDER;
            sendData.blog_id = blogId;
            sendData.post_count = 1;
            sendData.posts = [];

            item = body;
            sendPost = {};
            sendPost.title = item.title;
            sendPost.modified = item.updated;
            sendPost.id = item.id;
            sendPost.url = item.url;
            sendPost.categories = [];
            sendPost.tags = [];
            if (item.labels) {
                for (j = 0; j < item.labels.length; j += 1) {
                    sendPost.tags.push(item.labels[j]);
                }
            }
            sendPost.replies = [];
            sendPost.replies.push({"comment_count":item.replies.totalItems});

            sendData.posts.push(sendPost);

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

/**
 *
 * @param user
 * @param provider
 * @private
 * @bug 401에러 발생한 요청사항은 무시되어버림.
 */
function _updateAccessToken(user, provider) {
    "use strict";
    var url;
    var bodyInfo;
    var hasError;
    var meta = {};

    meta.cName = "google";
    meta.fName = "_updateAccessToken";
    meta.userId = user._id;

    url =  GOOGLE_API_URL + "/oauth2/v3/token";

    bodyInfo = {};
    bodyInfo.client_id = clientConfig.clientID;
    bodyInfo.client_secret = clientConfig.clientSecret;
    bodyInfo.refresh_token = provider.refreshToken;
    bodyInfo.grant_type = 'refresh_token';

    log.debug(" ", meta);

    request.post(url, {
        json: true,
        form: bodyInfo
    }, function (err, response, body) {
        hasError = _checkError(err, response, body);
        if (hasError) {
            log.error("Fail to get new access token", meta);
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

/**
 *
 * @param err
 * @param response
 * @param body
 * @returns {*}
 * @private
 */
function _checkError(err, response, body) {
    "use strict";
    var errStr;
    var meta = {};

    meta.cName = "google";
    meta.fName = "_checkError";

    if (err) {
        log.debug(err, meta);
        return err;
    }
    if (response.statusCode >= 400) {
        errStr = "API error: " + response.statusCode;
        if (body.error) {
            if (body.error.message) {
                errStr += " " + body.error.message;
            }
        }
        log.error(body, meta);
        log.error(errStr, meta);
        return new Error(errStr);
    }
}

module.exports = router;
