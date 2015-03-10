
app.controller("NavigationController", function($scope, $state, UserService, ItemService) {

	$scope.navbarCollapsed = true;
	$scope.isLoggedIn = UserService.isLoggedIn;

	$scope.addItems = function(files) {
		$scope.navbarCollapsed = true;
		var items = ItemService.createItems(files);
        ItemService.saveItems(items);
	}
	
	$scope.logout = function() {
		UserService.logout();
		$state.go("frontpage");
	}

	$scope.login = function() {
		UserService.requireLogin().then(function() {
			$state.go("items");
		});
	}
});