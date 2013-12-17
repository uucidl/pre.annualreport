"use strict";

var BigNum = require('bignumber.js');

// Compute the balances from a ledger
function balances(ledger) {
    return ledger.transactions.reduce(function (balance, transaction) {
        return transaction.postings.reduce(function (balance, posting) {
            var commodity;

            if (!posting.amount) {
                return balance;
            }

            commodity = posting.amount.commodity;

            if (balance[commodity] === undefined) {
                balance[commodity] = {
                    count: 0,
                    total: new BigNum(0),
                    unit: commodity,
                };
            }

            balance[commodity].total = balance[commodity].total
                .plus(posting.amount.quantity);
            balance[commodity].count += 1;

            return balance;
        }, balance);
    }, {});
}

exports.balances = balances;
