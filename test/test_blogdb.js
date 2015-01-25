/**
 *
 * Created by aleckim on 14. 11. 15..
 */


var assert  = require('assert');
var Site = require('../models/blogdb');
if (!global.log) {
    global.log = require('winston');
}

var testProvider1 = {
    providerName: "twitter",
    providerId: "3373",
    accessToken: "xxxdfd",
    refreshToken: "xxddsdf",
    displayName: "wizard"
};

var testBlog1 = {
    blog_id: "33377",
    blog_title: "wizard",
    blog_url: "www.wzdfac.com"
};

var testBlog2 = {
    blog_id: "777373",
    blog_title: "wzdfac",
    blog_url: "www.wzdfac22.com"
};

describe('siteDb', function () {
    describe('Function', function () {
        var siteDb;
        it('create siteDb', function () {
            siteDb = new Site();
            assert.notEqual(typeof siteDb, "undefined", "Fail to create siteDb");
        });
        it('add siteDb', function () {
            var blogs = [];
            var testSite;
            blogs.push(testBlog1);
            blogs.push(testBlog2);
            testSite = {"provider":testProvider1, "blogs":blogs};
            siteDb.sites.push(testSite);
            assert.equal(siteDb.sites[0].blogs[0].blog_id, testBlog1.blog_id, "Fail to add siteDb");
        });
        it('find site by provider', function () {
            var site;
            site = siteDb.findSiteByProvider(testProvider1.providerName, testProvider1.providerId);
            assert.equal(site.provider.providerName, testProvider1.providerName, "Fail to find site by provider");
        });
        it('find blog from site', function () {
            var blog;
            blog = siteDb.findBlogFromSite(siteDb.sites[0], testBlog1.blog_id);
            assert.equal(blog.blog_id, testBlog1.blog_id, "Fail to find blog from Site");
        });
    });
});
