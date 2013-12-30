"use strict";

var d3 = require('d3');
var util = require('util');
var querystring = require('querystring');
var sparkline = require('./sparkline');

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

    rows.append('td')
        .each(function (d) {
            var element = d3.select(this),
                history;

            if (d.history && d.history.length > 0) {
                history = d.history.map(function (e) {
                    return Math.round(e);
                });

                sparkline.sparkline(16, history).curve(element);
            }
        });
}

function load(period, uiconsole, expenses_elements, incomes_elements, equity_elements) {
    function api_url(service, params) {
        return util.format('/v1/%s%s', service, querystring ? '?' + querystring.stringify(params) : '');
    }

    var expenses_url = api_url("expenses", { limit: 10, period: period }),
        incomes_url = api_url("incomes", { limit: 5, period: period }),
        equity_url = api_url("equity", { period: period });

    d3.json(expenses_url, function (json) {
        Object.keys(json).forEach(function (key) {
            var selection = d3.select(
                expenses_elements[key]
            );

            attach_list(selection, json[key]);
        });
        uiconsole.say('Loaded expenses');
    });

    d3.json(incomes_url, function (json) {
        Object.keys(json).forEach(function (key) {
            var selection = d3.select(
                incomes_elements[key]
            );

            attach_list(selection, json[key]);
        });
        uiconsole.say('Loaded incomes');
    });

    d3.json(equity_url, function (json) {
        Object.keys(json).forEach(function (key) {
            var selection = d3.select(
                equity_elements[key]
            );

            attach_list(selection, json[key]);
        });
        uiconsole.say('Loaded equity');
    });
}

exports.load = load;
