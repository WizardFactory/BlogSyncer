/**
 * Created by aleckim on 2014. 7. 19..
 */

// load up the user model
var UserDb = require('../models/userdb');

var express = require('express');
var passport = require('passport');
var request = require('request');
var KakaoStrategy = require('passport-kakao').Strategy;
var blogBot = require('./blogbot');

var router = express.Router();

var svcConfig = require('../models/svcConfig.json');
var clientConfig = svcConfig.kakao;

var KAKAO_API_URL = "https://kapi.kakao.com";

passport.serializeUser(function(user, done) {
    "use strict";
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    "use strict";
    done(null, obj);
});

function _updateOrCreateUser(req, provider, callback) {
    "use strict";
    var meta = {};

    meta.cName = "kakao";
    meta.fName = "_updateOrCreateUser";
    meta.providerName = provider.providerName;
    meta.providerId = provider.providerId;

    UserDb.findOne({'providers.providerName':provider.providerName,
                    'providers.providerId': provider.providerId},
        function (err, user) {
            var p;
            var isNewProvider = false;

            if (err) {
                return callback(err);
            }

            // if there is a user id already but no token (user was linked at one point and then removed)
            if (user) {
                log.debug("Found user="+user._id, meta);
                p = user.findProvider("kakao");
                if (p.accessToken !== provider.accessToken) {
                    p.accessToken = provider.accessToken;
                    p.refreshToken = provider.refreshToken;
                    user.save (function(err) {
                        if (err) {
                            return callback(err);
                        }
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
                    UserDb.findById(req.user._id, function (err, user) {
                        if (err) {
                            log.error(err.toString(), meta);
                            return callback(err);
                        }
                        if (!user) {
                            log.error("Fail to get user id="+req.user._id, meta);
                            log.error(err.toString(), meta);
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
                    var newUser = new UserDb();
                    newUser.providers = [];

                    newUser.providers.push(provider);
                    newUser.save(function(err) {
                        if (err) {
                            return callback(err);
                        }
                        return callback(null, newUser, isNewProvider);
                    });
                }
            }
        } );
}

passport.use(new KakaoStrategy({
        clientID: clientConfig.clientID,
        callbackURL: svcConfig.svcURL + "/kakao/authorized",
        passReqToCallback : true
    },
    function(req, accessToken, refreshToken, profile, done) {
        "use strict";
        var provider;
        var meta = {};

        meta.cName = "kakao";
        meta.fName = "passport.use";

        //log.debug("accessToken:" + accessToken, meta);
        //log.debug("refreshToken:" + refreshToken, meta);
        //log.debug("profile:" + JSON.stringify(profile), meta);

        provider = {
            "providerName": profile.provider,
            "accessToken": accessToken,
            "refreshToken": refreshToken,
            "providerId": profile.id.toString(),
            "displayName": profile.username
        };

        _updateOrCreateUser(req, provider, function(err, user, isNewProvider) {
            if (err) {
                log.error("Fail to get user", meta);
                return done(err);
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
    passport.authenticate('kakao')
);

router.get('/authorized',
    passport.authenticate('kakao', { failureRedirect: '/#signin' }),
    function(req, res) {
        "use strict";
        var meta = {};

        meta.cName = "kakao";
        meta.fName = "/authorized";

        // Successful authentication, redirect home.
        log.debug("Successful!", meta);
        res.redirect('/#');
    }
);

function _getUserId(req, res) {
    "use strict";
    var userId;
    var errorMsg;
    var meta = {};

    meta.cName = "kakao";
    meta.fName = "_getUserId";

    if (req.user) {
        userId = req.user._id;
    }
    else if (req.query.userid)
    {
       //this request form child process;
       userId = req.query.userid;
    }
    else {
        errorMsg = 'You have to login first!';
        log.debug(errorMsg, meta);
        res.send(errorMsg);
        res.redirect("/#/signin");
    }

    return userId;
}

function _checkError(err, response, body) {
    "use strict";
    var errStr;
    var meta = {};

    meta.cName = "kakao";
    meta.fName = "_checkError";

    if (err) {
        log.debug(err);
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

function _requestPost(url, accessToken, data, callback) {
    "use strict";

    request.post(url, {
        headers: {
            "authorization": "Bearer " + accessToken
        },
        form: data
    }, function (err, response, body) {
        callback(err, response, body);
    });
}

router.get('/me', function (req, res) {
    "use strict";

    var userId = _getUserId(req);
    if (!userId) {
        return;
    }

    UserDb.findById(userId, function (err, user) {
        var p;
        var apiUrl;

        p = user.findProvider("kakao");
        apiUrl = KAKAO_API_URL + "/v1/user/me";

        log.debug(apiUrl);

        _requestGet(apiUrl, p.accessToken, function (err, response, body) {
            log.debug(body);
            res.send(body);
        });
    });
});

router.get('/mystories', function (req, res) {
    "use strict";
    var userId;

    userId = _getUserId(req);
    if (!userId) {
        return;
    }

    UserDb.findById(userId, function (err, user) {
        var p;
        var apiUrl;

        p = user.findProvider("kakao");

        apiUrl = KAKAO_API_URL + "/v1/api/story/mystories";

        log.debug(apiUrl);

        _requestGet(apiUrl, p.accessToken, function (err, response, body) {
            //log.debug(body);
            res.send(body);
        });
    });
});

router.get('/bot_bloglist', function (req, res) {
    "use strict";
    var userId;

    log.debug(req.url);

    userId = _getUserId(req);
    if (!userId) {
        return;
    }

    UserDb.findById(userId, function (err, user) {
        var p;
        var apiUrl;

        p = user.findProvider("kakao");
        apiUrl = KAKAO_API_URL + "/v1/user/me";

        log.debug(apiUrl);

        _requestGet(apiUrl, p.accessToken, function (err, response, body) {
            var hasError;
            var nickName;
            var blogUrl;
            var sendData;

            hasError = _checkError(err, response, body);
            if (hasError) {
                res.statusCode = response.statusCode;
                res.send(hasError);
                return;
            }

            nickName = body.properties.nickname;
            blogUrl = "stroy.kakao.com/" + nickName;
            sendData = {};
            sendData.provider = p;
            sendData.blogs = [];
            sendData.blogs.push({"blog_id": nickName, "blog_title": nickName, "blog_url": blogUrl});
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
    "use strict";
    var userId;
    var blogId;
    var sendData;

    log.debug(req.url);

    userId = _getUserId(req);
    if (!userId) {
        return;
    }

    //kakao did not support post_count.
    blogId = req.params.blog_id;
    sendData = {};
    sendData.provider_name = 'kakao';
    sendData.blog_id = blogId;
    sendData.post_count = -1;

    res.send(sendData);
 });

router.get('/bot_posts/:blog_id', function (req, res) {
    "use strict";
    var userId;

    log.debug(req.url);

    userId = _getUserId(req);
    if (!userId) {
        return;
    }

    UserDb.findById(userId, function (err, user) {
        var p;
        var blogId;
        var lastId;
        var after;
        var apiUrl;

        blogId = req.params.blog_id;
        lastId = req.query.offset;
        after = req.query.after;

        p = user.findProvider("kakao");
        apiUrl = KAKAO_API_URL + "/v1/api/story/mystories";
        if (lastId) {
            apiUrl += "?";
            apiUrl += "last_id=" + lastId;
        }

        log.debug(apiUrl);

        _requestGet(apiUrl, p.accessToken, function (err, response, body) {
            var hasError;
            var sendData;
            var i;
            var rawPost;
            var postDate;
            var afterDate;
            var sendPost;

            hasError = _checkError(err, response, body);
            if (hasError) {
                res.statusCode = response.statusCode;
                res.send(hasError);
                return;
            }

            sendData = {};
            sendData.provider_name = 'kakao';
            sendData.blog_id = blogId;
            sendData.posts = [];

            for (i = 0; i < body.length; i+=1) {
                rawPost = body[i];
                if (after) {
                    postDate = new Date(rawPost.created_at);
                    afterDate = new Date(after);

                    if (postDate < afterDate) {
                        //log.debug('post is before');
                        continue;
                    }
                }

                sendPost = {};
                //send_post.title;
                sendPost.modified = rawPost.created_at;
                sendPost.id = rawPost.id;
                sendPost.url = rawPost.url;
                sendPost.categories = [];
                sendPost.tags = [];
                sendPost.content = rawPost.content;

                sendData.posts.push(sendPost);
            }
            sendData.post_count = sendData.posts.length;
            res.send(sendData);
        });
    });
});

router.get('/bot_posts/:blog_id/:post_id', function (req, res) {
    "use strict";
    var userId;

    log.debug(req.url);

    userId = _getUserId(req);
    if (!userId) {
        return;
    }

    UserDb.findById(userId, function (err, user) {
        var p;
        var blogId;
        var postId;
        var apiUrl;

        blogId = req.params.blog_id;
        postId = req.params.post_id;

        p = user.findProvider("kakao");

        apiUrl = KAKAO_API_URL + "/v1/api/story/mystory";
        if (postId) {
            apiUrl += "?";
            apiUrl += "id=" + postId;
        }
        log.debug(apiUrl);

        _requestGet(apiUrl, p.accessToken, function (err, response, body) {
            var hasError;
            var sendData;
            var rawPost;
            var sendPost;

            //log.debug(body);
            hasError = _checkError(err, response, body);
            if (hasError) {
                res.statusCode = response.statusCode;
                res.send(hasError);
                return;
            }

            sendData = {};
            sendData.provider_name = 'kakao';
            sendData.blog_id = blogId;
            sendData.post_count = 1;
            sendData.posts = [];

            {
                rawPost = body;
                sendPost = {};
                //send_post.title;
                sendPost.modified = rawPost.created_at;
                sendPost.id = rawPost.id;
                sendPost.url = rawPost.url;
                sendPost.categories = [];
                sendPost.tags = [];

                sendPost.content = rawPost.content;
                sendPost.replies = [];
                sendPost.replies.push({"comment_count": rawPost.comment_count});
                sendPost.replies.push({"like_count": rawPost.like_count});
                sendData.posts.push(sendPost);
            }

            res.send(sendData);
        });
    });
});

function _convertToURL(postId) {
    "use strict";
    var indexOfDot;
    var str;

    indexOfDot = postId.indexOf(".");
    str = postId.substring(0,indexOfDot);
    str += "/";
    str += postId.substring(indexOfDot+1);

    log.debug(str);
    return str;
}

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
    var userId;
    var newPost;

    log.debug(req.url);

    userId = _getUserId(req);
    if (!userId) {
        return;
    }

    newPost = _makeNewPost(req.body);

    UserDb.findById(userId, function (err, user) {
        var blogId;
        var p;
        var apiUrl;

        blogId = req.params.blog_id;
        p = user.findProvider("kakao");
        apiUrl = KAKAO_API_URL + "/v1/api/story/post/note";
        log.debug(apiUrl);

        _requestPost(apiUrl, p.accessToken, newPost, function (err, response, body) {
            var hasError;
            var sendData;
            var sendPost;
            var rawPost;
            var errMsg;

            hasError = _checkError(err, response, body);
            if (hasError) {
                res.statusCode = response.statusCode;
                res.send(hasError);
                return;
            }

            //log.debug(data);

            //add post info
            sendData = {};
            sendData.provider_name = 'kakao';
            sendData.blog_id = blogId;
            sendData.posts = [];

            sendPost = {};
            if (typeof(body) === "string") {
                rawPost = JSON.parse(body);
            }
            else if (typeof(body) === "object") {
                rawPost = body;
            }

            sendPost.modified = new Date();

            if (!rawPost) {
                errMsg = "Fail to post";
                log.debug(errMsg);
                res.send(errMsg);
                return;
            }

            sendPost.id = rawPost.id;
            sendPost.url = "https://story.kakao.com" + "/" + _convertToURL(rawPost.id);
            sendPost.categories = [];
            sendPost.tags = [];
            sendPost.content = newPost.content;

            sendData.posts.push(sendPost);
            log.debug(sendData);
            res.send(sendData);
        });
    });
});


router.get('/bot_comments/:blogID/:postID', function (req, res) {
    "use strict";
    var userId;

    log.debug(req.url);

    userId = _getUserId(req);
    if (!userId) {
        return;
    }

    UserDb.findById(userId, function (err, user) {
        var blogId;
        var postId;
        var p;
        var apiUrl;

        blogId = req.params.blogID;
        postId = req.params.postID;
        p = user.findProvider("kakao");
        apiUrl = KAKAO_API_URL+"/v1/api/story/mystory";

        if (postId) {
            apiUrl += "?";
            apiUrl += "id=" + postId;
        }

        log.debug(apiUrl);

        _requestGet(apiUrl, p.accessToken, function (err, response, body) {
            var hasError;
            var send;
            var i;
            var comment;

            hasError = _checkError(err, response, body);
            if (hasError) {
                res.statusCode = response.statusCode;
                res.send(hasError);
                return;
            }
            log.debug(body);

            send = {};
            send.providerName = "kakao";
            send.blogID = blogId;
            send.postID = postId;
            send.found = body.comment_count;
            send.comments = [];

            for (i = 0; i < body.comment_count; i+=1) {
                comment = {};
                comment.URL = body.url;
                comment.content = body.comments[i].text;
                send.comments.push(comment);
            }
            res.send(send);
        });
    });
});

module.exports = router;
