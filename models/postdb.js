/**
 * Created by aleckim on 2014. 8. 9..
 * posts db는 각 사용자별로 하나씩 가지게 된다.
 */

var fs = require('fs');
var dbfilename = 'post.db';


function postdb() {

}

/* 오직 자신만이 정보를 가지고 있음 by dhkim2*/

postdb.posts = [];
/* posts[] -> id, title, categories[], tags[], modified, infos[]-> blog, post_info */
/*
   [
        {
            "id":1,
            "title":"XXXX",
            "categories":"ttt",
            "tags":["xxxx","bbb"],
            "modified": "2014-08-07T13:22:12+09:00",
            "infos": [
                {
                    "provider_name":"wordpress", "blog_id":2313, "post_id":123,"post_url":"http://www.xxx.yy",
                },
                {
                    "provider_name":"wordpress", "blog_id":2314, "post_id":789,"post_url":"http://www.xxx.bb",
                },
            ]
        }
    ];
*/

postdb.init = function () {
  try {
    postdb.posts = JSON.parse(fs.readFileSync(dbfilename)).post_db;
  }
  catch (e) {
    console.log(e);
    return false;
  }

  return true;
};

postdb.saveFile = function () {
  try {
    fs.writeFile(dbfilename, JSON.stringify({"post_db":postdb.posts}), function (err) {
        if (err) throw err;
        console.log('It\'s saved!');
    });
  }
  catch(e) {
      console.log(e);
      return false;
  }

  return true;
};

postdb.get_post_count = function () {
    return this.posts.length;
};

postdb.find_post_by_title = function(title) {

    for (var i = 0; i<postdb.posts.length; i++) {
        if (postdb.posts[i].title == title) {
            break;
        }
    }

    if (i == postdb.posts.length) {
        console.log('Fail to find post title=' + title);
    }
    else {
        var post = postdb.posts[i];
        console.log('find post('+post.id+') by title='+title);
        return postdb.posts[i];
    }

    return null;
};

postdb.find_post_by_url = function(url) {

};

postdb.find_post_by_id = function(post_id) {

};

postdb.find_post_by_post_id_of_blog = function(post_id, blog_id, provider_name) {

};

postdb.add_postinfo = function(post, provider_name, blog_id, new_post) {
    console.log('add_postinfo');
    var postinfo = {};
    postinfo.provider_name = provider_name;
    postinfo.blog_id = blog_id;
    postinfo.post_id = new_post.id;
    postinfo.url = new_post.url;
    postinfo.modified = new_post.modified;

    if (new_post.categories) {
        for (var i = 0;i<new_post.categories.length;i++) {
            post.categories.push(new_post.categories[i]);
        }
    }
    if (new_post.tags) {
        for (var i = 0;i<new_post.tags.length;i++) {
            post.tags.push(new_post.tags[i]);
        }
    }

    post.infos.push(postinfo);

    return post;
};

postdb.add_post = function(provider_name, blog_id, new_post) {
    console.log('add_post');
    var totalCount= 0;
    var lastId = 0;
    var post = {};

    totalCount = this.get_post_count();
    //console.log("total = " + totalCount);

    if (totalCount > 0) {
        lastId = this.posts[totalCount - 1].id;
    }
    //console.log("lastId = " + lastId);
    lastId++;

    post.id = lastId;
    if (new_post.title) {
        post.title = new_post.title;
    }
    if (new_post.categories) {
        post.categories = new_post.categories;
    }
    if (new_post.tags) {
        post.tags = new_post.tags;
    }
    post.infos = [];
    var postinfo = {};
    postinfo.provider_name = provider_name;
    postinfo.blog_id = blog_id;
    postinfo.post_id = new_post.id;
    postinfo.url = new_post.url;
    postinfo.modified = new_post.modified;

    post.infos.push(postinfo);

    this.posts.push(post);

    //this.saveFile();

    return this.posts[totalCount];
};

module.exports = postdb;
