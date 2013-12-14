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

function load(uiconsole, odd_payee_element) {
    d3.json('http://localhost:3000/v1/odd_payees?limit=5', function (json) {
        attach_payees(d3.select(odd_payee_element).append('ul').classed('liabilities', true),
                      json.expenses_by_count);
        attach_payees(d3.select(odd_payee_element).append('ul'),
                      json.income_by_count);
        uiconsole.say('Loaded');
    });
}

exports.load = load;
exports.attach_payees = attach_payees;
