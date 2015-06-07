/**
 *
 * Created by aleckim on 2014. 5. 15..
 */

"use strict";

var router = require('express').Router();
var passport = require('passport');
var request = require('../controllers/requestEx');

var blogBot = require('./../controllers/blogBot');
var userMgr = require('./../controllers/userManager');

var botFormat = require('../models/botFormat');
var bC = require('../controllers/blogConvert');

var svcConfig = require('../config/all');

var clientConfig = svcConfig.Wordpress;
var wordpressStrategy = require('passport-wordpress').Strategy;
var WORDPRESS_API_URL = "https://public-api.wordpress.com/rest/v1";
var WORDPRESS_PROVIDER = "Wordpress";

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

passport.use(new wordpressStrategy({
        clientID: clientConfig.clientID,
        clientSecret: clientConfig.clientSecret,
        callbackURL: svcConfig.svcURL+"/wordpress/authorized",
        passReqToCallback : true
    },
    function(req, accessToken, refreshToken, profile, done) {
        var providerId;
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

        //it is not user id(it's blog_id)
        var provider = new botFormat.ProviderOauth2(profile.provider, providerId.toString(), profile.displayName,
            accessToken, refreshToken);

        userMgr.updateOrCreateUser(req, provider, function(err, user, isNewProvider, delUser) {
            if (err) {
                log.error("Fail to get user ");
                return done(err);
            }

            if (delUser) {
                blogBot.combineUser(user, delUser);
                userMgr.combineUser(user, delUser, function(err) {
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
    passport.authenticate('wordpress')
);

router.get('/authorized',
    passport.authenticate('wordpress', { failureRedirect: '/#signin' }),
    function(req, res) {
        // Successful authentication, redirect home.
        log.info('Successful!');
        res.redirect('/#');
    }
);

router.get('/me', function (req, res) {
    var userId = userMgr.getUserId(req, res);
    if (!userId) {
        return;
    }

    userMgr.findProviderByUserId(userId, WORDPRESS_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err);
            return res.status(500).send(err);
        }

        var apiUrl = WORDPRESS_API_URL+"/me";
        log.debug(apiUrl);

        _requestGet(apiUrl, provider.accessToken, function(err, response, body) {
            if(err) {
                log.error(err);
                return res.status(err.statusCode).send(err);
            }

            log.debug(body);
            res.send(body);
        });
    });
});

router.get('/bot_bloglist', function (req, res) {
    var userId = userMgr.getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":WORDPRESS_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    if (req.query.providerid === false) {
        var error = new Error("User didn't have blog!");
        log.error(error, meta);
        res.status(404).send(error);    //404 Not Found
        res.redirect("/#/signin");
        return;
    }

    var providerId = req.query.providerid;

    userMgr.findProviderByUserId(userId, WORDPRESS_PROVIDER, providerId, function (err, user, provider) {

        var getSiteListUrl = WORDPRESS_API_URL+"/sites/"+provider.providerId;
        log.debug(getSiteListUrl);

        _requestGet(getSiteListUrl, provider.accessToken, function(err, response, body) {
            if(err) {
                log.error(err, meta);
                return res.status(err.statusCode).send(err);
            }

            var wpBlog = {'id': body.ID.toString(), 'name':body.name, 'url':body.URL};

            var getCategoriesUrl = getSiteListUrl+'/categories';
            _requestGet(getCategoriesUrl, provider.accessToken, function(err, response, body) {
                if(err) {
                    log.error(err, meta);
                    return res.status(err.statusCode).send(err);
                }

                log.debug(body);
                var botBlogList = new botFormat.BotBlogList(provider);
                try {
                    var botCategories = [];
                    for (var i=0; i<body.categories.length; i+=1) {
                        var wpCategories = body.categories[i];
                        botCategories.push({'id':wpCategories.ID, 'name':wpCategories.name});
                    }
                    var botBlog = new botFormat.BotBlog(wpBlog.id, wpBlog.name, wpBlog.url,
                                botCategories);
                    botBlogList.blogs.push(botBlog);
                }
                catch (e) {
                    log.error(e, meta);
                    log.error(body, meta);
                    return res.statusCode(500).send(e);
                }

                res.send(botBlogList);
            });
        });
    });
});

router.get('/bot_post_count/:blog_id', function (req, res) {
    var userId = userMgr.getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":WORDPRESS_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var blogId = req.params.blog_id;

    userMgr.findProviderByUserId(userId, WORDPRESS_PROVIDER, blogId, function (err, user, provider) {

        var apiUrl = WORDPRESS_API_URL+"/sites/"+blogId;

        log.debug(apiUrl, meta);

        _requestGet(apiUrl, provider.accessToken, function(err, response, body) {
            if(err) {
                log.error(err, meta);
                return res.status(err.statusCode).send(err);
            }

            var botPostCount = {};
            try {
                log.debug("post count=" + body.post_count, meta);
                botPostCount = new botFormat.BotPostCount(WORDPRESS_PROVIDER, body.ID.toString(), body.post_count);
            }
            catch(e) {
                log.error(e, meta);
                log.error(body, meta);
                return res.status(500).send(e);
            }
            res.send(botPostCount);
        });
    });
 });


function _convertBotCategories(wpCategories) {
    var categories = [];
    if (wpCategories) {
        var categoryArr = Object.keys(wpCategories);
        for (var j=0; j<categoryArr.length; j+=1) {
            //pass '미분류' category
            if (wpCategories[categoryArr[j]].ID === 1) {
                continue;
            }
            categories.push(categoryArr[j]);
        }
    }

    return categories;
}

function _convertBotTags(wpTags) {
    var tags = [];
    if (wpTags) {
        var tagArr = Object.keys(wpTags);
        for (var h=0; h<tagArr.length; h+=1) {
            tags.push(tagArr[h]);
        }
    }

    return tags;
}

router.get('/bot_posts/:blog_id', function (req, res) {
    var userId = userMgr.getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":WORDPRESS_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var blogId = req.params.blog_id;
    var offSet = req.query.offset;
    var after = req.query.after;

    userMgr.findProviderByUserId(userId, WORDPRESS_PROVIDER, blogId, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            return res.status(500).send(err);
        }

        var apiUrl = WORDPRESS_API_URL+"/sites/"+blogId;
        var isExtended = false;
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
            if(err) {
                log.error(err, meta);
                return res.status(err.statusCode).send(err);
            }

            var botPostList = new botFormat.BotPostList(WORDPRESS_PROVIDER, blogId);

            try {

                for (var i = 0; i<body.posts.length; i+=1) {
                    var rawPost = body.posts[i];

                    var postDate = new Date(rawPost.modified);
                    var afterDate = new Date(after);
                    if (postDate < afterDate) {
                        log.debug('post is before', meta);
                        continue;
                    }

                    var botPost = new botFormat.BotTextPost(rawPost.ID.toString(), " ", rawPost.modified, rawPost.URL,
                                rawPost.title, _convertBotCategories(rawPost.categories), _convertBotTags(rawPost.tags));

                    botPostList.posts.push(botPost);
                }
            }
            catch(e) {
                log.error(e, meta);
                log.error(body, meta);
                return res.status(500).send(e);
            }

            res.send(botPostList);
        });
    });
});

