
app.config(["$stateProvider", function($stateProvider) {
    $stateProvider.state("frontpage", {
        url: "/",
        templateUrl: "modules/templates/frontpage.html",
        controller: "FrontpageController"
    })
    $stateProvider.state("items", {
        url: "/items",
        templateUrl: "modules/templates/items.html",
        controller: "ItemsController",
        resolve: {
            allItems: function(ItemService) {
                return ItemService.getAllItems();
            }
        }
    });
}]);
