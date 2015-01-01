"use strict";

/*jslint bitwise: true*/

var expat = require('node-expat');
var nodefn = require('when/node/function');
var subprocess = require('child_process');
var util = require('util');
var when = require('when');
var BigNum = require('bignumber.js');
var watch = require('node-watch');

function communicate(cmd, args) {
    var deferred, stdout_deferred, stderr_deferred, process,
        stdout_buffer, stderr_buffer;

    deferred = when.defer();
    stdout_deferred = when.defer();
    stderr_deferred = when.defer();

    stdout_buffer = new Buffer(0);
    stderr_buffer = new Buffer(0);

    console.log(util.format('INFO spawning %s %j', cmd, args));
    process = subprocess.spawn(cmd, args);
    deferred.notify(process);

    process.stdout.on('data', function (data) {
        stdout_buffer = Buffer.concat([stdout_buffer, data]);
    });
    process.stderr.on('data', function (data) {
        stderr_buffer = Buffer.concat([stderr_buffer, data]);
    });


    process.stdout.on('end', function () {
        stdout_deferred.resolve(stdout_buffer.toString('utf8'));
    });
    process.stderr.on('end', function () {
        stderr_deferred.resolve(stderr_buffer.toString('utf8'));
    });

    process.on('exit', function (rc) {
        console.log(util.format('INFO %s %j finished with %d', cmd, args, rc));

        when.all(
            [stdout_deferred.promise, stderr_deferred.promise]
        ).done(function (results) {
            if (rc !== 0) {
                deferred.reject(util.format(
                    'cmd %s %j failed with return code %d: [\n%s]',
                    cmd,
                    args,
                    rc,
                    results[1].toString()
                ));
                return;
            }

            console.log(util.format('INFO cmd %s %j has finished', cmd, args));

            deferred.resolve([ results[0], results[1] ]);
        });
    });


    return deferred.promise;
}

function version(optional_runner) {
    var run = optional_runner || communicate;

    function parse_version(version_str) {
        var first_line, match;

        first_line = version_str.split('\n')[0];

        match = first_line.match(/Ledger ([0-9]+)(?:\.([0-9]+))?(?:\.([0-9]+))?/);
        if (match) {
            return [match[1] | 0, 0 | match[2], 0 | match[3]];
        }

        throw util.format("cannot parse version '%s'", first_line);
    }

    return run('ledger', ['--version']).then(
        function (streams) {
            return parse_version(streams[0]);
        }
    );
}

function date(year, month, day) {
    return [ year, month, day ];
}

function amount(qty, commodity) {
    return {
        quantity: new BigNum(qty),
        commodity: commodity,
    };
}

function ledger_date_to_tuple(text) {
    var match = text.match(/([0-9]+)\/([0-9]+)\/([0-9]+)/);
    if (!match) {
        return;
    }

    return date(match[1] | 0, match[2] | 0, match[3] | 0);
}


