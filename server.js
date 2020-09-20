"use strict";

var connect = require('connect');
var connectRoute = require('connect-route');
var serveStatic = require('serve-static');
var http = require('http');
var util = require('util');
var url = require('url');
var when = require('when');

var balance = require('./lib/balance');
var ledger = require('./lib/io/jw-ledger');
var outliers = require('./lib/outliers');
var series = require('./lib/series');

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
    if (config.version !== 3) {
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
        ledger_cache = ledger.Cache(ledger_file);

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

    app = connect()
        .use(serveStatic('./ui/static'))
        .use(connectRoute(function (router) {
            /*jslint unparam:true*/

            function flows(
                name,
                name_with_unit_pattern,
                ledger,
                limit,
                year
            ) {
                var flags = [];
                // NOTE(nicolas): crashes w/ assertion error:
                flags = ['--exchange', '€'];
                return ledger.query(flags).then(function (values) {
                    return when.join(
                        when.resolve(balance.balances(values)),
                        outliers.payees_by_count(ledger, limit),
                        outliers.payees_by_amount(ledger, limit),
                        outliers.accounts_by_count(ledger, limit),
                        outliers.accounts_by_amount(ledger, limit),
                        values
                    );
                }).then(function (values) {
                    var transactions = values[5].transactions;

                    function add_count_history(balances) {
                        balances.forEach(function (elem) {
                            elem.history = series.sample_by_count(
                                elem.unit,
                                [year, 1, 1],
                                12,
                                series.intervals.month,
                                transactions
                            ).map(parseFloat);
                        });

                        return balances;
                    }

                    function add_history(balances) {
                        balances.forEach(function (elem) {
                            elem.history = series.sample(
                                elem.unit,
                                [year, 1, 1],
                                12,
                                series.intervals.month,
                                transactions
                            ).map(parseFloat);
                        });

                        return balances;
                    }

                    function add_payee_count_history(payees) {
                        payees.forEach(function (elem) {
                            elem.history = series.sample_payee_by_count(
                                elem.name,
                                undefined,
                                [year, 1, 1],
                                12,
                                series.intervals.month,
                                transactions
                            ).map(parseFloat);
                        });

                        return payees;
                    }

                    function add_payee_history(payees) {
                        payees.forEach(function (elem) {
                            elem.history = series.sample_payee(
                                elem.name,
                                elem.unit,
                                [year, 1, 1],
                                12,
                                series.intervals.month,
                                transactions
                            ).map(parseFloat);
                        });

                        return payees;
                    }

                    function add_account_count_history(accounts) {
                        accounts.forEach(function (elem) {
                            elem.history = series.sample_account_by_count(
                                elem.name,
                                undefined,
                                [year, 1, 1],
                                12,
                                series.intervals.month,
                                transactions
                            ).map(parseFloat);
                        });

                        return accounts;
                    }

                    function add_account_history(accounts) {
                        accounts.forEach(function (elem) {
                            elem.history = series.sample_account(
                                elem.name,
                                elem.unit,
                                [year, 1, 1],
                                12,
                                series.intervals.month,
                                transactions
                            ).map(parseFloat);
                        });

                        return accounts;
                    }

                    return when.resolve({
                        balances: add_history(tuple_list_by_key(values[0], name)),
                        balances_count: add_count_history(tuple_list_count_by_key(
                            values[0],
                            name_with_unit_pattern
                        )),
                        payees_by_count: add_payee_count_history(values[1]),
                        payees_by_amount: add_payee_history(values[2]),
                        accounts_by_count: add_account_count_history(values[3]),
                        accounts_by_amount: add_account_history(values[4])
                    });
                });
            }

            router.get('/v1/expenses', json_response(function (req, res, next) {
                var params = req_params(req),
                    limit = params.limit || 5,
                    period = params.period;

                if (!period) {
                    throw 'Missing period parameter';
                }

                return flows('Expenses', 'Expenses (%s)', expenses_ledger(period), limit, period);
            }));

            router.get('/v1/incomes', json_response(function (req, res, next) {
                var params = req_params(req),
                    limit = params.limit || 5,
                    period = params.period;

                if (!period) {
                    throw 'Missing period parameter';
                }

                return flows('Income', 'Income (%s)', income_ledger(period), limit, period);
            }));

            router.get('/v1/equity', json_response(function (req, res, next) {
                var params = req_params(req),
                    period = params.period;

                if (!period) {
                    throw 'Missing period parameter';
                }

                return when.join(
                    assets_ledger(period).query(),
                    liabilities_ledger(period).query()
                ).then(function (ledgers) {
                    var assets   = balance.balances(ledgers[0]),
                        liabilities = balance.balances(ledgers[1]),
                        assets_list = tuple_list_by_key(assets, 'Assets'),
                        assets_count_list = tuple_list_count_by_key(assets, 'Assets (%s)'),
                        liabilities_list = tuple_list_by_key(liabilities, 'Liabilities'),
                        liabilities_count_list = tuple_list_count_by_key(liabilities, 'Liabilities (%s)');
                    return when.resolve({
                        assets_total: assets_list,
                        assets_count: assets_count_list,
                        liabilities_total: liabilities_list,
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
