
app.directive("mbxFileselect", ["$parse", function($parse) {
    return {
        restrict : "A",
        link: function (scope, elem, attr) {
            elem.bind('change', function(event) {
                event.stopPropagation();
                event.preventDefault();
                
                var files = this.files;
                var fn = $parse(attr["mbxFileselect"]);
                scope.$apply(function() {
                    fn(scope, {files:files});
                });
            });
        }
    }
}]);
