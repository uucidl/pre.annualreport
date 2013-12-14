"use strict";

/*global describe:false,it:false*/

var assert = require('assert');
var when = require('when');

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
        console.log(outliers.contributors_to_average(outliers.contributors_to_average({
            a: 1,
            b: 1000,
            c: 1,
            d: 1
        })));
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
                'B',
            ], payees.sort());
        }).then(done, done);
    });
});
