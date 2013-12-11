"use strict";

// this is a server

var ledger = require('./lib/io/jw-ledger');

console.log('testing ledger');

ledger.version().then(function (version) {
    console.log(version);
}).then(function () {
    console.log('querying ledger');
    return ledger.query(
        '/Volumes/ACTIVEDOCS/financial/ledger.dat',
        ['^Assets:Checking:ING', '^Liabilities:ING']
    );
}).then(function (data) {
    console.log(data);
}, function (err) {
    console.log(err.stack);
});
