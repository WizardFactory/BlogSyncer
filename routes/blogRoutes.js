/**
 * Created by SeanKim on 2014. 8. 11..
 */

var express = require('express');
var router = express.Router();
var blogBot = require('./blogbot');

/**
 *
 * @param req
 * @param res
 * @returns {user|*}
 * @private
 */
function _getUser(req, res) {
    "use strict";

    if (!req.user) {
        var errorMsg = 'You have to login first!';
        log.error(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }

    return req.user;
}

router.get('/sites', function (req, res) {
    "use strict";
    var user;
    var sites;

    user = _getUser(req,res);
    if (!user) {
        return;
    }

    sites = blogBot.getSites(user);
    res.send(sites);
});

router.get('/posts/:reqStartNum/:reqTotalNum', function (req, res) {
    "use strict";
    var user;
    var posts;
    var startNum;
    var totalNum;

    user = _getUser(req,res);
    if (!user) {
        return;
    }

    startNum = req.params.reqStartNum;
    totalNum = req.params.reqTotalNum;

    posts = blogBot.getPosts(user, startNum, totalNum);

    //log.info(posts);
    res.send({"posts":posts});
});

router.get('/replies/:providerName/:blogID/:postID', function (req, res) {
    "use strict";
    var user;
    var providerName;
    var postID;
    var blogID;

    user = _getUser(req,res);
    if (!user) {
        return;
    }

    providerName = req.params.providerName;
    blogID = req.params.blogID;
    postID = req.params.postID;

    blogBot.getRepliesByInfo(user, providerName, blogID, postID, function (sendData) {
        log.debug(sendData);
        res.send(sendData);
    });
});

router.get('/histories', function (req, res) {
    "use strict";
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
        "use strict";
        var user;
        var groups;

        user = _getUser(req,res);
        if (!user) {
            return;
        }

        groups = blogBot.getGroups(user);
        res.send({"groups":groups});
    })
    .put(function (req, res) {
        "use strict";
        var user;
        var groups;

        user = _getUser(req,res);
        if (!user) {
            return;
        }

        groups = req.body.groups;
        blogBot.setGroups(user, groups);
        res.send("Success");
    });

router.post('/group', function (req, res) {
    "use strict";

    var user;

    user = _getUser(req,res);
    if (!user) {
        return;
    }

    blogBot.addGroup(user, req.body.group);
    res.send("Success");
});


module.exports = router;