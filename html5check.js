"use strict";

var fs = require('fs'),
    html5Lint = require('html5-lint'),
    util = require('util');

process.argv.forEach(function (file_path, index) {
    if (index < 2) {
        return;
    }
    fs.readFile(file_path, 'utf8', function (err, html) {
        console.log(util.format('parsing %s', file_path));
        if (err) {
            throw err;
        }

        html5Lint(html, function (err, results) {
            var an_error = false;
            console.log(err);

            results.messages.forEach(function (msg) {
                var type = msg.type, // error or warning
                    message = msg.message;

                console.log("HTML5 Lint [%s]: %s", type, message);
                if (type === 'error') {
                    an_error = true;
                }
            });

            if (an_error) {
                throw util.format('An error was detected in your HTML file %s', file_path);
            }
        });
    });
});
