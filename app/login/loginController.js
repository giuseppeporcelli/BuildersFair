'use strict';

angular.module('customerSentiment.login')
    .controller('loginController', ['$scope', '$http', '$q', '$location', '$window', 'oauth2Service', 
    function ($scope, $http, $q, $location, $window, oauth2Service) {

        $scope.$emit('logout.visibility', {
            showLogoutButton : false
        });

        // Login.
        $scope.login = () => {

            // Checks if an OAuth2 token is available (either refresh or access token).
            // If no token is available, starts the OAuth2 authorization flow.
            var hasToken = oauth2Service.hasTokens();
            if (hasToken) {
                $location.path('/dashboard');
            }
            else{
                oauth2Service.authorize();
            }
        };
    }
]);
