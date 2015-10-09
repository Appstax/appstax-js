'use strict';

angular.module('MyApp').controller('UserCtrl', function ($log, $scope, $state, conf, $timeout) {
   $log.debug('Entering UserCtrl');
   
   $scope.email = "";
   $scope.password = "";
   $scope.message = "";
   $scope.conf = conf;
   $scope.error = false;
   
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
          $scope.$apply(function(){
            $scope.error = true;
            $scope.message = "Could not log in. Please verify your username and password.";  
          });

          //Cancel the error after 3 seconds
           $timeout(function(){
            $scope.error = false;
            $scope.message = "";  
          },3000);
          
           
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
        
          $scope.$apply(function(){
            $scope.error = true;
            $scope.message = "Could not sign up.";  
          });

          //Cancel the error after 3 seconds
          $timeout(function(){
            $scope.error = false;
            $scope.message = "";  
          },3000);
                   
       });
   }

   $scope.cancel = function() {
      $state.go("public.landingsite");
   }

   $log.debug('Exiting UserCtrl');
});
