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
        ledger_cache = {};

    function ledgerfor(period, account_re) {
        return {
            query: function (args) {
                return ledger.query(
                    ledger_file,
                    [ '--period', period, account_re ].concat(args || []),
                    null,
                    ledger_cache
                );
            }
        };
    }

    function expenses_ledger(period) {
        return ledgerfor(period, config['expense-account-re']);
    }

    function income_ledger(period) {
        return ledgerfor(period, config['income-account-re']);
    }

    function liabilities_ledger(period) {
        return ledgerfor(period, config['liabilities-account-re']);
    }

    function assets_ledger(period) {
        return ledgerfor(period, config['assets-account-re']);
    }

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
                    outliers.payees_by_count(expenses_ledger(period), limit),
                    outliers.payees_by_count(income_ledger(period), limit),
                    outliers.payees_by_amount(expenses_ledger(period), limit),
                    outliers.payees_by_amount(income_ledger(period), limit)
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
                    outliers.accounts_by_count(expenses_ledger(period), limit),
                    outliers.accounts_by_count(income_ledger(period), limit),
                    outliers.accounts_by_amount(expenses_ledger(period), limit),
                    outliers.accounts_by_amount(income_ledger(period), limit)
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
                    expenses_ledger(period).query(),
                    income_ledger(period).query(),
                    assets_ledger(period).query(),
                    liabilities_ledger(period).query()
                ).then(function (ledgers) {
                    function tuple_list_by_key(map, tuple_name) {
                        return Object.keys(map).reduce(function (list, key) {
                            if (map[key].total.isZero()) {
                                return list;
                            }

                            return list.concat(
                                [{ name: tuple_name, total: parseFloat(map[key].total), unit: key } ]
                            );
                        }, []);
                    }

                    function tuple_list_count_by_key(map, tuple_name_pattern) {
                        return Object.keys(map).reduce(function (list, key) {
                            return list.concat(
                                [{
                                    name: util.format(tuple_name_pattern, key),
                                    total: map[key].count,
                                    unit: ''
                                }]
                            );
                        }, []);
                    }

                    var expenses = balance.balances(ledgers[0]),
                        incomes  = balance.balances(ledgers[1]),
                        assets   = balance.balances(ledgers[2]),
                        liabilities = balance.balances(ledgers[3]),
                        expenses_list = tuple_list_by_key(expenses, 'Expenses'),
                        incomes_list = tuple_list_by_key(incomes, 'Incomes'),
                        expenses_count_list = tuple_list_count_by_key(expenses, 'Expenses (%s)'),
                        incomes_count_list = tuple_list_count_by_key(incomes, 'Income (%s)'),
                        assets_list = tuple_list_by_key(assets, 'Assets'),
                        assets_count_list = tuple_list_count_by_key(assets, 'Assets (%s)'),
                        liabilities_list = tuple_list_by_key(liabilities, 'Liabilities'),
                        liabilities_count_list = tuple_list_count_by_key(liabilities, 'Liabilities (%s)');

                    return when.resolve({
                        expenses: expenses_list,
                        incomes: incomes_list,
                        expenses_count: expenses_count_list,
                        incomes_count: incomes_count_list,
                        assets: assets_list,
                        assets_count: assets_count_list,
                        liabilities: liabilities_list,
                        liabilities_count: liabilities_count_list
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
