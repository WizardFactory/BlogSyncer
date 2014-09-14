/**
 * Created by SeanKim on 2014. 8. 11..
 */

var express = require('express');
var blogCommon  = require('./blogjs/blogCommon');

var app = express();
var router = express.Router();

router.get('/blogRegister', function(req, res) {
    res.redirect('/#' + req.originalUrl);
});

router.get('/blogSetSync', function(req, res) {
    res.redirect('/#' + req.originalUrl);
});

router.get('/blogHistorySync', function(req, res) {
    res.redirect('/#' + req.originalUrl);
});

router.get('/blogCollectFeedback', function(req, res) {
    res.redirect('/#' + req.originalUrl);
});

// Get Posts
router.get('/blogCollectFeedback/posts', function(req, res) {
    blogCommon.getWPPosts(req, res);
});

// Get post by post ID
router.get('/blogCollectFeedback/posts/:postsID/comments', function(req, res) {
    blogCommon.getWPComments(req, res);
});

module.exports = router;