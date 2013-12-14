"use strict";

// Outliers
// --------
//

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
            sum: avg.sum -= map[key]
        }

        val[key] = (avg.sum * avg_without_me.count) / (avg_without_me.sum * avg.count);

        return val;
    }, {});
}

function top_contributors(map, limit) {
    var contribs = contributors_to_average(map)

    return Object.keys(contribs).reduce(function(list, key) {
        list.push({
            key: key,
            contribution: map[key]
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
    throw 'Not Implemented Yet';
}

exports.average = average;
exports.contributors_to_average = contributors_to_average;
exports.payees_by_count = payees_by_count;
