/**
 * Created by aleckim on 2014. 7. 19..
 */

var router = require('express').Router();
var passport = require('passport');
var request = require('request');

var blogBot = require('./blogbot');
var userMgr = require('./userManager');
var svcConfig = require('../models/svcConfig.json');

var clientConfig = svcConfig.kakao;
var KakaoStrategy = require('passport-kakao').Strategy;
var KAKAO_API_URL = "https://kapi.kakao.com";
var KAKAO_PROVIDER = "kakao";

passport.serializeUser(function(user, done) {
    "use strict";
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    "use strict";
    done(null, obj);
});

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

router.get('/me', function (req, res) {
    "use strict";

    var userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }

    userMgr._findProviderByUserId(userId, KAKAO_PROVIDER, undefined, function (err, user, provider) {
        var apiUrl;

        if (err) {
            log.error("Fail to find provider");
            log.error(err.toString());
            return res.send(err);
        }

        apiUrl = KAKAO_API_URL + "/v1/user/me";

        log.debug(apiUrl);
        _requestGet(apiUrl, provider.accessToken, function (err, response, body) {
            log.debug(body);
            res.send(body);
        });
    });
});

router.get('/mystories', function (req, res) {
    "use strict";
    var userId;

    userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }

    userMgr._findProviderByUserId(userId, KAKAO_PROVIDER, undefined, function (err, user, provider) {
        var apiUrl;

        if (err) {
            log.error("Fail to find provider");
            log.error(err.toString());
            return res.send(err);
        }

        apiUrl = KAKAO_API_URL + "/v1/api/story/mystories";

        log.debug(apiUrl);
        _requestGet(apiUrl, provider.accessToken, function (err, response, body) {
            //log.debug(body);
            res.send(body);
        });
    });
});

