/**
 * Created by pokers on 15. 3. 22..
 */
/*************************************************************************
 * This is just sample and example.
 * *************************************************************************
 describe('Test the login function on the all providers', function(){
 it('Twitter : allow BlogSync on the twitter to get messages', function(){
 getMainPage();


 var twitter = getProviderByRow(providers.twitter);
 twitter.click();

 // login to twitter
 browser.driver.findElement(by.id('username_or_email')).sendKeys(params.twitter.user);
 browser.driver.findElement(by.id('password')).sendKeys(params.twitter.passwd, protractor.Key.ENTER);

 // sometimes, it requires to click allow buttion.
 //browser.driver.findElement(by.id('allow')).click();

 //browser.driver.findElement(by.id('allow')).click();
 //element(by.id('username_or_email')).sendKeys('pokers11@empal.com');
 //browser.getElementbyId('username_or_email');
 //element(by.id('not-logged-in')).getText();
 //expect(element(by.id('allow')));
 //console.info(browser.getTitle());
 //console.info(element(by.id('allow')).getText());
 });


 // how to get the text on the HTML
 browser.driver.get(this.params.url.main + 'user').then(function(){
            console.log('STEP 1');
            browser.driver.findElement(by.tagName('pre')).then(function(ele){
                console.log('STEP 2');
                ele.getText().then(function(string){
                    console.log('STEP 3');
                    console.log('1. : ' + string);
                    this.userInfo = string;
                });
            });
        });
 });

 // how to use request function
 function getInfo() {
            var defer = protractor.promise.defer();
            request.post('http://www.justwapps.com/user', 'GET', function (error, message) {
                console.log('status Code : ' + message.statusCode);
                console.log('body : ' + message.body);
                defer.fulfill(message);
                return defer.promise;
            });
        }
 var flow = protractor.promise.controlFlow();
 flow.execute(getInfo);

 // how to use the controlFlow
 function getInfo1() {
            var defer = protractor.promise.defer();
            request.post('http://www.justwapps.com/user', 'GET', function (error, message) {
                console.log('status Code : ' + message.statusCode);
                console.log('body : ' + message.body.toString());
                defer.fulfill(message);
            });

            //browser.wait(function(){}, 1000, '');
            return defer.promise;
        }
 function getInfo2(){
            var defer = protractor.promise.defer();
            browser.driver.get('http://www.justwapps.com/user').then(function(){
                console.log('STEP 1');
                browser.driver.findElement(by.tagName('pre')).then(function(ele){
                    console.log('STEP 2');
                    ele.getText().then(function(string){
                        console.log('STEP 3');
                        console.log('1. : ' + string);
                        defer.fulfill(string);
                    });
                });
            });
            return defer.promise;
        }
 var flow = protractor.promise.controlFlow();
 flow.execute(getInfo2);
 flow.execute(getInfo1);
 //getInfo2();
 //getInfo1();

 //get attribute
 var ele = element(by.binding(nameBinding.title));
 ele.getAttribute('class').then(function(name){
    console.log('attr' + name);
 });
 ****************************************************************/
var request = require('request');
var req = require('../../controllers/requestEx.js');
var stringKo = require('../../public/views/strings/ko.json');
var stringEn = require('../../public/views/strings/en.json');

var providers = Object.freeze({
    facebook        : 0,
    google          : 1,
    kakao           : 2,
    tistory         : 3,
    tumbir          : 4,
    twitter         : 5,
    wordpress       : 6,
    maxProviderCount   : 7
});

var pageIndex = Object.freeze({
    main : 0,
    register : 1,
    articles : 2,
    history : 3,
    account : 4,
    nothing : 5
});

var pageRegister = Object.freeze({
    repeterSites : 'site in sites track by $index',
    registerButton : 'button[2]'
});

var pageMyArticles = Object.freeze({

});

var pageHistory = Object.freeze({

});

var pageAccount = Object.freeze({
    repeaterProviders : 'provider in providers',
    repeaterUserProviders : 'provider in user.providers'
});

var pageTwitterElementId = Object.freeze({
    user : 'username_or_email', // input box for username
    passwd : 'password',        // input box for password
    approve : 'allow'            // button to allow blogsync to access twitter
});