router.get('/bot_posts/:blog_id/:post_id', function (req, res) {
    var userId = userMgr.getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":WORDPRESS_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var blogId = req.params.blog_id;

    userMgr.findProviderByUserId(userId, WORDPRESS_PROVIDER, blogId, function (err, user, provider) {
        var postId;
        var apiUrl;

        postId = req.params.post_id;
        apiUrl = WORDPRESS_API_URL+"/sites/"+blogId;
        apiUrl += "/posts";
        apiUrl += "/" + postId;

        log.debug(apiUrl, meta);

        _requestGet(apiUrl, provider.accessToken, function(err, response, body) {
            if(err) {
                log.error(err, meta);
                return res.status(err.statusCode).send(err);
            }

            //log.debug(data);
            var botPostList = new botFormat.BotPostList(WORDPRESS_PROVIDER, blogId);

            try {
                var rawPost = body;

                var replies = [];
                replies.push({"comment": rawPost.comment_count});
                replies.push({"like": rawPost.like_count});

                var botPost = new botFormat.BotTextPost(rawPost.ID.toString(), rawPost.content, rawPost.modified, rawPost.URL,
                    rawPost.title, _convertBotCategories(rawPost.categories), _convertBotTags(rawPost.tags), replies);

                botPostList.posts.push(botPost);
            }
            catch(e) {
                log.error(e, meta);
                log.error(body, meta);
                return res.status(500).send(e);
            }

            res.send(botPostList);
        });
    });
});

