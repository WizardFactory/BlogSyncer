bs.controller('mainCtrl', function ($q, $scope, $http, User) {
    "use strict";

    $scope.user = User.getUser();
    $scope.username = '당신';
    $scope.message = '의 블로그 글들을 동기화 시킵니다.';
    $scope.signstat = '로그인';

    // add DropDown Blog
    $scope.options = [
        {"Route":"/#/blog/blogRegister","Display":"블로그 등록"},
        {"Route":"/#/blog/blogSetSync","Display":"동기화 설정"},
        {"Route":"/#/blog/blogHistorySync","Display":"동기 히스토리"},
        {"Route":"/#/blog/blogCollectFeedback","Display":"피드백 모음"}
    ];

    console.log('Start mainCtrl');

    if (!$scope.user._id) {
        $http.get('/user')
            .success(function (data) {
                if (data === 'NAU') {
                    console.log('NAU');
                }
                else {
                    var user = data;
                    User.setUser(user);
                    $scope.signstat = "내계정";
                    $scope.username = user.providers[0].displayName;
                    console.log('Change username, signstat');
                }
            })
            .error(function (data) {
                window.alert('Error: ' + data);
            });
    }
});

bs.controller('homeCtrl', function ($q, $scope) {
    "use strict";

    console.log('Start homeCtrl');
    $scope.title = 'Home';
});

bs.controller('blogCtrl', function ($scope, $http, User) {
    "use strict";

    $scope.user = User.getUser();
    $scope.title = 'Your blog ctrl';
});

bs.controller('blogHistoryCtrl', function ($scope, $http, User) {
    "use strict";

    $scope.user = User.getUser();
    $scope.title = "Blog Sync Histories";
    $scope.histories = [];

    var user = $scope.user;

    if (user._id === undefined) {
        console.log('you have to signin~');
    }

    $http.get('/blogs/histories')
        .success(function (data) {
            $scope.histories = data.histories;
        })
        .error(function (data) {
            window.alert('Error: ' + data);
        });
});

bs.controller('blogRegisterCtrl', function ($scope, $http, User) {
    "use strict";

    $scope.user = User.getUser();
    $scope.title = 'Your blog groups';
    $scope.button = ['Delete', 'Create', 'Close'];
    $scope.groups = [];
    $scope.sites = [];
    $scope.selected = [];

    $scope.onClickButton = function(button) {
        if (button === 'Delete') {
            if ($scope.groups.length > 0) {
                $scope.button[0] = 'Confirm';
            }
        } else if (button === 'Confirm') {
            updateBlogGroup();
            $scope.button[0] = 'Delete';
        } else if (button === 'Create') {
            disselectAllBlog();
            $scope.button[1] = 'Register';
        } else if (button === 'Close') {
            $scope.button[1] = 'Create';
        } else if (button === 'Register') {
            registerBlogGroup();
        }
    };

    $scope.onClickGroup = function(group_index, blog_index) {
        if ($scope.button[0] !== 'Confirm') {
            return;
        }
        var group = $scope.groups[group_index].group;
        group.splice(blog_index, 1);
        if (group.length === 0) {
            $scope.groups.splice(group_index, 1);
        }
        if ($scope.groups.length === 0) {
            $scope.button[0] = 'Delete';
        }
    };

    $scope.onClickBlog = function(index) {
        if ($scope.selected[index] === 'normal') {
            $scope.selected[index] = 'selected';
        } else {
            $scope.selected[index] = 'normal';
        }
    };

    function disselectAllBlog() {
        for (var i = 0; i < $scope.sites.length; i += 1) {
            $scope.selected[i] = 'normal';
        }
    }

    function updateBlogGroup() {
        $http.put("/blogs/groups",{"groups":$scope.groups})
            .success(function (data) {
                console.log(data);
            })
            .error(function (data) {
                window.alert('Error: ' + data);
            });
    }

    function registerBlogGroup() {
        var group = [];
        for (var i = 0; i < $scope.sites.length; i += 1) {
            if ($scope.selected[i] === 'selected') {
                $scope.selected[i] = 'normal';
                group.push($scope.sites[i]);
            }
        }
        if (group.length > 0) {
            $scope.groups.push({"group":group});
            console.log(group);
            $http.post("/blogs/group",{"group":group})
                .success(function (data) {
                    console.log(data);
                })
                .error(function (data) {
                    window.alert('Error: ' + data);
                });
        }
    }

    function init() {
        var user = $scope.user;
        if (!user._id) {
            console.log('you have to signin~');
            return;
        }

        console.log("init: blogs/sites");
        $http.get("/blogs/sites")
            .success(function (data) {
                console.log(data);
                for (var i = 0; i < data.sites.length; i += 1) {
                    for (var j = 0; j < data.sites[i].blogs.length; j += 1) {
                        var site = {'provider' : data.sites[i].provider, 'blog' : data.sites[i].blogs[j]};
                        $scope.sites.push(site);
                    }
                }
            })
            .error(function (data) {
                window.alert('Error: ' + data);
            });

        console.log("init: blogs/groups");
        $http.get("/blogs/groups")
            .success(function (data) {
                console.log(data);
                $scope.groups = data.groups;
            })
            .error(function (data) {
                window.alert('Error: ' + data);
            });

        disselectAllBlog();
    }

    init();
});

