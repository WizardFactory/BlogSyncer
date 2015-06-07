/**
 * Created by aleckim on 2014. 7. 20.
 */

"use strict";

var router = require('express').Router();
var passport = require('passport');
var request = require('../controllers/requestEx');
var url = require('url');

var blogBot = require('./../controllers/blogBot');
var userMgr = require('./../controllers/userManager');

var botFormat = require('../models/botFormat');
var bC = require('../controllers/blogConvert');

var svcConfig = require('../config/all');

var clientConfig = svcConfig.tistory;
var TistoryStrategy = require('passport-tistory').Strategy;
var TISTORY_API_URL = "https://www.tistory.com/apis";
var TISTORY_PROVIDER = "tistory";


var Entities = require('html-entities').AllHtmlEntities;
var entities = new Entities();

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

passport.use(new TistoryStrategy({
        clientID: clientConfig.clientID,
        clientSecret: clientConfig.clientSecret,
        callbackURL: svcConfig.svcURL + "/tistory/authorized",
        passReqToCallback : true
    },
    function(req, accessToken, refreshToken, profile, done) {
//       log.debug("accessToken:" + accessToken);
//       log.debug("refreshToken:" + refreshToken);
//       log.debug("profile:" + JSON.stringify(profile));

        var provider  = new botFormat.ProviderOauth2(TISTORY_PROVIDER, profile.userId.toString(), profile.id,
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
    passport.authenticate('tistory')
);

router.get('/authorized',
    passport.authenticate('tistory', { failureRedirect: '/#signin' }),
    function(req, res) {
        // Successful authentication, redirect home.
        log.debug('Successful!');
        res.redirect('/#');
    }
);

router.get('/info', function (req, res) {
    var userId = userMgr.getUserId(req, res);
    if (!userId) {
        return;
    }

    userMgr.findProviderByUserId(userId, TISTORY_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err);
            return res.status(500).send(err);
        }

        var api_url = TISTORY_API_URL+"/blog/info?access_token="+ provider.accessToken+"&output=json";

        log.debug(api_url);

        request.getEx(api_url, null, function (err, response, body) {
            if (err) {
                log.error(err);
                return res.status(err.statusCode).send(err);
            }
            log.debug(body);
            res.send(body);
        });
    });
});

