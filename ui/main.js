"use strict";

var d3 = require('d3');
var util = require('util');
var querystring = require('querystring');

function attach_list(selection, list) {
    var rows = selection
        .selectAll('tr')
        .data(list)
        .enter()
        .append('tr');

    rows.append('td').text(function (d) { return d.name + " "; });
    rows.append('td')
        .classed("number", true)
        .text(function (d) { return Math.round(d.total); });
    rows.append('td')
        .classed('linked', true)
        .text(function (d) { return d.unit; });
}

function load(period, uiconsole, payee_elements, account_elements, flows_elements) {
    function api_url(service, params) {
        return util.format('http://localhost:3000/v1/%s%s', service, querystring ? '?' + querystring.stringify(params) : '');
    }

    var odd_payees_url = api_url("odd_payees", { limit: 5, period: period }),
        odd_accounts_url = api_url("odd_accounts", { limit: 5, period: period }),
        flows_url = api_url("flows", { period: period });

    d3.json(odd_payees_url, function (json) {
        Object.keys(json).forEach(function (key) {
            var selection = d3.select(
                payee_elements[key]
            );

            attach_list(selection, json[key]);
        });
        uiconsole.say('Loaded payees');
    });

    d3.json(odd_accounts_url, function (json) {
        Object.keys(json).forEach(function (key) {
            var selection = d3.select(
                account_elements[key]
            );

            attach_list(selection, json[key]);
        });
        uiconsole.say('Loaded accounts');
    });

    d3.json(flows_url, function (json) {
        if (!json) {
            uiconsole.say('could not load flows');
        }
        Object.keys(json).forEach(function (key) {
            var selection = d3.select(flows_elements[key]);
            attach_list(selection, json[key]);
        });
        uiconsole.say('Loaded flows');
    });
}

exports.load = load;
