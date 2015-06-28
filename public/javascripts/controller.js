bs.controller('mainCtrl', function ($q, $scope, $http, $translate, Data, Type) {
    "use strict";

    $scope.user = Data.getUser();
    $scope.signstat = 'LOC_LOGIN';
    $scope.menuType = Type.MENU;
    $scope.alertType = Type.ALERT.NONE;
    $scope.alertHeader = '';
    $scope.alertMessage = '';

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
                    $scope.signstat = "LOC_MY_ACCOUNT";
                    console.log('Change username, signstat');
                }
            })
            .error(function (data) {
                $scope.showAlert(Type.ALERT.DANGER, data);
            });
    }

    $scope.showAlert = function(type, message) {
        $scope.alertType = type;
        $scope.alertMessage = message;
        if (type === Type.ALERT.SUCCESS) {
            $scope.alertHeader = 'LOC_ALERT_SUCCESS';
        }
        else if (type === Type.ALERT.INFO) {
            $scope.alertHeader = 'LOC_ALERT_INFO';
        }
        else if (type === Type.ALERT.WARNING) {
            $scope.alertHeader = 'LOC_ALERT_WARNING';
        }
        else if (type === Type.ALERT.DANGER) {
            $scope.alertHeader = 'LOC_ALERT_DANGER';
        }
    };

    $scope.hideAlert = function() {
        $scope.alertType = Type.ALERT.NONE;
        $scope.alertHeader = '';
        $scope.alertMessage = '';
    };
});

bs.controller('homeCtrl', function ($q, $scope) {
    "use strict";

    console.log('Start homeCtrl');
    $scope.title = 'LOC_BLOG_SYNC';
});

