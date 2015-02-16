/**
 * Created by aleckim on 2014. 7. 14..
 */

var router = require('express').Router();
var passport = require('passport');
var request = require('request');

var blogBot = require('./blogbot');
var userMgr = require('./userManager');
var svcConfig = require('../models/svcConfig.json');

var clientConfig = svcConfig.facebook;
var FacebookStrategy = require('passport-facebook').Strategy;
var FACEBOOK_API_URL = "https://graph.facebook.com";
var FACEBOOK_PROVIDER = "facebook";

passport.serializeUser(function(user, done) {
    "use strict";
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    "use strict";
    done(null, obj);
});

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

router.get('/me', function (req, res) {
    "use strict";
    var userId = userMgr._getUserId(req, res);

    if (!userId) {
        return;
    }

    userMgr._findProviderByUserId(userId, FACEBOOK_PROVIDER, undefined, function (err, user, provider) {
        var api_url;

        if (err) {
            log.error("Fail to find provider");
            log.error(err.toString());
            return res.send(err);
        }

        api_url = FACEBOOK_API_URL+"/me";
        log.debug(api_url);

        _requestGet(api_url, provider.accessToken, function(err, response, body) {
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
    var userId = userMgr._getUserId(req, res);
    var providerId;

    if (!userId) {
        return;
    }

    if (req.query.providerid === false) {
        errorMsg = 'User:'+userId+' didnot have blog!';
        log.debug(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }

    providerId = req.query.providerid;

    userMgr._findProviderByUserId(userId, FACEBOOK_PROVIDER, providerId, function (err, user, provider) {
        var apiUrl;

        if (err) {
            log.error("Fail to find provider");
            log.error(err.toString());
            return res.send(err);
        }

        apiUrl = FACEBOOK_API_URL+"/"+provider.providerId+"/accounts";
        log.debug(apiUrl);

        _requestGet(apiUrl, provider.accessToken, function(err, response, body) {
            var hasError = _checkError(err, response, body);
            if (hasError !== undefined) {
                res.send(hasError);
                return;
            }

            log.debug(body);

            var sendData = {};
            sendData.provider = provider;
            sendData.blogs = [];

            log.debug("pageId: "+provider.providerId+", pageName: feed, pageLink: https://www.facebook.com");
            sendData.blogs.push({"blog_id":provider.providerId, "blog_title":"feed", "blog_url":"https://www.facebook.com"});

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

    var user_id = userMgr._getUserId(req);
    if (!user_id) {
        return;
    }

    log.debug("get facebook post count!!");

    //facebook did not support post_count.
    var blog_id = req.params.blog_id;
    var send_data = {};
    send_data.provider_name = FACEBOOK_PROVIDER;
    send_data.blog_id = blog_id;
    send_data.post_count = -1;

    res.send(send_data);

    return;
});

router.get('/bot_posts/:blog_id', function (req, res) {
    "use strict";
    var userId;
    var blogId;
    var limit;
    var until;
    var pagingToken;

    userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }
    blogId = req.params.blog_id;
    limit = req.query.limit;
    until = req.query.until;
    pagingToken = req.query.__paging_token;

    userMgr._findProviderByUserId(userId, FACEBOOK_PROVIDER, undefined, function (err, user, provider) {
        var apiUrl;

        if (err) {
            log.error("Fail to find provider");
            log.error(err.toString());
            return res.send(err);
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

        _requestGet(apiUrl, provider.accessToken, function (err, response, body) {
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
            sendData.provider_name = FACEBOOK_PROVIDER;
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

    log.debug("facebook: "+ req.url + ' : this is called by bot');

    userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }

    userMgr._findProviderByUserId(userId, FACEBOOK_PROVIDER, undefined, function (err, user, provider) {
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
        apiUrl = FACEBOOK_API_URL+"/"+postId;

        log.debug(apiUrl);

        _requestGet(apiUrl, provider.accessToken, function(err, response, body) {
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
            sendData.provider_name = FACEBOOK_PROVIDER;
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

module.exports = router;
