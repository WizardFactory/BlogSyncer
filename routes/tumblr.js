/**
 * Created by aleckim on 2014. 7. 5..
 */

"use strict";

var router = require('express').Router();
var passport = require('passport');

var blogBot = require('./../controllers/blogbot');
var userMgr = require('./../controllers/userManager');

var botFormat = require('../models/botFormat');
var bC = require('../controllers/blogConvert');

var svcConfig = require('../models/svcConfig.json');

var clientConfig = svcConfig.tumblr;
var TumblrStrategy = require('passport-tumblr').Strategy;
var tumblr = require('tumblr.js');
var TUMBLR_PROVIDER = "tumblr";

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

passport.use(new TumblrStrategy({
        consumerKey: clientConfig.clientID,
        consumerSecret: clientConfig.clientSecret,
        callbackURL: svcConfig.svcURL+"/tumblr/authorized",
        passReqToCallback : true
    },
    function(req, token, tokenSecret, profile, done) {

//        log.debug("token:" + token); // 인증 이후 auth token을 출력할 것이다.
//        log.debug("token secret:" + tokenSecret); // 인증 이후 auto token secret을 출력할 것이다.
//        log.debug("profile:" + JSON.stringify(profile));

        var provider = new botFormat.ProviderOauth1(profile.provider, profile.username.toString(), profile.username,
                    token, tokenSecret);

        userMgr._updateOrCreateUser(req, provider, function(err, user, isNewProvider, delUser) {
            if (err) {
                log.error("Fail to get user");
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
    passport.authenticate('tumblr')
);

router.get('/authorized',
    passport.authenticate('tumblr', { failureRedirect: '/#signin' }),
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
    var meta = {"cName":TUMBLR_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    userMgr._findProviderByUserId(userId, TUMBLR_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            return res.status(500).send(err);
        }

        var client = tumblr.createClient({
            consumer_key: clientConfig.clientID,
            consumer_secret: clientConfig.clientSecret,
            token: provider.token,
            token_secret: provider.tokenSecret
        });

        client.userInfo(function(error, response, body) {
            if (error) {
                log.error(error, meta);
                return res.status(404).send(error);
            }

            log.debug(body, meta);
            return res.send(body);
        });
    });
});

router.get('/posts/:blogName', function (req, res) {
    var userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":TUMBLR_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var blogName = req.params.blogName;

    userMgr._findProviderByUserId(userId, TUMBLR_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            return res.status(500).send(err);
        }

        var client = tumblr.createClient({
            consumer_key: clientConfig.clientID,
            consumer_secret: clientConfig.clientSecret,
            token: provider.token,
            token_secret: provider.tokenSecret
        });

        client.posts(blogName, function (error, response) {
            if (error) {
                log.error(error, meta);
                return res.status(400).send(error);
            }
            log.debug(response, meta);
            res.send(response);
        });
    });
});

router.get('/bot_bloglist', function (req, res) {
    var userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":TUMBLR_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var providerId = req.query.providerid;

    userMgr._findProviderByUserId(userId, TUMBLR_PROVIDER, providerId, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            return res.status(500).send(err);
        }

        var client = tumblr.createClient({
            consumer_key: clientConfig.clientID,
            consumer_secret: clientConfig.clientSecret,
            token: provider.token,
            token_secret: provider.tokenSecret
        });

        client.userInfo(function (error, response) {
            if (error) {
                log.error(error, meta);
                return res.status(400).send(error);
            }
            //log.debug(response, meta);

            var botBlogList = new botFormat.BotBlogList(provider);

            try {
                var blogs = response.user.blogs;
                log.debug('blogs length=' + blogs.length, meta);

                for (var i = 0; i < blogs.length; i+=1) {
                    var botBlog = new botFormat.BotBlog(blogs[i].name, blogs[i].title, blogs[i].url);
                    botBlogList.blogs.push(botBlog);
                }
            }
            catch(e) {
                log.error(e, meta);
                log.error(response, meta);
                return res.status(500).send(e);
            }

            res.send(botBlogList);
        });
    });
});

router.get('/bot_post_count/:blog_id', function (req, res) {
    var userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":TUMBLR_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var blog_id = req.params.blog_id;

    userMgr._findProviderByUserId(userId, TUMBLR_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            return res.status(500).send(err);
        }

        var client = tumblr.createClient({
            consumer_key: clientConfig.clientID,
            consumer_secret: clientConfig.clientSecret,
            token: provider.token,
            token_secret: provider.tokenSecret
        });

        client.blogInfo(blog_id, function(error, response) {
            if (error) {
                log.error(error, meta);
                res.status(400).send(error);
                return;
            }
            var botPostCount;
            try {
                botPostCount = new botFormat.BotPostCount(TUMBLR_PROVIDER, response.blog.name, response.blog.posts);
            }
            catch(e) {
                log.error(e, meta);
                log.error(response, meta);
                return res.status(500).send(e);
            }

            res.send(botPostCount);
        });
    });
 });

