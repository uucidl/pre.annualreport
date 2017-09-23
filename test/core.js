"use strict";

/*global describe:false,it:false*/

var assert = require('assert');
var ledger = require('../lib/io/jw-ledger');
var util = require('util');
var when = require('when');
var fs = require('fs');
var BigNum = require('bignumber.js');

describe('ledger', function () {
    it('should fail on invalid version strings', function (done) {
        function mock_ledger() {
            return when.resolve(['', null]);
        }

        ledger.version(mock_ledger).then(function (version) {
            assert.ok(false, util.format('we expected an error and got %s instead', version));
        }, function () {
            assert.ok(true, 'hurray!');
        }).then(done, done);
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

    it('should read transactions from a ledger XML output', function (done) {
        function mock_ledger() {
            /*jslint stupid:true*/
            return when.resolve([fs.readFileSync('test/data/ledger.xml'), null]);
        }

        ledger.query('fake-file',
                     [],
                     mock_ledger,
                     /* deactivate cache */null).then(function (result) {
            console.log(result);

            assert.equal(2, result.transactions.length);
            assert.equal(1, result.transactions.filter(
                function (e) { return e.state === 'cleared'; }
            ).length);

            assert.deepEqual(
                [
                    "2013-12-11",
                    "2013-12-12",
                ],
                Object.keys(
                    result.transactions.map(function (e) {
                        return e.date.join('-');
                    }).reduce(function (val, element) {
                        val[element] = true;
                        return val;
                    }, {})
                )
            );
            assert.notEqual(
                "",
                result.transactions.reduce(
                    function (val, element) {
                        assert.ok(element.payee !== undefined);
                        return val + element.payee;
                    },
                    ""
                )
            );

            var postings = result.transactions.map(function (e) {
                return e.postings;
            }).reduce(function (val, element) {
                return val.concat(element);
            }, []);

            assert.ok(postings.reduce(function (val, element) {
                val[element.account.name] = true;
                return val;
            }, {}).hasOwnProperty('Expenses:Cash'));

            assert.equal(
                new BigNum("-10.21").toString(),
                postings.reduce(function (val, posting) {
                    console.log(posting);
                    if (posting.amount.commodity === '€') {
                        return val.plus(posting.amount.quantity);
                    }

                    return val;
                }, new BigNum(0)).toString()
            );

            console.log(postings);
        }).then(done, done);
    });

    it('should read all the text of elements with space', function (done) {
        var payee_name = "this is a long payee name";
        function mock_ledger() {
            /*jslint stupid:true*/
            return when.resolve([
                "<ledger version='196608'>" +
                    "<transactions>" +
                    "<transaction>" +
                    util.format("<payee>%s</payee>", payee_name) +
                    "</transaction>" +
                    "</transactions>" +
                    "</ledger>",
                null
            ]);
        }

        ledger.query('fake-file', [], mock_ledger).then(function (result) {
            assert.equal(payee_name, result.transactions[0].payee);
        }).then(done, done);
    });

    it('should optionally fetch results from a cache', function (done) {
        var cacheData = [],
            cache = {
                find: function (key) {
                    return cacheData[key];
                },
                put: function (key, value) {
                    cacheData[key] = value;
                    return value;
                },
            };

        function mock_ledger() {
            /*jslint stupid:true*/
            return when.resolve([
                "<ledger version='196608'>" +
                    "<transactions>" +
                    "<transaction>" +
                    "<payee>Hello</payee>" +
                    "</transaction>" +
                    "</transactions>" +
                    "</ledger>",
                null
            ]);
        }

        ledger.query('fake-file', [], mock_ledger, cache).then(function (result) {
            var first_result = result;
            assert.ok(result.transactions.length === 1);

            return ledger.query('fake-file', [], null, cache).then(function (result) {
                assert.deepEqual(first_result, result);
            });
        }).then(done, done);
    });
});
