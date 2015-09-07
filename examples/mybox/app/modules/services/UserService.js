
app.service("UserService", function($q, $modal) {

    this.signup = function(options) {
        return $q.when(appstax.signup(options.email, options.password, true, {email:options.email, name:options.name}));
    }

    this.login = function(email, password) {
        return $q.when(appstax.login(email, password));
    }

    this.logout = function() {
        return $q.when(appstax.logout());
    }

    this.isLoggedIn = function() {
        return appstax.currentUser() != null;
    }

    this.username = function() {
        var u = "";
        if(this.isLoggedIn()) {
            u = appstax.currentUser().username;
        }
        return u;
    }

    this.requireLogin = function() {
        var defer = $q.defer();
        var modalInstance = $modal.open({
            templateUrl: "modules/templates/login.html",
            controller: "LoginModalController",
            size: "sm"
        });

        modalInstance.result.then(function (selectedItem) {
            console.log("result");
            defer.resolve({});
        }, function () {
            console.log("dismissed");
        });
        return defer.promise;
    }

});