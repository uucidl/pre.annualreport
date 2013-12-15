"use strict";

var connect = require('connect');
var connectRoute = require('connect-route');
var http = require('http');
var util = require('util');
var url = require('url');
var when = require('when');

var ledger = require('./lib/io/jw-ledger');
var outliers = require('./lib/outliers');

var config = require('./config.json');

function json_response(f) {
    return function (req, res, next) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        f(req, res, next).then(function (result) {
            res.end(util.format('%j', result));
        }, function (err) {
            res.statusCode = 500;
            res.end(err);
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
        return this.my_ledger.query(['--period', this.period, '^Expenses'].concat(args || []));
    };

    function IncomeLedger(period) {
        this.my_ledger = my_ledger;
        this.period = period;
    }

    IncomeLedger.prototype.query = function (args) {
        return this.my_ledger.query(['--period', this.period, '^Income'].concat(args || []));
    };

    app = connect()
        .use(connect.static('./ui/static'))
        .use(connectRoute(function (router) {
            /*jslint unparam:true*/
            router.get('/v1/ledger', function (req, res, next) {
                res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                my_ledger.query(
                    ['^Assets:Checking:ING', '^Liabilities:ING']
                ).done(function (ledger) {
                    res.end(util.format('%j', ledger));
                });
            });

            router.get('/v1/odd_payees', json_response(function (req, res, next) {
                var params = req_params(req),
                    limit = params.limit || 5,
                    period = params.period || "2013";
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
                    period = params.period || "2013";
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
