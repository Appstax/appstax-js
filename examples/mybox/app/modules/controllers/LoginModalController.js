

app.controller("LoginModalController", function($scope, $modalInstance, UserService) {

	$scope.model = {
		email: "",
		password: "",
		error: ""
	}

	$scope.ok = function() {
		$scope.model.error = "";
		var u = $scope.model;
		UserService.login(u.email, u.password).then(function() {
			$modalInstance.close();
		}, function(error) {
			$scope.model.error = error.message;
		});
	}

	$scope.cancel = function() {
		console.log("cancel");
		$modalInstance.dismiss("cancel");
	}

});