"use strict";

var connect = require('connect');
var connectRoute = require('connect-route');
var http = require('http');
var util = require('util');
var url = require('url');
var when = require('when');

var ledger = require('./lib/io/jw-ledger');
var outliers = require('./lib/outliers');
var balance = require('./lib/balance');
var config = require('./config.json');

function json_response(f) {
    return function (req, res, next) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        f(req, res, next).done(function (result) {
            res.end(util.format('%j', result));
        }, function (err) {
            res.statusCode = 500;
            res.end(util.format('%s', err));
            console.log(util.format('ERR %s: [%s]', res.statusCode, err));
        });
    };
}

function req_params(req) {
    return url.parse(req.url, true).query;
}

function validate_config(config) {
    if (config.version !== 0) {
        throw util.format('Unknown config version %s', config.version);
    }

    if (!config.ledgerfile) {
        throw 'Supply the path to your ledger file in "config.json"';
    }
}

validate_config(config);

ledger.version().then(function (version) {
    console.log(util.format('Using ledger version: %s', version));
    if (version[0] !== 3) {
        throw util.format('Expecting ledger version >= 3, got %s', version);
    }
}).then(function () {
    var ledger_file = config.ledgerfile,
        port = 3000,
        app,
        my_ledger;

    my_ledger = {
        cache: {},
        query: function (args) {
            return ledger.query(ledger_file, args || [], null, this.cache);
        }
    };

    function ExpensesLedger(period) {
        this.my_ledger = my_ledger;
        this.period = period;
    }

    ExpensesLedger.prototype.query = function (args) {
        return this.my_ledger.query([
            '--period', this.period, config['expense-account-re']
        ].concat(args || []));
    };

    function IncomeLedger(period) {
        this.my_ledger = my_ledger;
        this.period = period;
    }

    IncomeLedger.prototype.query = function (args) {
        return this.my_ledger.query([
            '--period', this.period, config['income-account-re']
        ].concat(args || []));
    };

    app = connect()
        .use(connect.static('./ui/static'))
        .use(connectRoute(function (router) {
            /*jslint unparam:true*/
            router.get('/v1/odd_payees', json_response(function (req, res, next) {
                var params = req_params(req),
                    limit = params.limit || 5,
                    period = params.period;

                if (!period) {
                    throw 'Missing period parameter';
                }

                return when.join(
                    outliers.payees_by_count(new ExpensesLedger(period), limit),
                    outliers.payees_by_count(new IncomeLedger(period), limit),
                    outliers.payees_by_amount(new ExpensesLedger(period), limit),
                    outliers.payees_by_amount(new IncomeLedger(period), limit)
                ).then(function (values) {
                    return when.resolve({
                        expenses_by_count: values[0],
                        income_by_count: values[1],
                        expenses_by_amount: values[2],
                        income_by_amount: values[3]
                    });
                });
            }));

            router.get('/v1/odd_accounts', json_response(function (req, res, next) {
                var params = req_params(req),
                    limit = params.limit || 5,
                    period = params.period;

                if (!period) {
                    throw 'Missing period parameter';
                }

                return when.join(
                    outliers.accounts_by_count(new ExpensesLedger(period), limit),
                    outliers.accounts_by_count(new IncomeLedger(period), limit),
                    outliers.accounts_by_amount(new ExpensesLedger(period), limit),
                    outliers.accounts_by_amount(new IncomeLedger(period), limit)
                ).then(function (values) {
                    return when.resolve({
                        expenses_by_count: values[0],
                        income_by_count: values[1],
                        expenses_by_amount: values[2],
                        income_by_amount: values[3]
                    });
                });
            }));

            router.get('/v1/flows', json_response(function (req, res, next) {
                var params = req_params(req),
                    period = params.period;

                if (!period) {
                    throw 'Missing period parameter';
                }

                return when.join(
                    new ExpensesLedger(period).query(),
                    new IncomeLedger(period).query()
                ).then(function (ledgers) {
                    var expenses = balance.balances(ledgers[0]),
                        incomes  = balance.balances(ledgers[1]),
                        expenses_list,
                        incomes_list,
                        expenses_count_list,
                        incomes_count_list;

                    expenses_list = Object.keys(expenses).reduce(function (list, key) {
                        return list.concat(
                            [{ name: 'Expenses', total: parseFloat(expenses[key].total), unit: key } ]
                        );
                    }, []);

                    incomes_list = Object.keys(incomes).reduce(function (list, key) {
                        return list.concat(
                            [{ name: 'Incomes', total: parseFloat(incomes[key].total), unit: key } ]
                        );
                    }, []);

                    expenses_count_list = Object.keys(expenses).reduce(function (list, key) {
                        return list.concat(
                            [{
                                name: 'Expenses (' + key + ')',
                                total: expenses[key].count,
                                unit: ''
                            }]
                        );
                    }, []);

                    incomes_count_list = Object.keys(incomes).reduce(function (list, key) {
                        return list.concat(
                            [{
                                name: 'Income (' + key + ')',
                                total: incomes[key].count,
                                unit: ''
                            }]
                        );
                    }, []);

                    return when.resolve({
                        expenses: expenses_list,
                        incomes: incomes_list,
                        expenses_count: expenses_count_list,
                        incomes_count: incomes_count_list
                    });
                });
            }));
        }));


    http.createServer(app).listen(port);
    return util.format(
        'started web server at port %d\n\thttp://localhost:%d',
        port,
        port
    );
}).then(console.log, function (err) {
    console.log(err.stack);
});
