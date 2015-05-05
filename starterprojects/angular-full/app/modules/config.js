angular.module('MyApp').provider("conf", function() {
  
return {
    $get: function () {
      return {
        siteName: "MyApp"
      };
    }
  };

});