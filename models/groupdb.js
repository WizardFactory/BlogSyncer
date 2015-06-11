/**
 * Created by alecKim on 2014. 9. 22..
 */
"use strict";

var mongoose = require('mongoose');

/**
 * 동기화 되는 group 을 여러개 가질 수 있다. by alecKim
 */
var groupSchema = mongoose.Schema({
    userId : Object,
    groups : [{
        group: [{
            provider: {
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
                blog_url: String,
                categories: [{
                    id: String,
                    name: String
                }]
            }}
        ],
        groupInfo: [{
            syncEnable: String,
            postType: String
        }]
    }]
});

/**
 *
 * @param {string} providerName
 * @param {string} blogId
 * @returns {Array}
 */
groupSchema.methods.findGroupByBlogInfo = function(providerName, blogId) {
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
        log.verbose("Fail to find group", meta);
    }

    return newGroups;
};

groupSchema.methods.getSyncInfoByBlogInfo = function(groupIndex, fromProviderName, fromBlogId, toProviderName,
                                                     toBlogId) {
    var group;
    var blog;
    var provider;
    var fromIndex = -1, toIndex = -1;
    var meta = {};

    meta.cName = "groupSchema";
    meta.fName = "getPostTypeByBlogInfo";
    meta.fromProviderName = fromProviderName;
    meta.fromBlogId = fromBlogId;
    meta.toProviderName = toProviderName;
    meta.toBlogId = toBlogId;

    group = this.groups[groupIndex];
    for (var i = 0; i < group.group.length; i += 1) {
        blog = group.group[i].blog;
        provider = group.group[i].provider;
        if (provider.providerName === fromProviderName && blog.blog_id === fromBlogId) {
            fromIndex = i;
        }
        if (provider.providerName === toProviderName && blog.blog_id === toBlogId) {
            toIndex = i;
        }
        if (fromIndex >= 0 && toIndex >= 0) {
            break;
        }
    }

    var index = fromIndex * group.group.length + toIndex;
    return group.groupInfo[index];
};

module.exports = mongoose.model('Group', groupSchema);



