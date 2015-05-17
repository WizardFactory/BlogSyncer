bs.controller('mainCtrl', function ($q, $scope, $http, Data) {
    "use strict";

    $scope.user = Data.getUser();
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
                    Data.setUser(user);
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

bs.controller('blogCtrl', function ($scope, $http, Data) {
    "use strict";

    $scope.user = Data.getUser();
    $scope.title = 'Your blog ctrl';
});

bs.controller('blogHistoryCtrl', function ($scope, $http, Data) {
    "use strict";

    $scope.user = Data.getUser();
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

bs.controller('blogRegisterCtrl', function ($scope, $http, Data, Site) {
    "use strict";

    $scope.user = Data.getUser();
    $scope.title = 'Your blog groups';
    $scope.button = ['Delete', 'Detail Setting', 'Register', 'Close'];
    $scope.groups = [];
    $scope.group = null;
    $scope.groupInfo = null;
    $scope.groupInfoType = 'polygons'; //'table' or 'polygons'
    $scope.sites = [];
    $scope.selected = [];
    $scope.info = "";
    var graph, paper, circles, links, selectCircle;

    $scope.onClickButton = function(button) {
        if (button === 'Delete') {
            if ($scope.groups.length > 0) {
                $scope.button[0] = 'Confirm';
                $scope.button[1] = '';
            }
        } else if (button === 'Detail Setting') {
            if ($scope.groups.length > 0) {
                $scope.button[0] = '';
                $scope.button[1] = 'Confirm';
            }
        } else if (button === 'Confirm') {
            if ($scope.button[0] === '') {
                updateDetailSetting();
            } else if ($scope.button[1] === '') {
                updateBlogGroup();
            }
            $scope.button[0] = 'Delete';
            $scope.button[1] = 'Detail Setting';
        } else if (button === 'Create') {
            disselectAllBlog();
            $scope.button[2] = 'Register';
        } else if (button === 'Close') {
            $scope.button[2] = 'Create';
        } else if (button === 'Register') {
            registerBlogGroup();
        }
    };

    $scope.onClickGroup = function(group_index) {
        if ($scope.button[0] === '' && $scope.button[1] === 'Confirm') {
            var group = $scope.groups[group_index];
            var count = group.group.length;
            var index = 0;

            $scope.group = group.group;
            $scope.groupInfo = new Array(count);
            for (var i = 0; i < count; i += 1) {
                $scope.groupInfo[i] = new Array(count);
                for (var j = 0; j < count; j += 1) {
                    //if group didn't have groupinfo, postType is set to post. It's for legacy groupDb
                    if (!$scope.groups[group_index].groupInfo[index]) {
                        if (i === j) {
                            $scope.groupInfo[i][j] = {"syncEnable": 'none', "postType": 'none'};
                        } else {
                            var fromProvider = group[i].provider.providerName;
                            var toProvider = group[j].provider.providerName;
                            $scope.groupInfo[i][j] = {"syncEnable": 'true', "postType": Data.getPostType(fromProvider, toProvider)};
                        }
                    }
                    else {
                        $scope.groupInfo[i][j] = $scope.groups[group_index].groupInfo[index];
                    }
                    index += 1;
                }
            }

            drawDetailSetting();
        } else if ($scope.button[0] === 'Confirm' && $scope.button[1] === '') {
            $scope.groups.splice(group_index, 1);
            if ($scope.groups.length === 0) {
                updateBlogGroup();
                $scope.button[0] = 'Delete';
                $scope.button[1] = 'Detail Setting';
            }
        }
    };

    $scope.onClickGroupInfo = function(fromIndex, toIndex) {
        if ($scope.button[0] === '' && $scope.button[1] === 'Confirm') {
            var info = $scope.groupInfo[fromIndex][toIndex];
            if (info.syncEnable === 'false') {
                info.syncEnable = 'true';
            } else if (info.syncEnable === 'true') {
                info.syncEnable = 'false';
            }
        }
    };

    $scope.onClickBlog = function(index) {
        if ($scope.selected[index] !== 'selected') {
            $scope.selected[index] = 'selected';
        } else {
            $scope.selected[index] = 'normal';
        }
    };

    function disselectAllBlog() {
        if ($scope.sites && $scope.sites.length) {
            for (var i = 0; i < $scope.sites.length; i += 1) {
                $scope.selected[i] = 'normal';
            }
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

    function updateDetailSetting() {
        if ($scope.groupInfo !== null) {
            $scope.groups.groupInfo = [];
            for (var i = 0; i < $scope.groupInfo.length; i += 1) {
                for (var j = 0; j < $scope.groupInfo[i].length; j += 1) {
                    $scope.groups.groupInfo.push($scope.groupInfo[i][j]);
                }
            }
            updateBlogGroup();
            $scope.group = null;
            $scope.groupInfo = null;

            if ($scope.groupInfoType === 'polygons') {
                $('#paper').hide();
                graph.clear();
                circles = [];
                links = [];
                selectCircle = null;
            }
        }
    }

    function registerBlogGroup() {
        var group = [];
        var i, j, k, isExist;
        for (i = 0; i < $scope.sites.length; i += 1) {
            if ($scope.selected[i] === 'selected') {
                $scope.selected[i] = 'normal';
                group.push($scope.sites[i]);
            }
        }

        if (group.length <= 1) {
            $scope.info = "A group must have at least more than two blogs!!";
            return;
        }

        for (i = 0; i < $scope.groups.length; i += 1) {
            if ($scope.groups[i].group.length !== group.length) {
                continue;
            }

            for (j = 0; j < group.length; j += 1) {
                isExist = false;
                for (k = 0; k < $scope.groups[i].group.length; k += 1) {
                    if (group[j].provider.providerName === $scope.groups[i].group[k].provider.providerName &&
                        group[j].blog.blog_id === $scope.groups[i].group[k].blog.blog_id) {
                        isExist = true;
                        break;
                    }
                }
                if (!isExist) {
                    break;
                }
            }
            if (isExist) {
                $scope.info = "The group already exists!!";
                return;
            }
        }

        var groupInfo = [];
        var fromProvider, toProvider;
        for (i = 0; i < group.length; i += 1) {
            fromProvider = group[i].provider.providerName;
            for (j = 0; j < group.length; j += 1) {
                toProvider = group[j].provider.providerName;
                if (i === j) {
                    groupInfo.push({"syncEnable": 'none', "postType": 'none'});
                } else {
                    groupInfo.push({"syncEnable": 'true', "postType": Data.getPostType(fromProvider, toProvider)});
                }
            }
        }
        $scope.groups.push({"group":group, "groupInfo":groupInfo});
        console.log(group);
        $http.post("/blogs/group", {"group":group, "groupInfo":groupInfo})
            .success(function (data) {
                console.log(data);
                $scope.info = "";
            })
            .error(function (data) {
                window.alert('Error: ' + data);
                $scope.info = data;
            });
    }

    function drawDetailSetting() {
        if ($scope.groupInfoType !== 'polygons') {
            return;
        }

        $('#paper').show();
        function circle(x, y, label) {
            var cell = new joint.shapes.basic.Circle({
                position: {x: x, y: y},
                size: {width: 50, height: 50},
                attrs: {
                    circle: {'stroke-width': 3},
                    text : {text: label || '', 'font-weight': '800', 'font-size': '12'}
                }
            });

            graph.addCell(cell);
            return cell;
        }

        function link(source, target) {
            var cell = new joint.dia.Link({
                source: {id: source.id},
                target: {id: target.id},
                vertices: [],
                smooth: false,
                attrs: {
                    '.marker-source': {d: 'M 10 0 L 0 5 L 10 10 z', fill: 'transparent'},
                    '.marker-target': {d: 'M 10 0 L 0 5 L 10 10 z', fill: 'transparent'},
                    '.marker-arrowheads': {display: 'none'},
                    '.marker-vertices': {display: 'none'},
                    '.link-tools': {display: 'none'},
                    '.labels': {visibility:'collapse'}
                }
            });
            graph.addCell(cell);
            return cell;
        }

        var size = 200;
        var centerX = 225;
        var centerY = 225;
        var i, j, x, y;
        var count = $scope.group.length;

        for (i = 1; i <= count;i += 1) {
            x = centerX + size * Math.cos(i * 2 * Math.PI / count + Math.PI / 2);
            y = centerY - size * Math.sin(i * 2 * Math.PI / count + Math.PI / 2);
            circles.push(circle(x, y, $scope.group[i-1].blog.blog_title));
        }
        for (i = 0; i < count; i += 1) {
            for (j = 0; j < count; j += 1) {
                if (i < j) {
                    var element = link(circles[i], circles[j]);
                    setArrowheads(element, $scope.groupInfo[j][i], $scope.groupInfo[i][j]);
                    links.push(element);
                }
            }
        }
    }

    function setArrowheads(element, sourceInfo, targetInfo, selectedMarker) {
        var sourceFill = 'transparent';
        var targetFill = 'transparent';
        var connectionStroke = 'black';

        if (sourceInfo !== null && sourceInfo.syncEnable === 'true') {
            if (selectedMarker === 'target') {
                sourceFill = 'pink';
            }
            else {
                sourceFill = 'red';
            }
        }
        if (targetInfo !== null && targetInfo.syncEnable === 'true') {
            if (selectedMarker === 'source') {
                targetFill = 'pink';
            }
            else {
                targetFill = 'red';
            }
        }

        if (selectedMarker === 'none') {
            connectionStroke = 'lightgray';
        }
        else if (selectedMarker === 'source') {
            if (sourceInfo.syncEnable === 'true') {
                connectionStroke = 'red';
            }
            element.toFront();
        }
        else if (selectedMarker === 'target') {
            if (targetInfo.syncEnable === 'true') {
                connectionStroke = 'red';
            }
            element.toFront();
        }

        element.attr({
            '.marker-source': {stroke: connectionStroke, fill: sourceFill},
            '.marker-target': {stroke: connectionStroke, fill: targetFill},
            '.connection': {stroke: connectionStroke}
        });
    }

    function initDetailSetting() {
        if ($scope.groupInfoType !== 'polygons') {
            return;
        }

        graph = new joint.dia.Graph();
        paper = new joint.dia.Paper({
            el: $('#paper'),
            width: 500,
            height: 500,
            gridSize: 1,
            model: graph,
            interactive: false
        });
        circles = [];
        links = [];
        selectCircle = null;

        paper.on('cell:pointerup', function(cellView, evt, x, y) {
            var i, j, k;
            var count = $scope.group.length;
            var circle, link, info;

            var normalCircle = function (element) {
                element.attr({
                    circle: {fill: 'transparent'}
                });
            };
            var selectedCircle = function (element) {
                element.attr({
                    circle: {fill: 'lightyellow'}
                });
            };

            if (cellView.model instanceof joint.dia.Link) {
                link = cellView.model;
                if (selectCircle !== null &&
                    ((selectCircle.id === link.get('source').id) || (selectCircle.id === link.get('target').id))) {
                    for (k = 0; k < count; k += 1) {
                        circle = circles[k];
                        if (circle.id === link.get('source').id) {
                            i = k;
                        }
                        else if (circle.id === link.get('target').id) {
                            j = k;
                        }
                    }

                    if (selectCircle.id === link.get('source').id) {
                        info = $scope.groupInfo[i][j];
                        if (info.syncEnable === 'false') {
                            info.syncEnable = 'true';
                        } else if (info.syncEnable === 'true') {
                            info.syncEnable = 'false';
                        }
                        setArrowheads(link, $scope.groupInfo[j][i], info, 'target');
                    }
                    else {
                        info = $scope.groupInfo[j][i];
                        if (info.syncEnable === 'false') {
                            info.syncEnable = 'true';
                        } else if (info.syncEnable === 'true') {
                            info.syncEnable = 'false';
                        }
                        setArrowheads(link, info, $scope.groupInfo[i][j], 'source');
                    }
                }
            }
            else if (cellView.model instanceof joint.shapes.basic.Circle) {
                for (i = 0; i < count; i += 1) {
                    circle = circles[i];
                    if (circle.id === cellView.model.id) {
                        if (selectCircle !== null && circle.id === selectCircle.id) {
                            normalCircle(circle);
                            selectCircle = null;
                        }
                        else {
                            selectedCircle(circle);
                            selectCircle = circle;
                        }
                    }
                    else {
                        normalCircle(circle);
                    }
                }

                k = 0;
                for (i = 0; i < count; i += 1) {
                    for (j = 0; j < count; j += 1) {
                        if (i < j) {
                            link = links[k];
                            k += 1;
                            if (selectCircle !== null) {
                                if (link.get('source').id === selectCircle.id) {
                                    setArrowheads(link, $scope.groupInfo[j][i], $scope.groupInfo[i][j], 'target');
                                }
                            else if (link.get('target').id === selectCircle.id) {
                                    setArrowheads(link, $scope.groupInfo[j][i], $scope.groupInfo[i][j], 'source');
                                }
                                else {
                                    setArrowheads(link, null, null, 'none');
                                }
                            }
                            else {
                                setArrowheads(link, $scope.groupInfo[j][i], $scope.groupInfo[i][j]);
                            }
                        }
                    }
                }
            }
        });
    }

    function init() {
        var user = $scope.user;
        if (!user._id) {
            console.log('you have to signin~');
            return;
        }

        $scope.sites = Site.getSiteList();
        if (!$scope.sites) {
            Site.pullSitesFromServer(function setSites(err, rcvSites) {
                if (err) {
                    window.alert(err);
                }
                $scope.sites = rcvSites;
            });
        }

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
        initDetailSetting();
    }

    init();
});

bs.controller('blogCollectFeedbackCtrl', function ($scope, $http, Data, Site, $timeout) {
    "use strict";

    var reqStartNum;
    var reqTotalNum;
    var sites;

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
                        //console.log(indexes);
                        $scope.posts[indexes.postIndex].infos[indexes.infoIndex].replies = data.replies;
                    })
                    .error(function (data) {
                        window.alert('Error: ' + data);
                    });
            }
        }
    }

    $scope.user = Data.getUser();
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

    $scope.getBlogTitle = function(providerName, blogID) {
        var i;
        var len;

        if (!sites)  {
            console.log("Fail to get sites");
            return;
        }
        len = sites.length;
        for (i=0; i<len; i+=1) {
            if (sites[i].provider.providerName === providerName &&
                sites[i].blog.blog_id === blogID)  {
                return sites[i].blog.blog_title;
            }
        }
    };

    function init() {
        var url;
        var user = $scope.user;

        if (user._id === undefined) {
            console.log('you have to signin~');
            return;
        }

        sites = Site.getSiteList();
        if (!sites) {
            Site.pullSitesFromServer(function setSites(err, rcvSites) {
                if (err) {
                    window.alert(err);
                }
               sites = rcvSites;
            });
        }

        reqStartNum = 0;
        reqTotalNum = 20;
        url = "/blogs/posts/" + reqStartNum + "/" + reqTotalNum;

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

bs.controller('signinCtrl', function ($scope, $http, Data, Site) {
    "use strict";

    $scope.providers = [ "Wordpress", "tistory", "google", "facebook", "tumblr", "twitter", "kakao"];

    function init() {
        $scope.user = Data.getUser();
        $scope.sites = Site.getSiteList();
        if (!$scope.sites) {
            Site.pullSitesFromServer(function setSites(err, rcvSites) {
                if (err) {
                    window.alert(err);
                }
                $scope.sites = rcvSites;
            });
        }

        $scope.getBlogTitle = function(provider) {
            if (!$scope.sites) {
                return;
            }

            for (var i = 0; i < $scope.sites.length; i += 1) {
                if ($scope.sites[i].provider.providerId === provider.providerId) {
                    return "(" + $scope.sites[i].blog.blog_title + ")";
                }
            }
        };

        if ($scope.user._id) {
            $scope.title = 'Your accounts';
        }
        else {
            $scope.title = 'Please sign in';
        }
    }

    init();
});
