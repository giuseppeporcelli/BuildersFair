'use strict';

angular.module('customerSentiment', [
  'ngRoute',
  'ngAria',
  'ngAnimate',
  'customerSentiment.oauth2',
  'customerSentiment.login',
  'customerSentiment.dashboard'
]).

  config(['$locationProvider', '$routeProvider', '$httpProvider',
          function ($locationProvider, $routeProvider, $httpProvider) {
    $locationProvider.hashPrefix('!');
    $routeProvider.otherwise({ redirectTo: '/login' });

    $httpProvider.defaults.useXDomain = true;
    delete $httpProvider.defaults.headers.common['X-Requested-With'];

  }])
  .run(['$rootScope', 'oauth2Service', function($rootScope, oauth2Service)
  {
      $rootScope.showLogoutButton = false;

      $rootScope.$on('email.retrieved', function (event, data) {
        $rootScope.emailAddress = data.emailAddress;
      });

      $rootScope.$on('logout.visibility', function (event, data) {
        $rootScope.showLogoutButton = data.showLogoutButton;
      });

      $rootScope.logout = () => {
          oauth2Service.logout();
      };
  }]);
