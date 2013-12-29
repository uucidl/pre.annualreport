"use strict";

/*global describe:false,it:false*/

var assert = require('assert');
var ledger = require('../lib/io/jw-ledger');
var BigNum = require('bignumber.js');

describe('series', function () {
    var series = require('../lib/series');

    it('it should coalesce empty series over the chosen period', function (done) {
        var N = 12,
            history = series.sample_account(
                'fake-account',
                null,
                [2013, 1, 1],
                N,
                series.intervals.month,
                []
            );
        assert.equal(N, history.length);
        assert.deepEqual(new BigNum(0), history.reduce(function (val, elem) {
            return val.plus(elem);
        }, new BigNum(0)));
        done();
    });

    it('it should coalesce an account over the chosen period', function (done) {
        function transaction(year, month, day, account_name, qty, commodity) {
            return {
                state: null,
                date: ledger.date(year, month, day),
                payee: null,
                postings: [ {
                    account: { name: account_name },
                    amount: ledger.amount(qty, commodity)
                } ]
            };
        }

        var N = 6,
            ledger_transactions = [
                transaction(2013,  1,  1, 'fake-account', 1, '$'),
                transaction(2012, 12, 31, 'fake-account', 1, '€'),
                transaction(2013,  1,  1, 'fake-account', 1, '€'),
                transaction(2013,  2,  1, 'fake-account', 1, '€'),
                transaction(2013,  1,  3, 'fake-account', 3, '€'),
                transaction(2013,  1,  3, 'other-account', 1, '€'),
                transaction(2013,  3,  1, 'fake-account', 1, '€'),
            ],
            history = series.sample_account(
                'fake-account',
                '€',
                [2013, 1, 1],
                N,
                series.intervals.month,
                ledger_transactions
            );

        assert.equal(N, history.length);
        assert.deepEqual(new BigNum(6), history.reduce(function (val, elem) {
            return val.plus(elem);
        }, new BigNum(0)));
        assert.deepEqual([0, 1, 2], history.reduce(function (val, elem, index) {
            if (!elem.isZero(0)) {
                val.push(index);
            }

            return val;
        }, []));
        done();
    });

    it('it should coaelesce a payee over the chosen period', function (done) {
        function transaction(year, month, day, payee_name, qty, commodity) {
            return {
                state: null,
                date: ledger.date(year, month, day),
                payee: payee_name,
                postings: [ {
                    amount: ledger.amount(qty, commodity)
                } ]
            };
        }

        var N = 6,
            ledger_transactions = [
                transaction(2013,  1,  1, 'fake-payee', 1, '$'),
                transaction(2012, 12, 31, 'fake-payee', 1, '€'),
                transaction(2013,  1,  1, 'fake-payee', 1, '€'),
                transaction(2013,  2,  1, 'fake-payee', 1, '€'),
                transaction(2013,  1,  3, 'fake-payee', 3, '€'),
                transaction(2013,  1,  3, 'other-payee', 1, '€'),
                transaction(2013,  3,  1, 'fake-payee', 1, '€'),
                transaction(2014, 1, 1, 'fake-payee', 10, '€')
            ],
            history = series.sample_payee(
                'fake-payee',
                '€',
                [2013, 1, 1],
                N,
                series.intervals.month,
                ledger_transactions
            ),
            counts = series.sample_payee_by_count(
                'fake-payee',
                '€',
                [2013, 1, 1],
                N,
                series.intervals.month,
                ledger_transactions
            );

        assert.equal(N, history.length);
        assert.deepEqual(new BigNum(6), history.reduce(function (val, elem) {
            return val.plus(elem);
        }, new BigNum(0)));
        assert.deepEqual([0, 1, 2], history.reduce(function (val, elem, index) {
            if (!elem.isZero(0)) {
                val.push(index);
            }

            return val;
        }, []));

        assert.deepEqual(new BigNum(4), counts.reduce(function (val, elem) {
            return val.plus(elem);
        }, new BigNum(0)));

        done();
    });

    it('the month interval should add 1 to the month', function (done) {
        assert.deepEqual([2013, 2, 1], series.intervals.month.next([2013, 1, 1]));
        assert.deepEqual([2013, 1, 1], series.intervals.month.next([2012, 12, 1]));
        done();
    });

    it('the month interval can also add many months', function (done) {
        assert.deepEqual([2014, 1, 1], series.intervals.month.plus([2013, 1, 1], 12));
        done();
    });

    it('should count transactions, not postings', function (done) {
        var transactions =
            [
                {
                    state: null,
                    date: ledger.date(2013, 1, 2),
                    payee: 'fake-payee',
                    postings: [
                        {
                            amount: ledger.amount(1, '#')
                        },
                        {
                            amount: ledger.amount(2, '#')
                        },
                    ]
                }
            ],
            counts = series.sample_payee_by_count(
                'fake-payee',
                '#',
                [2013, 1, 1],
                1,
                series.intervals.month,
                transactions
            );

        assert.deepEqual(new BigNum(1), counts.reduce(function (val, elem) {
            return val.plus(elem);
        }, new BigNum(0)));

        done();
    });

});
