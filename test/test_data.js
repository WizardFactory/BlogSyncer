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
        categories: [{'id':1, 'name':"development"}, {'id':2, 'name':"company"}],
        postCount: 3
    },

    testBlog2: {
        blog_id: "777373",
        blog_title: "wzdfac",
        blog_url: "www.wzdfac22.com",
        categories: [{'id':2, 'name':"company"}],
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
    testConvertPlainTextPost1Result: 'tumblr photo posting test !',
    testTextPost2: {
        id: '342',
        content: '<p class=\"p1\"><span class=\"s1\"><a href=\"http://d3js.org/\">d3js.org</a></span><span class=\"s2\"> example 중에 <a href=\"http://bl.ocks.org/Caged/6476579\"><span class=\"s3\">&#8220;Using d3-tip to add tooltips to a d3 bar bart&#8221;</span></a>를 분석하였다.</span></p>\n<p class=\"p2\"><span class=\"s1\">아래 분석은 &#8220;<a href=\"http://bost.ocks.org/mike/bar/\">Let&#8217;s Make a Bar Chart, Part 1 2 3</a>&#8220;내용을 참조하였다.</span></p>\n<p class=\"p2\"><span class=\"s1\">example 예제에서 꾸미는 CSS나 속성은 모두 제외하고 데이타가 있을 때 어떻게 bar chart를 만들 것인가 순으로 분석하였다.</span></p>\n<h2 class=\"p3\"><span class=\"s1\">Step 1- Loading an external data file in tab-separated values(TSV) format</span></h2>\n<p class=\"p2\"><script src=\"https://gist.github.com/kimalec/343db480040cede571b8.js\"></script></p>\n<p class=\"p2\"><span class=\"s1\">d3.tsv를 사용하여 데이터를 읽어오고, div tag기준으로 분류하였다. 또한 div의 width를 달리하여 값에 따라 차이가 나도록 하였다.</span></p>\n<p class=\"p2\"><a href=\"https://wizardfactory.files.wordpress.com/2015/05/ec8aa4ed81aceba6b0ec83b7-2015-05-04-16-15-07.png\"><img class=\"alignnone size-large wp-image-345\" src=\"https://wizardfactory.files.wordpress.com/2015/05/ec8aa4ed81aceba6b0ec83b7-2015-05-04-16-15-07.png?w=1024&#038;h=678\" alt=\"스크린샷 2015-05-04 16.15.07\"   /></a></p>\n<p class=\"p2\">위의 결과는 html으로 아래와 같이 된다.</p>\n<p class=\"p2\"><a href=\"https://gist.github.com/kimalec/3f0fe8dfa015c9cc2ab8/bfcf2e44ddbcccb53fadceb054f66e475f7c0f4a\" rel=\"nofollow\">https://gist.github.com/kimalec/3f0fe8dfa015c9cc2ab8/bfcf2e44ddbcccb53fadceb054f66e475f7c0f4a</a></p>\n<h2 class=\"p2\">Step 2 &#8211; Bar chart using SVG</h2>\n<p class=\"p2\"><script src=\"https://gist.github.com/kimalec/d769a03177752f5235ec.js\"></script></p>\n<p class=\"p2\">d3.select와 append를 사용하여 svg를 dom에 추가하고, selectAll.data를 사용하여 rect 객체를 추가 한다.</p>\n<p class=\"p2\">scale.ordinal은 공평하게 분류할때 사용한다. 주어진 0~width에서 domain에 들어온 갯수만큼 나누어서 x(d)에 의해서 x값을 주고, x.rangeBand()로 동일한 넓이를 받는다.</p>\n<p class=\"p2\">scale.linear는 주어진 범위와 domain으로 들어온 최대값을 매핑해서 그 값에 맞는 상대값을 계산하여 반환한다.</p>\n<p class=\"p2\">아래와 같은 결과가 나오게 된다.</p>\n<p class=\"p2\"><a href=\"https://wizardfactory.files.wordpress.com/2015/05/ec8aa4ed81aceba6b0ec83b7-2015-05-04-16-51-31.png\"><img class=\"alignnone wp-image-351 size-full\" src=\"https://wizardfactory.files.wordpress.com/2015/05/ec8aa4ed81aceba6b0ec83b7-2015-05-04-16-51-31.png?w=650&#038;h=500\" alt=\"스크린샷 2015-05-04 16.51.31\" width=\"650\" height=\"500\" /></a></p>\n<p class=\"p2\">\n<p class=\"p2\">위의 결과는 html으로 아래와 같이 된다.</p>\n<p class=\"p2\"><a href=\"https://gist.github.com/kimalec/3f0fe8dfa015c9cc2ab8/e55f26e60acfef717c89063e5954850100285609\" rel=\"nofollow\">https://gist.github.com/kimalec/3f0fe8dfa015c9cc2ab8/e55f26e60acfef717c89063e5954850100285609</a></p>\n<h2 class=\"p2\">Step 3 &#8211; Adding Axes</h2>\n<p class=\"p2\"><script src=\"https://gist.github.com/kimalec/ed353c98faf5ae3264c9.js\"></script></p>\n<p class=\"p2\">x,y축을 그리기 위해서 left, bottom에 margin를 넣어야 한다. 실제 예제에서는 top, right 모두 들어가지만 내용의 이해를 돕기 위해서 left, bottom만 넣었다.</p>\n<p class=\"p2\">svg를 640&#215;480 전체 사이즈를 가지고, scaler들의 최대값을 margin를 뺀 값으로 변경하고, chart라는 object가 left로 translate left해서 실제 그리는 영역으로 사용했다.</p>\n<p class=\"p2\">d3에서는 축을 그리는 위해서 axis라는 api를 제공한다. 그 중에 orient는 axis(축)을 어디에 둘 것인가 지정하는 것이지만 내부적으로 tick를 그릴때 참고하는 것이지 실제 위치를 찾아주는 것이 아니므로 위치는 직접 잡아주어야 한다.</p>\n<p class=\"p2\">y축이 헷갈릴 수 있는데, 이유가 값이 일반적으로 우리가 배운 반대인 가장 위가 좌표상으로 0이고, 가장 아래가 가장 크므로 반대로 생각해야 한다.</p>\n<p class=\"p2\"><a href=\"https://wizardfactory.files.wordpress.com/2015/05/ec8aa4ed81aceba6b0ec83b7-2015-05-04-17-04-28.png\"><img class=\"alignnone size-full wp-image-352\" src=\"https://wizardfactory.files.wordpress.com/2015/05/ec8aa4ed81aceba6b0ec83b7-2015-05-04-17-04-28.png?w=654&#038;h=476\" alt=\"스크린샷 2015-05-04 17.04.28\" width=\"654\" height=\"476\" /></a></p>\n<p class=\"p2\">위의 결과는 html으로 아래와 같이 된다.</p>\n<p class=\"p2\"><a href=\"https://gist.github.com/kimalec/3f0fe8dfa015c9cc2ab8/2c3f54a1a8969a0ac23d7a111df57f14fde4f632\" rel=\"nofollow\">https://gist.github.com/kimalec/3f0fe8dfa015c9cc2ab8/2c3f54a1a8969a0ac23d7a111df57f14fde4f632</a></p>\n<p class=\"p2\">html tag를 보면, tick이라는 group에 line과 text element가 추가된 것을 볼 수 있다. path, line, text를 axis가 넣어주는 것이다.</p>\n<h2 class=\"p2\">Step 4 &#8211; Add tooltips to a d3 bar chart</h2>\n<p class=\"p2\"><script src=\"https://gist.github.com/kimalec/a03eb1a05f602c14e16d.js\"></script></p>\n<p class=\"p2\"><a href=\"https://github.com/caged/d3-tip\">d3-tip</a>은 추가로 lib가 필요로 한다.</p>\n<p class=\"p2\">사용법은 간단하다.</p>\n<p class=\"p2\">d3.tip이라는 api로 tip를 생성해서 연결하고자 하는 selector에서 call 하면 된다.</p>\n<p class=\"p2\">그리고 실제 적용해야 하는 rect object의 mouse event에 연결하면 끝난다.</p>\n<p class=\"p2\">해보면 각 rect에 event를 붙이고 나서 axes를 추가하면 정상적으로 svg element에 추가 되지 않는데 정확한 이유는 모르겠음.</p>\n<p class=\"p2\"><a href=\"https://wizardfactory.files.wordpress.com/2015/05/ec8aa4ed81aceba6b0ec83b7-2015-05-04-17-15-29.png\"><img class=\"alignnone size-full wp-image-353\" src=\"https://wizardfactory.files.wordpress.com/2015/05/ec8aa4ed81aceba6b0ec83b7-2015-05-04-17-15-29.png?w=650&#038;h=484\" alt=\"스크린샷 2015-05-04 17.15.29\" width=\"650\" height=\"484\" /></a></p>\n<p class=\"p2\">위의 결과는 html으로 아래와 같이 된다.</p>\n<p class=\"p2\"><a href=\"https://gist.github.com/kimalec/3f0fe8dfa015c9cc2ab8\" rel=\"nofollow\">https://gist.github.com/kimalec/3f0fe8dfa015c9cc2ab8</a></p>\n<p class=\"p2\">위의 full code는 https://github.com/kimalec/d3barchart에 올려두었으니 참고바랍니다.</p>\n<p class=\"p2\">참고<br />\n<a href=\"http://bost.ocks.org/mike/bar/\" rel=\"nofollow\">http://bost.ocks.org/mike/bar/</a><br />\n<a href=\"https://github.com/caged/d3-tip\" rel=\"nofollow\">https://github.com/caged/d3-tip</a></p>\n<p class=\"p2\">\n<p class=\"p2\">\n<p class=\"p2\">\n","excerpt": "<p>d3js.org example 중에 &#8220;Using d3-tip to add tooltips to a d3 bar bart&#8221;를 분석하였다. 아래 분석은 &#8220;Let&#8217;s Make a Bar Chart, Part 1 2 3&#8220;내용을 참조하였다. example 예제에서 꾸미는 CSS나 속성은 모두 제외하고 데이타가 있을 때 어떻게 bar chart를 만들 것인가 순으로 분석하였다. Step 1- Loading an external data file in tab-separated values(TSV) format d3.tsv를 [&hellip;]</p>\n',
        modified: d,
        post_url: 'https://wizardfactory.wordpress.com/2015/05/04/%eb%b6%84%ec%84%9d-d3-js-bar-chart-with-tooltips/',
        title: '분석 : d3.js bar chart with tooltips',
        categories: ['development'],
        tags: ['node.js', 'javascript', 'web', 'ionic'],
        replies: [{'notes': 99}]
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
    convertPlainTextOfLink : 'https://docs.angularjs.org/tutorial/step_02In Angular, theviewis a projection of the model through the HTMLtemplate . This means that whenever the model changes, Angu…',

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
    convertTextResultOfPhoto: '<figure><img src="http://s.wsj.net/public/resources/images/BN-IG731_Americ_G_20150505224714.jpg" style="max-width: 100%;"><br><img src="http://si.wsj.net/public/resources/images/BN-IF969_0506pt_G_20150504172642.jpg" style="max-width: 100%;"><br><img src="http://si.wsj.net/public/resources/images/PJ-CB508_PTECHc_G_20150505130613.jpg" style="max-width: 100%;"><br><figcaption><div class="insetContent"><h3 class="first"> <a href="#"> More In 우버</a></h3><ul><li></li><a href="http://kr.wsj.com/posts/2015/05/06/%ed%98%b8%ec%a3%bc-%eb%8f…%94-%eb%ad%94%ea%b0%80-%ed%8a%b9%eb%b3%84%ed%95%98%eb%8b%a4/">호주 도미노 피자는 뭔가 특별하다</a></li></ul></div></figcaption></figure>',
    convertPlainTextResultOfPhoto: 'http://is.gd/N5CgDW http://is.gd/N5CgDW http://is.gd/N5CgDW More In 우버호주 도미노 피자는 뭔가 특별하다',
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
    testShortenUrl: 'http://is.gd/N5CgDW',
    testNewLineString: 'kakao story line change test 20:40\nl\ni\nn\ne\n(Sticker) \n(Sticker) \n',
    testBreakString: 'kakao story line change test 20:40<br>l<br>i<br>n<br>e<br>(Sticker) <br>(Sticker) <br>'
};

module.exports = testData;