function xml_stream(data) {
    var deferred = when.defer(),
        parser = new expat.Parser('UTF-8'),
        result = {
            transactions: [],
        },
        stack = [],
        curr;

    parser.on('startElement', function (name, attrs) {
        curr = {
            element: {
                name: name,
                attr: attrs
            },
        };
        curr.parent = stack.length > 0 ? stack[stack.length - 1] : curr;

        stack.push(curr);
    });

    parser.on('text', function (text) {
        var text_elements, prependif;

        text_elements = {
            date: true,
            payee: true,
            name: true,
            symbol: true,
            quantity: true
        };

        prependif =
            function (val, suffix) {
                return (val || '') + suffix;
            };

        if (text_elements[curr.element.name]) {
            curr.element.text = prependif(curr.element.text, text);
        }
    });

    parser.on('endElement', function () {
        var appendif, prev, version;

        appendif =
            function (val, appended) {
                var arr = val || [];
                arr.push(appended);
                return arr;
            };

        prev = stack.pop();
        curr = prev.parent;

        if (prev.element.name === 'transaction') {
            result.transactions.push({
                state: prev.element.attr.state,
                date: prev.element.attr.date,
                payee: prev.element.attr.payee,
                postings: prev.element.attr.postings,
            });
        } else if (prev.element.name === 'ledger' && curr === prev) {
            version = prev.element.attr.version;
            if ((version | 0) < 196608) {
                throw util.format('untested version "%s"', version);
            }
        } else if (prev.element.name === 'posting') {
            prev.element.value = {
                account: prev.element.attr.account,
                amount: prev.element.amount,
            };
        } else if (prev.element.name === 'amount') {
            prev.element.value = amount(prev.element.quantity,
                                        prev.element.commodity);
        }

        if (curr.element.name === 'transaction') {
            if (prev.element.name === 'date') {
                curr.element.attr.date = ledger_date_to_tuple(prev.element.text);
                if (!curr.element.attr.date) {
                    throw util.format('parse error at %j', prev);
                }
            } else if (prev.element.name === 'payee') {
                curr.element.attr.payee = prev.element.text;
            } else if (prev.element.name === 'postings') {
                curr.element.attr.postings = prev.element.value;
            }
        } else if (curr.element.name === 'account' && prev.element.name === 'name') {
            curr.element.value = prev.element.text;
        } else if (curr.element.name === 'posting') {
            if (prev.element.name === 'account') {
                curr.element.attr.account = { name: prev.element.value };
            } else if (prev.element.name === 'post-amount') {
                curr.element.amount = prev.element.value;
            }
        } else if (curr.element.name === 'postings' && prev.element.name === 'posting') {
            curr.element.value = appendif(curr.element.value, prev.element.value);
        } else if (curr.element.name === 'post-amount' && prev.element.name === 'amount') {
            curr.element.value = prev.element.value;
        } else if (curr.element.name === 'commodity' && prev.element.name === 'symbol') {
            curr.element.value = prev.element.text;
        } else if (curr.element.name === 'amount' && prev.element.name === 'commodity') {
            curr.element.commodity = prev.element.value;
        } else if (curr.element.name === 'amount' && prev.element.name === 'quantity') {
            curr.element.quantity = new BigNum(prev.element.text);
        }

    });

    parser.on('error', function (err) {
        throw err;
    });

    parser.on('end', function () {
        console.log('parsed query w/ count: ' + result.transactions.length);
        if (result.transactions.length === 0) {
            console.log('data: ' + data);
        }
        deferred.resolve(result);
    });

    // send data to parser
    parser.end(data);

    return deferred.promise;
}

function query(ledgerfile, args, optional_runner, cache) {
    var run = optional_runner || communicate,
        params = ['-f', ledgerfile, 'xml'].concat(args || []),
        query_key = params.join('.');

    function cache_value(value) {
        if (!cache) {
            return value;
        }

        var watcher_key = ledgerfile + '.iswatched',
            keys_key = ledgerfile + '.keys';

        if (cache[watcher_key] === undefined) {
            watch(ledgerfile, function (file) {
                console.log(util.format('invalidating %s', file));
                cache[keys_key].forEach(function (key) {
                    delete cache[key];
                });
            });
            cache[watcher_key] = true;
        }

        console.log(util.format('caching %s', query_key));

        cache[query_key] = value;
        cache[keys_key] = (cache[keys_key] || []).concat(query_key);

        return value;
    }

    function cache_lookup() {
        if (!cache || cache[query_key] === undefined) {
            return null;
        }

        console.log(util.format('cached run with %s', query_key));
        return cache[query_key];
    }

    function cached_run(ledger, params) {
        if (cache && cache[query_key] !== undefined) {
            return when.resolve(cache[query_key]);
        }

        return run(ledger, params);
    }

    return cached_run('ledger', params).then(function (streams) {
        return cache_lookup() || cache_value(xml_stream(streams[0]));
    });
}

exports.version = version;
exports.query = query;
exports.amount = amount;
exports.date = date;
