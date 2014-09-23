bs.controller('mainCtrl', function ($q, $scope, $http, User) {
    $scope.user = User.getUser();

    $scope.username = '당신';
    $scope.message = '의 블로그 글들을 동기화 시킵니다.';
    $scope.signstat = 'Sign in';

    // add DropDown Blog
    $scope.options = [{"Route":"/#/blog/blogRegister","Display":"블로그 등록"},{"Route":"/#/blog/blogSetSync","Display":"동기화 설정"},
        {"Route":"/#/blog/blogHistorySync","Display":"동기 히스토리"},{"Route":"/#/blog/blogCollectFeedback","Display":"피드백 모음"}]

    console.log('Start mainCtrl');

    if (!$scope.user.id) {
        var httpGet = function() {
            var deferred = $q.defer();
            $http.get('/user')
                .success(function (data) {
                    if (data == 'NAU') {
                        console.log('NAU');
                    }
                    else {
                        var user = data;
                        User.setUser(user);
                        $scope.signstat = 'My account';
                        $scope.username = user.providers[0].displayName;
                        console.log('Change username, signstat');
                    }
                    deferred.resolve();
                })
                .error(function (data) {
                    window.alert('Error: ' + data);
                });

            return deferred.promise;
        };

        var firsttime_skip = 0;
        httpGet()
            .then(function () {
                console.log('user id = '+ User.getUser().id);
                if (User.getUser().id) {
                    console.log('get_child_port');
                    if (firsttime_skip) {
                        $http.get('/user/child_port')
                            .success(function (data) {
                                console.log(User.getUser());
                                console.log('recv child_port =' + data.child_port);
                                User.setChildPort(data.child_port);
                            })
                            .error(function (data) {
                                window.alert('Error: ' + data);
                            });
                    }
                    else {
                        firsttime_skip = 1;
                    }
                }
                else {
                    console.log('you have to signin~');
                }
            });
    }
    else
    {
        $http.get('/child_port')
            .success(function (data) {
                console.log('recv child_port =' + data.child_port);
                return data;
            })
            .error(function (data) {
                window.alert('Error: ' + data);
            });
    }
});

bs.controller('homeCtrl', function ($q, $scope, $http, User) {
    console.log('Start homeCtrl');
});

