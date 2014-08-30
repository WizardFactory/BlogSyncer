/**
 * Created by aleckim on 2014. 8. 13..
 */

var fs = require('fs');
var dbfilename = 'blog.db';

function blogdb() {

}

/* 오직 자신만이 정보를 가지고 있음 by dhkim2*/
/* 1user -> sites[] -> provider,blogs[] -> posts[] */
blogdb.sites = [];
/*
 [
 { "provider":object, "blogs":
                        [ {"blog_id":12, "blog_title":"wzdfac", "blog_url":"wzdfac.iptime.net"},
                          {"blog_id":12, "blog_title":"wzdfac", "blog_url":"wzdfac.iptime.net"} ] },
 { "provider":object, "blogs":
                        [ {"blog_id":12, "blog_title":"wzdfac", "blog_url":"wzdfac.iptime.net"},
                          {"blog_id":12, "blog_name":"wzdfac", "blog_url":"wzdfac.iptime.net"} ] }
 ];
 */


blogdb.init = function () {
  try {
    blogdb.sites = JSON.parse(fs.readFileSync(dbfilename)).blog_db;
  }
  catch (e) {
    console.log(e);
    return false;
  }

  return true;
};

blogdb.saveFile = function () {
  try {
    fs.writeFile(dbfilename, JSON.stringify({"blog_db":blogdb.sites}), function (err) {
        if (err) throw err;
        console.log("It's saved!");
    });
  }
  catch(e) {
      console.log(e);
      return false;
  }

  return true;
};

blogdb.getProviderCount = function () {
    return this.sites.length;
};

blogdb.findSiteByProvider = function (providerName) {
    var sites = this.sites;

    for (var i = 0; i < sites.length; i++) {
        if (sites[i].provider.providerName === providerName) {
            return sites[i];
        }
    }

    console.log ("Fail to find blog of provider="+providerName);

    return null;
};

blogdb.addBlog = function (site, new_blogs) {
    site.blogs.length = 0;
    site.blogs = new_blogs;
};

blogdb.addProvider = function (new_provider, new_blogs) {
    var totalCount = 0;

    this.sites.push({"provider":new_provider, "blogs":new_blogs});
    //this.saveFile();

    totalCount = this.sites.length;

    return this.sites[totalCount-1];
};

module.exports = blogdb;

