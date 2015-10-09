'use strict';

//
//  Initialize the Appstax app engine with your appkey
//
appstax.init("<<appstax-app-key>>");

var module = angular.module('MyApp', [
    'ngSanitize',    
    'ui.router'
  ])
  .config(['$stateProvider', '$urlRouterProvider', '$locationProvider', '$httpProvider', 
    function ($stateProvider, $urlRouterProvider, $locationProvider, $httpProvider, $log, conf) {

      $stateProvider
        .state('public', {
          template: '<ui-view>',
          abstract: true    
      });


      $stateProvider
        .state('public.landingsite', {
          url: '/',
          templateUrl: 'modules/main/landingsite.html',
          controller: 'OpenCtrl'
      });

        $stateProvider
        .state('public.login', {
         url: '/login', 
        templateUrl: 'modules/user/login.html',
        controller: 'UserCtrl'
      });

      $stateProvider
        .state('public.signup', {
          url: '/signup',
          templateUrl: 'modules/user/signup.html',
          controller: 'UserCtrl'
      });

      $stateProvider
      .state('app', {
        url: '/app',
        templateUrl: 'modules/main/main.html',
        controller: 'MainCtrl',

        resolve: {
          data: function(DataService, $q, $log) {

            // Uncomment this if you want to fetch collection data from
            // the Appstax back-end. Remember, you must pride a colleciton name that exists
            // in your app.

            /*var deferred = $q.defer();
                DataService.getCollection("mailinglist").then(function(data){                  
                  deferred.resolve(data);
                }, function(error){
                  $log.error('Could not get data', error);
                });
              return deferred.promise;*/
          }
        }
      });

      $urlRouterProvider.otherwise('/#/');
      
      // Send browser to landing page "/#/" when URL is "/"
      if(location.pathname === "/" && location.hash === "") {
        location.replace("/#/");
      }

  }]);

/* Configure degug logging */
module.config(function ($logProvider) {
  $logProvider.debugEnabled(true);
});


/* Directive for autofocusing the input field in modals */

module.directive('focusMe', function($timeout) {
    return function(scope, element, attrs) {
        attrs.$observe('focusMe', function(value) {
            if ( value==="true" ) {
                $timeout(function(){
                    element[0].focus();
                },5);
            }
        });
    }
});

/*
 * Module that checks if the user is logged in every time a route is changed.
 * If the user is logged in he gets to proceed to the requested url, if not he is redirected to
 * the main page.
 */

module.run(['$rootScope', '$state', '$location', '$log', function ($rootScope, $state, $location, $log) {
  $rootScope.$on("$stateChangeStart", function (event, toState, fromState, fromParams) {

    $rootScope.loading = true;
    if (appstax.currentUser()) {
      $rootScope.currentUser = appstax.currentUser().username;
      $log.debug('User is logged in');
      $location.path("/app");
    } else {
      $location.path("/");
      $log.debug('User is not logged in');
    }
   
  });

  $rootScope.$on("$stateChangeSuccess", function (event, toState, fromState, fromParams) {
        
    $rootScope.loading = false;
        
  });

  $rootScope.$on('$stateChangeError', function(event, toState, toParams, fromState, fromParams, error){
    $log.error('Error from stateChange: ' + error);
  });

    // somewhere else
  $rootScope.$on(['$stateNotFound', '$log'],
    function(event, unfoundState, fromState, fromParams, $log){
        $log.error('Unfound state to' + JSON.stringify(unfoundState.to)); 
        $log.error('unfoundState params:',  unfoundState.toParams);
        $log.error('unfoundState options:', unfoundState.options); 
    });
}]);


 
