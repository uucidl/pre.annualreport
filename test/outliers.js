"use strict";

/*global describe:false,it:false*/

var assert = require('assert');
var when = require('when');
var BigNum = require('bignumber.js');
var ledger = require('../lib/io/jw-ledger');

describe('outliers', function () {
    var outliers = require('../lib/outliers');

    it('should compute the average of an empty map', function (done) {
        assert.deepEqual({ count: 0, sum: 0 }, outliers.average({}));
        done();
    });

    it('should compute the average of a map', function (done) {
        assert.deepEqual({ count: 4, sum: 4 }, outliers.average({
            a: 1,
            b: 1,
            c: 1,
            d: 1
        }));
        done();
    });

    it('should identify elements contribution to an average', function (done) {
        assert.deepEqual(
            ['b'],
            outliers.top_contributors({
                a: 1,
                b: -1000,
                c: 1,
                d: 1
            }, 1).map(function (e) {
                return e.key;
            })
        );
        done();
    });

    it('should identify the most odd payees by count', function (done) {
        var dataset = {
            transactions: [
                { payee: 'A' },
                { payee: 'B' },
                { payee: 'B' },
                { payee: 'B' },
                { payee: 'B' },
                { payee: 'B' },
                { payee: 'C' },
                { payee: 'C' },
                { payee: 'D' },
                { payee: 'D' }
            ]
        };

        outliers.payees_by_count({
            query: function () {
                return when.resolve(dataset);
            }
        }, 1).then(function (payees) {
            assert.deepEqual([
                { name: 'B', total: 5, unit: '' },
            ], payees);
        }).then(done, done);
    });

    it('should identify the most odd payees by amount', function (done) {
        function posting(qty, commodity) {
            return [ { amount: ledger.amount(qty, commodity) } ];
        }
        var dataset = {
            transactions: [
                { payee: 'A', postings: posting(12, '€') },
                { payee: 'B', postings: posting(12, '€') },
                { payee: 'B', postings: posting(1200, '¥') },
                { payee: 'C', postings: posting(-28, '€') },
                { payee: 'C', postings: posting(-60.21, '€') }
            ]
        };

        outliers.payees_by_amount({
            query: function () {
                return when.resolve(dataset);
            }
        }, 1).then(function (payees) {
            assert.deepEqual([{name: 'C', total: -88.21, unit: '€'}], payees);
        }).then(done, done);
    });
});