bs.controller('blogCollectFeedbackCtrl', function ($scope, $http, User, $timeout) {
    "use strict";

    var reqStartNum;
    var reqTotalNum;

    function getPost(providerName, blogID, postID) {
        for (var i = 0; i<$scope.posts.length; i += 1) {
            for (var j=0; j<$scope.posts[i].infos.length; j += 1) {
                var info = $scope.posts[i].infos[j];
                //console.log(info);
                if (info.provider_name === providerName && info.blog_id === blogID && info.post_id === postID.toString()) {
                    return {"postIndex":i, "infoIndex":j};
                }
            }
        }
        console.log("Fail to find post of provider="+providerName+",blog="+blogID+",postID"+postID);
    }

    function getReplies(data) {
        for (var i = 0; i < data.posts.length; i += 1) {
            var post = data.posts[i];

            var formattedDate;
            var date;

            for (var j = 0; j < post.infos.length; j += 1) {
                var url;
                console.log('push post_id=' + post.infos[j].post_id);

                url = "/blogs/replies";
                url += "/" + post.infos[j].provider_name;
                url += "/" + post.infos[j].blog_id;
                url += "/" + post.infos[j].post_id;

                date = new Date(post.infos[j].modified);
                formattedDate = date.getFullYear() + '/' + (date.getMonth() + 1) +
                            '/' + date.getDate() + ' ' + date.getHours() + ':' + date.getMinutes();
                //console.log(formattedDate);

                post.infos[j].formattedDate = formattedDate;

                $http.get(url)
                    .success(function (data) {
                        var indexes;

                        if (!data) {
                            console.log("Fail to get data");
                            return;
                        }

                        indexes = getPost(data.providerName, data.blogID, data.postID);
                        console.log(indexes);
                        $scope.posts[indexes.postIndex].infos[indexes.infoIndex].replies = data.replies;
                    })
                    .error(function (data) {
                        window.alert('Error: ' + data);
                    });
            }
        }
    }

    $scope.user = User.getUser();
    $scope.title = 'Collect Feedback';
    $scope.posts = [];
    $scope.waiting = false;
    $scope.getReplyContent = function (providerName, blogID, postID) {
        //window.alert("getReplyContent = " + providerName + blogID + postID);
        var url = providerName + "/bot_comments/" + blogID + "/" + postID;
        $http.get(url)
            .success(function (data) {
                console.log(data);
                var indexes = getPost(data.providerName, data.blogID, data.postID);
                console.log("postIndex="+indexes.postIndex+" infoIndex="+indexes.postIndex);
                console.log(data.comments);
                $scope.posts[indexes.postIndex].infos[indexes.infoIndex].comments = data.comments;
            })
            .error(function (data) {
                window.alert('Error: ' + data);
            });
    };

    $scope.requestMorePosts = function () {
        console.log("requestMorePosts");

        var url = "/blogs/posts/" + reqStartNum + "/" + reqTotalNum;
        console.log(url);
        $scope.waiting = true;
        $http.get(url)
            .success(function (data) {
                if (data.posts.length === 0) {
                    console.log("posts is zero");
                    $scope.waiting = false;
                    return;
                }

                reqStartNum += data.posts.length;
                $timeout(function () {
                    $scope.posts = $scope.posts.concat(data.posts);
                    $scope.waiting = false;
                    getReplies(data);
                }, 0);
            })
            .error(function (data) {
                window.alert('Error: ' + data);
                $scope.waiting = false;
            });
    };

    function init() {
        reqStartNum = 0;
        reqTotalNum = 20;

        var user = $scope.user;
        if (user._id === undefined) {
            console.log('you have to signin~');
            return;
        }

        var url = "/blogs/posts/" + reqStartNum + "/" + reqTotalNum;

        $http.get(url)
            .success(function (data) {
                console.log(data);

                if (data.posts.length === 0) {
                    console.log("posts is zero");
                    return;
                }

                reqStartNum += data.posts.length;
                $scope.posts = data.posts;
                getReplies(data);
            })
            .error(function (data) {
                window.alert('Error: ' + data);
            });
    }

    init();
});

bs.controller('signinCtrl', function ($scope, $http, User) {
    "use strict";

    $scope.user = User.getUser();
    $scope.providers = [ "Wordpress", "tistory", "google", "facebook", "tumblr", "twitter", "kakao"];

    if ($scope.user._id) {
        $scope.title = 'Your accounts';
    }
    else {
        $scope.title = 'Please sign in';
    }
});