bs.controller('blogRegisterCtrl', function ($scope, $http, Data, Site, Type) {
    "use strict";

    $scope.user = Data.getUser();
    $scope.title = 'LOC_BLOG_GROUPS';
    $scope.type = Type;
    $scope.sites = [];
    $scope.inSites = [];
    $scope.outSites = [];
    $scope.groups = [];
    $scope.groupInfo = null;
    $scope.groupInfoType = Type.GROUP_INFO.POLYGONS;
    $scope.groupIndex = -1;
    $scope.newGroup = false;
    $scope.initGroupInfo = false;
    $scope.detailSetting = false;
    var graph, paper, circles, links, selectCircle;

    $scope.onClickGroup = function(index) {
        if ($scope.groupIndex === index) {
            return;
        }

        $scope.groupIndex = index;
        $scope.newGroup = false;
        $scope.inSites = [];

        var group = $scope.groups[index];
        for (var i = 0; i < group.group.length; i += 1) {
            $scope.inSites.push(group.group[i]);
        }
        createOutSites();

        $scope.groupInfo = null;
        $scope.initGroupInfo = false;
        $scope.detailSetting = false;
    };

    $scope.onClickNewGroup = function() {
        if ($scope.newGroup === true || $scope.sites.length === 0) {
            return;
        }

        $scope.groupIndex = -1;
        $scope.newGroup = true;
        $scope.inSites = [];
        createOutSites();

        $scope.groupInfo = null;
        $scope.initGroupInfo = true;
        $scope.detailSetting = false;
    };

    $scope.onClickSite = function(isInSite, index) {
        if ($scope.groupIndex === -1 && $scope.newGroup === false) {
            return;
        }

        if (isInSite === true) {
            $scope.inSites.splice(index, 1);
        }
        else {
            $scope.inSites.push($scope.outSites[index]);
        }
        createOutSites();
        $scope.initGroupInfo = true;
    };

    $scope.onClickDetailSetting = function($event) {
        if ($scope.groupIndex === -1 && $scope.newGroup === false) {
            return;
        }

        createGroupInfo();
        showDetailSetting();
        $event.stopPropagation();
    };

    $scope.onClickDelete = function($event) {
        if ($scope.groupIndex === -1 && $scope.newGroup === false) {
            return;
        }

        deleteBlogGroup($scope.groupIndex);
        $scope.groupIndex = -1;
        $scope.newGroup = false;
        $scope.inSites = [];
        $scope.outSites = [];
        $scope.groupInfo = null;
        $scope.initGroupInfo = false;
        $event.stopPropagation();
    };

    $scope.onClickConfirm = function($event) {
        if ($scope.groupIndex === -1 && $scope.newGroup === false) {
            return;
        }

        var group = [];
        var i, j;
        for (i = 0; i < $scope.inSites.length; i += 1) {
            group.push($scope.inSites[i]);
        }

        if (group.length <= 1) {
            $scope.showAlert(Type.ALERT.DANGER, 'LOC_COUNT_ERROR');
            return;
        }

        if (isExistBlogGroup(group, $scope.groupIndex) === true) {
            $scope.showAlert(Type.ALERT.DANGER, 'LOC_EXIST_ERROR');
            return;
        }

        if ($scope.newGroup === true) {
            registerBlogGroup(group);
        }
        else {
            updateBlogGroup(group);
        }

        $scope.groupIndex = -1;
        $scope.newGroup = false;
        $scope.inSites = [];
        $scope.outSites = [];
        $scope.groupInfo = null;
        $scope.initGroupInfo = false;

        hideDetailSetting();
        $event.stopPropagation();
    };

    $scope.onClickCancel = function($event) {
        if ($scope.groupIndex === -1 && $scope.newGroup === false) {
            return;
        }

        if ($scope.detailSetting === false) {
            $scope.groupIndex = -1;
            $scope.newGroup = false;
            $scope.inSites = [];
            $scope.outSites = [];
            $scope.initGroupInfo = false;
        }
        $scope.groupInfo = null;

        hideDetailSetting();
        $event.stopPropagation();
    };

    $scope.onClickGroupInfo = function(fromIndex, toIndex) {
        var info = $scope.groupInfo[fromIndex][toIndex];
        if (info.syncEnable === Type.SYNC_ENABLE.OFF) {
            info.syncEnable = Type.SYNC_ENABLE.ON;
        } else if (info.syncEnable === Type.SYNC_ENABLE.ON) {
            info.syncEnable = Type.SYNC_ENABLE.OFF;
        }
    };

    function createOutSites() {
        $scope.outSites = [];

        var isAdd = false;
        for (var i = 0; i < $scope.sites.length; i += 1) {
            isAdd = false;
            for (var j = 0; j < $scope.inSites.length; j += 1) {
                if ($scope.sites[i].provider.providerId === $scope.inSites[j].provider.providerId &&
                    $scope.sites[i].blog.blog_id === $scope.inSites[j].blog.blog_id) {
                    isAdd = true;
                    break;
                }
            }
            if (isAdd === false) {
                $scope.outSites.push($scope.sites[i]);
            }
        }
    }

    function createGroupInfo() {
        var group = null;
        var count = 0;
        var index = 0;

        if ($scope.initGroupInfo === true) {
            group = $scope.inSites;
            count = $scope.inSites.length;
        }
        else {
            if ($scope.groupInfo === null) {
                group = $scope.groups[$scope.groupIndex];
                count = group.group.length;
            }
        }

        if (group !== null) {
            $scope.groupInfo = new Array(count);
            for (var i = 0; i < count; i += 1) {
                $scope.groupInfo[i] = new Array(count);
                for (var j = 0; j < count; j += 1) {
                    if ($scope.initGroupInfo === true) {
                        if (i === j) {
                            $scope.groupInfo[i][j] = {"syncEnable": Type.SYNC_ENABLE.NONE, "postType": Type.POST.NONE};
                        } else {
                            var fromProvider = group[i].provider.providerName;
                            var toProvider = group[j].provider.providerName;
                            $scope.groupInfo[i][j] = {
                                "syncEnable": Type.SYNC_ENABLE.ON,
                                "postType": Data.getPostType(fromProvider, toProvider)
                            };
                        }
                    }
                    else {
                        $scope.groupInfo[i][j] = {
                            "syncEnable": group.groupInfo[index].syncEnable,
                            "postType": group.groupInfo[index].postType
                        };
                    }
                    index += 1;
                }
            }
        }
    }

    function isExistBlogGroup(group, groupIndex) {
        var i, j, k, isExist;

        for (i = 0; i < $scope.groups.length; i += 1) {
            if (i === groupIndex || $scope.groups[i].group.length !== group.length) {
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
                return true;
            }
        }
        return false;
    }

    function registerBlogGroup(group) {
        if ($scope.groupInfo === null) {
            createGroupInfo();
        }

        var i, j;
        var groupInfo = [];
        for (i = 0; i < $scope.groupInfo.length; i += 1) {
            for (j = 0; j < $scope.groupInfo[i].length; j += 1) {
                groupInfo.push($scope.groupInfo[i][j]);
            }
        }

        $scope.groups.push({"group":group, "groupInfo":groupInfo});
        console.log(group);
        $http.post("/blogs/group", {"group":group, "groupInfo":groupInfo})
            .success(function (data) {
                console.log(data);
            })
            .error(function (data) {
                $scope.showAlert(Type.ALERT.DANGER, data);
            });
    }

    function updateBlogGroup(group) {
        if ($scope.detailSetting === false) {
            createGroupInfo();
        }

        var i, j;
        var groupInfo = [];
        for (i = 0; i < $scope.groupInfo.length; i += 1) {
            for (j = 0; j < $scope.groupInfo[i].length; j += 1) {
                groupInfo.push($scope.groupInfo[i][j]);
            }
        }

        $scope.groups[$scope.groupIndex].group = group;
        $scope.groups[$scope.groupIndex].groupInfo = groupInfo;

        $http.put("/blogs/groups",{"groups":$scope.groups})
            .success(function (data) {
                console.log(data);
            })
            .error(function (data) {
                $scope.showAlert(Type.ALERT.DANGER, data);
            });
    }

    function deleteBlogGroup(groupIndex) {
        $scope.groups.splice(groupIndex , 1);

        $http.put("/blogs/groups",{"groups":$scope.groups})
            .success(function (data) {
                console.log(data);
            })
            .error(function (data) {
                $scope.showAlert(Type.ALERT.DANGER, data);
            });
    }

    function showDetailSetting() {
        $scope.detailSetting = true;

        if ($scope.groupInfoType !== Type.GROUP_INFO.POLYGONS) {
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
        var count = $scope.inSites.length;

        for (i = 1; i <= count;i += 1) {
            x = centerX + size * Math.cos(i * 2 * Math.PI / count + Math.PI / 2);
            y = centerY - size * Math.sin(i * 2 * Math.PI / count + Math.PI / 2);
            circles.push(circle(x, y, $scope.inSites[i-1].blog.blog_title));
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

    function hideDetailSetting() {
        $scope.detailSetting = false;

        if ($scope.groupInfoType === Type.GROUP_INFO.POLYGONS) {
            $('#paper').hide();
            graph.clear();
            circles = [];
            links = [];
            selectCircle = null;
        }
    }

    function setArrowheads(element, sourceInfo, targetInfo, selectedMarker) {
        var sourceFill = 'transparent';
        var targetFill = 'transparent';
        var connectionStroke = 'black';

        if (sourceInfo !== null && sourceInfo.syncEnable === Type.SYNC_ENABLE.ON) {
            if (selectedMarker === 'target') {
                sourceFill = 'pink';
            }
            else {
                sourceFill = 'red';
            }
        }
        if (targetInfo !== null && targetInfo.syncEnable === Type.SYNC_ENABLE.ON) {
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
            if (sourceInfo.syncEnable === Type.SYNC_ENABLE.ON) {
                connectionStroke = 'red';
            }
            element.toFront();
        }
        else if (selectedMarker === 'target') {
            if (targetInfo.syncEnable === Type.SYNC_ENABLE.ON) {
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
        if ($scope.groupInfoType !== Type.GROUP_INFO.POLYGONS) {
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
            var count = $scope.inSites.length;
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
                        if (info.syncEnable === Type.SYNC_ENABLE.OFF) {
                            info.syncEnable = Type.SYNC_ENABLE.ON;
                        } else if (info.syncEnable === Type.SYNC_ENABLE.ON) {
                            info.syncEnable = Type.SYNC_ENABLE.OFF;
                        }
                        setArrowheads(link, $scope.groupInfo[j][i], info, 'target');
                    }
                    else {
                        info = $scope.groupInfo[j][i];
                        if (info.syncEnable === Type.SYNC_ENABLE.OFF) {
                            info.syncEnable = Type.SYNC_ENABLE.ON;
                        } else if (info.syncEnable === Type.SYNC_ENABLE.ON) {
                            info.syncEnable = Type.SYNC_ENABLE.OFF;
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
        $('#paper').hide();
    }

    function init() {
        var user = $scope.user;
        if (!user._id) {
            $scope.showAlert(Type.ALERT.WARNING, 'LOC_LOGIN_ERROR');
            return;
        }

        $scope.sites = Site.getSiteList();
        if (!$scope.sites) {
            Site.pullSitesFromServer(function setSites(err, rcvSites) {
                if (err) {
                    $scope.showAlert(Type.ALERT.DANGER, err);
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
                $scope.showAlert(Type.ALERT.DANGER, data);
            });

        initDetailSetting();
    }

    init();
});

bs.controller('blogHistoryCtrl', function ($scope, $http, Data, Type) {
    "use strict";

    $scope.user = Data.getUser();
    $scope.title = "LOC_HISTORY";
    $scope.histories = [];

    var user = $scope.user;

    if (user._id === undefined) {
        $scope.showAlert(Type.ALERT.WARNING, 'LOC_LOGIN_ERROR');
        return;
    }

    $http.get('/blogs/histories')
        .success(function (data) {
            $scope.histories = data.histories;
        })
        .error(function (data) {
            $scope.showAlert(Type.ALERT.DANGER, data);
        });
});

bs.controller('blogCollectFeedbackCtrl', function ($scope, $http, Data, Site, Type, $timeout) {
    "use strict";

    var reqStartNum;
    var reqTotalNum;
    var sites;

    function getPost(providerName, blogID, postID) {
        for (var i = 0; i<$scope.posts.length; i += 1) {
            for (var j=0; j<$scope.posts[i].infos.length; j += 1) {
                var info = $scope.posts[i].infos[j];
                //console.log(info);
                if (info.provider_name === providerName && info.blog_id === blogID &&
                    info.post_id === postID.toString()) {
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
                        $scope.showAlert(Type.ALERT.DANGER, data);
                    });
            }
        }
    }

    $scope.user = Data.getUser();
    $scope.title = 'LOC_COLLECT_FEEDBACK';
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
                $scope.showAlert(Type.ALERT.DANGER, data);
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
                $scope.showAlert(Type.ALERT.DANGER, data);
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
            $scope.showAlert(Type.ALERT.WARNING, 'LOC_LOGIN_ERROR');
            return;
        }

        sites = Site.getSiteList();
        if (!sites) {
            Site.pullSitesFromServer(function setSites(err, rcvSites) {
                if (err) {
                    $scope.showAlert(Type.ALERT.DANGER, err);
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
                $scope.showAlert(Type.ALERT.DANGER, data);
            });
    }

    init();
});

bs.controller('signinCtrl', function ($scope, $http, Data, Site, Type) {
    "use strict";

    $scope.providers = Data.getProviderType();

    function init() {
        $scope.user = Data.getUser();
        if ($scope.user._id) {
            $scope.title = 'LOC_ACCOUNT_LIST';
        }
        else {
            $scope.title = 'LOC_LOGIN_TITLE';
            $scope.showAlert(Type.ALERT.WARNING, 'LOC_LOGIN_ERROR');
            return;
        }

        $scope.sites = Site.getSiteList();
        if (!$scope.sites) {
            Site.pullSitesFromServer(function setSites(err, rcvSites) {
                if (err) {
                    $scope.showAlert(Type.ALERT.DANGER, err);
                }
                $scope.sites = rcvSites;
            });
        }

        $scope.getBlogTitle = function(provider) {
            if (!$scope.sites) {
                return;
            }

            if (provider.providerName !== Type.PROVIDER.WORDPRESS) {
                return;
            }

            for (var i = 0; i < $scope.sites.length; i += 1) {
                if ($scope.sites[i].provider.providerId === provider.providerId) {
                    return "(" + $scope.sites[i].blog.blog_title + ")";
                }
            }
        };
    }

    init();
});
