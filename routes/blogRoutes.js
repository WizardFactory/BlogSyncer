/**
 * Created by SeanKim on 2014. 8. 11..
 */

var express = require('express');
var blogCommon  = require('./blogjs/blogCommon');

var app = express();
var router = express.Router();

// Get Posts
router.get('/blogCollectFeedback/posts', function(req, res) {
    blogCommon.getWPPosts(req, res);
});

// Get post by post ID
router.get('/blogCollectFeedback/posts/:postsID/comments', function(req, res) {
    blogCommon.getWPComments(req, res);
});

module.exports = router;