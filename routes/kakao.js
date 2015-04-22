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

var clientConfig = svcConfig.kakao;
var KakaoStrategy = require('passport-kakao').Strategy;
var KAKAO_API_URL = "https://kapi.kakao.com";
var KAKAO_PROVIDER = "kakao";

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

passport.use(new KakaoStrategy({
        clientID: clientConfig.clientID,
        callbackURL: svcConfig.svcURL + "/kakao/authorized",
        passReqToCallback : true
    },
    function(req, accessToken, refreshToken, profile, done) {
        var meta = {"cName": KAKAO_PROVIDER, "fName":"passport.use"};

        //log.debug("accessToken:" + accessToken, meta);
        //log.debug("refreshToken:" + refreshToken, meta);
        //log.debug("profile:" + JSON.stringify(profile), meta);

        var provider = {
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
        var meta = {"cName":KAKAO_PROVIDER, "url":req.url};

        // Successful authentication, redirect home.
        log.debug("Successful!", meta);
        res.redirect('/#');
    }
);

router.get('/me', function (req, res) {
    var userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }

    userMgr._findProviderByUserId(userId, KAKAO_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err);
            return res.status(500).send(err);
        }

        var apiUrl = KAKAO_API_URL + "/v1/user/me";

        log.debug(apiUrl);
        _requestGet(apiUrl, provider.accessToken, function (err, response, body) {
            log.debug(body);
            res.send(body);
        });
    });
});

router.get('/mystories', function (req, res) {
    var userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }

    userMgr._findProviderByUserId(userId, KAKAO_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err);
            return res.status(500).send(err);
        }

        var apiUrl = KAKAO_API_URL + "/v1/api/story/mystories";

        log.debug(apiUrl);
        _requestGet(apiUrl, provider.accessToken, function (err, response, body) {
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
    var meta = {"cName":KAKAO_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var providerId = req.query.providerid;
    var apiUrl = KAKAO_API_URL + "/v1/user/me";
    log.debug(apiUrl, meta);


    userMgr._findProviderByUserId(userId, KAKAO_PROVIDER, providerId, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            return res.status(500).send(err);
        }

        _requestGet(apiUrl, provider.accessToken, function (err, response, body) {
            if (err) {
                log.error(err, meta);
                return res.status(err.statusCode).send(err);
            }

            var nickName;
            var blogUrl;
            var sendData;

            try {
                nickName = body.properties.nickname;
            }
            catch(e) {
                log.error(e, meta);
                log.error(body, meta);
                return res.status(500).send(e);
            }

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
    var userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":KAKAO_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    //kakao did not support post_count.
    var blogId = req.params.blog_id;
    var sendData = {};
    sendData.provider_name = KAKAO_PROVIDER;
    sendData.blog_id = blogId;
    sendData.post_count = -1;

    res.send(sendData);
 });

router.get('/bot_posts/:blog_id', function (req, res) {
    var userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":KAKAO_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var blogId = req.params.blog_id;
    var lastId = req.query.offset;
    var after = req.query.after;
    var apiUrl = KAKAO_API_URL + "/v1/api/story/mystories";
    if (lastId) {
        apiUrl += "?";
        apiUrl += "last_id=" + lastId;
    }
    log.debug(apiUrl, meta);

    userMgr._findProviderByUserId(userId, KAKAO_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            return res.status(500).send(err);
        }

        _requestGet(apiUrl, provider.accessToken, function (err, response, body) {
            if (err) {
                log.error(err, meta);
                return res.status(err.statusCode).send(err);
            }

            var sendData = {};
            sendData.provider_name = KAKAO_PROVIDER;
            sendData.blog_id = blogId;
            sendData.posts = [];

            try {
                for (var i = 0; i < body.length; i+=1) {
                    var rawPost = body[i];
                    if (after) {
                        var postDate = new Date(rawPost.created_at);
                        var afterDate = new Date(after);

                        if (postDate < afterDate) {
                            //log.debug('post is before', meta);
                            continue;
                        }
                    }

                    var sendPost = {};
                    //send_post.title;
                    sendPost.modified = rawPost.created_at;
                    sendPost.id = rawPost.id;
                    sendPost.url = rawPost.url;
                    sendPost.categories = [];
                    sendPost.tags = [];
                    sendPost.content = rawPost.content;

                    sendData.posts.push(sendPost);
                }
            }
            catch(e) {
                log.error(e, meta);
                log.error(body, meta);
                return res.status(500).send(e);
            }

            sendData.post_count = sendData.posts.length;

            res.send(sendData);
        });
    });
});

router.get('/bot_posts/:blog_id/:post_id', function (req, res) {
    var userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":KAKAO_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var blogId = req.params.blog_id;
    var postId = req.params.post_id;
    var apiUrl = KAKAO_API_URL + "/v1/api/story/mystory";
    if (postId) {
        apiUrl += "?";
        apiUrl += "id=" + postId;
    }
    log.debug(apiUrl, meta);

    userMgr._findProviderByUserId(userId, KAKAO_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            return res.statusCode(500).send(err);
        }

        _requestGet(apiUrl, provider.accessToken, function (err, response, body) {
            if (err) {
                log.error(err, meta);
                return res.status(err.statusCode).send(err);
            }

            //log.debug(body, meta);

            var sendData = {};
            sendData.provider_name = KAKAO_PROVIDER;
            sendData.blog_id = blogId;
            sendData.post_count = 1;
            sendData.posts = [];
            try {
                var rawPost = body;
                var sendPost = {};
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
            catch(e) {
                log.error(e, meta);
                log.error(body, meta);
                return res.status(500).send(e);
            }

            return res.send(sendData);
        });
    });
});