/**
 *
 * @param posts
 * @param raw_posts
 * @param after
 * @private
 */
function _pushPostsFromTumblr(posts, raw_posts, after) {
    var content;
    var i, j;

    for (i = 0; i<raw_posts.length; i+=1) {
        var raw_post = raw_posts[i];

        var post_date = new Date(raw_post.date);
        var after_date = new Date(after);
        if (post_date < after_date) {
            //log.debug('post(' + raw_post.id + ') is before');
            continue;
        }

        var botPost;
        var botPostReplies = [];

        //note_count has 0
        if (raw_post.note_count !== undefined) {
           botPostReplies.push({"notes":raw_post.note_count});
        }

        // tumblr don't have category
        var categoires = [];
        var title;
        if (raw_post.title) {
            title = raw_post.title.replace(/<\/?[^>]+(>|$)/g, "");
        }

        switch (raw_post.type) {
            case 'text':
                botPost = new botFormat.BotTextPost(raw_post.id, raw_post.body, raw_post.date, raw_post.post_url, title,
                        categoires, raw_post.tags, botPostReplies);
                break;
            case 'link':
                botPost = new botFormat.BotLinkPost(raw_post.id, raw_post.url, raw_post.date,raw_post.post_url, title,
                        raw_post.description, categoires, raw_post.tags, botPostReplies);
                break;
            case 'photo':
                var photoUrls = [];
                for (j=0; j<raw_post.photos.length; j+=1) {
                    photoUrls.push(raw_post.photos[j].original_size.url);
                }
                botPost = new botFormat.BotPhotoPost(raw_post.id, photoUrls, raw_post.date, raw_post.post_url,
                            title, raw_post.caption, categoires, raw_post.tags, botPostReplies);
                break;
            case 'audio':
                if (!title) {
                    title = raw_post.track_name;
                }
                botPost = new botFormat.BotAudioPost(raw_post.id, raw_post.audio_url, raw_post.audio_source_url,
                            raw_post.embed,raw_post.date, raw_post.post_url, title, raw_post.caption,
                            categoires, raw_post.tags, botPostReplies);
                break;
            case 'video':
                var embed_code;
                if (raw_post.player) {
                    embed_code = raw_post.player[raw_post.player.length-1].embed_code;
                }
                botPost = new botFormat.BotVideoPost(raw_post.id, raw_post.video_url, embed_code,
                            raw_post.date, raw_post.post_url, title, raw_post.caption, categoires,
                            raw_post.tags, botPostReplies);
                break;
            case 'quote':
            {
                content ='';
                content += '<div><blockquote>';
                content += raw_post.text;
                content += '</blockquote><div>';
                content += raw_post.source;
                content += '</div></div>';
                botPost = new botFormat.BotTextPost(raw_post.id, content, raw_post.date, raw_post.post_url, title,
                            categoires, raw_post.tags, botPostReplies);
            }
                break;
            case 'answer':
            {
                if (raw_post.question) {
                    title = raw_post.question.replace(/<\/?[^>]+(>|$)/g, "");
                }
                content = raw_post.answer;
                botPost = new botFormat.BotTextPost(raw_post.id, content, raw_post.date, raw_post.post_url, title,
                            categoires, raw_post.tags, botPostReplies);
            }
                break;
            case 'chat':
            {
                content='';
                content += '<ul>';
                for (j=0;j<raw_post.dialogue.length; j+=1) {
                    content += '<li><span>';
                    content += raw_post.dialogue[j].name + ': </span>';
                    content += raw_post.dialogue[j].phrase;
                    content += '</li>';
                }
                content += '</ul>';
                botPost = new botFormat.BotTextPost(raw_post.id, content, raw_post.date, raw_post.post_url, title,
                            categoires, raw_post.tags, botPostReplies);
            }
                break;
            default:
                log.error('Unknown type='+raw_post.type);
                continue;
        }
        if (!botPost) {
            log.error('Fail to create botPost of raw_post');
            log.error(raw_post);
            continue;
        }

        posts.push(botPost);
    }
}

router.get('/bot_posts/:blog_id', function (req, res) {
    var userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":TUMBLR_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var blog_id = req.params.blog_id;
    var offset = req.query.offset;
    var after = req.query.after;

    userMgr._findProviderByUserId(userId, TUMBLR_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            return res.status(400).send(err);
        }

        var client = tumblr.createClient({
            consumer_key: clientConfig.clientID,
            consumer_secret: clientConfig.clientSecret,
            token: provider.token,
            token_secret: provider.tokenSecret
        });

        var options;
        if (offset) {
            var start_index = offset.split("-")[0];
            log.debug('offset=' + start_index, meta);
            options = {offset: start_index};
        }

        client.posts(blog_id, options, function (error, response) {
            if (error) {
                log.error(error, meta);
                res.status(400).send(error);
                return;
            }

            var botPostList;
            try{
                botPostList = new botFormat.BotPostList(TUMBLR_PROVIDER, response.blog.name);

                _pushPostsFromTumblr(botPostList.posts, response.posts, after);
            }
            catch(e) {
                log.error(e, meta);
                log.error(response, meta);
                return res.status(400).send(e);
            }

            res.send(botPostList);
        });
    });
});

