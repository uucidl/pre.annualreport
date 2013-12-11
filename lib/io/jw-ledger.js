"use strict";

var when = require('when');
var stream = require('stream');
var nodefn = require('when/node/function');
var subprocess = require('child_process');
var util = require('util');

function communicate(cmd, args) {
    var deferred, stdout_deferred, stderr_deferred, process
    ,stdout_buffer, stderr_buffer;

    deferred = when.defer();
    stdout_deferred = when.defer();
    stderr_deferred = when.defer();
    stdout_buffer = new Buffer(0);
    stderr_buffer = new Buffer(0);

    console.log(util.format('INFO spawning %s %j'));
    process = subprocess.spawn(cmd, args);
    deferred.notify(process);

    process.stdout.on('data', function (data) {
	stdout_buffer = Buffer.concat([stdout_buffer, data]);
    });
    process.stderr.on('data', function (data) {
	stderr_buffer = Buffer.concat([stderr_buffer, data]);
    });


    process.stdout.on('end', function () {
	stdout_deferred.resolve(stdout_buffer.toString());
    });
    process.stderr.on('end', function () {
	stderr_deferred.resolve(stderr_buffer.toString());
    });
    process.on('exit', function (rc) {
	console.log(util.format('INFO %s %j finished with %d', cmd, args, rc));
	if (stdout_deferred.promise.inspect().state === 'pending') {
	    stdout_deferred.resolve('');
	}

	if (stderr_deferred.promise.inspect().state === 'pending') {
	    stderr_deferred.resolve('');
	}

	when.settle(
	    [stdout_deferred.promise, stderr_deferred.promise]
	).done(function(results) {
	    if (rc !== 0) {
		deferred.reject(util.format(
		    'cmd %s %j failed with return code %d: [\n%s]', cmd, args, rc,
		    results[1].value.toString()
		));
		return;
	    }

	    console.log(util.format('INFO cmd %s %j has finished', cmd, args));

	    deferred.resolve(
		[
		    results[0].state === 'fulfilled' ? results[0].value : '',
		    results[1].state === 'fulfilled' ? results[1].value : ''
		]
	    );
	});
    });


    return deferred.promise;
}

function version() {
    var run = arguments[0] || communicate;

    function parse_version(version_str) {
	var first_line, match;

	first_line = version_str.split('\n')[0];

	match = first_line.match(/Ledger ([0-9]+)(?:\.([0-9]+))?(?:\.([0-9]+))?/)
	if (match) {
	    return [0|match[1], 0|match[2], 0|match[3]];
	}

	throw util.format("cannot parse version '%s'", first_line);
    }

    return run('ledger', ['--version']).then(
	function (streams) {
	    return parse_version(streams[0]);
	}
    );
}

function xml_stream(data) {
    return data;
}

function query(ledgerfile, args, _runner) {
    var run = _runner || communicate;

    return run('ledger', ['-f', ledgerfile, 'xml'].concat(args)).then(function (streams) {
	return xml_stream(streams[0]);
    });
}

exports.version = version;
exports.query = query;