router.get('/bot_bloglist', function (req, res) {
    "use strict";
    var userId;
    var providerId;

    log.debug(req.url);

    userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }
    providerId = req.query.providerid;

    userMgr._findProviderByUserId(userId, KAKAO_PROVIDER, providerId, function (err, user, provider) {
        var apiUrl;

        if (err) {
            log.error("Fail to find provider");
            log.error(err.toString());
            return res.send(err);
        }

        apiUrl = KAKAO_API_URL + "/v1/user/me";

        log.debug(apiUrl);
        _requestGet(apiUrl, provider.accessToken, function (err, response, body) {
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
            sendData.provider = provider;
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

    userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }

    //kakao did not support post_count.
    blogId = req.params.blog_id;
    sendData = {};
    sendData.provider_name = KAKAO_PROVIDER;
    sendData.blog_id = blogId;
    sendData.post_count = -1;

    res.send(sendData);
 });

router.get('/bot_posts/:blog_id', function (req, res) {
    "use strict";
    var userId;

    log.debug(req.url);

    userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }

    userMgr._findProviderByUserId(userId, KAKAO_PROVIDER, undefined, function (err, user, provider) {
        var blogId;
        var lastId;
        var after;
        var apiUrl;

        if (err) {
            log.error("Fail to find provider");
            log.error(err.toString());
            return res.send(err);
        }

        blogId = req.params.blog_id;
        lastId = req.query.offset;
        after = req.query.after;
        apiUrl = KAKAO_API_URL + "/v1/api/story/mystories";
        if (lastId) {
            apiUrl += "?";
            apiUrl += "last_id=" + lastId;
        }

        log.debug(apiUrl);

        _requestGet(apiUrl, provider.accessToken, function (err, response, body) {
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
            sendData.provider_name = KAKAO_PROVIDER;
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

    userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }

    userMgr._findProviderByUserId(userId, KAKAO_PROVIDER, undefined, function (err, user, provider) {
        var blogId;
        var postId;
        var apiUrl;

        if (err) {
            log.error("Fail to find provider");
            log.error(err.toString());
            return res.send(err);
        }

        blogId = req.params.blog_id;
        postId = req.params.post_id;
        apiUrl = KAKAO_API_URL + "/v1/api/story/mystory";
        if (postId) {
            apiUrl += "?";
            apiUrl += "id=" + postId;
        }
        log.debug(apiUrl);

        _requestGet(apiUrl, provider.accessToken, function (err, response, body) {
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
            sendData.provider_name = KAKAO_PROVIDER;
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

function _postText(accessToken, rcvPost, callback) {
    "use strict";

    var apiUrl;
    apiUrl = KAKAO_API_URL + "/v1/api/story/post/note";
    log.debug(apiUrl);

    var newPost;
    newPost = _makeNewPost(rcvPost);
    callback(undefined, apiUrl, rcvPost);
}

function _postLink(accessToken, rcvPost, callback) {
    "use strict";
    var meta={};
    meta.cName = "kakao";
    meta.fName = "_postLink";

    var linkInfoUrl;
    linkInfoUrl = KAKAO_API_URL + "/v1/api/story/linkinfo";
    linkInfoUrl += "?";
    linkInfoUrl += "url=" + rcvPost.url;
    log.debug(linkInfoUrl);

    _requestGet(linkInfoUrl, accessToken, function (err, response, body) {

        var hasError;
        hasError = _checkError(err, response, body);
        if (hasError) {
            log.error("Fail to get link info", meta);
            callback(err, undefined, undefined);
            return;
        }

        var apiUrl;
        apiUrl = KAKAO_API_URL + "/v1/api/story/post/link";
        log.debug(apiUrl, meta);

        log.debug(body, meta);

        var data = {};
        data.link_info = JSON.stringify(body);
        if (rcvPost.title) {
            data.content = rcvPost.title;
        }
        else if (rcvPost.content) {
            data.content = rcvPost.content;
        }
        else {
            data.content = " ";
        }

        log.debug(data, meta);

        callback(undefined, apiUrl, data);
    });
}

function _responsePostResult(blogId, content, body, callback) {
    "use strict";
    var sendData;
    var sendPost;
    var rawPost;
    var errMsg;

    //log.debug(body);

    //add post info
    sendData = {};
    sendData.provider_name = KAKAO_PROVIDER;
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
        callback(errMsg, undefined);
        return;
    }

    sendPost.id = rawPost.id;
    sendPost.url = "https://story.kakao.com" + "/" + _convertToURL(rawPost.id);
    sendPost.categories = [];
    sendPost.tags = [];
    sendPost.content = content;

    sendData.posts.push(sendPost);
    log.debug(sendData);

    callback (undefined, sendData);
}

router.post('/bot_posts/new/:blog_id', function (req, res) {
    "use strict";

    var meta={};
    meta.cName = "kakao";
    meta.fName = "/bot_posts/new";

    log.debug(req.url);

    var userId;
    userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }
    meta.userId = userId;

    blogId = req.params.blog_id;
    meta.blogId = blogId;

    var postType;
    postType = req.query.postType;
    if (!postType) {
        log.error("postType is undefined, so it set to text", meta);
        postType = "text";
    }

    var rcvPost;
    rcvPost = req.body;

    var blogId;
    blogId = req.params.blog_id;


    userMgr._findProviderByUserId(userId, KAKAO_PROVIDER, undefined, function (err, user, provider) {

        if (err) {
            log.error("Fail to find provider");
            log.error(err.toString());
            return res.send(err);
        }

        var postFunc;
        if (postType === "text") {
            postFunc = _postText;
        }
        else if (postType === "link") {
            postFunc = _postLink;
        }
        else {
            //need to refactoring make a error object;
            err = "postType was undefined";
            log.error(err);
            return res.send(err);
        }

        postFunc(provider.accessToken, rcvPost, function(err, apiUrl, postData) {
            if (err) {
                log.error(err.toString());
                return res.send(err);
            }

            _requestPost(apiUrl, provider.accessToken, postData, function(err, response, body) {
                var hasError;
                hasError = _checkError(err, response, body);
                if (hasError) {
                    if (response && response.statusCode) {
                        res.statusCode = response.statusCode;
                    }
                    res.send(hasError);
                    return;
                }

                _responsePostResult(blogId, rcvPost.content, body, function(err, sendData) {
                    if (err) {
                        log.error(err.toString());
                        return res.send(err);
                    }

                    res.send(sendData);
                });
            });
        });
    });
});


router.get('/bot_comments/:blogID/:postID', function (req, res) {
    "use strict";
    var userId;

    log.debug(req.url);

    userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }

    userMgr._findProviderByUserId(userId, KAKAO_PROVIDER, undefined, function (err, user, provider) {
        var blogId;
        var postId;
        var apiUrl;

        if (err) {
            log.error("Fail to find provider");
            log.error(err.toString());
            return res.send(err);
        }

        blogId = req.params.blogID;
        postId = req.params.postID;
        apiUrl = KAKAO_API_URL+"/v1/api/story/mystory";

        if (postId) {
            apiUrl += "?";
            apiUrl += "id=" + postId;
        }

        log.debug(apiUrl);

        _requestGet(apiUrl, provider.accessToken, function (err, response, body) {
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
            send.providerName = KAKAO_PROVIDER;
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

function _checkError(err, response, body) {
    "use strict";
    var errStr;
    var meta = {};

    meta.cName = "kakao";
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

module.exports = router;
