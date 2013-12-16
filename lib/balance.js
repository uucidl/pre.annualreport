"use strict";

var BigNum = require('bignumber.js');

// Compute the balances from a ledger
function balances(ledger) {
    return ledger.transactions.reduce(function (balance, transaction) {
        return transaction.postings.reduce(function (balance, posting) {
            if (!posting.amount) {
                return balance;
            }

            balance[posting.amount.commodity] =
                (balance[posting.amount.commodity] || new BigNum(0))
                .plus(posting.amount.quantity);

            return balance;
        }, balance);
    }, {});
}

exports.balances = balances;