router.get('/post/list/:simpleName', function (req, res) {
    var userId = userMgr.getUserId(req, res);
    if (!userId) {
        return;
    }

    var blog_name = req.params.simpleName;

    userMgr.findProviderByUserId(userId, TISTORY_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err);
            return res.status(500).send(err);
        }

        var api_url = TISTORY_API_URL+"/post/list?access_token="+ provider.accessToken;
        api_url = api_url + "&targetUrl=" + blog_name;
        api_url = api_url + "&output=json";

        log.debug(api_url);

        request.getEx(api_url, null, function (err, response, body) {
            if (err) {
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
    var meta = {"cName":TISTORY_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var providerId = req.query.providerid;

    userMgr.findProviderByUserId(userId, TISTORY_PROVIDER, providerId, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            return res.status(500).send(err);
        }

        var api_url = TISTORY_API_URL + "/blog/info?access_token=" + provider.accessToken + "&output=json";
        log.debug(api_url, meta);

        request.getEx(api_url, null, function (err, response, body) {
            if (err)  {
                log.error(err, meta);
                return res.send(500).send(err);
            }

            var botBlogList = new botFormat.BotBlogList(provider);

            try {
                var item = JSON.parse(body).tistory.item;
                log.debug('item length=' + item.length, meta);

                for (var i = 0; i < item.length; i+=1) {
                    var hostname = url.parse(item[i].url).hostname;
                    var target_url;
                    if (hostname.indexOf('tistory.com') > -1) {
                        target_url = hostname.split('.')[0];
                    }
                    else {
                        target_url = hostname;
                    }

                    log.debug('target_url=', target_url, meta);
                    //tistory api had used targetUrl instead of blogId;
                    var botBlog = new botFormat.BotBlog(target_url, item[i].title, item[i].url);
                    botBlogList.blogs.push(botBlog);
                }
            }
            catch(e) {
                log.error(e, meta);
                log.error(body, meta);
                return res.status(500).send(e);
            }

            var async = require('async');
            var asyncTasks = [];

            botBlogList.blogs.forEach(function (botBlog) {
              asyncTasks.push(function (callback) {
                  _getCategoryIds(botBlog.blog_id, provider.accessToken, request.getEx, function(err, category) {
                      if (err) {
                          log.error(err, meta);
                          return callback(err);
                      }
                      callback(null, category);
                  });
              });
            });

            async.parallel(asyncTasks, function (err, result) {
                botBlogList.blogs.forEach(function (botBlog, index) {
                    botBlog.categories = result[index];
                });
                log.verbose(botBlogList, meta);
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
    var meta = {"cName":TISTORY_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var target_url = req.params.blog_id;

    userMgr.findProviderByUserId(userId, TISTORY_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            return res.status(500).send(err);
        }

        var api_url = TISTORY_API_URL + "/blog/info?";
        api_url = api_url + "access_token=" + provider.accessToken;
        api_url += "&output=json";

        log.debug(api_url, meta);

        request.getEx(api_url, null, function (err, response, body) {
            if (err) {
                log.error(err, meta);
                return res.status(500).send(err);
            }

            var postCount;
            try {
                var item = JSON.parse(body).tistory.item;

                log.debug('item length=' + item.length, meta);

                for (var i = 0; i < item.length; i+=1) {
                    var hostname = url.parse(item[i].url).hostname;
                    var target_host = hostname.split('.')[0];
                    if (target_host === target_url) {
                        break;
                    }
                }

                if (i === item.length) {
                    log.debug('Fail to find blog=' + target_url, meta);
                    postCount = 0;
                }
                else {
                    postCount = item[i].statistics.post;
                }
            }
            catch(e)  {
                log.error(e, meta);
                log.error(body, meta);
                return res.status(500).send(e);
            }

            var botPostCount = new botFormat.BotPostCount(TISTORY_PROVIDER, target_url, postCount);
            res.send(botPostCount);
        });
    });
});

router.get('/bot_posts/:blog_id', function (req, res) {
    var userId = userMgr.getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":TISTORY_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var target_url = req.params.blog_id;
    var offset = req.query.offset;
    var after = req.query.after;

    var count;
    var page;
    if (offset) {
        count = offset.split("-")[1];
        page = offset.split("-")[0] / count + 1; //start from 1
    }

    userMgr.findProviderByUserId(userId, TISTORY_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            return res.status(500).send(err);
        }

        var api_url = TISTORY_API_URL + "/post/list?";
        api_url = api_url + "access_token=" + provider.accessToken;
        api_url += "&targetUrl=" + target_url; //조회할 티스토리 주소
        if (offset) {
            api_url += "&page=" + page;
            api_url += "&count=" + count;
        }
        if (after) {
            if (!offset) {
                api_url += "&count=" + 30;
            }
            api_url += "&sort=date";
        }
        api_url += "&output=json";

        //log.debug(api_url, meta);

        _getCategoryIds(target_url, provider.accessToken, request.getEx, function(err, category) {
            if (err) {
               log.error(err, meta);
                return res.status(err.statusCode).send(err);
            }

            request.getEx(api_url, null, function (err, response, body) {
                if (err) {
                    log.error(err, meta);
                    return res.status(err.statusCode).send(err);
                }

                var botPostList = new botFormat.BotPostList(TISTORY_PROVIDER, target_url);

                try {
                    var item = JSON.parse(body).tistory.item;

                    var recvPostCount = 0;
                    if (item.totalCount === 1) {
                        recvPostCount = item.totalCount;
                    }
                    else {
                        recvPostCount = item.posts.post.length;
                    }
                    //log.debug('tistory target_url='+target_url+' posts='+recv_post_count, meta);

                    for (var i = 0; i < recvPostCount; i += 1) {
                        var raw_post = {};
                        if (recvPostCount === 1) {
                            raw_post = item.posts.post;
                        }
                        else {
                            raw_post = item.posts.post[i];
                        }
                        var post_date = new Date(raw_post.date);
                        if (after) {
                            var after_date = new Date(after);
                            if (post_date < after_date) {
                                //log.debug('post(' + raw_post.id + ') is before');
                                continue;
                            }
                            else {
                                log.debug("add post(" + raw_post.id + ")");
                            }
                        }

                        var botPost = new botFormat.BotTextPost(raw_post.id, " ", raw_post.date, raw_post.postUrl,
                                    raw_post.title, _getCategoryNameById(category, raw_post.categoryId));
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
});

router.get('/bot_posts/:blog_id/:post_id', function (req, res) {
    var userId = userMgr.getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":TISTORY_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var target_url = req.params.blog_id;
    var post_id = req.params.post_id;

    userMgr.findProviderByUserId(userId, TISTORY_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err);
            return res.status(500).send(err);
        }

        _getCategoryIds(target_url, provider.accessToken, request.getEx, function(err, category) {
            if (err) {
                log.error(err, meta);
                return res.status(err.statusCode).send(err);
            }

            var api_url = TISTORY_API_URL + "/post/read?";
            api_url = api_url + "access_token=" + provider.accessToken;
            api_url += "&targetUrl=" + target_url; //조회할 티스토리 주소
            api_url += "&postId=" + post_id;
            api_url += "&output=json";

            log.debug(api_url, meta);

            request.getEx(api_url, null, function (err, response, body) {
                if (err) {
                    log.error(err, meta);
                    return res.status(err.statusCode).send(err);
                }

                //log.debug(body, meta);

                var botPostList = new botFormat.BotPostList(TISTORY_PROVIDER, target_url);

                try {
                    var item = JSON.parse(body).tistory.item;

                    var replies = [];
                    replies.push({"comment": item.comments});
                    replies.push({"trackback": item.trackbacks});

                    var tags;
                    if (Array.isArray(item.tags.tag)) {
                        tags = item.tags.tag;
                    }
                    else {
                        tags = [];
                        if (item.tags.tag) {
                            tags.push(item.tags.tag);
                        }
                    }

                    var botPost = new botFormat.BotTextPost(item.id, entities.decode(item.content), item.date, item.postUrl,
                        item.title, _getCategoryNameById(category, item.categoryId), tags, replies);
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
});

router.post('/bot_posts/new/:blog_id', function (req, res) {
    var userId = userMgr.getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":TISTORY_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var target_url = req.params.blog_id;
    var api_url = TISTORY_API_URL + "/post/write";

    var newPost = {};
    var botPost = req.body;

    newPost.targetUrl = target_url;
    newPost.visibility = 3; //3:발행

    if (botPost.title) {
        newPost.title = botPost.title;
    }
    else {
        newPost.title = bC.makeTitle(botPost) ;
    }

    newPost.content = bC.convertBotPostToTextContent(botPost);
    newPost.content = bC.convertNewLineToBreakTag(newPost.content);

    if (botPost.tags) {
        newPost.tag = botPost.tags.toString();
    }

    var categoryName;
    if (botPost.categories) {
        categoryName =  botPost.categories[0];
    }

    userMgr.findProviderByUserId(userId, TISTORY_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err);
            return res.status(500).send(err);
        }

        newPost.access_token = provider.accessToken;

        _getCategoryIds(target_url, provider.accessToken, request.getEx, function(err, category) {
            if (err)  {
                log.error(err);
                return res.status(err.statusCode).send(err);
            }

            //get categoryId from name
            if (categoryName) {
                newPost.category = _getCategoryIdByName(category, categoryName);

                //tistory didn't open create category
                if(!newPost.category) {
                    delete newPost.category;
                }
            }
            newPost.output = "json";

            request.postEx(api_url, {
                form: newPost
            }, function (err, response, body) {
                if (err)  {
                    log.error(err);
                    return res.status(err.statusCode).send(err);
                }

                var botPostList = new botFormat.BotPostList(TISTORY_PROVIDER, target_url);

                try {
                    var item = JSON.parse(body).tistory;
                    //todo: get date
                    var botPost = new botFormat.BotTextPost(item.postId, ' ', new Date(), item.url, newPost.title,
                                _getCategoryNameById(category, newPost.categoryId));
                    botPostList.posts.push(botPost);
                }
                catch(e) {
                    log.error(e, meta);
                    log.error(body, meta);
                    return res.status(500).send(e);
                }

                //log.debug(send_data);
                res.send(botPostList);
            });
        });
    });
});

router.get('/bot_comments/:blogID/:postID', function (req, res) {
    var userId = userMgr.getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":TISTORY_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var targetURL = req.params.blogID;
    var postID = req.params.postID;

    userMgr.findProviderByUserId(userId, TISTORY_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err);
            return res.status(500).send(err);
        }

        var api_url = TISTORY_API_URL + "/comment/list?";
        api_url = api_url + "access_token=" + provider.accessToken;
        api_url += "&targetUrl=" + targetURL; //조회할 티스토리 주소
        api_url += "&postId=" + postID;
        api_url += "&output=json";

        log.debug(api_url, meta);

        request.getEx(api_url, null, function (err, response, body) {
            if (err)  {
                log.error(err);
                return res.status(err.statusCode).send(err);
            }

            //log.debug(body);
            var botCommentList = new botFormat.BotCommentList(provider.providerName, targetURL, postID);

            try {
                var item = JSON.parse(body).tistory.item;


                for (var i = 0; i < item.totalCount; i+=1) {
                    var comment = new botFormat.BotComment(item.comments.comment[i].comment, item.url,
                                item.comments.comment[i].date);
                    botCommentList.comments.push(comment);
                }
            }
            catch(e) {
                log.error(e, meta);
                log.error(body, meta);
                return res.status(500).send(e);
            }

            res.send(botCommentList);
        });
    });
});

/**
 * 이 함수처럼, request.get과 callback을 분리해서 unit test가능한 구조로 변경할 필요가 있음.
 * @param target_api_url
 * @param accessToken
 * @param get
 * @param cb
 * @private
 */
function _getCategoryIds(target_api_url, accessToken, get, cb) {
    var api_url;
    var category;
    var botCategories = [];

    api_url = TISTORY_API_URL + "/category/list?";
    api_url += "access_token=" + accessToken;
    api_url += "&targetUrl=" + target_api_url; //조회할 티스토리 주소
    api_url += "&output=json";

    log.debug("url="+api_url);

    get(api_url, null, function (err, response, body) {
        if (err) {
            log.error(err);
            cb(err);
        }
        try {
            category = JSON.parse(body).tistory.item.categories.category;
            if (category) {
                for (var i=0; i<category.length; i+=1) {
                    botCategories.push({'id':category[i].id, 'name':category[i].name});
                }
            }
        }
        catch (e) {
            e.statusCode = 500;
            e.routerMessage = "Fail to get category info";
            log.error(e);
            category = [];
            cb(e);
        }

        log.debug(botCategories);
        cb(null, botCategories);
    });
}

/*
 *
 * @param category
 * @param categoryId
 * @returns {*}
 * @private
 */
function _getCategoryNameById(category, categoryId) {
    var len;

    if (!category) {
        return categoryId;
    }

    len = category.length;
    for (var i=0; i<len; i+=1)  {
        if (category[i].id === categoryId) {
            return category[i].name;
        }
    }
}

/***
 *
 * @param category
 * @param categoryName
 * @returns {*}
 * @private
 */
function _getCategoryIdByName(category, categoryName) {
    var len;

    if (!category) {
        return categoryName;
    }

    len = category.length;
    for (var i=0; i<len; i+=1)  {
        if (category[i].name === categoryName) {
            return category[i].id;
        }
    }
}

/* It's only for test */
//router.get('/bot_category/:blog_id', function(req, res) {
//    var userId = getUserId(req, res);
//    UserDb.findById(userId, function (err, user) {
//        var target_url;
//        var category;
//        var p;
//
//        target_url = req.params.blog_id;
//        p = user.findProvider("tistory");
//        log.debug("target_url="+target_url);
//        _getCategoryIds(target_url, p.accessToken, request.get, function(category) {
//            log.debug("catogory=");
//            log.debug(category);
//            res.send(category);
//        });
//    });
//});

module.exports = router;
