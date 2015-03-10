

app.controller("EditItemModalController", function($scope, $modalInstance, item, UserService) {

	$scope.item = item;
	$scope.changes = {
		description: item.description
	}

	$scope.hasChanges = function() {
		return $scope.changes.description != $scope.item.description;
	}

	$scope.save = function() {
		$scope.item.username = UserService.username();
		$scope.item.description = $scope.changes.description;
		$scope.item.save();
		$modalInstance.close();
	}

	$scope.close = function() {
		$modalInstance.close();
	}

});