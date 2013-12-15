"use strict";

var d3 = require('d3');

function attach_list(selection, list) {
    selection
        .selectAll('li')
        .data(list)
        .enter()
        .append('li')
        .text(function (d) { return d; });
}

function load(uiconsole, payee_elements, account_elements) {
    d3.json('http://localhost:3000/v1/odd_payees?limit=5', function (json) {
        Object.keys(json).forEach(function (key) {
            var selection = d3.select(
                payee_elements[key]
            );

            if (key.match(/^expenses/)) {
                selection.classed('liabilities', true);
            }

            attach_list(selection, json[key]);
        });
        uiconsole.say('Loaded payees');
    });

    d3.json('http://localhost:3000/v1/odd_accounts?limit=5', function (json) {
        Object.keys(json).forEach(function (key) {
            var selection = d3.select(
                account_elements[key]
            );

            if (key.match(/^expenses/)) {
                selection.classed('liabilities', true);
            }

            attach_list(selection, json[key]);
        });
        uiconsole.say('Loaded accounts');
    });
}

exports.load = load;
