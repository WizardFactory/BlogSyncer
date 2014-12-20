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

var log = require('winston');

var KAKAO_API_URL = "https://kapi.kakao.com";

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

function _updateOrCreateUser(req, provider, callback) {
    UserDb.findOne({'providers.providerName':provider.providerName
            , 'providers.providerId': provider.providerId},
        function (err, user) {
            var p;
            var isNewProvider = false;

            if (err) {
                return callback(err);
            }

            // if there is a user id already but no token (user was linked at one point and then removed)
            if (user) {
                log.debug("Found user of pName="+provider.providerName+",pId="+provider.providerId);
                p = user.findProvider("kakao");
                if (p.accessToken !== provider.accessToken) {
                    p.accessToken = provider.accessToken;
                    p.refreshToken = provider.refreshToken;
                    user.save (function(err) {
                        if (err)
                            return callback(err);

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
                            log.error(err);
                            return callback(err);
                        }
                        if (!user) {
                            log.error("Fail to get user id="+req.user._id);
                            log.error(err);
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
                        if (err)
                            return callback(err);

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
        log.debug("accessToken:" + accessToken);
        log.debug("refreshToken:" + refreshToken);
        log.debug("profile:" + JSON.stringify(profile));

        var provider = {
            "providerName": profile.provider,
            "accessToken": accessToken,
            "refreshToken": refreshToken,
            "providerId": profile.id.toString(),
            "displayName": profile.username
        };

        _updateOrCreateUser(req, provider, function(err, user, isNewProvider) {
            if (err) {
                log.error("Fail to get user ");
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
        // Successful authentication, redirect home.
        log.debug('Successful!');
        res.redirect('/#');
    }
);

function _getUserID(req, res) {
    var userid = 0;

    if (req.user) {
        userid = req.user._id;
    }
    else if (req.query.userid)
    {
       //this request form child process;
       userid = req.query.userid;
    }
    else {
        var errorMsg = 'You have to login first!';
        log.debug(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
    }

    return userid;
}

function _checkError(err, response, body) {
    if (err) {
        log.debug(err);
        return err;
    }
    if (response.statusCode >= 400) {
        var err = body.meta ? body.meta.msg : body.error;
        var errStr = 'API error: ' + response.statusCode + ' ' + err;
        log.debug(errStr);
        return new Error(errStr);
    }
}

function _requestGet(url, accessToken, callback) {
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
    var user_id = _getUserID(req);
    if (user_id == 0) {
        return;
    }

    UserDb.findById(user_id, function (err, user) {
        var p;
        var api_url;

        p = user.findProvider("kakao");
        api_url = KAKAO_API_URL + "/v1/user/me";

        log.debug(api_url);

        _requestGet(api_url, p.accessToken, function (err, response, body) {
            log.debug(body);
            res.send(body);
        });
    });
});

router.get('/mystories', function (req, res) {
    var user_id = _getUserID(req);
    if (user_id == 0) {
        return;
    }

    UserDb.findById(user_id, function (err, user) {
        var p;
        var api_url;

        p = user.findProvider("kakao");

        api_url = KAKAO_API_URL + "/v1/api/story/mystories";

        log.debug(api_url);

        _requestGet(api_url, p.accessToken, function (err, response, body) {
            //log.debug(body);
            res.send(body);
        });
    });
});

router.get('/bot_bloglist', function (req, res) {

    log.debug(req.url);

    var user_id = _getUserID(req);
    if (user_id == 0) {
        return;
    }

    UserDb.findById(user_id, function (err, user) {
        var p;
        var api_url;

        p = user.findProvider("kakao");
        console.log(p);
        api_url = KAKAO_API_URL + "/v1/user/me";
        log.debug(api_url);

        _requestGet(api_url, p.accessToken, function (err, response, body) {

            log.debug(body);
            var hasError = _checkError(err, response, body);
            if (hasError) {
                res.statusCode = response.statusCode;
                res.send(hasError);
                return;
            }

            var nickname = body.properties.nickname;
            var blog_url = "stroy.kakao.com/" + nickname;
            var send_data = {};
            send_data.provider = p;
            send_data.blogs = [];
            send_data.blogs.push({"blog_id": nickname, "blog_title": nickname, "blog_url": blog_url});
            /*
             { "provider":object, "blogs":
             [ {"blog_id":"12", "blog_title":"wzdfac", "blog_url":"wzdfac.iptime.net"},
             {"blog_id":"12", "blog_title":"wzdfac", "blog_url":"wzdfac.iptime.net"} ] },
             */
            res.send(send_data);
        });
    });
});

router.get('/bot_post_count/:blog_id', function (req, res) {

    log.debug(req.url);

    var user_id = _getUserID(req);
    if (user_id == 0) {
        return;
    }

    //kakao did not support post_count.
    var blog_id = req.params.blog_id;
    var send_data = {};
    send_data.provider_name = 'kakao';
    send_data.blog_id = blog_id;
    send_data.post_count = -1;

    res.send(send_data);

    return;

 });

router.get('/bot_posts/:blog_id', function (req, res) {

    log.debug(req.url);

    var user_id = _getUserID(req);
    if (user_id == 0) {
        return;
    }

    UserDb.findById(user_id, function (err, user) {
        var p;
        var blog_id = req.params.blog_id;
        var last_id = req.query.offset;
        var after = req.query.after;
        var api_url;

        if (user.providers === null) {
            log.error("user.providers is null !!!");
            return;
        }

        console.log(user.providers);

        p = user.findProvider("kakao");
        api_url = KAKAO_API_URL + "/v1/api/story/mystories";
        if (last_id) {
            api_url += "?";
            api_url += "last_id=" + last_id;
        }

        log.debug(api_url);

        _requestGet(api_url, p.accessToken, function (err, response, body) {
            //log.debug(data);
            var hasError = _checkError(err, response, body);
            if (hasError) {
                res.statusCode = response.statusCode;
                res.send(hasError);
                return;
            }

            var send_data = {};
            send_data.provider_name = 'kakao';
            send_data.blog_id = blog_id;
            send_data.posts = [];

            for (var i = 0; i < body.length; i++) {
                var raw_post = body[i];
                if (after !== undefined) {
                    var post_date = new Date(raw_post.created_at);
                    var after_date = new Date(after);

                    if (post_date < after_date) {
                        //log.debug('post is before');
                        continue;
                    }
                }

                var send_post = {};
                //send_post.title;
                send_post.modified = raw_post.created_at;
                send_post.id = raw_post.id;
                send_post.url = raw_post.url;
                send_post.categories = [];
                send_post.tags = [];
                send_post.content = raw_post.content;

                send_data.posts.push(send_post);
            }
            send_data.post_count = send_data.posts.length;
            res.send(send_data);
        });
    });
});

router.get('/bot_posts/:blog_id/:post_id', function (req, res) {

    log.debug(req.url);

    var user_id = _getUserID(req);
    if (user_id == 0) {
        return;
    }

    UserDb.findById(user_id, function (err, user) {
        var p;
        var api_url;
        var blog_id = req.params.blog_id;
        var post_id = req.params.post_id;

        p = user.findProvider("kakao");

        api_url = KAKAO_API_URL + "/v1/api/story/mystory";
        if (post_id) {
            api_url += "?";
            api_url += "id=" + post_id;
        }
        log.debug(api_url);

        _requestGet(api_url, p.accessToken, function (err, response, body) {

            //log.debug(body);
            var hasError = _checkError(err, response, body);
            if (hasError) {
                res.statusCode = response.statusCode;
                res.send(hasError);
                return;
            }

            var send_data = {};
            send_data.provider_name = 'kakao';
            send_data.blog_id = blog_id;
            send_data.post_count = 1;
            send_data.posts = [];

            {
                var raw_post = body;
                var send_post = {};
                //send_post.title;
                send_post.modified = raw_post.created_at;
                send_post.id = raw_post.id;
                send_post.url = raw_post.url;
                send_post.categories = [];
                send_post.tags = [];

                send_post.content = raw_post.content;
                send_post.replies = [];
                send_post.replies.push({"comment_count": raw_post.comment_count});
                send_post.replies.push({"like_count": raw_post.like_count});
                send_data.posts.push(send_post);
            }

            res.send(send_data);
        });
    });
});

function _convertToURL(postId) {
    var indexOfDot = postId.indexOf(".");
    var str = postId.substring(0,indexOfDot);
    str += "/";
    str += postId.substring(indexOfDot+1);

    log.debug(str);
    return str;
}

function _makeNewPost(body) {
    var newPost = {};
    newPost.content = "";

    if (body.title !== undefined) {
        newPost.content += body.title +'\n';
    }
    if (body.content) {
        newPost.content += body.content;
    }

    log.debug(newPost);

    return newPost;
}

router.post('/bot_posts/new/:blog_id', function (req, res) {

    log.debug(req.url);

    var user_id = _getUserID(req);
    if (user_id == 0) {
        return;
    }

    var newPost = _makeNewPost(req.body);

    UserDb.findById(user_id, function (err, user) {
        var blog_id = req.params.blog_id;
        var p = user.findProvider("kakao");
        var api_url = KAKAO_API_URL + "/v1/api/story/post/note";
        log.debug(api_url);

        _requestPost(api_url, p.accessToken, newPost, function (err, response, body) {
            var hasError = _checkError(err, response, body);
            if (hasError) {
                res.statusCode = response.statusCode;
                res.send(hasError);
                return;
            }

            //log.debug(data);

            //add post info
            var send_data = {};
            send_data.provider_name = 'kakao';
            send_data.blog_id = blog_id;
            send_data.posts = [];

            var send_post = {};
            var raw_post;
            if (typeof(body) === "string") {
                raw_post = JSON.parse(body);
            }
            else if (typeof(body) === "object") {
                raw_post = body;
            }

            send_post.modified = new Date();

            if (raw_post === undefined) {
                var errMsg = "Fail to post";
                log.debug(errMsg);
                res.send(errMsg);
                return;
            }

            send_post.id = raw_post.id;
            send_post.url = "https://story.kakao.com" + "/" + _convertToURL(raw_post.id);
            send_post.categories = [];
            send_post.tags = [];
            send_post.content = newPost.content;

            send_data.posts.push(send_post);
            log.debug(send_data);
            res.send(send_data);
        });
    });
});


router.get('/bot_comments/:blogID/:postID', function (req, res) {
    log.debug(req.url);

    var user_id = _getUserID(req);
    if (user_id == 0) {
        return;
    }

    UserDb.findById(user_id, function (err, user) {

        var blog_id = req.params.blogID;
        var post_id = req.params.postID;
        var p = user.findProvider("kakao");
        var api_url = KAKAO_API_URL+"/v1/api/story/mystory";

        if (post_id) {
            api_url += "?";
            api_url += "id=" + post_id;
        }

        log.debug(api_url);

        _requestGet(api_url, p.accessToken, function (err, response, body) {
            var hasError = _checkError(err, response, body);
            if (hasError) {
                res.statusCode = response.statusCode;
                res.send(hasError);
                return;
            }
            log.debug(body);

            var send = {};
            send.providerName = "kakao";
            send.blogID = blog_id;
            send.postID = post_id;
            send.found = body.comment_count;
            send.comments = [];

            for (var i = 0; i < body.comment_count; i++) {
                var comment = {};
                comment.URL = body.url;
                comment.content = body.comments[i].text;
                send.comments.push(comment);
            }
            res.send(send);
        });
    });
});

module.exports = router;
