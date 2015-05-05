'use strict';

var module = angular.module('MyApp');

module.service('Service', ['$http', '$q', '$log', function($http, $q, $log) {
	$log.debug("Entering Service");

	this.getSomething = function(){
		
	}
	$log.debug("Exiting Service");
}]);