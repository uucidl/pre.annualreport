var Console = require('./ui/console').Console;
var main = require('./ui/main');
var uiconsole = new Console(document.getElementById("console"));
var year = document.getElementById('year').textContent;

uiconsole.say('Loading...');
main.load(year,
	  uiconsole,
	  {
	      'income_by_count':    document.getElementById('payee-income_by_count'),
	      'expenses_by_count':  document.getElementById('payee-expenses_by_count'),
	      'income_by_amount':   document.getElementById('payee-income_by_amount'),
	      'expenses_by_amount': document.getElementById('payee-expenses_by_amount'),
	  },
	  {
	      'income_by_count':    document.getElementById('account-income_by_count'),
	      'expenses_by_count':  document.getElementById('account-expenses_by_count'),
	      'income_by_amount':   document.getElementById('account-income_by_amount'),
	      'expenses_by_amount': document.getElementById('account-expenses_by_amount'),
	  },
	  {
	      'expenses': document.getElementById('total-expenses'),
	      'incomes': document.getElementById('total-income'),
	      'expenses_count': document.getElementById('count-expenses'),
	      'incomes_count': document.getElementById('count-income'),
	      'assets': document.getElementById('total-assets'),
	      'liabilities': document.getElementById('total-liabilities')
	  }
	 );
