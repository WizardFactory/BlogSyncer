/**
 * Created by aleckim on 2014. 9. 22..
 */

var log = require('winston');

function GroupDb(groups) {
    this.groups = groups;
}

/*
 [
    [
        {provider, blog}
        {provider, blog}
    ]
 ]
 */

GroupDb.prototype.init = function () {
  try {
    this.groups = JSON.parse(fs.readFileSync(dbfilename)).groups;
  }
  catch (e) {
    log.debug(e);
    return false;
  }

  return true;
};

GroupDb.prototype.saveFile = function () {
  try {
    fs.writeFile(dbfilename, JSON.stringify({"groups":this.groups}), function (err) {
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

GroupDb.prototype.findGroupByBlogInfo = function (provider_name, blog_id)  {
    var new_groups = [];
    var i = 0;

    log.debug(this.groups);

    for ( i=0; i<this.groups.length; i++) {
        var group = this.groups[i];
        var j = 0;
        var foundIt = false;
        log.debug(group);
        for (j=0; j<group.length; j++) {
            var blog = group[j].blog;
            var provider = group[j].provider;
            if ( provider.providerName === provider_name
                && blog.blog_id == blog_id) {
                foundIt = true;
                break;
            }
        }
        if (foundIt) {
            new_groups.push(group);
        }
    }
    if (new_groups.length === 0) {
        log.error("Fail to find group p="+provider_name+" b="+blog_id);
    }
    return new_groups;
};

module.exports = GroupDb;


