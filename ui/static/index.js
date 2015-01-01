var Console = require('ui.console').Console;
var main = require('ui.main');
var uiconsole = new Console(document.getElementById("console"));
var year = document.getElementById('year').textContent;

uiconsole.say('Loading...');
main.load(year,
          uiconsole,
          {
              'payees_by_count':  document.getElementById('payee-expenses_by_count'),
              'payees_by_amount': document.getElementById('payee-expenses_by_amount'),
              'accounts_by_count':  document.getElementById('account-expenses_by_count'),
              'accounts_by_amount': document.getElementById('account-expenses_by_amount'),
              'balances': document.getElementById('total-expenses'),
              'balances_count': document.getElementById('count-expenses'),
          },
          {
              'balances': document.getElementById('total-income'),
              'payees_by_count':    document.getElementById('payee-income_by_count'),
              'payees_by_amount':   document.getElementById('payee-income_by_amount'),
              'accounts_by_count':    document.getElementById('account-income_by_count'),
              'accounts_by_amount':   document.getElementById('account-income_by_amount'),
              'balances_count': document.getElementById('count-income'),
          },
          {
              'assets_total': document.getElementById('total-assets'),
              'liabilities_total': document.getElementById('total-liabilities')
          }
         );
