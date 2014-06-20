/**
 * Created by aleckim on 2014. 6. 20..
 */
var assert  = require('assert');
var init = require("../models/init");

describe('Example', function() {
    describe('hello~', function() {
        it('hello wizard', function() {
            assert.equal(init.getTasks().title, "Hello Wizard", 'Wrong title');
        });
        it('user', function() {
            assert.equal(init.getTasks().user, "respond with a resource", 'Wrong user');
        });
    });
});

