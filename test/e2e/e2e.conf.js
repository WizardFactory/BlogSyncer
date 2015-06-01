exports.config = {
  seleniumAddress: 'http://localhost:4444/wd/hub',

  capabilities: {
    'browserName': 'chrome',
    'chromeOptions': {
      'args': ['lang=ko-kr']
    }
  },

  params: {
    url:{
      main: 'http://www.justwapps.com/'
    },

    wordpress: {
      user : 'pokers11',
      passwd : 'tjwndtn7053@!w',
      nickname: 'pokers11'
    },

    tistory: {
      user: 'pokers@hanmail.net',
      passwd : 'tjwndtn7053',
      nickname : 'pokers'
    },

    google: {
      user : 'pokerstest02@gmail.com',
      passwd : 'tjwndtn11',
      nickname : 'pokerstest02',
    },

    twitter: {
      user : 'pokers@hanmail.net',
      passwd : 'tjwndtn11',
      nickname : 'pokers'
    }

  },

  onPrepare: function(){
    global.dvr = browser.driver;
    browser.driver.manage().window().setPosition(850, 50);
    browser.driver.manage().window().setSize(1024, 768);
  },

  specs: ['/Users/Peter/GitHub/BlogSyncer/test/e2e/test_protractor.js'],
  baseUrl: 'http://www.justwapps.com',

  jasmineNodeOpts: {
    showColors: true
  }
};
