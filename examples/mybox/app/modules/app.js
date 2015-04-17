

appstax.init("ZDJkOWI4OTUtZTRmZS00OTEzLTQxMDktOGM0YzY0ZjZjNTY3");

var app = angular.module("MyBoxApp", ["ui.bootstrap","ui.router","angular-ladda"]);

app.run(function(UserService) {
	if(location.pathname === "/" && location.hash === "") {
        location.replace(UserService.isLoggedIn() ? "/#/items" : "/#/");
    }
})
