"use strict";

var BigNum = require('bignumber.js');

exports.intervals = {
    month: {
        next: function (date) {
            if (date[1] === 12) {
                return [ date[0] + 1, 1, date[2] ];
            }

            return [ date[0], date[1] + 1, date[2] ];
        },
        plus: function (date, count) {
            while (count > 0) {
                date = this.next(date);
                count -= 1;
            }

            return date;
        }
    }
};

function date_compare(a, b) {
    return (a[0] - b[0]) ||
        (a[1] - b[1]) ||
        (a[2] - b[2]);
}

function sample_dated_values(dated_values, start_date, count, interval) {
    function ntimes(value, count) {
        var list = [],
            i;

        for (i = 0; i < count; i += 1) {
            list.push(value);
        }

        return list;
    }

    var date = interval.next(start_date),
        samples = ntimes(new BigNum(0), count),
        i = 0;

    dated_values = dated_values.sort(function (a, b) {
        return date_compare(a.date, b.date);
    });

    return samples.map(function (value) {
        for (0; i < dated_values.length
                 && date_compare(dated_values[i].date, date) < 0;
                 i += 1) {
            value = value.plus(dated_values[i].value);
        }

        date = interval.next(date);

        return value;
    });
}

function in_date_range(date, start_date, end_date) {
    return date_compare(date, start_date) >= 0 && date_compare(date, end_date) < 0;
}

function select_by_payee(transactions, payee_name, commodity, start_date, end_date) {
    return transactions.reduce(function (list, transaction) {
        if (!in_date_range(transaction.date, start_date, end_date)) {
            return list;
        }

        if (transaction.payee !== payee_name) {
            return list;
        }

        transaction.postings.forEach(function (posting) {
            if (!commodity || posting.amount.commodity === commodity) {
                list.push({
                    date: transaction.date,
                    value: posting.amount.quantity,
                });
            }
        });

        return list;
    }, []);
}

function exists_by_payee(transactions, payee_name, commodity, start_date, end_date) {
    return transactions.reduce(function (list, transaction) {
        if (!in_date_range(transaction.date, start_date, end_date)) {
            return list;
        }

        if (transaction.payee !== payee_name) {
            return list;
        }

        var exists = false;

        transaction.postings.forEach(function (posting) {
            if (!commodity || posting.amount.commodity === commodity) {
                exists = true;
            }
        });

        if (exists) {
            list.push({
                date: transaction.date,
                value: true
            });
        }

        return list;
    }, []);
}

function select_by_account(transactions, account_name, commodity, start_date, end_date) {
    return transactions.reduce(function (list, transaction) {
        if (!in_date_range(transaction.date, start_date, end_date)) {
            return list;
        }

        transaction.postings.forEach(function (posting) {
            if (posting.account.name === account_name
                     && posting.amount.commodity === commodity) {
                list.push({
                    date: transaction.date,
                    value: posting.amount.quantity,
                });
            }
        });

        return list;
    }, []);
}

function exists_by_account(transactions, account_name, commodity, start_date, end_date) {
    return transactions.reduce(function (list, transaction) {
        if (!in_date_range(transaction.date, start_date, end_date)) {
            return list;
        }

        var exists = false;

        transaction.postings.forEach(function (posting) {
            if (posting.account.name === account_name
                     && (!commodity ||
                         posting.amount.commodity === commodity)) {
                exists = true;
            }
        });

        if (exists) {
            list.push({
                date: transaction.date,
                value: true,
            });
        }

        return list;
    }, []);
}

exports.sample_payee = function (
    payee_name,
    commodity,
    start_date,
    count,
    interval,
    transactions
) {
    return sample_dated_values(
        select_by_payee(
            transactions,
            payee_name,
            commodity,
            start_date,
            interval.plus(start_date, count)
        ),
        start_date,
        count,
        interval
    );
};

exports.sample_payee_by_count = function (
    payee_name,
    commodity,
    start_date,
    count,
    interval,
    transactions
) {
    return sample_dated_values(
        exists_by_payee(
            transactions,
            payee_name,
            commodity,
            start_date,
            interval.plus(start_date, count)
        ).map(function (e) {
            return { date: e.date, value: new BigNum(1) };
        }),
        start_date,
        count,
        interval
    );
};

exports.sample_account = function (
    account_name,
    commodity,
    start_date,
    count,
    interval,
    transactions
) {
    return sample_dated_values(
        select_by_account(
            transactions,
            account_name,
            commodity,
            start_date,
            interval.plus(start_date, count)
        ),
        start_date,
        count,
        interval
    );
};

exports.sample_account_by_count = function (
    account_name,
    commodity,
    start_date,
    count,
    interval,
    transactions
) {
    return sample_dated_values(
        exists_by_account(
            transactions,
            account_name,
            commodity,
            start_date,
            interval.plus(start_date, count)
        ).map(function (e) {
            return { date: e.date, value: new BigNum(1) };
        }),
        start_date,
        count,
        interval
    );
};
