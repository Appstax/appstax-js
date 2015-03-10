
app.controller("ItemsController", function($scope, $state, $window, $timeout, $modal, allItems, UserService, ItemService) {

    if(!UserService.isLoggedIn()) {
        $state.go("frontpage");
    }

    $scope.items = [];
    $scope.limit = 12;

    updateView(allItems);

    $scope.$on("items:change", function(event, data) {
        updateView(ItemService.allItems);
    });

    function updateView(items) {
        $window.scrollTo(0,0)
        $timeout(function() {
            $scope.items = items.slice().reverse();
        },1);
    }

    $scope.addItems = function(files) {
        var items = ItemService.createItems(files);
        ItemService.saveItems(items);
    }

    $scope.editItem = function(item) {
        var modalInstance = $modal.open({
            templateUrl: "modules/templates/edititem.html",
            controller: "EditItemModalController",
            size: "lg",
            resolve: {
                item: function() { return item; }
            }
        });
    }

    $scope.showMore = function(event) {
        event.preventDefault();
        $scope.limit += 12;
    }

});