bs.controller('blogCtrl', function ($scope, $http, User) {
    $scope.message = 'Your blog groups';
    $scope.button = ['Create', 'Register'];
    $scope.groups = [
        [{
            'provider' : {
                accessToken: 'd59f16d6ef07ff131824a858129f0028_bb9d06ced23d5eaacaffd3d11041628d',
                displayName: 'kimalec7@gmail.com',
                providerId: '1240601',
                providerName: 'tistory'
            },
            'blog' : {
                blog_id: 'wizardfactory',
                blog_title: 'WizardFactory',
                blog_url: 'http://wizardfactory.tistory.com'
            }
        },
        {
            'provider' : {
                accessToken: 'd59f16d6ef07ff131824a858129f0028_bb9d06ced23d5eaacaffd3d11041628d',
                displayName: 'kimalec7@gmail.com',
                providerId: '1240601',
                providerName: 'tistory'
            },
            'blog' : {
                blog_id: 'aleckim',
                blog_title: 'The wizard',
                blog_url: 'http://aleckim.tistory.com'
            }
        }],
        [{
            'provider' : {
                accessToken: 'd59f16d6ef07ff131824a858129f0028_bb9d06ced23d5eaacaffd3d11041628d',
                displayName: 'kimalec7@gmail.com',
                providerId: '1240601',
                providerName: 'google'
            },
            'blog' : {
                blog_id: 'wizardfactory',
                blog_title: 'WizardFactory',
                blog_url: 'http://wizardfactory.tistory.com'
            }
        }]
    ];
    $scope.sites = [
        {
            'provider' : {
                accessToken: 'd59f16d6ef07ff131824a858129f0028_bb9d06ced23d5eaacaffd3d11041628d',
                displayName: 'kimalec7@gmail.com',
                providerId: '1240601',
                providerName: 'google'
            },
            'blog' : {
                blog_id: 'wizardfactory',
                blog_title: 'WizardFactory',
                blog_url: 'http://wizardfactory.tistory.com'
            }
        },
        {
            'provider' : {
                accessToken: 'd59f16d6ef07ff131824a858129f0028_bb9d06ced23d5eaacaffd3d11041628d',
                displayName: 'kimalec7@gmail.com',
                providerId: '1240601',
                providerName: 'tistory'
            },
            'blog' : {
                blog_id: 'aleckim',
                blog_title: 'The wizard',
                blog_url: 'http://aleckim.tistory.com'
            }
        }
    ];
    $scope.selected = [];

    $scope.child_port = User.getChildPort();
    //set/get Child port is not working now.
    $scope.child_port = 20149;
    $scope.posts = [];

    $scope.onClickButton = function(button) {
        if (button === 'Create') {
            $scope.button[0] = 'Close';
        } else if (button === 'Close') {
            $scope.button[0] = 'Create';
        } else if (button === 'Register') {
            registerBlogGroup();
        }
        disselectAllBlog();
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

    function registerBlogGroup() {
        var group = [];
        for (var i = 0; i < $scope.sites.length; i += 1) {
            if ($scope.selected[i] === 'selected') {
                group.push($scope.sites[i]);
            }
        }
        $scope.groups.push(group);
    }

    function init() {
        if (!$scope.user.id) {
            console.log('you have to signin~');
        }

        var child_url = 'http://www.justwapps.com:'+ $scope.child_port +'/blog';
        var childio = io.connect(child_url);
        console.log('child_url='+child_url);

//        childio.on('connect', function () {
//            childio.emit('blog', {msg: 'getSites'});
//        });
//        childio.on('sites', function(data){
//            console.log(data);
//            $scope.blog_list = data;
//        });

        // About blogCollectFeedback
        var postsID = 0;

        childio.emit('blog', {msg: 'getPosts'});
//        childio.on('connect', function(){
//            childio.emit('blog', {msg: 'getPosts'});
//        });

        childio.on('posts', function(data){
            var post_ids = [];
            for (var i=0; i<data.post_db.length; i++) {
                console.log('push post_id='+data.post_db[i].id);
                post_ids.push(data.post_db[i].id);
            }
            var messages = { msg : 'get_reply_count', post_ids : post_ids };
            console.log('send get_reply_count post_ids='+post_ids.length);
            childio.emit('blog', messages );

            $scope.$apply(function () {
                $scope.posts = data.post_db;
            });
        });

        childio.on('reply_count', function(data) {
            console.log('reply_count');
            console.log(data);
            for (var i = 0; i<$scope.posts.length; i++) {
                if ($scope.posts[i].id == data.post_id) {
                    for (var j=0; j<$scope.posts[i].infos.length; j++) {
                        var info = $scope.posts[i].infos[j];
                        if (info.provider_name == data.provider_name && info.blog_id == data.blog_id) {
                            $scope.$apply(function () {
                                console.log('provider='+info.provider_name+' blog='+info.blog_id+' add comment_count, like_count');
                                $scope.posts[i].infos[j].comment_count = data.comment_count;
                                $scope.posts[i].infos[j].like_count = data.like_count;
                            });
                            break;
                        }
                    }
                    break;
                }
            }
        });

//        childio.on('connect', function(data){
//            var messages = { msg : 'getComments', postID : postsID };
//            childio.emit('blog', messages );
//        });
//        childio.on('comments', function(data){
//            var comments = data.comments[0].content;
//            $scope.$apply(function() {
//                $scope.comments = comments;
//            });
//        });

        disselectAllBlog();
    }

    init();
});

bs.controller('signinCtrl', function ($scope, $http, User) {
    $scope.user = User.getUser();

    $scope.providers = [ "Wordpress", "tistory", "google", "facebook", "tumblr", "twitter", "kakao"];

    if ($scope.user.id) {
        $scope.message = 'Your accounts';
    }
    else {
        $scope.message = 'Please sign in';
    }
});