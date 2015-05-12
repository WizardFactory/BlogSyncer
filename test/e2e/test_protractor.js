/**
 * Created by pokers on 15. 3. 22..
 */
/*************************************************************************
 * This is just sample and example.
 * *************************************************************************
 describe('Test the login function on the all providers', function(){
 it('Twitter : allow BlogSync on the twitter to get messages', function(){
 getMainPage();
 getSubPageByName('signstat');

 var twitter = getProviderByRow(providers.twitter);
 twitter.click();

 // login to twitter
 browser.driver.findElement(by.id('username_or_email')).sendKeys(params.twitter.user);
 browser.driver.findElement(by.id('password')).sendKeys(params.twitter.passwd, protractor.Key.ENTER);

 // sometimes, it requires to click allow buttion.
 //browser.driver.findElement(by.id('allow')).click();

 getSubPageByCss(subPages.register);

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
 ****************************************************************/
var request = require('request');

var providers = Object.freeze({
    wordpress       : 0,
    tiStory         : 1,
    google          : 2,
    facebook        : 3,
    tumbir          : 4,
    twitter         : 5,
    kakao           : 6,
    maxProviderCount   : 7
});

var pageIndex = Object.freeze({
    pageMain : 0,
    pageRegister : 1,
    pageArticles : 2,
    pageHistory : 3,
    pageAccount : 4,
    pageNothing : 5
});

var cssSubPages = Object.freeze({
    main : '[ng-click=' + '"menu =' + " 'home'" + '; isCollapsed = true"]',
    register :'[ng-click=' + '"menu =' + " 'blogRegister'" + '"]',
    myArticles : '[ng-click=' + '"menu =' + " 'blogCollectFeedback'" + '"]',
    history : '[ng-click=' + '"menu =' + " 'blogHistorySync'" + '"]' ,
    myAccount : '[ng-click=' + '"menu =' + " 'signin'" + '"]'
});

var nameSubPages = Object.freeze({
    signin : 'signstat'
});

var nameBinding = Object.freeze({
    title : 'title',
    signin : 'signstat',
    user : 'user',
    userName : 'username',
    message : 'message',
    histories : 'histories',
    posts : 'posts',
    registerButton1 : 'button[1]'
});

var pageObjectString = Object.freeze({
    myArticlesTitle : 'Collect Feedback'
});

var pageMain = Object.freeze({
    title : 'Invisible automation service BlogSyncer',
    mainString : '의 블로그 글들을 동기화 시킵니다.'
});

var pageRegister = Object.freeze({
    title : 'Your blog groups',
    repeterSites : 'site in sites track by $index',
    registerCreate : 'Create'
});

var pageMyArticles = Object.freeze({
    title : 'Collect Feedback',
    repeaterArticles : 'post in posts'
});

var pageHistory = Object.freeze({

});

var pageAccount = Object.freeze({
    title : 'Your accounts',
    signinTitle : 'Please sign in',
    repeaterProviders : 'provider in providers',
    repeaterUserProviders : 'provider in user.providers'
});

var pageTwitterElementId = Object.freeze({
    user : 'username_or_email', // input box for username
    passwd : 'password',        // input box for password
    allow : 'allow'            // button to allow blogsync to access twitter
});

var pageStatus = Object.freeze({
    nothing   : 0,
    login     : 1,
    logout    : 2
});

var testString = Object.freeze({
    twitter : 'TEST : twitter - ',
});

var userInfo;
var blogCountOnRegistPage = 0;
var blogList = [];
var registedCount = 0;
var registedBlogs = [];

/***************************************
 * Global function
 ***************************************/
function sendPostToTwitter(blogId)
{
    "use strict";
    var url;

    var user = JSON.parse(userInfo);

    console.log('id : ' + user._id);

    //url = 'http://www.justwapps.com/twitter/bot_posts/new/3158674261?userid=553a5e54b03e147e0609d0b9';
    url = 'http://www.justwapps.com/twitter/bot_posts/new/';
    url += blogId;
    url += '?userid=';
    url += user._id;
    var opt = {
        form : {
            title: 'manual posting test 0101',
            modified: '2015-04-26T15:07:00+09:00',
            id: '3',
            url: 'https://pokers11.wordpress.com/2015/04/26/test_wordpress-01/',
            categories: ['미분류'],
            tags: []
        }
    };
    opt.form.title = new String(testString.twitter + '01');
    opt.form.modified = new Date.now().toString();

    //browser.driver.post()(url, opt, function (err, response, body) {
    request.post(url, opt, function (err, response, body) {
        console.log('error : ' + err );
    });
};