var pageWordpressElementId = Object.freeze({
    user : 'username',
    passwd : 'password',
    approve : 'approve'
});

var pageStatus = Object.freeze({
    nothing   : 0,
    login     : 1,
    logout    : 2
});

var userInfo;
var postInfo = '';
var blogCountOnRegistPage = 0;
var blogList = [];
var blogIdList = [];
var registedCount = 0;
var registedBlogs = [];
var postCount = 0;
var stringCur;
var sentBlogs = [];

/***************************************
 * Global function
 ***************************************/
function setCurLang(seo)
{
    "use strict";
    var lang = 'ko'; // temporary
    switch(lang)
    {
        case 'ko':
            stringCur = stringKo;
            break;
        case 'en':
            stringCur = stringEn;
            break;
        default:
            stringCur = stringKo;
            break;
    }
}

function getBlogString(blogName)
{
    var stringBlog;
    switch(blogName) {
        case stringCur.LOC_Wordpress:
            stringBlog = 'wordpress';
            break;

        case stringCur.LOC_tistory:
            stringBlog = 'tistory';
            break;

        case stringCur.LOC_google:
            stringBlog = 'google';
            break;

        case stringCur.LOC_facebook:
            stringBlog = 'facebook';
            break;

        case stringCur.LOC_tumblr:
            stringBlog = 'tumblr';
            break;

        case stringCur.LOC_twitter:
            stringBlog = 'twitter';
            break;

        case stringCur.LOC_kakao:
            stringBlog = 'kakao';
            break;
    }

    return stringBlog;
}

function sendPost(blogName, blogId)
{
    "use strict";
    var url;
    var stringBlogNameEn;
    var user = JSON.parse(userInfo);

    //console.log('blogName : ' + blogName);
    //console.log('id : ' + user._id);
    stringBlogNameEn = getBlogString(blogName);

    //url = 'http://www.justwapps.com/{blogName}/bot_posts/new/{blogID}?userid={userId}';
    url = 'http://www.justwapps.com/' + stringBlogNameEn + '/bot_posts/new/';
    url += blogId;
    url += '?userid=';
    url += user._id;
    var opt = {
        form : {
            title: '',
            modified: '',
            id: '3',
            url: '',
            categories: [],
            tags: [],
            type: 'text'
        }
    };

    //opt.form.modified = '';
    //opt.form.title = 'TEST MESSAGE';
    //opt.form.content = 'TEST CONTENT';

    opt.form.modified = new Date().toISOString();
    opt.form.title = 'TEST[' + stringBlogNameEn + '] - ' + opt.form.modified;
    //opt.form.title = opt.form.modified;
    opt.form.content = stringBlogNameEn +' - Content Date : ' + opt.form.modified;
    //opt.form.content = opt.form.modified;

    console.log('URL : ' + url);
    console.log('title : ' + opt.form.title);

    request.post(url, opt, function (err, response, body) {
        if(err)
        {
            console.log('error : ' + err );
        }
    });

    var sentInfo = {
        name : blogName,
        form : opt.form
    };

    sentBlogs.push(sentInfo);
}

function MakeUrlToGetPost(blogName, blogId, options)
{
    var url;
    var user = JSON.parse(userInfo);
    var stringBlogNameEn = getBlogString(blogName);

    url = stringBlogNameEn + '/bot_posts/';
    url += blogId;


    if (options.post_id) {
        url += "/" + options.post_id;
    }

    url += "?";

    if (options.after) {
        url += "after=" + options.after;
        url += "&";
    }
    if (options.offset) {
        url += "offset="+options.offset;
        url += "&";
    }
    if (options.nextPageToken) {
        url += "nextPageToken="+options.nextPageToken;
        url += "&";
    }

    url += 'userid=' + user._id;
    console.log('## Get post Info URL = ' + url);

    return url;
}

/***************************************
 * Main controller :
 ***************************************/