router.get('/bot_posts/:blog_id/:post_id', function (req, res) {
    var userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":TUMBLR_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var blog_id = req.params.blog_id;
    var post_id = req.params.post_id;

    userMgr._findProviderByUserId(userId, TUMBLR_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            return res.status(500).send(err);
        }

        var client = tumblr.createClient({
            consumer_key: clientConfig.clientID,
            consumer_secret: clientConfig.clientSecret,
            token: provider.token,
            token_secret: provider.tokenSecret
        });

        var options = {id: post_id, reblog_info: true, notes_info: true};

        client.posts(blog_id, options, function (error, response) {
            if (error) {
                log.error(error, meta);
                res.status(400).send(error);
                return;
            }

            var botPostList;
            try {
                botPostList = new botFormat.BotPostList(TUMBLR_PROVIDER, response.blog.name);
                _pushPostsFromTumblr(botPostList.posts, response.posts, 0);
            }
            catch(e) {
                log.error(e, meta);
                log.error(response, meta);
                return res.status(500).send(e);
            }

            res.send(botPostList);
        });
    });
});

router.post('/bot_posts/new/:blog_id', function (req, res) {
    var userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":TUMBLR_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var blog_id = req.params.blog_id;
    var options = {};
    var botPost = req.body;

    var postType = botPost.type;

    if (botPost.tags) {
        options.tags = botPost.tags.toString();
    }

    var botTextPost; //for convert text post

    userMgr._findProviderByUserId(userId, TUMBLR_PROVIDER, undefined, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            return res.status(500).send(err);
        }

        var client = tumblr.createClient({
            consumer_key: clientConfig.clientID,
            consumer_secret: clientConfig.clientSecret,
            token: provider.token,
            token_secret: provider.tokenSecret
        });

        if (postType === 'text') {
            options.body = botPost.content;
            if (botPost.title) { options.title = botPost.title; }
        }
        else if (postType === "photo") {
            if (botPost.mediaUrls.length > 1) {
                botTextPost = bC.convertPostMediaToText(botPost);
                options.body = botTextPost.content;
                postType = 'text';
            }
            else {
                options.source = botPost.mediaUrls[0];
                options.link = botPost.mediaUrls[0];
                if (botPost.description) {options.caption = botPost.description;}
            }
        }
        else if (postType === "link") {
            options.url = botPost.contentUrl;
            if (botPost.title) {options.title = botPost.title;}
            if (botPost.description) {options.description = botPost.description;}
        }
        else if (postType === "audio") {
            if (botPost.audio_source_url) {
                options.external_url = botPost.audio_source_url;
                if (botPost.description) {options.caption = botPost.description;}
            }
            else {
                botTextPost = bC.convertPostMediaToText(botPost);
                options.body = botTextPost.content;
                postType = 'text';
            }
        }
        else if (postType === "video") {
            if (botPost.videoUrl) {
                options.embed = bC.warpMediaTag(botPost.type, botPost.videoUrl);
                if (botPost.description) {options.caption = botPost.description;}
            }
            else {
                botTextPost = bC.convertPostMediaToText(botPost);
                options.body = botTextPost.content;
                postType = 'text';
            }
        }
        else {
            //need to refactoring make a error object;
            var error = new Error("postType was undefined");
            log.error(error, meta);
            return res.status(500).send(error);
        }

        log.error(options, meta);

        client[postType](blog_id, options, function (error, response) {
            if (error) {
                log.error(error, meta);
                return res.status(400).send(error);
            }

            //log.debug(response, meta);

            client.posts(blog_id, response, function (error, response) {
                if (error) {
                    log.error(error, meta);
                    res.status(400).send(error);
                    return;
                }
                //log.debug(response);

                var botPostList;

                try {
                    botPostList = new botFormat.BotPostList(TUMBLR_PROVIDER, response.blog.name);
                    _pushPostsFromTumblr(botPostList.posts, response.posts, 0);
                }
                catch(e) {
                    log.error(e, meta);
                    log.error(response, meta);
                    return res.status(500).send(e);
                }

                res.send(botPostList);
            });
        });
    });
});

router.get('/bot_comments/:blogID/:postID', function (req, res) {
    var userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":TUMBLR_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var err = new Error("This api is not supported");
    log.warn(err, meta);
    res.status(404).send(err);
});

 module.exports = router;
