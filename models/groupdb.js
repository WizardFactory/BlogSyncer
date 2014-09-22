/**
 * Created by aleckim on 2014. 9. 22..
 */

function GroupDb(groups) {
    this.groups = groups;
}

/*
 [
    {"id":"aaa", "blogs":[
                        {"provider":object, "blog":object}
                        {"provider":object, "blog":object}
                        ];
 ]
 */

GroupDb.prototype.init = function () {
  try {
    this.groups = JSON.parse(fs.readFileSync(dbfilename)).groups;
  }
  catch (e) {
    console.log(e);
    return false;
  }

  return true;
};

GroupDb.prototype.saveFile = function () {
  try {
    fs.writeFile(dbfilename, JSON.stringify({"groups":this.groups}), function (err) {
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

GroupDb.prototype.findGroupByBlogInfo = function (provider_name, blog_id)  {
    var new_groups = [];
    var i = 0;
    for ( i=0; i<this.groups.length; i++) {
        var group = this.groups[i];
        var j = 0;
        var foundIt = false;

        for (j=0; j<group.blogs.length; j++) {
            var blog = group.blogs[j];

            if ( blog.provider.providerName === provider_name
                && blog.blog.blog_id === blog_id) {
                foundIt = true;
                break;
            }
        }
        if (foundIt) {
            new_groups.push(group);
        }
    }

    return new_groups;
};

module.exports = GroupDb;


