/**
 * Created by aleckim on 2014. 7. 14..
 */

// load up the user model
var UserDb = require('../models/userdb');

var express = require('express');
var passport = require('passport');
var request = require('request');
var FacebookStrategy = require('passport-facebook').Strategy;
var blogBot = require('./blogbot');
var router = express.Router();

var svcConfig = require('../models/svcConfig.json');
var clientConfig = svcConfig.facebook;

var FACEBOOK_API_URL = "https://graph.facebook.com";

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
                log.debug("Found user of pName="+provider.providerName+",pId="+provider.providerId);
                p = user.findProvider("facebook");
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
                        if (err) {
                            return callback(err);
                        }

                        return callback(null, newUser, isNewProvider);
                    });
                }
            }
        } );
}

passport.use(new FacebookStrategy({
        clientID: clientConfig.clientID,
        clientSecret: clientConfig.clientSecret,
        callbackURL: svcConfig.svcURL + "/facebook/authorized",
        passReqToCallback : true
    },
    function(req, accessToken, refreshToken, profile, done) {
        "use strict";
//        log.debug("accessToken:" + accessToken);
//        log.debug("refreshToken:" + refreshToken);
//        log.debug("profile:" + JSON.stringify(profile));

        var provider = {
            "providerName": profile.provider,
            "accessToken": accessToken,
            "refreshToken": refreshToken,
            "providerId": profile.id.toString(),
            "displayName": profile.displayName
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
    passport.authenticate('facebook')
);

router.get('/authorized',
    passport.authenticate('facebook', { failureRedirect: '/#signin' }),
    function(req, res) {
        "use strict";
        // Successful authentication, redirect home.
        log.debug('Successful!');
        res.redirect('/#');
    }
);

function _getUserId(req) {
    "use strict";
    var userid = 0;

    if (req.user) {
        userid = req.user._id;
    }
    else if (req.query.userid)
    {
        //this request form child process;
        userid = req.query.userid;
    }

    return userid;
}

function _checkError(err, response, body) {
    "use strict";
    if (err) {
        log.debug(err);
        return err;
    }
    if (response.statusCode >= 400) {
        var error = body.meta ? body.meta.msg : body.error;
        var errStr = 'API error: ' + response.statusCode + ' ' + error;
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

router.get('/me', function (req, res) {
    "use strict";
    var user_id = _getUserId(req);
    if (!user_id) {
        var errorMsg = 'You have to login first!';
        log.debug(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }

    UserDb.findById(user_id, function (err, user) {
        var p;
        var api_url;

        p = user.findProvider("facebook");

        api_url = FACEBOOK_API_URL+"/me";
        log.debug(api_url);

        _requestGet(api_url, p.accessToken, function(err, response, body) {
            var hasError = _checkError(err, response, body);
            if (hasError !== undefined) {
                res.send(hasError);
                return;
            }
            log.debug(body);
            res.send(body);
        });
    });
});

router.get('/bot_bloglist', function (req, res) {
    "use strict";

    log.debug("facebook: "+ req.url + ' : this is called by bot');

    var errorMsg = "";
    var userId = _getUserId(req);
    if (!userId) {
        errorMsg = 'You have to login first!';
        log.debug(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }

    if (req.query.providerid === false) {
        errorMsg = 'User:'+userId+' didnot have blog!';
        log.debug(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }

    UserDb.findById(userId, function (err, user) {
        var p;
        var apiUrl;

        p = user.findProvider("facebook", req.query.providerid);

        apiUrl = FACEBOOK_API_URL+"/"+p.providerId+"/accounts";
        log.debug(apiUrl);

        _requestGet(apiUrl, p.accessToken, function(err, response, body) {
            var hasError = _checkError(err, response, body);
            if (hasError !== undefined) {
                res.send(hasError);
                return;
            }

            log.debug(body);

            var sendData = {};
            sendData.provider = p;
            sendData.blogs = [];

            log.debug("pageId: "+p.providerId+", pageName: feed, pageLink: https://www.facebook.com");
            sendData.blogs.push({"blog_id":p.providerId, "blog_title":"feed", "blog_url":"https://www.facebook.com"});

            for (var i = 0; i  < body.data.length; i+=1) {
                var item = body.data[i];
                var pageId = item.id;
                var pageName = item.name;
                var pageLink = "https://www.facebook.com";
                /*
                apiUrl = FACEBOOK_API_URL+"/"+pageId;
                log.debug(apiUrl);
                _requestGet(apiUrl, p.accessToken, function(err, response, pageBody) {
                    var hasError = _checkError(err, response, pageBody);
                    if (hasError !== undefined) {
                        log.debug("hasError: "+hasError);
                        res.send(hasError);
                        return;
                    }
                    pageLink = pageBody.link;
                    //log.debug("pageId: "+pageId+", pageName: "+pageName+", pageLink: "+pageLink);
                });
                */
                log.debug("pageId: "+pageId+", pageName: "+pageName+", pageLink: "+pageLink);
                sendData.blogs.push({"blog_id":pageId, "blog_title":pageName, "blog_url":pageLink});
            }
            res.send(sendData);
        });
    });
});

router.get('/bot_post_count/:blog_id', function (req, res) {
    "use strict";

    log.debug(req.url);

    var user_id = _getUserId(req);
    if (!user_id) {
        return;
    }

    log.debug("get facebook post count!!");

    //facebook did not support post_count.
    var blog_id = req.params.blog_id;
    var send_data = {};
    send_data.provider_name = 'facebook';
    send_data.blog_id = blog_id;
    send_data.post_count = -1;

    res.send(send_data);

    return;
});

router.get('/bot_posts/:blog_id', function (req, res) {
    "use strict";
    var userId;
    var blogId;
    var errMsg;
    var limit;
    var until;
    var pagingToken;

    userId = _getUserId(req, res);
    if (!userId) {
        return;
    }
    blogId = req.params.blog_id;
    limit = req.query.limit;
    until = req.query.until;
    pagingToken = req.query.__paging_token;

    UserDb.findById(userId, function (err, user) {
        var p;
        var apiUrl;

        if (err) {
            log.error(err.toString());
            res.send(err);
            return;
        }
        if (!user) {
            log.error("Fail to get user");
            log.error(err.toString());
            res.send(err);
            return;
        }

        p = user.findProvider("facebook");
        if (!p) {
            errMsg = "Fail to find provider";
            log.error(errMsg);
            res.send(errMsg);
            return;
        }

        apiUrl = FACEBOOK_API_URL+"/"+blogId+"/posts";
        apiUrl += "?limit=25&";
        /*
        if (limit) {
            apiUrl += "limit="+limit+"&";
        }
        */

        if (until) {
            apiUrl += "until=" + until + "&";
        }

        if (pagingToken) {
            apiUrl += "__paging_token" + pagingToken + "&";
        }

        log.info("apiUrl=" + apiUrl);

        _requestGet(apiUrl, p.accessToken, function (err, response, body) {
            var hasError;
            var sendData;
            var sendPost;
            var item;
            var i;

            hasError = _checkError(err, response, body);
            if (hasError) {
                res.statusCode = response.statusCode;
                res.send(hasError);
                return;
            }

            sendData = {};
            sendData.provider_name = 'facebook';
            sendData.blog_id = blogId;

            if (body.data) {
                sendData.post_count = body.data.length;
            }
            else {
                sendData.post_count = 0;
            }

            if (sendData.post_count === 25 && body.paging) {
                sendData.nextPageToken = body.paging.next;
            }

            sendData.posts = [];

            for (i = 0; i<sendData.post_count; i+=1) {
                item = body.data[i];
                sendPost = {};
                if (item.message) {
                    sendPost.title = item.message;
                    sendPost.modified = item.updated_time;
                    sendPost.id = item.id;
                    sendPost.url = item.link;
                    sendPost.categories = [];
                    sendPost.tags = [];
                    sendData.posts.push(sendPost);
                }
            }
            res.send(sendData);
        });
    });
});


router.get('/bot_posts/:blog_id/:post_id', function (req, res) {
    "use strict";
    var userId;
    var errMsg;

    log.debug("facebook: "+ req.url + ' : this is called by bot');

    userId = _getUserId(req, res);
    if (!userId) {
        return;
    }

    UserDb.findById(userId, function (err, user) {
        var blogId;
        var postId;
        var p;
        var apiUrl;

        blogId = req.params.blog_id;
        postId = req.params.post_id;

        p = user.findProvider("facebook");
        if (!p) {
            errMsg = "Fail to find provider";
            log.error(errMsg);
            res.send(errMsg);
            return;
        }

        apiUrl = FACEBOOK_API_URL+"/"+postId;

        log.debug(apiUrl);

        _requestGet(apiUrl, p.accessToken, function(err, response, body) {
            var hasError;
            var sendData;
            var sendPost;
            var rawPost;
            var comment_count;
            var like_count;

            hasError = _checkError(err, response, body);
            if (hasError) {
                res.statusCode = response.statusCode;
                res.send(hasError);
                return;
            }

            //log.debug(data);
            sendData = {};
            sendData.provider_name = 'facebook';
            sendData.blog_id = blogId;
            sendData.posts = [];

            rawPost = body;

            if (rawPost.comments) {
                comment_count = rawPost.comments.data.length;
            }
            else {
                comment_count = 0;
            }
            if (rawPost.likes) {
                like_count = rawPost.likes.data.length;
            }
            else {
                like_count = 0;
            }

            sendPost = {};
            sendPost.title = rawPost.message;
            sendPost.modified = rawPost.updated_time;
            sendPost.id = rawPost.id;
            sendPost.url = rawPost.link;
            sendPost.categories = [];
            sendPost.tags = [];
            sendPost.content = rawPost.message;
            sendPost.replies = [];
            sendPost.replies.push({"comment_count":comment_count});
            sendPost.replies.push({"like_count":like_count});
            sendData.posts.push(sendPost);
            res.send(sendData);
        });
    });
});

module.exports = router;
