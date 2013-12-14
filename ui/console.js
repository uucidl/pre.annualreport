"use strict";

var d3 = require('d3');

function Console(element) {
    this.element = element;
}

Console.prototype.say = function (msg) {
    d3.select(this.element).append('div').text(msg);
};

exports.Console = Console;
