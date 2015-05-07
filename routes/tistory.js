/**
 * Created by aleckim on 2014. 7. 20.
 */

"use strict";

var router = require('express').Router();
var passport = require('passport');
var request = require('../controllers/requestEx');
var url = require('url');

var blogBot = require('./../controllers/blogbot');
var userMgr = require('./../controllers/userManager');
var svcConfig = require('../models/svcConfig.json');

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

        var provider = {
            "providerName": TISTORY_PROVIDER,
            "accessToken": accessToken,
            "refreshToken": refreshToken,
            "providerId": profile.userId.toString(),
            "displayName": profile.id
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
    var userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }

    userMgr._findProviderByUserId(userId, TISTORY_PROVIDER, undefined, function (err, user, provider) {
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
    var userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }

    var blog_name = req.params.simpleName;

    userMgr._findProviderByUserId(userId, TISTORY_PROVIDER, undefined, function (err, user, provider) {
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
    var userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":TISTORY_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var providerId = req.query.providerid;

    userMgr._findProviderByUserId(userId, TISTORY_PROVIDER, providerId, function (err, user, provider) {
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

            var send_data = {};
            send_data.provider = provider;
            send_data.blogs = [];

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
                    send_data.blogs.push({"blog_id": target_url, "blog_title": item[i].title, "blog_url": item[i].url});
                }
            }
            catch(e) {
                log.error(e, meta);
                log.error(body, meta);
                return res.status(500).send(e);
            }

            res.send(send_data);
        });
    });
});

router.get('/bot_post_count/:blog_id', function (req, res) {
    var userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":TISTORY_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var target_url = req.params.blog_id;

    userMgr._findProviderByUserId(userId, TISTORY_PROVIDER, undefined, function (err, user, provider) {
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

            var send_data = {};
            send_data.provider_name = TISTORY_PROVIDER;

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
                    send_data.blog_id = target_url;
                    send_data.post_count = 0;
                }
                else {
                    send_data.blog_id = target_url;
                    send_data.post_count = item[i].statistics.post;
                }
            }
            catch(e)  {
                log.error(e, meta);
                log.error(body, meta);
                return res.status(500).send(e);
            }

            res.send(send_data);
        });
    });
});

router.get('/bot_posts/:blog_id', function (req, res) {
    var userId = userMgr._getUserId(req, res);
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

    userMgr._findProviderByUserId(userId, TISTORY_PROVIDER, undefined, function (err, user, provider) {
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

                var send_data = {};
                send_data.provider_name = TISTORY_PROVIDER;
                send_data.blog_id = target_url;
                send_data.post_count = 0;
                send_data.posts = [];

                try {
                    var item = JSON.parse(body).tistory.item;

                    var recv_post_count = 0;
                    if (item.totalCount === 1) {
                        recv_post_count = item.totalCount;
                    }
                    else {
                        recv_post_count = item.posts.post.length;
                    }
                    //log.debug('tistory target_url='+target_url+' posts='+recv_post_count, meta);

                    for (var i = 0; i < recv_post_count; i += 1) {
                        var raw_post = {};
                        if (recv_post_count === 1) {
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

                        var send_post = {};
                        send_post.title = raw_post.title;
                        send_post.modified = raw_post.date;
                        send_post.id = raw_post.id;
                        send_post.url = raw_post.postUrl;
                        send_post.categories = [];
                        send_post.categories.push(_getCategoryNameById(category, raw_post.categoryId));
                        send_data.posts.push(send_post);
                        send_data.post_count += 1;
                    }
                }
                catch(e) {
                    log.error(e, meta);
                    log.error(body, meta);
                    return res.status(500).send(e);
                }
                res.send(send_data);
            });
        });
    });
});

