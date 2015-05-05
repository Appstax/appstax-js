'use strict';

angular.module('MyApp').controller('UserCtrl', function ($log, $scope, $state, conf) {
   $log.debug('Entering UserCtrl');
   
   $scope.email = "";
   $scope.password = "";
   $scope.message = "";
   $scope.conf = conf;
   
   $scope.login = function(){
   	 $log.debug("Login is called");
   	 $log.debug("Username is: " + $scope.email);
   	 $log.debug("Password is is: " + $scope.password);
   	 appstax.login($scope.email, $scope.password)
       .then(function(user) {
        $scope.error = false;
           $log.debug("User logged in successfully...");
           $state.go('app');

       })
       .fail(function(error) {
          $scope.error = true;
           $scope.message = error.message;
           
       });
   }

   $scope.signup = function(){
     $log.debug("Signup is called");
     $log.debug("Username is: " + $scope.email);
     $log.debug("Password is is: " + $scope.password);
     appstax.signup($scope.email, $scope.password)
       .then(function(user) {          
           $log.debug("User logged in successfully...");
           $state.go('app');

       })
       .fail(function(error) {
        $scope.error = true;
           $scope.message = error.message;
           
       });
   }

   $scope.cancel = function() {
      $state.go("public.landingsite");
   }

   $log.debug('Exiting UserCtrl');
});
