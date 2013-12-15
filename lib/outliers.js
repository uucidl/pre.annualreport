"use strict";

// Outliers
// --------
//

var BigNum = require('bignumber.js');
var util = require('util');

// Computes average tuple of a key/value map
function average(map) {
    var average = { count: 0, sum: 0 };

    return Object.keys(map).reduce(function (val, key) {
        val.count++;
        val.sum += map[key];
        return val;
    }, average);
}

// Processes a map and find all the elements that contribute massively to the average
function contributors_to_average(map) {
    var avg = average(map);

    return Object.keys(map).reduce(function (val, key) {
        var avg_without_me = {
            count: avg.count - 1,
            sum: avg.sum - map[key]
        };

        val[key] = Math.abs((avg.sum * avg_without_me.count) / (avg_without_me.sum * avg.count));

        return val;
    }, {});
}

function top_contributors(map, limit) {
    var contribs = contributors_to_average(map)

    return Object.keys(contribs).reduce(function(list, key) {
        list.push({
            key: key,
            contribution: contribs[key]
        });
        return list;
    }, []).sort(function (a, b) {
        return -(a.contribution - b.contribution);
    }).slice(0, limit);
}

// Some payees are more common than others
function payees_by_count(ledger, limit) {
    return ledger.query().then(function (entries) {
        var counts = entries.transactions.map(function(e) {
            return e.payee;
        }).reduce(function (val, payee) {
            val[payee] = (val[payee] || 0) + 1;
            return val;
        }, {});

        return top_contributors(counts, limit).map(function (e) {
            return e.key;
        });
    });
}

// Some payees are more important than others to the assets/liabilities balance
function payees_by_amount(ledger, limit) {
    return ledger.query().then(function (entries) {
        var sums = entries.transactions.reduce(function(val, transaction) {
            var sum = transaction.postings.reduce(function(sum, posting) {
                var amount = posting.amount;
                if (amount.commodity == '€') {
                    sum = sum.plus(amount.quantity);
                }
                return sum;
            }, new BigNum(0));

            if (val[transaction.payee] === undefined) {
                val[transaction.payee] = sum;
            } else {
                val[transaction.payee] = val[transaction.payee].plus(sum);
            }

            return val;
        }, {});

        Object.keys(sums).forEach(function (key) {
            sums[key] = 1.0 * sums[key];
        });

        return top_contributors(sums, limit).map(function (e) {
            return e.key;
        });
    });
}

// Some accounts are more common than others
function accounts_by_count(ledger, limit) {
    return ledger.query().then(function (entries) {
        var counts = entries.transactions.map(function(e) {
            return e.postings;
        }).reduce(function (val, postings) {
            postings.forEach(function (posting) {
                var account = posting.account.name;
                val[account] = (val[account] || 0) + 1;
            });

            return val;
        }, {});

        return top_contributors(counts, limit).map(function (e) {
            return e.key;
        });
    });
}

// Some accounts are more important than others to the assets/liabilities balance
function accounts_by_amount(ledger, limit) {
    return ledger.query().then(function (entries) {
        var sums = entries.transactions.map(function(e) {
            return e.postings;
        }).reduce(function (val, postings) {
            postings.forEach(function (posting) {
                var account = posting.account.name,
                    amount = posting.amount;
                if (amount.commodity == '€') {
                    if (val[account] === undefined) {
                        val[account] = amount.quantity;
                    } else {
                        val[account] = val[account].plus(amount.quantity);
                    }
                }
            });

            return val;
        }, {});

        Object.keys(sums).forEach(function (key) {
            sums[key] = 1.0 * sums[key];
        });

        return top_contributors(sums, limit).map(function (e) {
            return e.key;
        });
    });
}

exports.average = average;
exports.top_contributors = top_contributors;
exports.payees_by_count = payees_by_count;
exports.payees_by_amount = payees_by_amount;
exports.accounts_by_count = accounts_by_count;
exports.accounts_by_amount = accounts_by_amount;
