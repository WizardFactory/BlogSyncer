/**
 *
 * Created by aleckim on 2014. 5. 15..
 */

// load up the user model
var UserDb = require('../models/userdb');

//var blogCommon  = require('./blogjs/blogCommon');

var express = require('express');
var passport = require('passport');
var request = require('request');
var wordpressStrategy = require('passport-wordpress').Strategy;
var blogBot = require('./blogbot');
var router = express.Router();

var svcConfig = require('../models/svcConfig.json');
var clientConfig = svcConfig.Wordpress;

var log = require('winston');

var WORDPRESS_API_URL = "https://public-api.wordpress.com/rest/v1";

passport.serializeUser(function(user, done) {
    "use strict";
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    "use strict";
    done(null, obj);
});

/**
 *
 * @param req
 * @param provider
 * @param callback
 * @private
 */
function _updateOrCreateUser(req, provider, callback) {
    "use strict";
    UserDb.findOne({'providers.providerName':provider.providerName,
                    'providers.providerId': provider.providerId},
        function (err, user) {
            var p;
            var isNewProvider = false;
            var newUser;

            if (err) {
                return callback(err);
            }

            // if there is a user id already but no token (user was linked at one point and then removed)
            if (user) {
                log.debug("Found user of pName="+provider.providerName+",pId="+provider.providerId);
                p = user.findProvider("Wordpress");
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
                    newUser = new UserDb();
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

passport.use(new wordpressStrategy({
        clientID: clientConfig.clientID,
        clientSecret: clientConfig.clientSecret,
        callbackURL: svcConfig.svcURL+"/wordpress/authorized",
        passReqToCallback : true
    },
    function(req, accessToken, refreshToken, profile, done) {
        "use strict";
        var providerId;
        var provider;
//        log.debug("accessToken:" + accessToken);
//        log.debug("refreshToken:" + refreshToken);
//        log.debug("profile:"+JSON.stringify(profile));

        //if user didn't set blog for oauth, token_site_id set to false
        if (profile._json.token_site_id) {
            providerId = profile._json.token_site_id;
        }
        else {
            log.error("token site id was not set!");
            providerId = profile._json.primary_blog;
        }

        provider = {
            "providerName":profile.provider,
            "accessToken":accessToken,
            "refreshToken":refreshToken,
            "providerId":providerId.toString(), //it is not user id(it's blog_id)
            "displayName":profile.displayName
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
    passport.authenticate('wordpress')
);

router.get('/authorized',
    passport.authenticate('wordpress', { failureRedirect: '/#signin' }),
    function(req, res) {
        "use strict";

        // Successful authentication, redirect home.
        log.debug('Successful!');
        res.redirect('/#');
    }
);

/**
 *
 * @param req
 * @param res
 * @returns {*}
 * @private
 */
function _getUserId(req, res) {
    "use strict";
    var userId;
    var errorMsg;

    if (req.user) {
        userId = req.user._id;
    }
    else if (req.query.userid) {

        //this request form child process;
        userId = req.query.userid;
    }
    else {
        errorMsg = 'You have to login first!';
        log.debug(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
    }
    return userId;
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
    var errBody;
    var errStr;

    if (err) {
        log.debug(err);
        return err;
    }
    if (response.statusCode >= 400) {
        errBody = body.meta ? body.meta.msg : body.error;
        errStr = 'wordpress error: ' + response.statusCode + ' ' + errBody;
        log.debug(errStr);
        return new Error(errStr);
    }
}

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

router.get('/me', function (req, res) {
    "use strict";
    var userId;

    userId = _getUserId(req, res);
    if (!userId) {
        return;
    }

    UserDb.findById(userId, function (err, user) {
        var p;
        var apiUrl;

        p = user.findProvider("Wordpress");

        apiUrl = WORDPRESS_API_URL+"/me";
        log.debug(apiUrl);

        _requestGet(apiUrl, p.accessToken, function(err, response, body) {
            var hasError;

            hasError = _checkError(err, response, body);
            if (hasError) {
                res.statusCode = response.statusCode;
                res.send(hasError);
                return;
            }
            log.debug(body);
            res.send(body);
        });
    });
});

//router.get('/posts/:blog_id', function (req, res) {
//    blogCommon.getWPPosts(req, res);
//});

router.get('/bot_bloglist', function (req, res) {
    "use strict";
    var userId;
    var errorMsg;

    log.debug("Wordpress: "+ req.url + ' : this is called by bot');

    userId = _getUserId(req, res);
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

    UserDb.findById(userId, function (err, user) {
        var p;
        var apiUrl;

        p = user.findProvider("Wordpress", req.query.providerid);

        apiUrl = WORDPRESS_API_URL+"/sites/"+p.providerId;
        log.debug(apiUrl);

        _requestGet(apiUrl, p.accessToken, function(err, response, body) {
            var hasError;
            var blogId;
            var blogTitle;
            var blogUrl;
            var sendData;

            hasError = _checkError(err, response, body);
            if (hasError) {
                res.statusCode = response.statusCode;
                res.send(hasError);
                return;
            }

//          log.debug(body);
            blogId = body.ID.toString();
            blogTitle = body.name;
            blogUrl = body.URL;
            sendData = {};

            sendData.provider = p;
            sendData.blogs = [];
            sendData.blogs.push({"blog_id":blogId, "blog_title":blogTitle, "blog_url":blogUrl});

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

    log.debug("Wordpress: "+ req.url + ' : this is called by bot');

    userId = _getUserId(req, res);
    if (!userId) {
        return;
    }

    UserDb.findById(userId, function (err, user) {
        var p;
        var apiUrl;
        var blogId;

        blogId = req.params.blog_id;
        p = user.findProvider("Wordpress", blogId);
        apiUrl = WORDPRESS_API_URL+"/sites/"+blogId;

        log.debug(apiUrl);

        _requestGet(apiUrl, p.accessToken, function(err, response, body) {
            var hasError;
            var sendData;

            hasError = _checkError(err, response, body);
            if (hasError) {
                res.statusCode = response.statusCode;
                res.send(hasError);
                return;
            }

            log.debug("post count=" + body.post_count);

            sendData = {};
            sendData.provider_name = 'Wordpress';
            sendData.blog_id = body.ID.toString();
            sendData.post_count = body.post_count;
            res.send(sendData);
        });
    });
 });

router.get('/bot_posts/:blog_id', function (req, res) {
    "use strict";
    var userId;

    //log.debug("Wordpress: "+ req.url + ' : this is called by bot');
    userId = _getUserId(req, res);
    if (!userId) {
        return;
    }

    UserDb.findById(userId, function (err, user) {
        var blogId;
        var offSet;
        var after;
        var isExtended;
        var apiUrl;
        var p;

        blogId = req.params.blog_id;
        offSet = req.query.offset;
        after = req.query.after;
        isExtended = false;

        apiUrl = WORDPRESS_API_URL+"/sites/"+blogId;
        p = user.findProvider("Wordpress", blogId);

        apiUrl += "/posts";
        apiUrl += "?";
        if (offSet) {
            apiUrl += "offset=" + offSet;
            isExtended = true;
        }
        if (after) {
            if (isExtended) {
                apiUrl += "&";
            }
            apiUrl += "after=" + after;
        }

//        log.debug(apiUrl);

        _requestGet(apiUrl, p.accessToken, function(err, response, body) {
            var hasError;
            var i;
            var sendData;
            var rawPost;
            var postDate;
            var afterDate;
            var sendPost;
            var j;
            var categoryArr;
            var tagArr;

            hasError =  _checkError(err, response, body);
            if (hasError) {
                res.statusCode = response.statusCode;
                res.send(hasError);
                return;
            }
            //log.debug(data);
            //for (i=0; i<data.posts.length;i++) {
            //    log.debug('post_id='+data.posts[i].ID);
            //}
            if (!body.posts) {
                log.debug('Fail to get posts');
                res.send('Fail to get posts');
                return;
            }

            sendData = {};
            sendData.provider_name = 'Wordpress';
            sendData.blog_id = blogId;
            sendData.post_count = body.posts.length;
            sendData.posts = [];

            for (i = 0; i<body.posts.length; i+=1) {
                rawPost = body.posts[i];
                postDate = new Date(rawPost.modified);
                afterDate = new Date(after);
                if (postDate < afterDate) {
                    //log.debug('post is before');
                    continue;
                }
                sendPost = {};
                sendPost.title = rawPost.title;
                sendPost.modified = rawPost.modified;
                sendPost.id = rawPost.ID.toString();
                sendPost.url = rawPost.URL;
                sendPost.categories = [];
                sendPost.tags = [];
                if (rawPost.categories) {
                    categoryArr = Object.keys(rawPost.categories);
                    for (j=0; j<categoryArr.length; j+=1) {
                        sendPost.categories.push(categoryArr[j]);
                    }
//                log.debug('category-raw');
//                log.debug(category_arr);
//                log.debug('category-send');
//                log.debug(send_post.categories);
                }
                if (rawPost.tags) {
                    tagArr = Object.keys(rawPost.tags);
                    for (j=0; j<tagArr.length; j+=1) {
                        sendPost.tags.push(tagArr[j]);
                    }
//                log.debug('tag-raw');
//                log.debug(tag_arr);
//                log.debug('tags-send');
//                log.debug(send_post.tags);
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

    log.debug("Wordpress: "+ req.url + ' : this is called by bot');

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
        p = user.findProvider("Wordpress", blogId);
        apiUrl = WORDPRESS_API_URL+"/sites/"+blogId;
        apiUrl += "/posts";
        apiUrl += "/" + postId;

        log.debug(apiUrl);

        _requestGet(apiUrl, p.accessToken, function(err, response, body) {
            var hasError;
            var sendData;
            var sendPost;
            var rawPost;
            var j;
            var categoryArr;
            var tagArr;

            hasError = _checkError(err, response, body);
            if (hasError) {
                res.statusCode = response.statusCode;
                res.send(hasError);
                return;
            }

            //log.debug(data);
            sendData = {};
            sendData.provider_name = 'Wordpress';
            sendData.blog_id = blogId;
            sendData.posts = [];

            rawPost = body;

            sendPost = {};
            sendPost.title = rawPost.title;
            sendPost.modified = rawPost.modified;
            sendPost.id = rawPost.ID;
            sendPost.url = rawPost.URL;
            sendPost.categories = [];
            sendPost.tags = [];
            if (rawPost.categories) {
                categoryArr = Object.keys(rawPost.categories);
                for (j=0; j<categoryArr.length; j+=1) {
                    sendPost.categories.push(categoryArr[j]);
                }
//                log.debug('category-raw');
//                log.debug(category_arr);
//                log.debug('category-send');
//                log.debug(send_post.categories);
            }
            if (rawPost.tags) {
                tagArr = Object.keys(rawPost.tags);
                for (j=0; j<tagArr.length; j+=1) {
                    sendPost.tags.push(tagArr[j]);
                }
//                log.debug('tag-raw');
//                log.debug(tag_arr);
//                log.debug('tags-send');
//                log.debug(send_post.tags);
            }
            sendPost.content = rawPost.content;
            sendPost.replies = [];
            sendPost.replies.push({"comment_count":rawPost.comment_count});
            sendPost.replies.push({"like_count":rawPost.like_count});
            sendData.posts.push(sendPost);
            res.send(sendData);
        });
    });
});

router.post('/bot_posts/new/:blog_id', function (req, res) {
    "use strict";
    var userId;

    log.debug('Wordpress ' + req.url);

    userId = _getUserId(req, res);
    if (!userId) {
        return;
    }

    UserDb.findById(userId, function (err, user) {
        var blogId;
        var p;
        var apiUrl;

        blogId = req.params.blog_id;
        p = user.findProvider("Wordpress", blogId);
        apiUrl = WORDPRESS_API_URL+"/sites/"+blogId +"/posts/new";

        log.debug(apiUrl);
        request.post(apiUrl, {
            json: true,
            headers: {
                "authorization": "Bearer " + p.accessToken
            },
            form: req.body
        }, function (err, response, body) {
            var hasError;
            var sendData;
            var sendPost;
            var rawPost;
            var j;
            var categoryArr;
            var tagArr;

            hasError = _checkError(err, response, body);
            if (hasError) {
                res.statusCode = response.statusCode;
                res.send(hasError);
                return;
            }
            //add post info
            sendData = {};
            sendData.provider_name = 'Wordpress';
            sendData.blog_id = blogId;
            sendData.posts = [];

            rawPost = body;
            sendPost = {};
            sendPost.title = rawPost.title;
            sendPost.modified = rawPost.modified;
            sendPost.id = rawPost.ID;
            sendPost.url = rawPost.URL;
            sendPost.categories = [];
            sendPost.tags = [];
            if (rawPost.categories) {
                categoryArr = Object.keys(rawPost.categories);
                for (j=0; j<categoryArr.length; j+=1) {
                    sendPost.categories.push(categoryArr[j]);
                }
//                log.debug('category-raw');
//                log.debug(category_arr);
//                log.debug('category-send');
//                log.debug(send_post.categories);
            }
            if (rawPost.tags) {
                tagArr = Object.keys(rawPost.tags);
                for (j=0; j<tagArr.length; j+=1) {
                    sendPost.tags.push(tagArr[j]);
                }
//                log.debug('tag-raw');
//                log.debug(tag_arr);
//                log.debug('tags-send');
//                log.debug(send_post.tags);
            }
            //send_post.content = raw_post.content;
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
        p = user.findProvider("Wordpress", blogId);
        apiUrl = WORDPRESS_API_URL+"/sites/"+blogId;
        apiUrl += "/posts";
        apiUrl += "/" + postId;
        apiUrl += "/replies";

        log.debug(apiUrl);

        _requestGet(apiUrl, p.accessToken, function(err, response, body) {
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
            send.providerName = p.providerName;
            send.blogID = blogId;
            send.postID = postId;
            send.found = body.found;
            send.comments = [];
            for(i=0; i<body.found; i+=1) {
                comment = {};
                comment.date = body.comments[i].date;
                comment.URL = body.comments[i].short_URL;
                comment.content = body.comments[i].content;
                send.comments.push(comment);
            }

            res.send(send);
        });
    });
});

module.exports = router;