var mainController = function() {
    this.pageNow = pageIndex.nothing;
    this.params = browser.params;

    this.getMainPage = function(){
        browser.get(this.params.url.main);
        this.pageNow = pageIndex.main;
    };

    this.getSubPageNonAngular = function(url){
        return browser.driver.get(this.params.url.main + url);
    };

    this.getSubPage = function(index){

        switch(index)
        {
            case pageIndex.main:
                element(by.css('.navbar-header')).element(by.css('.navbar-brand')).click();
                break;
            case pageIndex.register:
            case pageIndex.articles:
            case pageIndex.history:
            case pageIndex.account:
                console.log('index : ' + index);
                //element.all(by.css('.nav li')).get(index-1).click();
                element(by.css('.collapse')).$$('li').get(index-1).click();
                break;
        }
        this.pageNow = index;
    };

    this.getElementsByRepeater = function(repeaterName){
        return element.all(by.repeater(repeaterName));
    };

    this.getProvidersList = function (){
        return element.all(by.repeater(pageAccount.repeaterProviders));
    };
    this.getUserProvidersList = function(){
        return element.all(by.repeater(pageAccount.repeaterUserProviders));
    };
    this.getProviderByRow = function (row){
        return this.getProvidersList().get(row);
    };
    this.getUserProviderByRow = function(row){
        return this.getUserProvidersList().get(row);
    };

    this.getMainTitle = function(){
        return browser.getTitle();
    };

    this.findElementById = function(id){
        return browser.driver.findElement(by.id(id));
    };

    this.getUserInfo = function(){
        this.getSubPageNonAngular('user').then(function(){
            browser.driver.findElement(by.tagName('pre')).then(function(ele){
                ele.getText().then(function(string){
                    userInfo = string;
                    console.log('user Info : ' + userInfo);
                });
            });
        });
    };

    this.getPostInfo = function(url){
        this.getSubPageNonAngular(url).then(function(){
            browser.driver.findElement(by.tagName('pre')).then(function(ele){
                ele.getText().then(function(string){
                    postInfo = string;
                    console.log('post Info : ' + postInfo);
                });
            });
        });
    };
};

/************************************
 * Test Object for twitter
 ***********************************/
