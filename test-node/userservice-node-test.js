
var appstax = require("../src/appstax");
var nock    = require("nock");

describe("User service under node.js", function() {

    var setItemSpy;
    var appKey;
    var appKeyCounter = 0;
    var apiClient;

    beforeEach(function() {
        appKey = "test-app-key-" + (appKeyCounter++);
        _appstaxInit();
    });

    afterEach(function() {
        appstax.logout();
    });

    function _appstaxInit() {
        appstax.init({appKey:appKey, baseUrl: "http://localhost:3000/api/latest", log:false});
        apiClient = appstax.apiClient;
    }

    it("should POST signup", function() {
        var mock = nock("http://localhost:3000/")
                    .post("/api/latest/users?login=false", {sysUsername:"frank", sysPassword:"secret"}).reply(200, {})

        return appstax.signup("frank", "secret")
            .then(function() {
                mock.done();
            })
            .fail(function(error) {
                throw error;
            });
    });

    it("should POST login", function() {
        var mock = nock("http://localhost:3000/")
                    .post("/api/latest/sessions", {sysUsername:"frank", sysPassword:"secret"}).reply(200, {})

        return appstax.login("frank", "secret")
            .then(function() {
                mock.done();
            })
            .fail(function(error) {
                throw error;
            });
    });
});
