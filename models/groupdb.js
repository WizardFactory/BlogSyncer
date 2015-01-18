/**
 * Created by alecKim on 2014. 9. 22..
 */

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
                displayName: String,
                token : String,
                tokenSecret : String
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
    var meta = {};

    meta.cName = "groupSchema";
    meta.fName = "findGroupByBlogInfo";
    meta.providerName = providerName;
    meta.blogId = blogId;

    for (i=0; i<this.groups.length; i+=1) {
        group = this.groups[i].group;
        for (j=0; j<group.length; j+=1) {
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
        log.warning("Fail to find group", meta);
    }

    return newGroups;
};

module.exports = mongoose.model('Group', groupSchema);



