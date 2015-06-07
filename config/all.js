/**
 *
 * Created by aleckim on 2015. 6. 7..
 */
'use strict';

module.exports = {
    svcURL: "http://www.justwapps.com",
    db: 'mongodb://' + (process.env.MONGODB_URL || 'localhost/blogsync'),
    facebook: {
        clientID: process.env.FACEBOOK_ID || 'APP_ID',
        clientSecret: process.env.FACEBOOK_SECRET || 'APP_SECRET'
    },
    twitter: {
        clientID: process.env.TWITTER_KEY || 'CONSUMER_KEY',
        clientSecret: process.env.TWITTER_SECRET || 'CONSUMER_SECRET'
    },
    google: {
        clientID: process.env.GOOGLE_ID || 'APP_ID',
        clientSecret: process.env.GOOGLE_SECRET || 'APP_SECRET'
    },
    Wordpress: {
        clientID: process.env.WORDPRESS_ID || 'APP_ID',
        clientSecret: process.env.WORDPRESS_SECRET || 'APP_SECRET'
    },
    tistory: {
        clientID: process.env.TISTORY_ID || 'APP_ID',
        clientSecret: process.env.TISTORY_SECRET || 'APP_SECRET'
    },
    tumblr: {
        clientID: process.env.TUMBLR_ID || 'APP_ID',
        clientSecret: process.env.TUMBLR_SECRET || 'APP_SECRET'
    },
    kakao: {
        clientID: process.env.KAKAO_ID || 'APP_ID',
        clientSecret: process.env.KAKAO_SECRET || 'APP_SECRET'
    },
    mailer: {
        from: process.env.MAILER_FROM || 'MAILER_FROM',
        options: {
            service: process.env.MAILER_SERVICE_PROVIDER || 'MAILER_SERVICE_PROVIDER',
            auth: {
                user: process.env.MAILER_EMAIL_ID || 'MAILER_EMAIL_ID',
                pass: process.env.MAILER_PASSWORD || 'MAILER_PASSWORD'
            }
        }
    }
};

