/**
 * Created by aleckim on 2014. 7. 19..
 */

"use strict";

var router = require('express').Router();
var passport = require('passport');
//var request = require('../controllers/requestEx');
var url = require('url');

var blogBot = require('./../controllers/blogBot');
var userMgr = require('./../controllers/userManager');

var botFormat = require('../models/botFormat');
var bC = require('../controllers/blogConvert');

var svcConfig = require('../config/all');

var clientConfig = svcConfig.twitter;
var TwitterStrategy = require('passport-twitter').Strategy;
var TWITTER_API_URL = "https://api.twitter.com/1.1";
var TWITTER_PROVIDER = "twitter";

var OAuth = require('oauth').OAuth;
// global variable for object of OAuth
var objOAuth = new OAuth("https://api.twitter.com/oauth/request_token",
    "https://api.twitter.com/oauth/access_token",
    clientConfig.clientID,
    clientConfig.clientSecret,
    "1.0A",
    null,
    "HMAC-SHA1");

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

passport.use(new TwitterStrategy({
        consumerKey: clientConfig.clientID,
        consumerSecret: clientConfig.clientSecret,
        callbackURL: svcConfig.svcURL+"/twitter/authorized",
        passReqToCallback : true
    },
    function(req, token, tokenSecret, profile, done) {
//        log.debug("token:" + token); // 인증 이후 auth token을 출력할 것이다.
//        log.debug("token secret:" + tokenSecret); // 인증 이후 auto token secret을 출력할 것이다.
//        log.debug("profile:" + JSON.stringify(profile));

        var provider  = new botFormat.ProviderOauth1(profile.provider, profile.username.toString(), profile.displayName,
            token, tokenSecret);

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
    passport.authenticate('twitter')
);

router.get('/authorized',
    passport.authenticate('twitter', { failureRedirect: '/#signin' }),
    function(req, res) {
        // Successful authentication, redirect home.
        log.debug('Successful!');
        res.redirect('/#');
    }
);

router.get('/bot_bloglist', function (req, res) {
    var userId = userMgr.getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":TWITTER_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var providerId = req.query.providerid;
    if (providerId === false) {
        var error = new Error('User:'+userId+' did not have blog!');
        log.error(error, meta);
        res.status(500).send(error);
        res.redirect("/#/signin");
        return;
    }

    userMgr.findProviderByUserId(userId, TWITTER_PROVIDER, providerId, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            res.status(500).send(err);
            return;
        }

        var api_url = TWITTER_API_URL + "/users/show.json?screen_name=" + provider.providerId;

        objOAuth.get(api_url, provider.token, provider.tokenSecret, function (error, body, response) {
            if(error) {
                log.error(error, meta);
                log.error(response, meta);
                res.status(error.statusCode).send(error);
                return;
            }

            var botBlogList = new botFormat.BotBlogList(provider);
            var botBlog;
            try{
                var result = JSON.parse(body);
                botBlog = new botFormat.BotBlog(result.id, result.name, result.url);
                botBlogList.blogs.push(botBlog);
            }
            catch(e) {
                log.error(e, meta);
                res.status(500).send(e);
            }

            res.send(botBlogList);
        });
    });
});

router.get('/bot_post_count/:blog_id', function (req, res) {
    var userId = userMgr.getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":TWITTER_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var providerId = req.query.providerid;

    userMgr.findProviderByUserId(userId, TWITTER_PROVIDER, providerId, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            res.status(500).send(err);
            return;
       }

        var api_url = TWITTER_API_URL + "/users/show.json?screen_name=" + provider.providerId;
        log.debug(api_url, meta);

        objOAuth.get(api_url, provider.token, provider.tokenSecret, function (error, body, response) {
            if(error) {
                log.error(error, meta);
                log.error(response, meta);
                res.status(error.statusCode).send(error);
                return;
            }

            var botPostCount;

            try {
                var result = JSON.parse(body);
                botPostCount = new botFormat.BotPostCount(TWITTER_PROVIDER, result.id, result.statuses_count);
            }
            catch(e) {
                log.error(e, meta);
                res.status(500).send(e);
                return;
            }

            res.send(botPostCount);
        });
    });
});