/***************************************
 * Main controller :
 ***************************************/
var mainController = function() {
    this.pageNow = pageIndex.pageNothing;
    this.params = browser.params;

    this.setPageIndex = function(pageObject){
        console.log('set page : ' + pageObject);
        switch(pageObject)
        {
            case cssSubPages.main:
                this.pageNow = pageIndex.pageMain;
                break;
            case cssSubPages.register:
                this.pageNow = pageIndex.pageRegister;
                break;
            case cssSubPages.myArticles:
                this.pageNow = pageIndex.pageArticles;
                break;
            case cssSubPages.history:
                this.pageNow = pageIndex.pageHistory;
                break;
            case cssSubPages.myAccount:
            case nameSubPages.signin:
                this.pageNow = pageIndex.pageAccount;
                break;
        }
    };

    this.getMainPage = function(){
        browser.get(this.params.url.main);
        this.setPageIndex(cssSubPages.main);
    };
    this.getSubPageByName = function (pageName){
        console.log('subpage name : ' + pageName);

        element(by.binding(pageName)).click();
        this.setPageIndex(pageName);
    };
    this.getSubPageNonAngular = function(url){
        return browser.driver.get(this.params.url.main + url);
    }

    this.getSubPageByCss = function(pageCss){
        element(by.css(pageCss)).click();
        this.setPageIndex(pageCss);
    };

    this.getElementByBinding = function(bindName){
        return element(by.binding(bindName));
    };

    this.getElementsByRepeater = function(repeaterName){
        return element.all(by.repeater(repeaterName));
    }

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
    }

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
                    console.log('user Info : ' + string);
                    userInfo = new String(string);
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
        console.log('test connect to main page');
        this.mainCtrl.getMainPage();
        expect(this.mainCtrl.getMainTitle()).toEqual(pageMain.title);
    };

    this.testClickSignin = function(){
        console.log('current page : ' + this.mainCtrl.pageNow);
        if(this.mainCtrl.pageNow === pageIndex.pageNothing) {
            this.mainCtrl.getMainPage();
        }

        this.mainCtrl.getSubPageByName(nameSubPages.signin);
        if(this.status === pageStatus.login)
        {
            expect(this.mainCtrl.getElementByBinding(nameBinding.title).getText()).toEqual(pageAccount.title);
        }
        else
        {
            expect(this.mainCtrl.getElementByBinding(nameBinding.title).getText()).toEqual(pageAccount.signinTitle);
            this.status = pageStatus.login;
        }
    };

    this.testCheckProviders = function(){
        console.log('expected count : ' + providers.maxProviderCount);

        if(this.mainCtrl.pageNow !== pageIndex.pageAccount) {
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

    this.testTwitterNickname = function(){
        expect(this.mainCtrl.getElementByBinding(nameBinding.userName).getText()).toEqual(this.params.twitter.nickname + pageMain.mainString);
    };

    this.testLoginProvider = function(providerIndex){
        if(this.mainCtrl.pageNow !== pageIndex.pageAccount) {
            this.testClickSignin();
        }
        this.mainCtrl.getProviderByRow(providerIndex).click();
        switch(providerIndex) {
            case providers.twitter:
                this.TwitterLogin();
                break;
            default:
                console.log('not yet : ' + providerIndex);
                break;
        }
    };

    this.testUserProvider = function(){
        expect(this.mainCtrl.getUserProviderByRow(0).getText()).toEqual('  twitter : ' + this.params.twitter.nickname);
    };

    this.testNicknameOnMain = function(){
        this.mainCtrl.getSubPageByCss(cssSubPages.main);
        this.testTwitterNickname();
    };

    this.testUserGroups = function(){
        this.mainCtrl.getSubPageByCss(cssSubPages.register);
        expect(this.mainCtrl.getElementByBinding(nameBinding.title).getText()).toEqual(pageRegister.title);
    };

    this.testCountOfArticles = function(count){
        this.mainCtrl.getSubPageByCss(cssSubPages.myArticles);

        // Using the 'getElementByBinding' occurs WARNING when you execute this test. Because there are many binding name as 'title'.
        //expect(this.mainCtrl.getElementByBinding(nameBinding.title).getText()).toEqual(pageMyArticles.title);
        expect(element.all(by.binding(nameBinding.title)).get(0).getText()).toEqual(pageMyArticles.title);

        expect(this.mainCtrl.getElementByBinding(nameBinding.posts).getText()).toEqual(nameBinding.posts + ' : ' + count);
    };

    this.testMyArticle = function(index){
        this.mainCtrl.getSubPageByCss(cssSubPages.myArticles);
        var articles = this.mainCtrl.getElementsByRepeater(pageMyArticles.repeaterArticles).get(index);

        expect(articles.getText()).toEqual('추천토렌트 사이트 http://t.co/ic68zXUakt 에 가입');
    };

    this.testGetUserInfo = function(){
        this.mainCtrl.getUserInfo();
    };

    this.testOpenBlogs = function () {
        this.mainCtrl.getMainPage();
        this.mainCtrl.getSubPageByCss(cssSubPages.register);
        //var button = this.mainCtrl.getElementByBinding('button[1]');
        var button = this.mainCtrl.getElementByBinding(nameBinding.registerButton1);
        expect(button.getText()).toEqual(pageRegister.registerCreate);
        button.click(); // click 'create' button

        return this.mainCtrl.getElementsByRepeater(pageRegister.repeterSites);
    };

    this.testGetBlogCount = function (blogs) {
        blogs.count().then(function (count) {
            console.log('blog count :' + count);
            blogCountOnRegistPage = count;
        });
    };

    this.testRegistBlogs = function(toBeRegisted){
        var blogs = this.mainCtrl.getElementsByRepeater(pageRegister.repeterSites);
        blogs.count().then(function(count){
            blogCountOnRegistPage = count;

            if(count <= 0)
            {
                console.log('What\'s wrong???');
                return;
            }
            registedBlogs = new Array();
            blogList = new Array();
            registedCount = 0;

            for(var idx = 0 ; idx < count ; idx++)
            {
                blogs.get(idx).getText().then(function(string){
                    (function(str){
                        console.log('blog name : ' + string);
                        blogList.push(str);

                        for(var i ; i<toBeRegisted.length; i++)
                        {
                            if(toBeRegisted[i].indexOf(str) !== -1)
                            {
                                console.log('regist blog :' + str);
                                registedCount++;
                                registedBlogs.push(str);
                            }
                        }
                    })(string);
                });
            }
        });
    };

    this.testGetBlogList = function (blogs, count) {
        var idx = 0;

        blogList = new Array();
        for(idx=0 ; idx < count ; idx++){
            console.log('index : ' + idx);
            blogs.get(idx).getText().then(function (string) {
                console.log('blog list : ' + string);
                blogList.push(string);
            });
        }
    };

    this.testSendPost =  function(blogName){
        var blogId;
        var idx = 0;
        console.log('registed list count : ' + registedBlogs.length);

        for(idx = 0 ; idx < registedBlogs.length ; idx++)
        {
            if(registedBlogs[idx].indexOf(blogName) !== -1)
            {
                var component = registedBlogs[idx].split(':');
                blogId = new String(component[1].trim());   // index 0 : blog name, index 1 : blog ID
                console.log('found blog ID : ' + blogId);
                break;
            }
        }
        //sendPostToTwitter(blogId);
    }
}

describe('Test web page on the BlogSync : ', function(){

    beforeEach(function (){
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

        it('login Twitter', function () {
            testObj.testLoginProvider(providers.twitter);
        });

        it('check Nickname', function () {
            testObj.testTwitterNickname();
        });

        it('check login status', function () {
            testObj.testClickSignin();
            testObj.testUserProvider();
        });

        it('check main page again', function () {
            testObj.testNicknameOnMain();
        });

        it('check register page', function () {
            testObj.testUserGroups();
        });

        it('check count of my articles', function () {
            testObj.testCountOfArticles(0); // 0 --> for test
        });

        it('get user information to be used posting article', function () {
            testObj.testGetUserInfo();
        });

        describe('Check registing and get info on the regist page', function () {
            var blogs;
            it('Show blog list on register page', function () {
                blogs = testObj.testOpenBlogs();
            });

            //it('Get Blog count', function () {
            //    testObj.testGetBlogCount(blogs);
            //});

            //it('Get blog list', function(){
            //    testObj.testGetBlogList(blogs, blogCountOnRegistPage);
            //});

            it('regist blogs', function(){
                var toBeRegisted = new Array();
                toBeRegisted.push('twitter');
                testObj.testRegistBlogs(toBeRegisted);
            });
        });

        it('post simple article', function(){
            testObj.testSendPost('twitter');
        });
    });

    it('pause', function(){
        browser.pause();
    })

});
