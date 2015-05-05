'use strict';

angular.module('MyApp').controller('MainCtrl', function ($log, $scope, $state, conf) {
   $log.debug('Entering MainCtrl');
   $scope.currentUser = appstax.currentUser();

   

   $scope.logout = function(){
   	$log.debug("Trying to logout");
   	appstax.logout();
   	$state.go("public.landingsite");
   }
   $log.debug('Exiting MainCtrl');
});
