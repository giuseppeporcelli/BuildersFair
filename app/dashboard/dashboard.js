'use strict';

angular.module('customerSentiment.dashboard', ['ngRoute', 'chart.js', 'ui.bootstrap', 'customerSentiment.oauth2'])
	.config(['$routeProvider', function ($routeProvider) {
		$routeProvider.when('/dashboard', {
			templateUrl: 'views/dashboard.html',
			controller: 'dashboardController'
		});

		//Chart.defaults.global.colors = [ '#533842', '#524738', '#6a6845', '#50504e', '#435c63', '#949FB1', '#4D5360'];
	}]);