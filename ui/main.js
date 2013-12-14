"use strict";

var d3 = require('d3');

function attach_payees(selection, payees) {
    selection
        .selectAll('li')
        .data(payees)
        .enter()
        .append('li')
        .text(function (d) { return d; });
}

function load(uiconsole, payee_elements) {
    d3.json('http://localhost:3000/v1/odd_payees?limit=5', function (json) {
        Object.keys(json).forEach(function (key) {
            var selection = d3.select(
                payee_elements[key]
            ).append('ul');

            if (key.match(/^expenses/)) {
                selection.classed('liabilities', true);
            }

            attach_payees(selection, json[key]);
        });
        uiconsole.say('Loaded');
    });
}

exports.load = load;
exports.attach_payees = attach_payees;