/**
 * "entities":  {
      "hashtags":  [
         {
          "text": "prodmgmt",
          "indices":  [
            139,
            140
          ]
        }
      ],
 * @param hashTags
 * @private
 */
function _convertBotTags(hashTags) {
    var tags = [];
    if (!hashTags && !hashTags.length) {
        log.error('hashTags is not valid');
        return tags;
    }
    for (var i=0; i<hashTags.length; i+=1) {
        tags.push(hashTags[i].text);
    }
    return tags;
}

router.get('/bot_posts/:blog_id', function (req, res) {
    var userId = userMgr.getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":TWITTER_PROVIDER, "userId":userId, "url":req.url};
    log.verbose("+", meta);

    var provider_id = req.query.providerid;
    var blog_id = req.params.blog_id;
    var last_id = req.query.offset;
    var after = req.query.after;

    userMgr.findProviderByUserId(userId, TWITTER_PROVIDER, provider_id, function (err, user, provider) {
        if (err) {
            log.error(err, meta);
            res.status(500).send(err);
            return;
        }

        var count = 20;
        var api_url = TWITTER_API_URL+"/statuses/user_timeline.json?screen_name="+ provider.providerId +
                            "&count=" + count;
        if (last_id) {
            api_url += "&";
            api_url += "max_id=" + last_id;
        }

        log.debug(api_url, meta);

        objOAuth.get(api_url, provider.token, provider.tokenSecret, function (error, body, response) {
            if(error) {
                log.error(error, meta);
                log.error(response, meta);
                res.status(error.statusCode).send(error);
                return;
            }

            var result;
            try {
                result = JSON.parse(body);
            }
            catch(e) {
                log.error(e, meta);
                res.status(500).send(e);
                return;
            }
            log.debug(result);

            if(!result.length) {
                error = new Error("result is empty!");
                log.error(error, meta);
                log.error(result, meta);
                res.status(500).send(error);
                return;
            }

            var botPostList = new botFormat.BotPostList(TWITTER_PROVIDER, blog_id);
            var postUrl = 'https://twitter.com';
            postUrl += '/' + blog_id + '/status';

            for (var i = 0; i < result.length; i += 1) {
                var raw_post = result[i];
                if (after) {
                    var post_date = new Date(raw_post.created_at);
                    var after_date = new Date(after);

                    if (post_date < after_date) {
                        //log.debug('post is before');
                        continue;
                    }
                }

               //https://twitter.com/kimalec7/status/599212089035476994
                postUrl += '/' + raw_post.id_str;

                var botPost = new botFormat.BotTextPost(raw_post.id_str, raw_post.text, raw_post.created_at, postUrl,
                            '', [], _convertBotTags(raw_post.entities.hashtags), []);

                botPostList.posts.push(botPost);

                botPostList.stopReculsive = false;
            }

            if(!after)
            {
                if(!(botPostList.posts[i-1])) {
                    error = new Error("posts in undefined !!");
                    log.error(error, meta);
                    res.status(500).send(error);
                    return;
                }

                if( (last_id === botPostList.posts[i-1].id.toString()) &&
                    (result.length === 1) ) {
                    log.debug("stop Recursive!!!!!", meta);
                    botPostList.stopReculsive = true;
                }
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
    var meta = {"cName":TWITTER_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var blog_id = req.params.blog_id;
    var post_id = req.params.post_id;

    userMgr.findProviderByUserId(userId, TWITTER_PROVIDER, null, function (err, user, provider) {
        if (err) {
            log.error(err);
            res.status(500).send(err);
            return;
        }

        var api_url = TWITTER_API_URL + "/statuses/show/" + post_id + ".json";
        //log.debug(api_url, meta);

        objOAuth.get(api_url, provider.token, provider.tokenSecret, function (error, body, response) {

            if (error) {
                log.error(error, meta);
                log.error(response, meta);
                res.status(error.statusCode).send(error);
                return;
            }

            var botPostList = new botFormat.BotPostList(TWITTER_PROVIDER, blog_id);
            var postUrl = 'https://twitter.com';
            postUrl += '/' + blog_id + '/status';

            var botPost;
            try {
                var raw_post = JSON.parse(body);

                postUrl += '/' + raw_post.id_str;
                var replies = [];
                replies.push({"retweet": raw_post.retweet_count});
                replies.push({"like": raw_post.favorite_count});

                if (raw_post.entities.media && raw_post.entities.media.length) {
                    var media = raw_post.entities.media[0];
                    if (media.type === 'photo') {
                        var mediaUrls = [];
                        raw_post.entities.media.forEach(function(media) {
                            mediaUrls.push(media.media_url);
                        });
                        botPost = new botFormat.BotPhotoPost(raw_post.id_str, mediaUrls, raw_post.created_at, postUrl,
                                '', raw_post.text);
                    }
                    else {
                        log.error('Unknown media.type = '+media.type + ' media.id='+raw_post.id_str);
                        //It will be made to BotTextPost
                    }
                }
                else if (raw_post.entities.urls && raw_post.entities.urls.length) {
                    botPost = new botFormat.BotLinkPost(raw_post.id_str, raw_post.entities.urls[0].expanded_url,
                                raw_post.created_at, postUrl, '', raw_post.text);
                }

                if (!botPost) {
                    botPost = new botFormat.BotTextPost(raw_post.id_str, raw_post.text, raw_post.created_at, postUrl,
                        '');
                }

                botPost.categories = [];
                botPost.tags = _convertBotTags(raw_post.entities.hashtags);
                botPost.replies = replies;
            }
            catch (e) {
                log.error(e, meta);
                res.status(500).send(e);
                return;
            }

            botPostList.posts.push(botPost);

            if (botPostList.posts.length > 0 && botPostList.posts[0].type === 'link') {
                blogBot.getTeaser(botPostList.posts[0].contentUrl, function (err, botTeaser) {
                    if (err) {
                        log.error(err, meta);
                    }
                    else {
                        botPostList.posts[0].teaser = botTeaser;
                    }

                    res.send(botPostList);
                });
            }
            else {
                res.send(botPostList);
            }
        });
    });
});

router.post('/bot_posts/new/:blog_id', function (req, res) {
    var userId = userMgr.getUserId(req, res);
    if (!userId) {
        return;
    }
    var meta = {"cName":TWITTER_PROVIDER, "userId":userId, "url":req.url};
    log.info("+", meta);

    var blog_id = req.params.blog_id;
    var botPost = req.body;

    var newPost = {};

    /* length가 정확하게 맞지 않음 #328 */
    bC.convertPostToPlainContent(botPost, 136, bC.convertShortenUrl, function (content) {
        newPost.content = content;

        var encodedPost = encodeURIComponent(newPost.content);

        userMgr.findProviderByUserId(userId, TWITTER_PROVIDER, undefined, function (err, user, provider) {

            //log.debug(encodedPost, meta);

            var Twitter = require('twitter');

            var client = new Twitter({
                consumer_key: clientConfig.clientID,
                consumer_secret: clientConfig.clientSecret,
                access_token_key: provider.token,
                access_token_secret: provider.tokenSecret
            });

            client.post('statuses/update', {status: newPost.content},  function(error, body, response) {
               if(error) {
                    log.error(error, meta);
                    log.warn(newPost.content, meta);
                    log.warn(encodedPost, meta);
                    res.status(response.statusCode).send(error);
                    return;
                }

                var botPostList = new botFormat.BotPostList(TWITTER_PROVIDER, blog_id);
                var postUrl = 'https://twitter.com';
                postUrl += '/' + blog_id + '/status';

                var rcvBotPost = {};

                try {
                    var raw_post = body;
                    postUrl += '/' + raw_post.id_str;

                    rcvBotPost = new botFormat.BotTextPost(raw_post.id_str, raw_post.text, raw_post.created_at, postUrl,
                        '', [], _convertBotTags(raw_post.entities.hashtags));
                }
                catch (e) {
                    log.error(e, meta);
                    log.error(newPost, meta);
                    log.error(body, meta);
                    res.status(500).send(e);
                    return;
                }

                botPostList.posts.push(rcvBotPost);
                log.debug(botPostList, meta);
                res.send(botPostList);
            });
        });

    });
});

module.exports = router;

