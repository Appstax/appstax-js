'use strict';

var module = angular.module('MyApp');

module.service('DataService', ['$http', '$q', '$log', function($http, $q, $log) {
	$log.debug("Entering DataService");

	this.getCollection = function(collectionName){
		var deferred = $q.defer();
		$log.debug("Fetching data for: " + collectionName);
		appstax.findAll(collectionName).then(function(objects) {   
           deferred.resolve(objects);
       })
		.fail(function(error) {
           $log.error("Error: " + error);
           deferred.reject(error); 
       });
		return deferred.promise;
	}

	$log.debug("Exiting DataService");
}]);