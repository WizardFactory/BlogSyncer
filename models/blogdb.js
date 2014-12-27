/**
 * Created by aleckim on 2014. 8. 13..
 */

var log = require('winston');
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
            blog_url: String
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
    "use strict";
    var i;
    var sites = this.sites;
    var provider;

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

    log.error("Fail to find site of providerName="+providerName + " providerId="+providerId);
};

/**
 *
 * @param site
 * @param blogId
 * @returns {*|{blog_id: string, blog_title: string, blog_url: string}}
 */
siteSchema.methods.findBlogFromSite = function(site, blogId) {
    "use strict";
    var i;

    for (i=0; i<site.blogs.length; i+=1) {
        if (site.blogs[i].blog_id === blogId) {
            return site.blogs[i];
        }
    }

    log.error("Fail to find blog id="+blogId);
};

// create the model for users and expose it to our app
module.exports = mongoose.model('Site', siteSchema);


