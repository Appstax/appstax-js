
app.directive("mbxMaxheight", ["$parse", "$timeout", function($parse, $timeout) {
    return {
        restrict : "A",
        link: function (scope, elem, attr) {

            update();
            $(window).resize(function() {
                update();
            });

            function update() {
                if(elem.is("img")) {
                    if(elem[0].naturalHeight == 0) {
                        $timeout(update, 50);
                    } else {
                        var img = elem[0];
                        var percent = parseInt(attr["mbxMaxheight"]);
                        console.log("percent", percent);
                        var aspect = img.naturalWidth / img.naturalHeight;
                        var newHeight = (percent/100) * $(window).height();
                        var newWidth = newHeight * aspect;
                        
                        elem.height(newHeight);
                        elem.width(newWidth);

                        var actualWidth = elem.width();
                        if(actualWidth < newWidth) {
                            newWidth = actualWidth;
                            newHeight = newWidth / aspect;
                            elem.height(newHeight);
                            elem.width(newWidth);
                        }
                    }
                }
            }
        }
    }
}]);