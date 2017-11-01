'use strict';

angular.module('customerSentiment.dashboard')
.controller('dashboardController', ['$scope', '$http', '$interval', '$q', '$location', 'oauth2Service', '$timeout',
    function ($scope, $http, $interval, $q, $location, oauth2Service, $timeout) {

        var retrievedUserInfo = false;
        var API_ENDPOINT = 'https://5l4fl0vm58.execute-api.us-east-1.amazonaws.com/prod/';
        var REFRESH_INTERVAL_MS = 3000;

        $scope.canAutoRefresh = false;
        $scope.isAutoRefreshing = false;

        $scope.$watch('fromDate', function(newValue, oldValue){
            if (newValue !== oldValue){
                setCanAutoRefresh(newValue);

                if ($scope.isAutoRefreshing) {
                    stopAutoRefresh();
                }
            }
        });

        // From Date settings.
        $scope.fromDateOptions = {
            dateDisabled: false,
            formatYear: 'yy',
            startingDay: 1
        };
        $scope.openFromDate = () => {
            $scope.fromDatePopup.opened = true;
        };
        $scope.fromDateFormat = 'dd/MM/yyyy';
        $scope.fromDatePopup = {
            opened: false
        };
        $scope.fromDate = new Date();
        $scope.fromDate.setHours(0,0,0,0);
        setCanAutoRefresh($scope.fromDate);

        // End Date settings.
        $scope.endDateOptions = {
            dateDisabled: false,
            formatYear: 'yy',
            startingDay: 1
        };
        $scope.openEndDate = () => {
            $scope.endDatePopup.opened = true;
        };
        $scope.endDateFormat = 'dd/MM/yyyy';
        $scope.endDatePopup = {
            opened: false
        };
        $scope.endDate = new Date();

        // Initialization.
        setupCharts();
        oauth2Service.token().then(accessToken => {
            getUserInfo(accessToken);
        })
        
        function setCanAutoRefresh(newValue){
            var currentDate = new Date();

            if (newValue.getDate() === currentDate.getDate() &&
                newValue.getMonth() === currentDate.getMonth() &&
                newValue.getFullYear() === currentDate.getFullYear()){
                    $scope.canAutoRefresh = true;
                }
            else{
                $scope.canAutoRefresh = false;
            }
        };

        function setupCharts() {
            // Sentiment
            $scope.sentimentLabels = ["Happy", "Sad", "Angry", "Confused", "Disgusted", "Surprised", "Calm", "Unknown"];
            $scope.sentimentData = [0, 0, 0, 0, 0, 0, 0, 0];
            $scope.sentimentOptions = {
                legend: {
                    display: true,
                    position: 'top'
                }
            };

            // Gender
            $scope.genderLabels = ["Male", "Female"];
            $scope.genderData = [0, 0];
            $scope.genderOptions = {
                legend: {
                    display: true,
                    position: 'top'
                }
            };

            // Age Range
            $scope.ageRangeLabels = ["0-20", "20-40", "40-50", "50-80"];
            $scope.ageRangeData = [0, 0, 0, 0];
            $scope.ageRangeOptions = {
                scales: {
                    yAxes: [{
                        barPercentage: 0.8
                    }],
                    xAxes: [{
                        display: true,
                        ticks: {
                            beginAtZero: true
                        }
                    }]
                },
            };

            // Skipped faces
            $scope.skippedCount = 0;
            // Valid faces
            $scope.validCount = 0;
        };

        // Builds Requests.
        function buildRequest(accessToken, path, fromDate, endDate){
            var dayNumber = fromDate.getDate();
            var dayString = dayNumber <= 9 ? '0' + dayNumber.toString() : dayNumber.toString();
            var monthNumber = fromDate.getMonth() + 1;
            var monthString = monthNumber <= 9 ? '0' + monthNumber.toString() : monthNumber.toString();

            var resultDate = moment.utc(fromDate.getFullYear() + '-' + monthString + '-' + dayString).valueOf();
            var epochTime = resultDate.toString();
            epochTime = epochTime.substring(0, 10);

            var requestUrl = API_ENDPOINT + path + '?day=' + epochTime;

            var req = {
                method: 'GET',
                url: requestUrl,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + accessToken
                }
            };

            return $http(req);
        };

        function getUserInfo(access_token) {
			if (!retrievedUserInfo){
				AWSCognito.config.region = 'eu-west-1';
				var provider = new AWSCognito.CognitoIdentityServiceProvider();

				var params = { 
					AccessToken: access_token
				};

				provider.getUser(params, function(err, result) {
					if (err) {
						console.error(JSON.stringify(err));
						return;
					}
					if (result && result.UserAttributes){
						for (var index in result.UserAttributes){
							var attribute = result.UserAttributes[index];
							if (attribute.Name == 'email'){
								$scope.$emit('email.retrieved', {
									emailAddress: attribute.Value
								});

								$scope.$emit('logout.visibility', {
									showLogoutButton : true
								});

								retrievedUserInfo = true;
                                $scope.$apply();
							}
						}
					}
				});
			}
		};

        var stopTime;

        $scope.getData = () => {
            if (!$scope.isAutoRefreshing){
                setupCharts();
                refreshCharts();
            }
        };

        $scope.$watch('isAutoRefreshing', function(newValue, oldValue){
            if (newValue !== oldValue){
                if (newValue){
                    startAutoRefresh();
                }
                else {
                    stopAutoRefresh();
                }
            }
        });

        $scope.toggleAutoRefreshing = () => {
            $scope.isAutoRefreshing = !$scope.isAutoRefreshing;
        }


        function startAutoRefresh() {
            setupCharts();
            refreshCharts();
            stopTime = $interval(refreshCharts, REFRESH_INTERVAL_MS);
        };

        function stopAutoRefresh() {
            if (stopTime){
                $interval.cancel(stopTime);
            }
        };

        // Refreshes all chars by getting data from the servers.
        function refreshCharts() {

            oauth2Service.token().then(function(accessToken)
            {
                if (accessToken) {

                // Gender promise
                var genderPromise = buildRequest(accessToken, 'sex', $scope.fromDate, $scope.endDate);
                // Sentiment promise
                var sentimentPromise = buildRequest(accessToken, 'sentiment', $scope.fromDate, $scope.endDate);
                // Age Range promise
                var ageRangePromise = buildRequest(accessToken, 'ages', $scope.fromDate, $scope.endDate);
                // Skipped promise
                var skippedPromise = buildRequest(accessToken, 'skipped', $scope.fromDate, $scope.endDate);

                var allPromises = [genderPromise, sentimentPromise, ageRangePromise, skippedPromise];

                return $q.all(allPromises).then((allReturnValues) => {
                    if (allReturnValues){

                        var genderResponse = allReturnValues[0].data;
                        if (genderResponse && genderResponse.Item){
                            $scope.genderData = [genderResponse.Item.Male ? parseInt(genderResponse.Item.Male.N) : 0, 
                            genderResponse.Item.Female ? parseInt(genderResponse.Item.Female.N) : 0];
                        }

                        var sentimentResponse = allReturnValues[1].data;
                        if (sentimentResponse && sentimentResponse.Item){

                            $scope.sentimentData = [sentimentResponse.Item.HAPPY ? parseInt(sentimentResponse.Item.HAPPY.N) : 0,
                                sentimentResponse.Item.SAD ? parseInt(sentimentResponse.Item.SAD.N) : 0,
                                sentimentResponse.Item.ANGRY ? parseInt(sentimentResponse.Item.ANGRY.N) : 0,
                                sentimentResponse.Item.CONFUSED ? parseInt(sentimentResponse.Item.CONFUSED.N) : 0,
                                sentimentResponse.Item.DISGUSTED ? parseInt(sentimentResponse.Item.DISGUSTED.N) : 0,
                                sentimentResponse.Item.SURPRISED ? parseInt(sentimentResponse.Item.SURPRISED.N) : 0,
                                sentimentResponse.Item.CALM ? parseInt(sentimentResponse.Item.CALM.N) : 0,
                                sentimentResponse.Item.UNKNOWN ? parseInt(sentimentResponse.Item.UNKNOWN.N) : 0];
                        }

                        var ageRangeResponse = allReturnValues[2].data;
                        if (ageRangeResponse && ageRangeResponse.Item){
                            var keys = Object.keys(ageRangeResponse.Item);
                            $scope.ageRangeLabels = [];
                            $scope.ageRangeData = [];
                            keys.forEach(k => {
                                if (k !== 'date' && k !== 'HumanDate'){
                                    $scope.ageRangeLabels.push(k);
                                    $scope.ageRangeData.push(parseInt(ageRangeResponse.Item[k].N));
                                }
                            });
                        }

                        var skippedResponse = allReturnValues[3].data;
                        if (skippedResponse && skippedResponse.Item){
                            if (skippedResponse.Item.skipped){
                                $scope.skippedCount = parseInt(skippedResponse.Item.skipped.N);
                            }
                            else {
                                $scope.skippedCount = 0;
                            }
                            if (skippedResponse.Item.valid){
                                $scope.validCount = parseInt(skippedResponse.Item.valid.N) - $scope.skippedCount;
                            }
                            else {
                                $scope.validCount = 0;
                            }
                        }
                    }
                }).catch((reason) => {
                    console.error('Unable to get data: ' + reason);
                });
            }
            }).catch((reason) => {
                console.error('Unable to get token: ' + reason);
            });;
        };
    }]);
    