var testObject = function() {
    this.mainCtrl = new mainController();
    this.status = pageStatus.nothing;
    this.params = browser.params;

    this.testConnectMainpage = function(){
        setCurLang();

        console.log('Title : ' + stringCur.LOC_TITLE);
        this.mainCtrl.getMainPage();
        expect(this.mainCtrl.getMainTitle()).toEqual(stringCur.LOC_TITLE);
    };

    this.testClickSignin = function(){
        console.log('current page : ' + this.mainCtrl.pageNow);
        if(this.mainCtrl.pageNow === pageIndex.nothing) {
            this.mainCtrl.getMainPage();
        }

        this.mainCtrl.getSubPage(pageIndex.account);
        if(this.status === pageStatus.login)
        {
            expect(element(by.css('.content-title')).element(by.css('.page-header')).getText()).toEqual(stringCur.LOC_ACCOUNT_LIST);
        }
        else
        {
            expect(element(by.css('.content-title')).element(by.css('.page-header')).getText()).toEqual(stringCur.LOC_LOGIN_TITLE);
            this.status = pageStatus.login;
        }
    };

    this.testCheckProviders = function(){
        console.log('expected count : ' + providers.maxProviderCount);

        if(this.mainCtrl.pageNow !== pageIndex.account) {
            this.testClickSignin();
        }

        expect(this.mainCtrl.getProvidersList().count()).toEqual(providers.maxProviderCount);
    };

    this.TwitterLogin = function(){
        this.mainCtrl.findElementById(pageTwitterElementId.user).sendKeys(this.params.twitter.user);
        this.mainCtrl.findElementById(pageTwitterElementId.passwd).sendKeys(this.params.twitter.passwd, protractor.Key.ENTER);

        // Until apr 4, 2015, it had to click allow button, but these days, it's not necessary to click it.
        //this.mainCtrl.findElementById(by.id('allow')).click();
    };

    this.WordpressLogin = function(){
        this.mainCtrl.findElementById(pageWordpressElementId.user).sendKeys(this.params.wordpress.user);
        this.mainCtrl.findElementById(pageWordpressElementId.passwd).sendKeys(this.params.wordpress.passwd, protractor.Key.ENTER);

        this.mainCtrl.findElementById(pageWordpressElementId.approve).click();
    };

    this.testHomeTitle = function() {
        expect(element(by.css('.text-center')).element(by.css('.lead')).getText()).toEqual(stringCur.LOC_HOME_MESSAGE);
    };

    this.testLoginProvider = function(providerIndex){
        if(this.mainCtrl.pageNow !== pageIndex.account) {
            this.testClickSignin();
        }
        this.mainCtrl.getProviderByRow(providerIndex).click();
        switch(providerIndex) {
            case providers.twitter:
                this.TwitterLogin();
                break;

            case providers.wordpress:
                this.WordpressLogin();
                break;

            default:
                console.log('not yet : ' + providerIndex);
                break;
        }
    };

    this.testBlogLogedIn = function(blogName){
        var stringBlog;
        switch(blogName)
        {
            case 'twitter':
                stringBlog = stringCur.LOC_twitter;
                break;
            case 'wordpress':
                stringBlog = stringCur.LOC_Wordpress;
                break;
            default:
                stringBlog ='none';
                break;
        }
        expect(this.mainCtrl.getUserProviderByRow(0).getText()).toEqual('  ' + stringBlog + ' : ' +this.params.twitter.nickname);
    };

    this.testNicknameOnMain = function(){
        this.mainCtrl.getSubPage(pageIndex.main);
        this.testHomeTitle();
    };

    this.testUserGroups = function(){
        this.mainCtrl.getSubPage(pageIndex.register);
        expect(element(by.css('.page-header')).getText()).toEqual(stringCur.LOC_BLOG_GROUPS);
    };

    this.testCountOfArticles = function(count){
        this.mainCtrl.getSubPage(pageIndex.articles);

        expect(element(by.css('.content-title')).element(by.css('.page-header')).getText()).toEqual(stringCur.LOC_COLLECT_FEEDBACK);
        expect(element(by.css('.lead')).getText()).toEqual(stringCur.LOC_POST_COUNT + ' : ' + count);
    };

    this.testGetCountOfArticles = function(){
        this.mainCtrl.getSubPage(pageIndex.articles);

        element(by.css('.lead')).getText().then(function(string){
            var stringArray = string.split(':');
            postCount = new Number(stringArray[1].trim());
            console.log('get count : ' + stringArray[1]);
            console.log('Article count : %d', postCount);
        });
    };

    this.testGetUserInfo = function(){
        this.mainCtrl.getUserInfo();
        this.mainCtrl.getMainPage();
    };

    this.testGetBlogCount = function (blogs) {
        blogs.count().then(function (count) {
            console.log('blog count :' + count);
            blogCountOnRegistPage = count;
        });
    };

    this.testSetRegistBlogs = function(toBeRegisted){
        var blogs = this.mainCtrl.getElementsByRepeater(pageRegister.repeterSites);

        blogs.count().then(function(count){
            blogCountOnRegistPage = count;

            if(count <= 0)
            {
                console.log('What\'s wrong???');
                return;
            }
            registedBlogs = [];
            blogList = [];
            blogIdList = [];
            registedCount = 0;

            console.log('list count : ' + toBeRegisted.length);
            console.log('blog count : ' + count);
            for(var idx = 0 ; idx < count ; idx++)
            {
                (function(idx) {
                    blogs.get(idx).getText().then(function (string) {
                        (function (str, index, ele) {
                            //console.log('To find blog name : ' + str);
                            blogList.push(str);
                            for (var i = 0; i < toBeRegisted.length; i++) {
                                console.log('org : ' + toBeRegisted[i]);
                                if (str.indexOf(toBeRegisted[i]) !== -1) {
                                    console.log('regist blog[' + index + ']:' + str);
                                    registedCount++;
                                    registedBlogs.push(str);
                                    ele.click();
                                }
                            }
                        })(string, idx, blogs.get(idx));
                    });

                    blogs.get(idx).element(by.css('.icon-blog')).getAttribute('id').then(function(idString){
                        (function(id){
                            console.log('--> id : ' + id);
                            blogIdList.push(id);
                        })(idString);
                    });
                })(idx);
            }
        });
    };

    this.testSetRegist = function() {
        if (registedCount > 1) {
            this.mainCtrl.getSubPage(pageIndex.register);

            var btnElement = element(by.binding(pageRegister.registerButton));
            expect(btnElement.getText()).toEqual(stringCur.LOC_REGISTER);
            btnElement.click();

        }
    };

    this.testSendPost =  function(blogName){
        var blogId;
        //console.log('registed list count : ' + registedBlogs.length);

        for(var idx = 0 ; idx < registedBlogs.length ; idx++)
        {
            if(registedBlogs[idx].indexOf(blogName) !== -1)
            {
                blogId = blogIdList[idx];
                console.log('found blog ID : ' + blogId);
                break;
            }
        }

        if(idx < registedBlogs.length)
        {
            sendPost(blogName, blogId);
        }

    };

    this.testCheckNewPost = function(blogName){
        var blogId;

        for(var idx = 0 ; idx < registedBlogs.length ; idx++)
        {
            if(registedBlogs[idx].indexOf(blogName) !== -1)
            {
                blogId = blogIdList[idx];
                console.log('check new post : blogId = ' + blogId);
                break;
            }
        }

        for(var i = 0 ; i < sentBlogs.length ; i++)
        {
            if(sentBlogs[i].name === blogName)
            {
                console.log('check new post : blog name = ' + sentBlogs[i].name);
                break;
            }
        }

        if(i < sentBlogs.length)
        {
            var url = MakeUrlToGetPost(blogName, blogId, {"after": sentBlogs[i].form.modified});
            this.mainCtrl.getPostInfo(url);
        }
    };
};

