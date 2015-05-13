/**
 * Created by aleckim on 2014. 7. 14..
 */

"use strict";

var router = require('express').Router();
var passport = require('passport');
var request = require('../controllers/requestEx');

var blogBot = require('./../controllers/blogbot');
var userMgr = require('./../controllers/userManager');
var svcConfig = require('../models/svcConfig.json');

var clientConfig = svcConfig.facebook;
var FacebookStrategy = require('passport-facebook').Strategy;
var FACEBOOK_API_URL = "https://graph.facebook.com";
var FACEBOOK_PROVIDER = "facebook";

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

passport.use(new FacebookStrategy({
        clientID: clientConfig.clientID,
        clientSecret: clientConfig.clientSecret,
        callbackURL: svcConfig.svcURL + "/facebook/authorized",
        passReqToCallback : true
    },
    function(req, accessToken, refreshToken, profile, done) {
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
        // Successful authentication, redirect home.
        log.debug('Successful!');
        res.redirect('/#');
    }
);

router.get('/me', function (req, res) {
    var userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":FACEBOOK_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    userMgr._findProviderByUserId(userId, FACEBOOK_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            return res.status(500).send(err);
        }

        var api_url = FACEBOOK_API_URL+"/me";
        log.debug(api_url);

        _requestGet(api_url, provider.accessToken, function(err, response, body) {
            if (err) {
                log.error(err, meta);
                return res.status(500).send(err);
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
    var meta = {"cName":FACEBOOK_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    if (req.query.providerid === false) {
        var error = new Error("User: "+userId+" did not have blog!");
        log.debug(error, meta);
        res.status(404).send(error);
        res.redirect("/#/signin");
        return;
    }

    var providerId = req.query.providerid;

    userMgr._findProviderByUserId(userId, FACEBOOK_PROVIDER, providerId, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            return res.status(500).send(err);
        }

        var apiUrl = FACEBOOK_API_URL+"/"+provider.providerId+"/accounts";
        log.debug(apiUrl);

        _requestGet(apiUrl, provider.accessToken, function(err, response, body) {
            if (err)  {
                log.error(err, meta);
                return res.status(err.statusCode).send(err);
            }

            //log.debug(body, meta);

            var sendData = {};
            sendData.provider = provider;
            sendData.blogs = [];

            log.debug("pageId: "+provider.providerId+", pageName: feed, pageLink: https://www.facebook.com", meta);

            //user can have unique url for people or pages on facebook
            sendData.blogs.push({"blog_id":provider.providerId, "blog_title":"feed", "blog_url":"https://www.facebook.com"});

            try {
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

router.get('/bot_post_count/:blog_id', function (req, res) {
    var userId = userMgr._getUserId(req);
    if (!userId) {
        return;
    }
    var meta = {"cName":FACEBOOK_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    //facebook did not support post_count.
    var blog_id = req.params.blog_id;
    var send_data = {};
    send_data.provider_name = FACEBOOK_PROVIDER;
    send_data.blog_id = blog_id;
    send_data.post_count = -1;

    res.send(send_data);
});

router.get('/bot_posts/:blog_id', function (req, res) {
    var userId;
    userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":FACEBOOK_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var blogId = req.params.blog_id;
    var limit = req.query.limit;
    var until = req.query.until;
    var pagingToken = req.query.__paging_token;

    userMgr._findProviderByUserId(userId, FACEBOOK_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            return res.status(500).send(err);
        }

        var apiUrl = FACEBOOK_API_URL+"/"+blogId+"/posts";
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
            if (err) {
                log.error(err, meta);
                return res.status(err.statusCode).send(err);
            }

            var sendData = {};
            sendData.provider_name = FACEBOOK_PROVIDER;
            sendData.blog_id = blogId;

            try {
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

                for (var i = 0; i<sendData.post_count; i+=1) {
                    var item = body.data[i];
                    var sendPost = {};
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
    var meta = {"cName":FACEBOOK_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var blogId = req.params.blog_id;
    var postId = req.params.post_id;

    userMgr._findProviderByUserId(userId, FACEBOOK_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            return res.status(500).send(err);
        }

        var apiUrl = FACEBOOK_API_URL+"/"+postId;

        log.debug(apiUrl, meta);

        _requestGet(apiUrl, provider.accessToken, function(err, response, body) {
            if (err) {
                log.error(err, meta);
                return res.status(err.statusCode).send(err);
            }

            var sendData = {};
            sendData.provider_name = FACEBOOK_PROVIDER;
            sendData.blog_id = blogId;
            sendData.posts = [];

            var rawPost = body;

            try {
                var comment_count = 0;
                if (rawPost.comments) {
                    comment_count = rawPost.comments.data.length;
                }

                var like_count = 0;
                if (rawPost.likes) {
                    like_count = rawPost.likes.data.length;
                }

                var sendPost = {};
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
