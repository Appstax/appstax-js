
app.directive("mbxFiledrop", ["$parse", function($parse) {
    return {
        restrict : "A",
        link: function (scope, elem, attr) {
            elem.bind('drop', function(event) {
                event.stopPropagation();
                event.preventDefault();
                var files = event.originalEvent.dataTransfer.files;
                var fn = $parse(attr["mbxFiledrop"]);
                scope.$apply(function() {
                    fn(scope, {files:files});
                });
            });
            elem.bind("dragover", function(event) {
                event.preventDefault();
            });
            elem.bind("dragenter", function(event) {
                event.preventDefault();
            });
        }
    }
}]);
