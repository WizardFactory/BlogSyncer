/**
 * Created by aleckim on 2014. 7. 19..
 */
"use strict";

var router = require('express').Router();
var passport = require('passport');
var request = require('../controllers/requestEx');

var blogBot = require('./../controllers/blogBot');
var userMgr = require('./../controllers/userManager');

var botFormat = require('../models/botFormat');
var bC = require('../controllers/blogConvert');

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
    function(req, accessToken, refreshToken, params, profile, done) {
        var meta = {"cName": KAKAO_PROVIDER, "fName":"passport.use"};

        //log.debug("accessToken:" + accessToken, meta);
        //log.debug("refreshToken:" + refreshToken, meta);
        //log.debug("params:"+JSON.stringify(params), meta);
        //log.debug("profile:" + JSON.stringify(profile), meta);
        var provider  = new botFormat.ProviderOauth2(profile.provider, profile.id.toString(), profile.username, accessToken,
                    refreshToken, userMgr.makeTokenExpireTime(params.expires_in));

        userMgr.updateOrCreateUser(req, provider, function(err, user, isNewProvider, delUser) {
            if (err) {
                log.error("Fail to get user", meta);
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
    var userId = userMgr.getUserId(req, res);
    if (!userId) {
        return;
    }

    userMgr.findProviderByUserId(userId, KAKAO_PROVIDER, undefined, function (err, user, provider) {
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
    var userId = userMgr.getUserId(req, res);
    if (!userId) {
        return;
    }

    userMgr.findProviderByUserId(userId, KAKAO_PROVIDER, undefined, function (err, user, provider) {
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
    var userId = userMgr.getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":KAKAO_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var providerId = req.query.providerid;
    var apiUrl = KAKAO_API_URL + "/v1/user/me";
    log.debug(apiUrl, meta);


    userMgr.findProviderByUserId(userId, KAKAO_PROVIDER, providerId, function (err, user, provider) {
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

            try {
                nickName = body.properties.nickname;
            }
            catch(e) {
                log.error(e, meta);
                log.error(body, meta);
                return res.status(500).send(e);
            }

            var blogUrl = "stroy.kakao.com/" + nickName;
            var botBlogList = new botFormat.BotBlogList(provider);
            var botBlog = new botFormat.BotBlog(nickName, nickName, blogUrl);
            botBlogList.blogs.push(botBlog);

            res.send(botBlogList);
        });
    });
});

router.get('/bot_post_count/:blog_id', function (req, res) {
    var userId = userMgr.getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":KAKAO_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    //kakao did not support post_count.
    var blogId = req.params.blog_id;
    var botPostCount = new botFormat.BotPostCount(KAKAO_PROVIDER, blogId, -1);

    res.send(botPostCount);
 });

function _pushPostsFromKakao(posts, rawPosts, after) {
    for (var i = 0; i < rawPosts.length; i+=1) {
        var rawPost = rawPosts[i];
        if (after) {
            var postDate = new Date(rawPost.created_at);
            var afterDate = new Date(after);

            if (postDate < afterDate) {
                //log.debug('post is before', meta);
                continue;
            }
        }

        var botPost;
        var replies = [];
        replies.push({'comment':rawPost.comment_count});
        replies.push({'like':rawPost.like_count});

        switch(rawPost.media_type) {
            case 'NOTE':
                botPost = new botFormat.BotTextPost(rawPost.id, rawPost.content, rawPost.created_at,
                    rawPost.url, '', [], [], replies);
                break;
            case 'PHOTO':
                var mediaUrls=[];
                for (var j=0; j<rawPost.media.length; j+=1) {
                   mediaUrls.push(rawPost.media[j].original);
                }
                botPost = new botFormat.BotPhotoPost(rawPost.id, mediaUrls, rawPost.created_at, rawPost.url, '',
                            rawPost.content, [], [], replies);
                break;
            case 'NOT_SUPPORTED':
                botPost = new botFormat.BotLinkPost(rawPost.id, rawPost.url, rawPost.created_at, rawPost.url, '',
                            rawPost.content, [], [], replies);
                break;
            default:
                log.error('Unknown media_type');
                break;
        }
        if(!botPost) {
            log.error(rawPost);
            log.error('Fail to create botPost!');
            continue;
        }

        posts.push(botPost);
    }
}

router.get('/bot_posts/:blog_id', function (req, res) {
    var userId = userMgr.getUserId(req, res);
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

    userMgr.findProviderByUserId(userId, KAKAO_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            return res.status(500).send(err);
        }

        _requestGet(apiUrl, provider.accessToken, function (err, response, body) {
            if (err) {
                log.error(err, meta);
                return res.status(err.statusCode).send(err);
            }

            var botPostList = new botFormat.BotPostList(KAKAO_PROVIDER, blogId);

            try {
                _pushPostsFromKakao(botPostList.posts, body, after);
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

    userMgr.findProviderByUserId(userId, KAKAO_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            return res.statusCode(500).send(err);
        }

        _requestGet(apiUrl, provider.accessToken, function (err, response, body) {
            if (err) {
                log.error(err, meta);
                return res.status(err.statusCode).send(err);
            }

            var botPostList = new botFormat.BotPostList(KAKAO_PROVIDER, blogId);
            log.info(body, meta);
            try {
                var rawPosts = [];
                rawPosts.push(body);
                _pushPostsFromKakao(botPostList.posts, rawPosts);
            }
            catch(e) {
                log.error(e, meta);
                log.error(body, meta);
                return res.status(500).send(e);
            }

            return res.send(botPostList);
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

function _makeContent(rcvPost) {
    var content = '';

    if (rcvPost.content) {
        content += rcvPost.content;
    }
    if (rcvPost.description) {
        content += rcvPost.description;
    }

    content = bC.removeHtmlTags(content);

    //if didn't have any content, add padding for safety
    content += ' ';

    return content;
}

function _makePhotoPost(accessToken, rcvPost, callback) {
    var photoPost = {};
    photoPost.image_url_list = rcvPost.mediaUrls;
    photoPost.content = _makeContent(rcvPost);

    return callback(undefined, photoPost);
}

function _makeNotePost(accessToken, rcvPost, callback) {
    var notePost = {};
    //notePost.content = _makeContent(rcvPost);
    bC.convertPostToPlainContentWithTitle(rcvPost, 2048, bC.convertShortenUrl, function (content) {
        notePost.content = content;
        return callback(undefined, notePost);
    });
}

function _makeLinkPost(accessToken, rcvPost, callback) {
    var meta={};
    meta.cName = KAKAO_PROVIDER;
    meta.fName = "_makeLinkPost";

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

        var linkPost = {};
        linkPost.content = _makeContent(rcvPost);

        try {
            linkPost.link_info = JSON.stringify(body);
        }
        catch(e) {
            log.error(e, meta);
            log.error(body, meta);
            return callback(e);
        }

        log.debug(linkPost, meta);

        return callback(undefined, linkPost);
    });
}

router.post('/bot_posts/new/:blog_id', function (req, res) {
    var userId = userMgr.getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":KAKAO_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var blogId = req.params.blog_id;
    var botPost= req.body;
    var postType = botPost.type;
    if (!postType) {
        log.error("postType is undefined, so it set to text", meta);
        postType = 'text';
    }

    var apiUrl = KAKAO_API_URL + "/v1/api/story/post";
    log.debug(apiUrl, meta);

    userMgr.findProviderByUserId(userId, KAKAO_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            return res.status(500).send(err);
        }

        var makePostFunc;
        //kakao supports only upload photo
        //if (postType === 'photo') {
        //    makePostFunc = _makePhotoPost;
        //    apiUrl += '/photo';
        //}
        //else
        if (postType === 'text') {
           //if big page(like blog post) link post
           // else
            makePostFunc = _makeNotePost;
            apiUrl += '/note';
        }
        else if (postType === 'link') {
            makePostFunc = _makeLinkPost;
            apiUrl += '/link';
        }
        else if (postType === 'audio' || postType === 'video' || postType === 'photo') {
            //make generate link or note
            log.debug('test audio/video to note');

            makePostFunc = _makeNotePost;
            apiUrl += '/note';
        }
        else {
            err = new Error("postType was undefined");
            log.error(err, meta);
            return res.status(500).send(err);
        }

        makePostFunc(provider.accessToken, botPost, function(err, newPost) {
            if (err) {
                log.error(err, meta);
                return res.status(err.statusCode).send(err);
            }

            _requestPost(apiUrl, provider.accessToken, newPost, function(err, response, body) {
                if (err) {
                    log.error(err, meta);
                    return res.status(err.statusCode).send(err);
                }

                var botPostList = new botFormat.BotPostList(KAKAO_PROVIDER, blogId);
                try {
                    botPost.id = body.id;
                    botPost.url = "https://story.kakao.com" + "/" + _convertToURL(body.id);
                    botPost.created_at = new Date(); //temp
                    botPost.replies = [];
                    botPostList.posts.push(botPost);
                }
                catch(e) {
                    log.error(e, meta);
                    log.error(body, meta);
                    return res.status(500).send(e);
                }

                return res.send(botPostList);
            });
        });
    });
});


router.get('/bot_comments/:blogID/:postID', function (req, res) {
    var userId = userMgr.getUserId(req, res);
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

    userMgr.findProviderByUserId(userId, KAKAO_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err);
            return res.status(500).send(err);
        }

        _requestGet(apiUrl, provider.accessToken, function (err, response, body) {
            if (err) {
                log.error(err);
                return res.status(err.statusCode).send(err);
            }

            var botCommentList = new botFormat.BotCommentList(KAKAO_PROVIDER, blogId, postId);

            try {
                for (var i = 0; i < body.comment_count; i+=1) {
                    var comment = {};
                    comment.URL = body.url;
                    comment.content = body.comments[i].text;
                    var botComment = new botFormat.BotComment(body.comments[i].text, new Date(0), body.url);
                    botCommentList.comments.push(botComment);
                }
            }
            catch(e) {
                log.error(e, meta);
                log.error(body, meta);
                return res.status(500).send(e);
            }

            return res.send(botCommentList);
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
        json: true,
        form: data
    }, function (error, response, body) {
        callback(error, response, body);
    });
}

function _updateAccessToken(user, provider, callback) {
    var url = "https://kauth.kakao.com" + "/oauth/token";
    var data = {
        grant_type: 'refresh_token',
        client_id: clientConfig.clientID,
        refresh_token: provider.refreshToken
    };

    _requestPost(url, provider.accessToken, data, function (error, response, body) {
        if (error) {
            log.error(error);
            return callback(error);
        }
        log.info(body);

        var newProvider = userMgr.updateAccessToken(user, provider, body.access_token, body.refresh_token, body.expires_in);
        return callback(null, newProvider);
    });
}

router.post('/bot_posts/updateToken', function (req, res) {
    var userId = userMgr.getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":KAKAO_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta) ;

    userMgr.findProviderByUserId(userId, KAKAO_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            return res.status(500).send(err);
        }
        _updateAccessToken(user, provider, function (err, data) {
            if (err) {
                log.error(err, meta);
                return res.status(err.statusCode).send(err);
            }
            res.send(data);
        });
    });
});

module.exports = router;
