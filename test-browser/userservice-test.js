
var appstax = require("../src/appstax");
var sinon = require("sinon");
var Q = require("kew");

describe("User service", function() {

    var xhr, requests;
    var setItemSpy;
    var appKey;
    var appKeyCounter = 0;
    var apiClient;

    beforeEach(function() {
        appKey = "test-app-key-" + (appKeyCounter++);
        _appstaxInit();
        requests = [];
        xhr = sinon.useFakeXMLHttpRequest();
        xhr.onCreate = function(request) {
            requests.push(request);
        };
    });

    afterEach(function() {
        xhr.restore();
        var key = "appstax_session_" + appKey;
        delete localStorage[key];
        appstax.logout();
    });

    function _appstaxInit() {
        appstax.init({appKey:appKey, baseUrl: "http://localhost:3000/", log:false});
        apiClient = appstax.apiClient;
    }

    function _createUserSession(username, userId, sessionId) {
        var key = "appstax_session_" + appKey;
        localStorage.setItem(key, JSON.stringify({
            username: username,
            userId: userId,
            sessionId: sessionId
        }));
        _appstaxInit();
    }

    it("should POST signup with login=true as default", function() {
        appstax.signup("frank", "secret");

        expect(requests).to.have.length(1);
        expect(requests[0].method).to.equal("POST");
        expect(requests[0].url).to.equal("http://localhost:3000/users?login=true");
        expect(requests[0].requestBody).to.exist;
        var data = JSON.parse(requests[0].requestBody);
        expect(data).to.have.property("sysUsername", "frank");
        expect(data).to.have.property("sysPassword", "secret");
    });

    it("should POST extra properties with signup", function() {
        appstax.signup("donald", "quack", {fullname:"Donald Duck"});

        expect(requests[0].requestBody).to.exist;
        var data = JSON.parse(requests[0].requestBody);
        expect(data).to.have.property("sysUsername", "donald");
        expect(data).to.have.property("sysPassword", "quack");
        expect(data).to.have.property("fullname", "Donald Duck");
    });

    it("should fulfill promise with user object when signup succeeds", function() {
        var promise = appstax.signup("fred", "holy");

        requests[0].respond(200, {}, JSON.stringify({}));
        return promise.then(function(user) {
            expect(user).to.have.property("username", "fred");
            expect(user).to.have.property("collectionName", "users");
            expect(user).to.not.have.property("password");
        });
    });

    it("should get user id from server on signup", function() {
        var promise = appstax.signup("fred", "holy");

        requests[0].respond(200, {}, JSON.stringify({user:{sysObjectId:"the-user-id"}}));
        return promise.then(function(user) {
            expect(user).to.have.property("id", "the-user-id");
        });
    });

    it("should set current user when signup succeeds with login=true", function() {
        expect(appstax.currentUser()).to.be.null;

        var promise = appstax.signup("howard", "holy", true);

        expect(requests[0].url).to.equal("http://localhost:3000/users?login=true");
        requests[0].respond(200, {}, JSON.stringify({}));
        return promise.then(function(user) {
            expect(appstax.currentUser()).to.not.be.null;
            expect(appstax.currentUser()).to.have.property("username", "howard");
            expect(appstax.currentUser()).to.have.property("collectionName", "users");
            expect(appstax.currentUser()).to.equal(user);
        });
    });

    it("should not set current user when signup succeeds if login=false", function() {
        expect(appstax.currentUser()).to.be.null;

        var promise = appstax.signup("howard", "holy", false);

        expect(requests[0].url).to.equal("http://localhost:3000/users?login=false");
        requests[0].respond(200, {}, JSON.stringify({}));
        return promise.then(function(user) {
            expect(appstax.currentUser()).to.be.null;
        });
    });

    it("should use session id from signup when it succeeds", function() {
        expect(apiClient.sessionId()).to.be.null;
        var promise = appstax.signup("homer", "duff", true);

        requests[0].respond(200, {}, JSON.stringify({sysSessionId:"the-session-id"}));
        return promise.then(function(user) {
            expect(apiClient.sessionId()).to.equal("the-session-id");
        });
    });

    it("should store session id, username and user id on localstorage when signup succeeds", function() {
        expect(localStorage["appstax_session_" + appKey]).to.not.exist;

        var promise = appstax.signup("homer", "duff", true);

        requests[0].respond(200, {}, JSON.stringify({sysSessionId:"the-other-session-id", user:{sysObjectId:"userid"}}));
        return promise.then(function(user) {
            var session = JSON.parse(localStorage["appstax_session_" + appKey]);
            expect(session).to.have.property("sessionId", "the-other-session-id");
            expect(session).to.have.property("username", "homer");
            expect(session).to.have.property("userId", "userid");
        });
    });

    it("should reject promise when signup fails", function() {
        var promise = appstax.signup("homer", "duff");

        requests[0].respond(422, {}, JSON.stringify({errorMessage:"The error"}));
        return promise
            .then(function() {
                throw new Error("Success handler should not be called!");
            })
            .fail(function(error) {
                expect(error).to.be.instanceOf(Error);
                expect(error.message).to.equal("The error");
            });
    });

    it("should POST login", function() {
        appstax.login("frank", "secret");

        expect(requests).to.have.length(1);
        expect(requests[0].method).to.equal("POST");
        expect(requests[0].url).to.equal("http://localhost:3000/sessions");
        expect(requests[0].requestBody).to.exist;
        var data = JSON.parse(requests[0].requestBody);
        expect(data).to.have.property("sysUsername", "frank");
        expect(data).to.have.property("sysPassword", "secret");
    });

    it("should fulfill promise with user object when login succeeds", function() {
        var promise = appstax.login("fred", "holy");

        requests[0].respond(200, {}, JSON.stringify({}));
        return promise.then(function(user) {
            expect(user).to.have.property("username", "fred");
            expect(user).to.have.property("collectionName", "users");
            expect(user).to.not.have.property("password");
        });
    });

    it("should get user id from server on login", function() {
        var promise = appstax.login("fred", "holy");

        requests[0].respond(200, {}, JSON.stringify({user:{sysObjectId:"the-user-id"}}));
        return promise.then(function(user) {
            expect(user).to.have.property("id", "the-user-id");
        });
    });

    it("should get custom user properties from server on login", function() {
        var promise = appstax.login("homer", "duff");

        requests[0].respond(200, {}, JSON.stringify({user:{sysObjectId:"the-user-id-3", fullname:"Homer Simpson"}}));
        return promise.then(function(user) {
            expect(user).to.have.property("fullname", "Homer Simpson");
        });
    });

    it("should set current user when login succeeds", function() {
        var promise = appstax.login("howard", "holy");

        requests[0].respond(200, {}, JSON.stringify({}));
        return promise.then(function(user) {
            expect(appstax.currentUser()).to.not.be.null;
            expect(appstax.currentUser()).to.have.property("username", "howard");
            expect(appstax.currentUser()).to.have.property("collectionName", "users");
            expect(appstax.currentUser()).to.equal(user);
        });
    });

    it("should use session id from login when it succeeds", function() {
        expect(apiClient.sessionId()).to.be.null;
        var promise = appstax.login("homer", "duff");

        requests[0].respond(200, {}, JSON.stringify({sysSessionId:"the-third-session-id"}));
        return promise.then(function(user) {
            expect(apiClient.sessionId()).to.equal("the-third-session-id");
        });
    });

    it("should store session id and username on localstorage when login succeeds", function() {
        expect(localStorage["appstax_session_" + appKey]).to.not.exist;

        var promise = appstax.login("homer", "duff");

        requests[0].respond(200, {}, JSON.stringify({sysSessionId:"the-4th-session-id", user:{sysObjectId:"user-id"}}));
        return promise.then(function(user) {
            var session = JSON.parse(localStorage["appstax_session_" + appKey]);
            expect(session).to.have.property("sessionId", "the-4th-session-id");
            expect(session).to.have.property("username", "homer");
            expect(session).to.have.property("userId", "user-id");
        });
    });

    it("should reject promise when login fails", function() {
        var promise = appstax.login("homer", "duff");

        requests[0].respond(422, {}, JSON.stringify({errorMessage:"The error"}));
        return promise
            .then(function() {
                throw new Error("Success handler should not be called!");
            })
            .fail(function(error) {
                expect(error).to.be.instanceOf(Error);
                expect(error.message).to.equal("The error");
            });
    });

    it("should remove current user and session on logout", function() {
        var promise = appstax.login("foo", "bar");
        requests[0].respond(200, {}, JSON.stringify({sysSessionId:"the-4th-session-id"}));

        return promise.then(function() {
            appstax.logout();
        }).then(function() {
            expect(appstax.currentUser()).to.be.null;
            expect(apiClient.sessionId()).to.be.null;
            expect(localStorage["appstax_session_" + appKey]).to.not.exist;
        });
    });

    it("should not have an initial currentUser", function() {
        expect(appstax.currentUser()).to.be.null;
    });

    it("should restore previous session from localStorage", function() {
        _createUserSession("theuser", "a-user-id", "my-session");

        appstax.init();
        expect(apiClient.sessionId()).to.equal("my-session");
        expect(appstax.currentUser()).to.exist;
        expect(appstax.currentUser()).to.have.property("username", "theuser");
        expect(appstax.currentUser()).to.have.property("collectionName", "users");
        expect(appstax.currentUser()).to.have.property("id", "a-user-id");
    });

    it("should have read-only username and id", function() {
        var promise = appstax.login("homer", "duff");
        requests[0].respond(200, {}, JSON.stringify({user:{sysObjectId:"hello-user"}}));
        return promise.then(function(user) {
            expect(function() { user.username = "bart" }).to.throw(Error);
            expect(function() { user.id = "1234-5678" }).to.throw(Error);
        });
    });

    it("should PUT to objects/users when saving user", function() {
        _createUserSession("homer", "the-user-id", "the-session-id");
        var user = appstax.currentUser();

        user.save();

        expect(requests).to.have.length(1);
        expect(requests[0].method).to.equal("PUT");
        expect(requests[0].url).to.equal("http://localhost:3000/objects/users/the-user-id");
    });

    it("should PUT sysUsername + all custom properties", function() {
        _createUserSession("homer", "the-user-id-2", "the-session-id");
        var user = appstax.currentUser();

        user.fullName = "Homer Simpson";
        user.beer = "Duff";
        user.save();

        var data = JSON.parse(requests[0].requestBody)
        expect(data).to.have.property("sysUsername", "homer");
        expect(data).to.have.property("fullName", "Homer Simpson");
        expect(data).to.have.property("beer", "Duff");
        expect(data).to.not.have.property("save");
        expect(data).to.not.have.property("collectionName");
        expect(data).to.not.have.property("id");
        expect(data).to.not.have.property("username");
    });

    it("should fulfill promise with user when saving completes", function() {
        _createUserSession("homer", "the-user-id-2", "the-session-id");
        var user = appstax.currentUser();

        var promise = user.save();
        requests[0].respond(200);

        return promise.then(function(savedUser) {
            expect(savedUser).to.equal(user);
        });
    });

    it("should reject promise when saving fails", function() {
        _createUserSession("homer", "the-user-id-2", "the-session-id");
        var user = appstax.currentUser();

        var promise = user.save();
        requests[0].respond(422, {}, JSON.stringify({errorMessage:"The user save error"}));

        return promise
            .then(function() {
                throw new Error("Success handler should not be called!");
            })
            .fail(function(error) {
                expect(error).to.have.property("message", "The user save error");
            });
    });

    it("should refresh a user object", function() {
        _createUserSession("theuser", "a-user-id", "my-session");
        appstax.init();

        var promise = appstax.currentUser().refresh();
        requests[0].respond(200, {}, JSON.stringify({sysObjectId:"a-user-id", fullName:"The Full Name"}));

        return promise.then(function(object) {
            var user = appstax.currentUser();
            expect(user.fullName).to.equal("The Full Name");
            expect(user).to.have.property("collectionName", "users");
            expect(user).to.not.have.property("sysObjectId");
        });
    });

    it("should add username property to objects from users collection", function() {
        var promise = appstax.findAll("users");

        requests[0].respond(200, {}, JSON.stringify({objects:[{sysObjectId:"a-user-id", sysUsername:"shortname", fullName:"The Full Name"}]}));

        return promise.then(function(users) {
            expect(users[0]).to.have.property("fullName", "The Full Name");
            expect(users[0]).to.have.property("collectionName", "users");
            expect(users[0]).to.have.property("id", "a-user-id");
            expect(users[0]).to.have.property("username", "shortname");
        });
    });

});