router.post('/bot_posts/new/:blog_id', function (req, res) {
    var userId = userMgr.getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":WORDPRESS_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var blogId = req.params.blog_id;
    var botPost = req.body;
    var newPost = {};

    if(botPost.title) {
        newPost.title = botPost.title;
    }
    if (botPost.tags) {
       newPost.tags = botPost.tags;
    }
    if (botPost.categories) {
        newPost.categories= botPost.categories;
    }

    newPost.content = bC.convertBotPostToTextContent(botPost);

    userMgr.findProviderByUserId(userId, WORDPRESS_PROVIDER, blogId, function (err, user, provider) {
        var apiUrl = WORDPRESS_API_URL+"/sites/"+blogId +"/posts/new";
        log.debug(apiUrl, meta);

        request.postEx(apiUrl, {
            json: true,
            headers: {
                "authorization": "Bearer " + provider.accessToken
            },
            form: newPost
        }, function (err, response, body) {
            if(err) {
                log.error(err, meta);
                return res.status(err.statusCode).send(err);
            }

            //add post info
            var botPostList = new botFormat.BotPostList(WORDPRESS_PROVIDER, blogId);

            try {
                var rawPost = body;
                var botPost = new botFormat.BotTextPost(rawPost.ID.toString(), rawPost.content, rawPost.modified, rawPost.URL,
                    rawPost.title, _convertBotCategories(rawPost.categories), _convertBotTags(rawPost.tags));

                botPostList.posts.push(botPost);
            }
            catch(e) {
                log.error(e, meta);
                log.error(body, meta);
                return res.status(500).send(e);
            }

            //log.debug(sendData);
            res.send(botPostList);
        });
    });
});

router.get('/bot_comments/:blogID/:postID', function (req, res) {
    var userId = userMgr.getUserId(req);
    if (!userId) {
        return;
    }
    var meta = {"cName":WORDPRESS_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var blogId = req.params.blogID;
    var postId = req.params.postID;

    userMgr.findProviderByUserId(userId, WORDPRESS_PROVIDER, blogId, function (err, user, provider) {
        if (err) {
            log.error(err);
            return res.status(500).send(err);
        }

        var apiUrl = WORDPRESS_API_URL+"/sites/"+blogId;
        apiUrl += "/posts";
        apiUrl += "/" + postId;
        apiUrl += "/replies";

        log.debug(apiUrl, meta);

        _requestGet(apiUrl, provider.accessToken, function(err, response, body) {
            if(err) {
                log.error(err, meta);
                return res.status(err.statusCode).send(err);
            }

            var botCommentList = new botFormat.BotCommentList(provider.providerName, blogId, postId);

            try {
                for(var i=0; i<body.found; i+=1) {
                    var raw = body.comments[i];
                    var botComment = new botFormat.BotComment(raw.content, raw.short_URL, raw.date);
                    botCommentList.comments.push(botComment);
                }
            }
            catch (e) {
                log.error(e, meta);
                log.error(body, meta);
                return res.status(500).send(e);
            }

            res.send(botCommentList);
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

