/**
 * Created by aleckim on 2014. 6. 20..
 */
var assert  = require('assert');
var userdb = require("../models/userdb");

var testUser1 = {
    "id":1,
    "providers": [{
        "providerName":"facebook",
        "providerId":"3377",
        "data":"dummy"
    }]
};

var testUser2 = {
    "id":2,
    "providers": [{
        "providerName":"facebook",
        "data":"dummy2"
    }]
};

var testProvider1 = {
    "providerName":"twitter",
    "providerId":"3388",
    "data":"t_dummy"
};


var testProviderForFindorCreate = {
    "providerName":"google",
    "providerId":"3377",
    "data":"t_dummy"
};

var testProviderForFindorCreate2 = {
    "providerName":"google",
    "providerId":"3378",
    "data":"t_dummy"
};

describe('userdb', function () {
    describe('Function', function () {
        it('add user', function () {
            assert.equal(userdb.addUser(testUser1.providers[0]).id, testUser1.id, "Fail to add user 1");
            assert.equal(userdb.addUser(testUser2.providers[0]).id, testUser2.id, "Fail to add user 2");
            assert.equal(userdb.getUserCount(), 2, "user count mismatch");
        });

        it('add provider', function () {
            var userid=1;
            assert.equal(userdb.addProvider(userid, testProvider1).id, userid, "Fail to add provider to user "+userid);
            assert.equal(userdb.getProviderCount(userid), 2, "Provider count mismatch");
        });

        it('find user', function () {
           var userid=2;
           assert.equal(userdb.findUser(userid).id, testUser2.id, "Fail to find user "+userid);
        });

        it('find user by provider', function () {
           assert.equal(userdb.findUserByProvider(testProvider1).id, testUser1.id
                    , "Fail to find user by provider " + testProvider1.providerName);
        });

        it ('find provider', function () {
           assert.equal(userdb.findProvider(testUser1.id, testProvider1.providerName).providerName
               , testProvider1.providerName, "Fail to find provider by providerName " + testProvider1.providerName)  ;
        });

        it ('find user without session of findOrCreate', function () {
            assert.equal(userdb.findOrCreate(undefined, testProvider1).id
                , testUser1.id, "Fail to find user without session by provider " + testProvider1.providerName)  ;
        });

        it ('find user with session of findOrCreate', function () {
            assert.equal(userdb.findOrCreate(testUser1, testProvider1).id
                , testUser1.id, "Fail to find user without session by provider " + testProvider1.providerName)  ;
        });

        it ('create user test of findOrCreate', function () {
            assert.equal(userdb.findOrCreate(undefined, testProviderForFindorCreate).id
                , 3, "Fail to create user by provider " + testProviderForFindorCreate.providerName)  ;
        });

        it ('add provider test of findOrCreate', function () {
            assert.equal(userdb.findOrCreate(testUser1, testProviderForFindorCreate2).id
                , testUser1.id, "Fail to add provider by provider " + testProviderForFindorCreate2.providerName)  ;
        });

    });
});