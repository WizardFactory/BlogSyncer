/**
 * Created by aleckim on 2014. 8. 13..
 */
"use strict";

var mongoose = require('mongoose');

// define Schema =================
var siteSchema = mongoose.Schema({
    userId : Object,
    sites : [{
        provider: {
            providerName: String,
            providerId: String,
            accessToken: String,
            refreshToken: String,
            displayName: String,
            token : String,
            tokenSecret : String
        },
        blogs: [{
            blog_id: String,
            blog_title: String,
            blog_url: String,
            accessToken: String,
            categories: [{
                id: String,
                name: String
            }]
        }]
    }]
});

/**
 *
 * @param {string} providerName
 * @param {string} providerId
 * @returns {*}
 */
siteSchema.methods.findSiteByProvider = function(providerName, providerId) {
    var i;
    var sites = this.sites;
    var provider;
    var meta = {};

    meta.cName = "siteSchema";
    meta.fName = "findSiteByProvider";
    meta.providerName = providerName;
    meta.providerId = providerId;

    for (i=0; i<sites.length; i+=1) {
        provider = sites[i].provider;
        if (provider.providerName === providerName) {
            if (providerId === undefined) {
                return sites[i];
            }
            else {
               if (provider.providerId === providerId)  {
                   return sites[i];
               }
            }
        }
    }

    log.verbose("Fail to find site", meta);
};

/**
 *
 * @param site
 * @param blogId
 * @returns {*|{blog_id: string, blog_title: string, blog_url: string}}
 */
siteSchema.methods.findBlogFromSite = function(site, blogId) {
    var i;
    var meta = {};

    meta.cName = "siteSchema";
    meta.fName = "findBlogFromSite";
    meta.siteId = site._id;
    meta.blogId = blogId;

    for (i=0; i<site.blogs.length; i+=1) {
        if (site.blogs[i].blog_id === blogId) {
            return site.blogs[i];
        }
    }

    log.debug("Fail to find blog", meta);
};

// create the model for users and expose it to our app
module.exports = mongoose.model('Site', siteSchema);


