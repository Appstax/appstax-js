/*global todomvc, angular, appstax */
'use strict';

todomvc.controller('TodoCtrl', function TodoCtrl($scope, $location) {

	$scope.model = appstax.model();
	$scope.model.watch('todos');
	$scope.newTodo = '';
	$scope.editedTodo = null;

	$scope.model.on('change', function () {
		var todos = $scope.model.todos;
		$scope.totalCount = todos.length;
		$scope.remainingCount = todos.has('completed', false).length;
		$scope.completedCount = todos.length - $scope.remainingCount;
		$scope.allChecked = $scope.remainingCount === 0;
		$scope.$apply();
	});

	$scope.addTodo = function () {
		var title = $scope.newTodo.trim();
		if (!title.length) {
			return;
		}

		var todo = appstax.object('todos');
		todo.title = title;
		todo.completed = false;
		todo.save();

		$scope.newTodo = '';
	};

	$scope.editTodo = function (todo) {
		$scope.editedTodo = todo;
		$scope.originalTodo = angular.extend({}, $scope.editedTodo);
	};

	$scope.doneEditing = function (todo) {
		$scope.editedTodo = null;
		var title = todo.title.trim();
		if (title) {
			todo.save();
		} else {
			todo.remove();
		}
	};

	$scope.revertEditing = function (todo) {
		todo.title = $scope.originalTodo.title;
		$scope.doneEditing(todo);
	};

	$scope.removeTodo = function (todo) {
		todo.remove();
	};

	$scope.clearCompletedTodos = function () {
		$scope.model.todos.forEach(function (todo) {
			if (todo.completed) {
				todo.remove();
			}
		});
	};

	$scope.markAll = function (allCompleted) {
		$scope.model.todos.forEach(function (todo) {
			todo.completed = allCompleted;
			todo.save();
		});
	};

	if ($location.path() === '') {
		$location.path('/');
	}
	$scope.location = $location;
});
