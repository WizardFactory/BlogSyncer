/**
 * Created by aleckim on 2014. 6. 20..
 */

var assert  = require('assert');
var User = require('../models/userdb');

var testProvider1 = {
    "providerName":"twitter",
    "providerId":"3388",
    "accessToken":"XXXX",
    "refreshToken":"bbbbb",
    "displayName" :"wizard"
};

describe('userdb', function () {
    describe('Function', function () {
        var userDb;
        it('create userdb', function () {
            userDb = new User();
            assert.notEqual(typeof userDb, "undefined", "Fail to create userDb");
        });
        it('add user', function () {
            userDb.providers.push(testProvider1);
            assert.equal(userDb.providers[0].providerId, testProvider1.providerId, "Fail to push to useDb");
        });
        it('find provider', function () {
            var p;
            p = userDb.findProvider(testProvider1.providerName, testProvider1.providerId);
            assert.equal(p.providerId, testProvider1.providerId, "Fail to find provider of useDb");
        });
    });
});


