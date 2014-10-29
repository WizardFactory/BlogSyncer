/**
 * Created by aleckim on 2014. 8. 9..
 * posts db는 각 사용자별로 하나씩 가지게 된다.
 */

var fs = require('fs');
var dbfilename = 'post.db';

var log = require('winston');

function postdb(posts) {
    this.posts = posts;
}

/* 오직 자신만이 정보를 가지고 있음 by alec*/

//postdb.lastUpdateTime = {};
//postdb.posts = [];
/* posts[] -> id, title, categories[], tags[], modified, infos[]-> blog, post_info */
/*
   [
        {
            "id":1,
            "title":"XXXX",
            "categories":"ttt",
            "tags":["xxxx","bbb"],
            "tyep": text, photo,
            "infos": [
                {
                    "provider_name":"wordpress", "blog_id":2313, "post_id":123,"post_url":"http://www.xxx.yy",
                    "modified": "2014-08-07T13:22:12+09:00",
                    //"replies":[{"comment":3}, {"like":4}]
                },
                {
                    "provider_name":"wordpress", "blog_id":2314, "post_id":789,"post_url":"http://www.xxx.bb",
                    "modified": "2014-08-07T13:22:12+09:00",
                },
            ]
        }
    ];
*/

postdb.prototype.init = function () {
  try {
    this.posts = JSON.parse(fs.readFileSync(dbfilename)).post_db;
  }
  catch (e) {
    log.debug(e);
    return false;
  }

  return true;
};

postdb.prototype.saveFile = function () {
  try {
    fs.writeFile(dbfilename, JSON.stringify({"post_db":this.posts}), function (err) {
        if (err) throw err;
        log.debug('It\'s saved!');
    });
  }
  catch(e) {
      log.debug(e);
      return false;
  }

  return true;
};

postdb.prototype.find_post_by_title = function(title) {

    for (var i = 0; i<this.posts.length; i++) {
        if (this.posts[i].title == undefined) {
            continue;
        }

        if (this.posts[i].title == title) {
            break;
        }
    }

    if (i == this.posts.length) {
        log.debug('Fail to find post title=' + title);
    }
    else {
        var post = this.posts[i];
        log.debug('find post('+post.id+') by title='+title);
        return this.posts[i];
    }

    return null;
};

postdb.prototype.find_post_by_url = function(url) {

};

postdb.prototype.find_post_by_id = function(post_id) {
    for (var i=0; i<this.posts.length; i++) {
        if (this.posts[i].id == post_id) {
            break;
        }
    }

    if (i == this.posts.length) {
        log.debug('Fail to find post id=' + post_id);
    }
    else {
        var post = this.posts[i];
        log.debug('find post('+post.id+')');
        return this.posts[i];
    }

    return null;
};

postdb.prototype.get_post_by_post_id_of_blog = function(provider_name, blog_id, post_id) {

    for (var i = 0; i<this.posts.length; i++) {
        var infos = this.posts[i].infos;
        for (var j = 0; j<infos.length; j++) {
           if (infos[j].provider_name == provider_name
                    && infos[j].blog_id == blog_id
                    && infos[j].post_id == post_id) {
               log.debug('posts index=' + i + ' infos index='+j);
               return this.posts[i];
           }
        }
    }
};

postdb.prototype.find_post_by_post_id_of_blog = function(provider_name, blog_id, post_id) {

    var foundit = false;

    for (var i = 0; i<this.posts.length; i++) {
        var infos = this.posts[i].infos;
        for (var j = 0; j<infos.length; j++) {
           if (infos[j].provider_name == provider_name && infos[j].blog_id == blog_id && infos[j].post_id == post_id) {
               log.debug('posts index=' + i + ' infos index='+j);
               foundit = true;
               break;
           }
        }
    }

    return foundit;
};

postdb.prototype.add_postinfo = function(post, provider_name, blog_id, new_post) {
    log.debug('add_postinfo');
    var postinfo = {};
    postinfo.provider_name = provider_name;
    postinfo.blog_id = blog_id;
    postinfo.post_id = new_post.id;
    postinfo.url = new_post.url;
    postinfo.modified = new_post.modified;

    if (new_post.categories) {
        if (!post.categories) {
            post.categories = [];
        }
        for (var i = 0;i<new_post.categories.length;i++) {
            post.categories.push(new_post.categories[i]);
        }
    }
    if (new_post.tags) {
        if (!post.tags) {
            post.tags = [];
        }
        for (var i = 0;i<new_post.tags.length;i++) {
            post.tags.push(new_post.tags[i]);
        }
    }

    post.infos.push(postinfo);

    return post;
};

postdb.prototype.add_post = function(provider_name, blog_id, new_post) {
    log.debug('add_post');
    var totalCount= 0;
    var lastId = 0;
    var post = {};

    totalCount = this.posts.length;
    log.debug("total = " + totalCount);

    if (totalCount > 0) {
        lastId = this.posts[totalCount - 1].id;
    }
    log.debug("lastId = " + lastId);
    lastId++;

    post.id = lastId;
    if (new_post.title !== undefined) {
        post.title = new_post.title;
    }
    else {
        //log.debug("title is undefined");
    }

    if (new_post.categories !== undefined) {
        post.categories = new_post.categories;
    }
    else {
        //log.debug("categories is undefined");
    }

    if (new_post.tags !== undefined) {
        post.tags = new_post.tags;
    }
    else {
        //log.debug("tags is undefined");
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
