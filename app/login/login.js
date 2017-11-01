'use strict';

angular.module('customerSentiment.login', ['ngRoute', 'chart.js', 'ui.bootstrap', 'customerSentiment.oauth2'])
	.config(['$routeProvider', function ($routeProvider) {
		$routeProvider.when('/login', {
			templateUrl: 'views/login.html',
			controller: 'loginController'
		});
	}]);