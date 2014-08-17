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
/*
   [
        {
            "id":1,
            "title":"XXXX",
            "categories":"ttt",
            "tags":["xxxx","bbb"],
            "modified": "2014-08-07T13:22:12+09:00",
            "providers": [
                {
                    "providerName":"wordpress", "site_id":2313, "post_id":123,"post_url":"http://www.xxx.yy",
                    "comment_count":3, "like_count":3, "is_reblogged":2
                },
                {
                    "providerName":"wordpress", "site_id":2314, "post_id":789,"post_url":"http://www.xxx.bb",
                    "comment_count":3, "like_count":3, "is_reblogged":2
                },
            ]
        }
    ];
*/

postdb.init = function () {
  try {
    postdb.users = JSON.parse(fs.readFileSync(dbfilename)).user_db;
  }
  catch (e) {
    console.log(e);
    return false;
  }

  return true;
};

postdb.saveFile = function () {
  try {
    fs.writeFile(dbfilename, JSON.stringify({"user_db":postdb.users}), function (err) {
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

postdb.getUserCount = function () {
    return this.users.length;
};