describe('Test web page on the BlogSync : ', function(){

    var ptor;
    beforeEach(function (){
        //ptor = protractor.getInstance();
        //browser.get('http://www.justwapps.com/');
    });

    describe('Check the functions of the BlogSync', function() {
        var testObj = new testObject();

        it('check title on the index page', function () {
            testObj.testConnectMainpage();
        });

        it('check login page', function () {
            testObj.testClickSignin();
            testObj.testCheckProviders();
        });

        describe('Check login with Twitter', function() {
            it('login Twitter', function () {
                testObj.testLoginProvider(providers.twitter);
            });

            it('check Nickname', function () {
                testObj.testHomeTitle();
            });

            it('check login status', function () {
                testObj.testClickSignin();
                testObj.testBlogLogedIn('twitter');
            });

            it('check main page again', function () {
                testObj.testNicknameOnMain();
            });
        });

        describe('Check login with Wordpress', function(){
            it('login Wordpress', function(){
                testObj.testLoginProvider(providers.wordpress);
            });
        });

        it('check register page', function () {
            testObj.testUserGroups();
        });

        it('get count of articles', function(){
            testObj.testGetCountOfArticles();
        });

        it('check count of my articles', function () {
            testObj.testCountOfArticles(postCount);
        });

        it('get user information to be used posting article', function () {
            testObj.testGetUserInfo();
        });

        describe('Check registing and get info on the regist page', function () {
            it('set blogs to be registed', function(){
                testObj.testUserGroups();
                var toBeRegisted = [];
                toBeRegisted.push(stringCur.LOC_twitter);
                toBeRegisted.push(stringCur.LOC_Wordpress);
                testObj.testSetRegistBlogs(toBeRegisted);
            });

            it('regist blogs', function(){
                testObj.testSetRegist();
            });
        });

        it('post simple article to twitter', function(){
            testObj.testSendPost(stringCur.LOC_twitter);
        });

        it('post simple article to wordpress', function(){
            testObj.testSendPost(stringCur.LOC_Wordpress);
        });

        it('check twitter post Info', function(){
            browser.wait(function(){
                testObj.testCheckNewPost(stringCur.LOC_twitter);

                if(postInfo.match('Content Date :'))
                {
                    console.log('Found post !!!');
                    postInfo = '';
                    return true;
                }
            }, 6* 10*1000);
        });

        it('get wordpress post Info', function(){
            browser.wait(function(){
                testObj.testCheckNewPost(stringCur.LOC_Wordpress);

                if(postInfo.match('Content Date :'))
                {
                    console.log('Found post !!!');
                    postInfo = '';
                    return true;
                }
            }, 6* 10*1000);
        });
        //it('check count of my articles', function () {
        //    testObj.testCountOfArticles(1);
        //});
    });

    //it('pause', function(){
    //    browser.pause();
    //})

});
