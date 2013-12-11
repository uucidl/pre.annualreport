"use strict";

/*global describe:false,it:false*/

var assert = require('assert');
var ledger = require('../lib/io/jw-ledger');
var util = require('util');
var when = require('when');

describe('ledger', function () {
    it('should fail on invalid version strings', function (done) {
        function mock_ledger() {
            return when.resolve(['', null]);
        }

        ledger.version(mock_ledger).done(function (version) {
            assert.ok(false, util.format('we expected an error and got %s instead', version));
            done();
        }, function(err) {
            assert.ok(true, 'hurray!');
            done();
        });
    });

    function test_a_version(version_string, expected, done) {
        function mock_ledger() {
            return when.resolve([version_string]);
        }

        ledger.version(mock_ledger).then(function (version) {
            assert.deepEqual(version, expected);
        }).then(done, done);
    }

    it('should parse ledger 3.2', function (done) {
        test_a_version('Ledger 3.2', [3, 2, 0], done);
    });

    it('should parse ledger 3.2.1', function (done) {
        test_a_version('Ledger 3.2.1', [3, 2, 1], done);
    });

    it('should parse ledger 3.2.1-443943', function (done) {
        test_a_version('Ledger 3.2.1-443934', [3, 2, 1], done);
    });

    it('should return the current ledger version', function (done) {
        ledger.version().then(function (version) {
            assert.ok(version !== null);
            done();
        }, done);
    });
});
