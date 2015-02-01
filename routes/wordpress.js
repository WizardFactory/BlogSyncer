/**
 *
 * Created by aleckim on 2014. 5. 15..
 */

var router = require('express').Router();
var passport = require('passport');
var request = require('request');

var blogBot = require('./blogbot');
var userMgr = require('./userManager');
var svcConfig = require('../models/svcConfig.json');

var clientConfig = svcConfig.Wordpress;
var wordpressStrategy = require('passport-wordpress').Strategy;
var WORDPRESS_API_URL = "https://public-api.wordpress.com/rest/v1";
var WORDPRESS_PROVIDER = "Wordpress";

passport.serializeUser(function(user, done) {
    "use strict";
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    "use strict";
    done(null, obj);
});

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

        userMgr._updateOrCreateUser(req, provider, function(err, user, isNewProvider) {
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

router.get('/me', function (req, res) {
    "use strict";

    var userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }

    userMgr._findProviderByUserId(userId, WORDPRESS_PROVIDER, undefined, function (err, user, provider) {
        var apiUrl;

        if (err) {
            log.error("Fail to find provider");
            log.error(err.toString());
            return res.send(err);
        }

        apiUrl = WORDPRESS_API_URL+"/me";
        log.debug(apiUrl);

        _requestGet(apiUrl, provider.accessToken, function(err, response, body) {
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
    var providerId;
    var errorMsg;

    log.debug("Wordpress: "+ req.url + ' : this is called by bot');

    userId = userMgr._getUserId(req, res);
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

    userMgr._findProviderByUserId(userId, WORDPRESS_PROVIDER, providerId, function (err, user, provider) {
        var apiUrl;

        apiUrl = WORDPRESS_API_URL+"/sites/"+provider.providerId;
        log.debug(apiUrl);

        _requestGet(apiUrl, provider.accessToken, function(err, response, body) {
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

            sendData.provider = provider;
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
    var blogId;

    log.debug("Wordpress: "+ req.url + ' : this is called by bot');

    userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }

    blogId = req.params.blog_id;

    userMgr._findProviderByUserId(userId, WORDPRESS_PROVIDER, blogId, function (err, user, provider) {
        var apiUrl;

        apiUrl = WORDPRESS_API_URL+"/sites/"+blogId;

        log.debug(apiUrl);

        _requestGet(apiUrl, provider.accessToken, function(err, response, body) {
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
            sendData.provider_name = WORDPRESS_PROVIDER;
            sendData.blog_id = body.ID.toString();
            sendData.post_count = body.post_count;
            res.send(sendData);
        });
    });
 });

router.get('/bot_posts/:blog_id', function (req, res) {
    "use strict";
    var userId;
    var blogId;

    //log.debug("Wordpress: "+ req.url + ' : this is called by bot');
    userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }

    blogId = req.params.blog_id;

    userMgr._findProviderByUserId(userId, WORDPRESS_PROVIDER, blogId, function (err, user, provider) {
        var offSet;
        var after;
        var isExtended;
        var apiUrl;

        offSet = req.query.offset;
        after = req.query.after;
        isExtended = false;

        apiUrl = WORDPRESS_API_URL+"/sites/"+blogId;

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

        _requestGet(apiUrl, provider.accessToken, function(err, response, body) {
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
            sendData.provider_name = WORDPRESS_PROVIDER;
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
    var blogId;

    log.debug("Wordpress: "+ req.url + ' : this is called by bot');

    userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }

    blogId = req.params.blog_id;

    userMgr._findProviderByUserId(userId, WORDPRESS_PROVIDER, blogId, function (err, user, provider) {
        var postId;
        var apiUrl;

        postId = req.params.post_id;
        apiUrl = WORDPRESS_API_URL+"/sites/"+blogId;
        apiUrl += "/posts";
        apiUrl += "/" + postId;

        log.debug(apiUrl);

        _requestGet(apiUrl, provider.accessToken, function(err, response, body) {
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
            sendData.provider_name = WORDPRESS_PROVIDER;
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
    var blogId;

    log.debug('Wordpress ' + req.url);

    userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }

    blogId = req.params.blog_id;

    userMgr._findProviderByUserId(userId, WORDPRESS_PROVIDER, blogId, function (err, user, provider) {
        var apiUrl;

        apiUrl = WORDPRESS_API_URL+"/sites/"+blogId +"/posts/new";

        log.debug(apiUrl);
        request.post(apiUrl, {
            json: true,
            headers: {
                "authorization": "Bearer " + provider.accessToken
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
            sendData.provider_name = WORDPRESS_PROVIDER;
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
    var blogId;

    log.debug(req.url);
    userId = userMgr._getUserId(req);
    if (!userId) {
        return;
    }

    blogId = req.params.blogID;

    userMgr._findProviderByUserId(userId, WORDPRESS_PROVIDER, blogId, function (err, user, provider) {
        var postId;
        var apiUrl;

        postId = req.params.postID;
        apiUrl = WORDPRESS_API_URL+"/sites/"+blogId;
        apiUrl += "/posts";
        apiUrl += "/" + postId;
        apiUrl += "/replies";

        log.debug(apiUrl);

        _requestGet(apiUrl, provider.accessToken, function(err, response, body) {
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
            send.providerName = provider.providerName;
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

module.exports = router;