router.get('/bot_posts/:blog_id/:post_id', function (req, res) {
    var userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":TISTORY_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var target_url = req.params.blog_id;
    var post_id = req.params.post_id;

    userMgr._findProviderByUserId(userId, TISTORY_PROVIDER, undefined, function (err, user, provider) {
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

                var send_data = {};
                send_data.provider_name = TISTORY_PROVIDER;
                send_data.blog_id = target_url;
                send_data.posts = [];

                try {
                    var item = JSON.parse(body).tistory.item;
                    var raw_post = item;
                    var send_post = {};
                    send_post.title = raw_post.title;
                    send_post.modified = raw_post.date; //it's write date tistory was not supporting modified date
                    send_post.id = raw_post.id;
                    send_post.url = raw_post.postUrl;
                    send_post.categories = [];
                    send_post.categories.push(_getCategoryNameById(category, raw_post.categoryId));

                    send_post.content = entities.decode(raw_post.content);
                    send_post.replies = [];
                    send_post.replies.push({"comment_count": raw_post.comments});
                    send_post.replies.push({"trackback_count": raw_post.trackbacks});
                    send_data.posts.push(send_post);
                }
                catch(e) {
                    log.error(e, meta);
                    log.error(body, meta);
                    return res.status(500).send(e);
                }

                res.send(send_data);
            });
        });
    });
});

router.post('/bot_posts/new/:blog_id', function (req, res) {
    var userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":TISTORY_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var target_url = req.params.blog_id;
    var api_url = TISTORY_API_URL + "/post/write";

    var new_post = {};
    new_post.targetUrl = target_url;
    new_post.visibility = 3; //3:발행

    if (req.body.title) {
        new_post.title = req.body.title;
    }
    else {
        var error =  new Error("Fail to get title");
        log.error(error, meta);
        return res.status(400).send(error);
    }

    if (req.body.content) {
        new_post.content = req.body.content;
    }
    if (req.body.tags) {
        new_post.tag = req.body.tags;
    }

    var categoryName;
    if (req.body.categories) {
        categoryName =  req.body.categories[0];
    }

    userMgr._findProviderByUserId(userId, TISTORY_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err);
            return res.status(500).send(err);
        }

        new_post.access_token = provider.accessToken;

        _getCategoryIds(target_url, provider.accessToken, request.getEx, function(err, category) {
            if (err)  {
                log.error(err);
                return res.status(err.statusCode).send(err);
            }

            //get category_id from name
            if (categoryName) {
                new_post.category_id = _getCategoryIdByName(category, categoryName);
                //todo create category
                //if(!new_post.category_id) {
                //
                //}
            }
            new_post.output = "json";

            request.postEx(api_url, {
                form: new_post
            }, function (err, response, body) {
                if (err)  {
                    log.error(err);
                    return res.status(err.statusCode).send(err);
                }

                var send_data = {};
                send_data.provider_name = TISTORY_PROVIDER;
                send_data.blog_id = target_url;
                send_data.posts = [];

                try {
                    var item = JSON.parse(body).tistory;

                    var send_post = {};
                    send_post.title = new_post.title;
                    //todo: get date
                    send_post.modified = new Date();
                    send_post.id = item.postId;
                    send_post.url = item.url;
                    send_post.categories = [];
                    send_post.categories.push(_getCategoryNameById(category, new_post.categoryId));
                    send_data.posts.push(send_post);
                }
                catch(e) {
                    log.error(e, meta);
                    log.error(body, meta);
                    return res.status(500).send(e);
                }

                //log.debug(send_data);
                res.send(send_data);
            });
        });
    });
});

router.get('/bot_comments/:blogID/:postID', function (req, res) {
    var userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":TISTORY_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var targetURL = req.params.blogID;
    var postID = req.params.postID;

    userMgr._findProviderByUserId(userId, TISTORY_PROVIDER, undefined, function (err, user, provider) {
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
            var send = {};
            send.providerName = provider.providerName;
            send.blogID = targetURL;
            send.postID = postID;

            try {
                var item = JSON.parse(body).tistory.item;
                send.found = item.totalCount;
                send.comments = [];
                for (var i = 0; i < item.totalCount; i+=1) {
                    var comment = {};
                    comment.date = item.comments.comment[i].date;
                    comment.URL = item.url;
                    comment.content = item.comments.comment[i].comment;
                    send.comments.push(comment);
                }
            }
            catch(e) {
                log.error(e, meta);
                log.error(body, meta);
                return res.status(500).send(e);
            }

            res.send(send);
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
//        log.debug(body);
        try {
            category = JSON.parse(body).tistory.item.categories.category;
        }
        catch (e) {
            e.statusCode = 500;
            e.routerMessage = "Fail to get category info";
            log.error(e);
            category = [];
            cb(e);
        }

//        log.debug(category);
        cb(null, category);
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
//    var userId = _getUserId(req, res);
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
