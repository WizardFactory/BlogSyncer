/**
 * Created by SeanKim on 2014. 8. 11..
 */

"use strict";

var express = require('express');
var router = express.Router();
var blogBot = require('./../controllers/blogBot');

/**
 *
 * @param req
 * @param res
 * @returns {user|*}
 * @private
 */
function _getUser(req, res) {

    if (!req.user) {
        var errorMsg = 'You have to login first!';
        log.error(errorMsg);
        res.status(401).send(errorMsg); //401 Unauthorized
        return;
    }

    return req.user;
}

router.get('/sites', function (req, res) {
    var user = _getUser(req,res);
    if (!user) {
        return;
    }
    var sites = blogBot.getSites(user);
    res.send(sites);
});

router.get('/posts/:reqStartNum/:reqTotalNum', function (req, res) {
    var user = _getUser(req,res);
    if (!user) {
        return;
    }

    var startNum;
    var totalNum;

    try {
        startNum = req.params.reqStartNum;
        totalNum = req.params.reqTotalNum;
    }
    catch(e) {
        log.error(e);
        log.error(req);
        return res.status(400).send(e); //400 Bad Request
    }

    var posts = blogBot.getPosts(user, startNum, totalNum);

    //log.info(posts);
    res.send({"posts":posts});
});

router.get('/replies/:providerName/:blogID/:postID', function (req, res) {
    var user = _getUser(req,res);
    if (!user) {
        return;
    }

    var providerName;
    var postID;
    var blogID;
    try {
        providerName = req.params.providerName;
        blogID = req.params.blogID;
        postID = req.params.postID;
    }
    catch(e) {
        log.error(e);
        log.error(req);
        return res.status(400).send(e);
    }

    blogBot.getRepliesByInfo(user, providerName, blogID, postID, function(err, sendData) {
        if (err) {
            log.error(err);
            return res.status(err.statusCode).send(err);
        }
        log.debug(sendData);
        res.send(sendData);
    });
});

router.get('/histories', function (req, res) {
    var user;
    var histories;

    user = _getUser(req,res);
    if (!user) {
        return;
    }

    histories = blogBot.getHistories(user);
    res.send({"histories":histories});
});

router.route('/groups')
    .get(function (req, res) {
        var user = _getUser(req,res);
        if (!user) {
            return;
        }

        var groups = blogBot.getGroups(user);
        res.send({"groups":groups});
    })
    .put(function (req, res) {
        var user = _getUser(req,res);
        if (!user) {
            return;
        }

        var groups = req.body.groups;
        blogBot.setGroups(user, groups);
        res.send("Success");
    });

router.post('/group', function (req, res) {
    var user = _getUser(req,res);
    if (!user) {
        return;
    }

    var group;
    var groupInfo;

    try {
        group = req.body.group;
        groupInfo = req.body.groupInfo;
    }
    catch(e) {
        log.error(e);
        log.error(req.body);
        return res.status(400).send(e);
    }

    blogBot.addGroup(user, group, groupInfo);
    res.send("Success");
});


module.exports = router;