function _convertToURL(postId) {
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

    var newPost;
    newPost = _makeNewPost(rcvPost);
    return callback(undefined, newPost);
}

function _postLink(accessToken, rcvPost, callback) {
    var meta={};
    meta.cName = KAKAO_PROVIDER;
    meta.fName = "_postLink";

    var linkInfoUrl;
    linkInfoUrl = KAKAO_API_URL + "/v1/api/story/linkinfo";
    linkInfoUrl += "?";
    linkInfoUrl += "url=" + rcvPost.url;
    log.debug(linkInfoUrl, meta);

    _requestGet(linkInfoUrl, accessToken, function (err, response, body) {
        if (err) {
            log.error(err, meta);
            return callback(err);
        }

        //log.debug(body, meta);

        var newPost = {};
        try {
            newPost.link_info = JSON.stringify(body);
        }
        catch(e) {
            log.error(e, meta);
            log.error(body, meta);
            return callback(e);
        }

        if (rcvPost.title) {
            newPost.content = rcvPost.title;
        }
        else if (rcvPost.content) {
            newPost.content = rcvPost.content;
        }
        else {
            newPost.content = " ";
        }

        log.debug(newPost, meta);

        return callback(undefined, newPost);
    });
}

function _responsePostResult(blogId, content, body, callback) {

    var sendData = {};
      sendData.provider_name = KAKAO_PROVIDER;
      sendData.blog_id = blogId;
      sendData.posts = [];

    var sendPost = {};
      sendPost.modified = new Date();

    var rawPost;
    try {
        if (typeof(body) === "string") {
            rawPost = JSON.parse(body);
        }
        else if (typeof(body) === "object") {
            rawPost = body;
        }
        sendPost.id = rawPost.id;
    }
    catch(e) {
        log.error(e);
        log.error(body);
        return callback(e);
    }

    sendPost.url = "https://story.kakao.com" + "/" + _convertToURL(sendPost.id);
    sendPost.categories = [];
    sendPost.tags = [];
    sendPost.content = content;
    sendData.posts.push(sendPost);

    log.debug(sendData);

    callback (undefined, sendData);
}

router.post('/bot_posts/new/:blog_id', function (req, res) {
    var userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":KAKAO_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var blogId = req.params.blog_id;
    var postType = req.query.postType;
    if (!postType) {
        log.error("postType is undefined, so it set to text", meta);
        postType = "post";
    }

    var rcvPost= req.body;
    var apiUrl = KAKAO_API_URL + "/v1/api/story/post/note";
    log.debug(apiUrl, meta);

    userMgr._findProviderByUserId(userId, KAKAO_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            return res.status(500).send(err);
        }

        var postFunc;
        if (postType === "post") {
            postFunc = _postText;
        }
        else if (postType === "link") {
            postFunc = _postLink;
        }
        else {
            //need to refactoring make a error object;
            err = new Error("postType was undefined");
            log.error(err, meta);
            return res.status(500).send(err);
        }

        postFunc(provider.accessToken, rcvPost, function(err, postData) {
            if (err) {
                log.error(err, meta);
                return res.status(err.statusCode).send(err);
            }

            _requestPost(apiUrl, provider.accessToken, postData, function(err, response, body) {
                if (err) {
                    log.error(err, meta);
                    return res.status(err.statusCode).send(err);
                }

                _responsePostResult(blogId, rcvPost.content, body, function(err, sendData) {
                    if (err) {
                        log.error(err, meta);
                        return res.status(500).send(err);
                    }

                    return res.send(sendData);
                });
            });
        });
    });
});


router.get('/bot_comments/:blogID/:postID', function (req, res) {
    var userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":KAKAO_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var blogId = req.params.blogID;
    var postId = req.params.postID;
    var apiUrl = KAKAO_API_URL+"/v1/api/story/mystory";
    if (postId) {
        apiUrl += "?";
        apiUrl += "id=" + postId;
    }
    log.debug(apiUrl, meta);

    userMgr._findProviderByUserId(userId, KAKAO_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err);
            return res.status(500).send(err);
        }

        _requestGet(apiUrl, provider.accessToken, function (err, response, body) {
            if (err) {
                log.error(err);
                return res.status(err.statusCode).send(err);
            }

            var send = {};
            send.providerName = KAKAO_PROVIDER;
            send.blogID = blogId;
            send.postID = postId;
            send.comments = [];

            try {
                for (var i = 0; i < body.comment_count; i+=1) {
                    var comment = {};
                    comment.URL = body.url;
                    comment.content = body.comments[i].text;
                    send.comments.push(comment);
                }
                send.found = body.comment_count;
            }
            catch(e) {
                log.error(e, meta);
                log.error(body, meta);
                return res.status(500).send(e);
            }

            return res.send(send);
        });
    });
});

function _requestGet(url, accessToken, callback) {
    request.getEx(url, {
        json: true,
        headers: {
            "authorization": "Bearer " + accessToken
        }
    }, function (error, response, body) {
        callback(error, response, body);
    });
}

function _requestPost(url, accessToken, data, callback) {
    request.postEx(url, {
        headers: {
            "authorization": "Bearer " + accessToken
        },
        form: data
    }, function (error, response, body) {
        callback(error, response, body);
    });
}

module.exports = router;
