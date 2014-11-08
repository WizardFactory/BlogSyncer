/**
 * Created by alecKim on 2014. 9. 22..
 */

var log = require('winston');
var mongoose = require('mongoose');

/**
 * 동기화 되는 group 을 여러개 가질 수 있다. by alecKim
 */
var groupSchema = mongoose.Schema({
    userId : Object,
    groups : [
        {group: [
            {provider: {
                providerName: String,
                providerId: String,
                accessToken: String,
                refreshToken: String,
                displayName: String
            },
            blog: {
                blog_id: String,
                blog_title: String,
                blog_url: String
            }}
        ]}
    ]
});

/**
 *
 * @param {string} providerName
 * @param {string} blogId
 * @returns {Array}
 */
groupSchema.methods.findGroupByBlogInfo = function(providerName, blogId) {
    "use strict";
    var i;
    var j;
    var group;
    var blog;
    var provider;
    var foundIt;
    var newGroups = [];

    for (i=0; i<this.groups.length; i++) {
        group = this.groups[i].group;
        for (j=0; j<group.length; j++) {
            blog = group[j].blog;
            provider = group[j].provider;
            if ( provider.providerName === providerName &&
                blog.blog_id === blogId) {
                foundIt = true;
                break;
            }
        }
        if (foundIt) {
            newGroups.push({"group":group});
            foundIt = false;
        }
    }

    if (newGroups.length === 0) {
        log.error("Fail to find group providerName="+providerName+" blogId="+blogId);
    }

    return newGroups;
};

module.exports = mongoose.model('Group', groupSchema);



