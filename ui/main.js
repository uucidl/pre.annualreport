"use strict";

var d3 = require('d3');
var util = require('util');

function attach_list(selection, list) {
    var rows = selection
        .selectAll('tr')
        .data(list)
        .enter()
        .append('tr');

    rows.append('td').text(function (d) { return d.name + " "; });
    rows.append('td').text(function (d) { return Math.round(d.total) + " " + d.unit; });
}

function load(period, uiconsole, payee_elements, account_elements) {
    var odd_payees_url = util.format(
            'http://localhost:3000/v1/odd_payees?limit=5&period=%d',
            period
        ),
        odd_accounts_url = util.format(
            'http://localhost:3000/v1/odd_accounts?limit=5&period=%d',
            period
        );
    d3.json(odd_payees_url, function (json) {
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

    d3.json(odd_accounts_url, function (json) {
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
