
app.controller("FrontpageController", function($scope, $state, $q, $timeout, UserService, ItemService) {

    $scope.maxShowItems = 4;
    $scope.items = [];
    $scope.signup = {};
    $scope.upload = {activity:false, status:""};
    $scope.saving = false;
    $scope.error = "";

    $scope.addItems = function(files) {
        $scope.showSignup = true;
        $timeout(function() {
            var items = ItemService.createItems(files);
            items.forEach(function(item) {
                $scope.items.unshift(item);
            })
            $scope.items.slice(0, $scope.maxShowItems).forEach(function(item) {
                item.file.preview().then(function() { $scope.$apply() });    
            });
        }, 100);
    }

    $scope.submitSignup = function() {
        $scope.error = "";
        $scope.upload.activity = true;
        $scope.upload.status = "Signing up!"
        UserService.signup($scope.signup)
        .then(function() {
            $scope.upload.status = "Uploading... 1 of " + $scope.items.length;
            return ItemService.saveItems($scope.items, function(done, total) {
                $scope.$apply(function() {
                    $scope.upload.activity = done / total;
                    $scope.upload.status = "Uploading... " + done + " of " + total;
                });
            });
        }, function(error) {
            console.log("Signup error: " + error.mesage, error);
            $scope.error = error.message;
            $scope.upload.activity = false;
            $scope.upload.status = "";
            throw error;
        })
        .then(function() {
            $scope.upload.activity = false;
            $state.go("items");
        },function(error) {
            console.log("Save error: " + error.message, error);
            $scope.error = error.message;
        });
    }

});