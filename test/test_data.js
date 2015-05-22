/**
 * Created by aleckim on 2015. 5. 13..
 */

var d = new Date();
var testData = {
    testProvider1: {
        providerName: "tumblr",
        providerId: "1234",
        token: "231345",
        tokenSecret: "3kd9e8",
        displayName: "ttman"
    },

    testProvider2: {
        providerName: "google",
        providerId: "3373",
        accessToken: "xxxdfd",
        refreshToken: "xxddsdf",
        displayName: "ggman"
    },

    testBlog1: {
        blog_id: "33377",
        blog_title: "wizard",
        blog_url: "www.wzdfac.com",
        postCount: 3
    },

    testBlog2: {
        blog_id: "777373",
        blog_title: "wzdfac",
        blog_url: "www.wzdfac22.com",
        postCount: 4
    },

    testTextPost1: {
        id: '77998',
        content: '<figure><img alt="tumblr photo posting test !" src="http://36.media.tumblr.com/3f48c762c7f776f293870a51873b2b61/tumblr_nnz0scBvrM1uus28go1_250.jpg"><figcaption>tumblr photo posting test !</figcaption></figure>',
        modified: d,
        post_url: 'http://test.text.post1',
        title: 'tumblr photo posting test',
        categories: ['development'],
        tags: ['node.js', 'javascript', 'web', 'ionic'],
        replies: [{'notes': 7}]
    },

    testLinkPost1: {
        id: '3333333',
        url: 'https://docs.angularjs.org/tutorial/step_02',
        modified: d,
        post_url: 'http://test.link.post1',
        title: '2-Angular Templates',
        description: '<p class="ng-scope">In Angular, the<strong>view</strong>is a projection of the model through the HTML<strong>template </strong>. This means that whenever the model changes, Angu…</p>',
        categories: ['development'],
        tags: ['angular.js', 'javascript', 'web', 'ionic'],
        replies: [{'notes': 3}]
    },

    convertTextResultOfLink : '<a href="' + 'https://docs.angularjs.org/tutorial/step_02' + '">' + 'https://docs.angularjs.org/tutorial/step_02' +'</a><p>' +
           '<p class="ng-scope">In Angular, the<strong>view</strong>is a projection of the model through the HTML<strong>template </strong>. This means that whenever the model changes, Angu…</p>'+'</p>',

    testPhotoPost1: {
        id: '32332',
        urls: ['http://s.wsj.net/public/resources/images/BN-IG731_Americ_G_20150505224714.jpg',
            'http://si.wsj.net/public/resources/images/BN-IF969_0506pt_G_20150504172642.jpg',
            'http://si.wsj.net/public/resources/images/PJ-CB508_PTECHc_G_20150505130613.jpg'],
        modified: d,
        post_url: 'http://test.photo.post1',
        type: 'photo',
        title: 'Everything is to be UBER',
        description: '<div class="insetContent"><h3 class="first"> <a href="#"> More In 우버</a></h3><ul><li></li><a href="http://kr.wsj.com/posts/2015/05/06/%ed%98%b8%ec%a3%bc-%eb%8f…%94-%eb%ad%94%ea%b0%80-%ed%8a%b9%eb%b3%84%ed%95%98%eb%8b%a4/">호주 도미노 피자는 뭔가 특별하다</a></li></ul></div>',
        categories: ['service'],
        tags: ['service', 'UBER', 'startup'],
        replies: [{'notes': 33}]
    },

    convertTextResultOfPhoto: '<figure><img src="http://s.wsj.net/public/resources/images/BN-IG731_Americ_G_20150505224714.jpg"><br><img src="http://si.wsj.net/public/resources/images/BN-IF969_0506pt_G_20150504172642.jpg"><br><img src="http://si.wsj.net/public/resources/images/PJ-CB508_PTECHc_G_20150505130613.jpg"><br><figcaption><div class="insetContent"><h3 class="first"> <a href="#"> More In 우버</a></h3><ul><li></li><a href="http://kr.wsj.com/posts/2015/05/06/%ed%98%b8%ec%a3%bc-%eb%8f…%94-%eb%ad%94%ea%b0%80-%ed%8a%b9%eb%b3%84%ed%95%98%eb%8b%a4/">호주 도미노 피자는 뭔가 특별하다</a></li></ul></div></figcaption></figure>',
    TEST_PHOTO_POST_TITLE_BY_DESC: 'More In 우버호주 도미노 피자는 뭔가 특별하다',
    TEST_PHOTO_POST_TITLE_BY_DATE: 'photo at '+ d.toString(),

    testAudioPost1: {
        id: '235464',
        audio_url: "https://api.soundcloud.com/tracks/136318169/stream?client_id=3cQaPshpEeLqMsNFAUw1Q",
        audio_source_url: "http://soundcloud.com/putitbackon88/snsd-mr-mr-4th-mini-album",
        embed: "<iframe src=\"https://w.soundcloud.com/player/?url=https%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F136318169&amp;visual=true&amp;liking=false&amp;sharing=false&amp;auto_play=false&amp;show_comments=false&amp;continuous_play=false&amp;origin=tumblr\" frameborder=\"0\" allowtransparency=\"true\" class=\"soundcloud_audio_player\" width=\"500\" height=\"500\"></iframe>",
        modified: d,
        post_url: 'http://test.audio.post1',
        type: 'audio',
        title: 'tumblr audio link posting test',
        description: '<div class="post_body"><p>tumblr audio link posting test 임.<br></p></div>',
        categories: [],
        tags: [],
        replies: []
    },

    convertTextResultOfAudio: "<figure><iframe src=\"https://w.soundcloud.com/player/?url=https%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F136318169&amp;visual=true&amp;liking=false&amp;sharing=false&amp;auto_play=false&amp;show_comments=false&amp;continuous_play=false&amp;origin=tumblr\" frameborder=\"0\" allowtransparency=\"true\" class=\"soundcloud_audio_player\" width=\"500\" height=\"500\"></iframe><figcaption><div class=\"post_body\"><p>tumblr audio link posting test 임.<br></p></div></figcaption></figure>",

    testAudioPost2: {
        id: '118853240069',
        audio_url: "https://www.tumblr.com/audio_file/wzdpage/118853240069/tumblr_noa886IDiy1uus28g",
        audio_source_url: "https://www.tumblr.com/audio_file/wzdpage/118853240069/tumblr_noa886IDiy1uus28g",
        embed: "<iframe class=\"tumblr_audio_player tumblr_audio_player_118853240069\" src=\"http://wzdpage.tumblr.com/post/118853240069/audio_player_iframe/wzdpage/tumblr_noa886IDiy1uus28g?audio_file=https%3A%2F%2Fwww.tumblr.com%2Faudio_file%2Fwzdpage%2F118853240069%2Ftumblr_noa886IDiy1uus28g\" frameborder=\"0\" allowtransparency=\"true\" scrolling=\"no\" width=\"500\" height=\"169\"></iframe>",
        modified: d,
        post_url: "http://wzdpage.tumblr.com/post/118853240069/tumblr-audio-upload-posting-test",
        type: 'audio',
        title: 'tumblr audio upload posting test',
        description: '<div class="post_body"><p>tumblr audio upload posting test!!.<br></p></div>',
        categories: [],
        tags: [],
        replies: []
    },

    testVideoPost1: {
        id: '1431502088',
        video_url: '',
        embed_code:"<iframe src=\"https://player.vimeo.com/video/127051771?title=0&byline=0&portrait=0\" width=\"500\" height=\"281\" frameborder=\"0\" title=\"God View\" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>",
        modified: d,
        post_url: 'http://test.video.post1',
        type: 'video',
        title: 'tumblr vimeo video link posting test',
        description: '<div><p>tumblr vimeo video link posting test<br></p></div>',
        categories: ['life'],
        tags: [],
        replies: [{'notes': 33}]
    },

    convertTextResultOfVideo: "<figure><iframe src=\"https://player.vimeo.com/video/127051771?title=0&byline=0&portrait=0\" width=\"500\" height=\"281\" frameborder=\"0\" title=\"God View\" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe><figcaption><div><p>tumblr vimeo video link posting test<br></p></div></figcaption></figure>",

    testVideoPost2: {
        id: '1431502088',
        video_url: "https://vt.tumblr.com/tumblr_noa8nyfMuf1uus28g_720.mp4",
        embed_code: "\n<video  id='embed-55531ea229631638230311' class='crt-video crt-skin-default' width='500' height='281' poster='https://31.media.tumblr.com/tumblr_noa8nyfMuf1uus28g_frame1.jpg' preload='none' data-crt-video data-crt-options='{\"duration\":4,\"hdUrl\":\"https:\\/\\/api.tumblr.com\\/video_file\\/118853518895\\/tumblr_noa8nyfMuf1uus28g\\/720\",\"filmstrip\":{\"url\":\"https:\\/\\/33.media.tumblr.com\\/previews\\/tumblr_noa8nyfMuf1uus28g_filmstrip.jpg\",\"width\":\"200\",\"height\":\"112\"}}' >\n    <source src=\"https://api.tumblr.com/video_file/118853518895/tumblr_noa8nyfMuf1uus28g/480\" type=\"video/mp4\">\n</video>\n",
        modified: d,
        post_url: 'http://test.video.post1',
        type: 'video',
        title: 'tumblr video upload posting test',
        description: '<div><p>tumblr vimeo video upload posting test<br></p></div>',
        categories: ['life'],
        tags: [],
        replies: [{'notes': 33}]
    },

    testHistory: {
        tryTime: d,
        status: "200",
        src: {
            title: "XXXXX", id: "ASDFED", url: "DJDJDJD"
        },
        dst: {
            id: "DFCddd", url: "e83ed0"
        }
    },

    testPostInfo: {
        title: "wwwwddd",
        type: "text",
        categories: ["aaa", "bbbb"],
        tags: ["xxx"],
        infos: [
            {
                provider_name: "SDSDFDS",
                blog_id: "wesdsfe",
                post_id: "2333243",
                url: "wzd.fac.com",
                modified: d
            }
        ]
    },
    testComment: {
        date: d,
        URL: 'http://test.comment.list',
        content: 'hahaha'
    },
    testCommentList: {
        providerName: "google",
        blogID: "3384",
        postID: "7752"
    },
    testNewLineString: 'kakao story line change test 20:40\nl\ni\nn\ne\n(Sticker) \n(Sticker) \n',
    testBreakString: 'kakao story line change test 20:40<br>l<br>i<br>n<br>e<br>(Sticker) <br>(Sticker) <br>'
};

module.exports = testData;
