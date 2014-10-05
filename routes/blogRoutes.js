/**
 * Created by SeanKim on 2014. 8. 11..
 */

var express = require('express');

var log = require('winston');
var router = express.Router();

var blogBot = require('./blogbot');

function _getUser(req, res) {
    if (req.user == undefined) {
        var errorMsg = 'You have to login first!';
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }

    return req.user;
}

router.get('/sites', function (req, res) {
    var user;
    var sites;

    user = _getUser(req,res);
    if (user == undefined) {
        return;
    }

    sites = blogBot.getSites(user);
    res.send(sites);
});

router.get('/posts', function (req, res) {
    var user;
    var posts;

    user = _getUser(req,res);
    if (user == undefined) {
        return;
    }

    posts = blogBot.getPosts(user);

    res.send({"posts":posts});
});

router.get('/replies/:providerName/:blogID/:postID', function (req, res) {
    var user;
    var providerName;
    var postID;
    var blogID;
    var i;

    user = _getUser(req,res);
    if (user == undefined) {
        log.error("Fail to get user");
        res.send();
        return;
    }

    providerName = req.params.providerName;
    blogID = req.params.blogID;
    postID = req.params.postID;

    blogBot.getRepliesByInfo(user, providerName, blogID, postID, function (sendData) {
        log.debug(sendData);
        res.send(sendData);
    });

    return;
});

router.get('/histories', function (req, res) {
    var user;
    var histories;

    user = _getUser(req,res);
    if (user == undefined) {
        return;
    }

    histories = blogBot.getHistories(user);
    res.send({"histories":histories});
});

router.route('/groups')
    .get(function (req, res) {
        var user;
        var groups;

        user = _getUser(req,res);
        if (user == undefined) {
            return;
        }

        groups = blogBot.getGroups(user);
        log.info(groups);
        res.send({"groups":groups});
    })
    .put(function (req, res) {
        var user;
        var groups;

        user = _getUser(req,res);
        if (user == undefined) {
            return;
        }

        groups = req.body.groups;
        blogBot.setGroups(user, groups);
        res.send("Success");
    });

router.post('/group', function (req, res) {
    var user;
    var group;

    user = _getUser(req,res);
    if (user == undefined) {
        return;
    }

    group = req.body.group;
    blogBot.addGroup(user, group);
    res.send("Success");
});


module.exports = router;