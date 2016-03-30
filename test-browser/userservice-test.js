
var appstax = require("../src/appstax");
var sinon = require("sinon");
var Q = require("q");

describe("User service", function() {

    var xhr, requests;
    var setItemSpy;
    var appKey;
    var appKeyCounter = 0;
    var apiClient;

    beforeEach(function() {
        appKey = "test-app-key-" + (appKeyCounter++);
        _deleteLocalStorage();
        _appstaxInit();
        requests = [];
        xhr = sinon.useFakeXMLHttpRequest();
        xhr.onCreate = function(request) {
            requests.push(request);
        };
    });

    afterEach(function() {
        xhr.restore();
        _deleteLocalStorage();
        appstax.logout();
    });

    function _deleteLocalStorage() {
        var key = "appstax_session_" + appKey;
        delete localStorage[key];
    }

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

    it("should POST signup with login=true as default", function(done) {
        appstax.signup("frank", "secret");

        setTimeout(function() {
            expect(requests).to.have.length(1);
            expect(requests[0].method).to.equal("POST");
            expect(requests[0].url).to.equal("http://localhost:3000/users?login=true");
            expect(requests[0].requestBody).to.exist;
            var data = JSON.parse(requests[0].requestBody);
            expect(data).to.have.property("sysUsername", "frank");
            expect(data).to.have.property("sysPassword", "secret");
            done();
        }, 10);
    });

    it("should POST extra properties with signup", function(done) {
        appstax.signup("donald", "quack", {fullname:"Donald Duck"});

        setTimeout(function() {
            expect(requests[0].requestBody).to.exist;
            var data = JSON.parse(requests[0].requestBody);
            expect(data).to.have.property("sysUsername", "donald");
            expect(data).to.have.property("sysPassword", "quack");
            expect(data).to.have.property("fullname", "Donald Duck");
            done();
        }, 10);
    });

    it("should POST extra properties with signup also when login is specified", function(done) {
        appstax.signup("donald", "quack", false, {fullname:"Donald Duck"});

        setTimeout(function() {
            expect(requests[0].url).to.equal("http://localhost:3000/users?login=false");
            expect(requests[0].requestBody).to.exist;
            var data = JSON.parse(requests[0].requestBody);
            expect(data).to.have.property("sysUsername", "donald");
            expect(data).to.have.property("sysPassword", "quack");
            expect(data).to.have.property("fullname", "Donald Duck");
            done();
        }, 10);
    });

    it("should fulfill promise with user object when signup succeeds", function(done) {
        var promise = appstax.signup("fred", "holy");

        setTimeout(function() {
            requests[0].respond(200, {}, JSON.stringify({}));
        }, 10);
        promise.then(function(user) {
            expect(user).to.have.property("username", "fred");
            expect(user).to.have.property("collectionName", "users");
            expect(user).to.not.have.property("password");
            done();
        }).done();
    });

    it("should get user id from server on signup", function(done) {
        var promise = appstax.signup("fred", "holy");

        setTimeout(function() {
            requests[0].respond(200, {}, JSON.stringify({user:{sysObjectId:"the-user-id"}}));
        }, 10);
        promise.then(function(user) {
            expect(user).to.have.property("id", "the-user-id");
            done();
        }).done();
    });

    it("should set current user when signup succeeds with login=true", function(done) {
        expect(appstax.currentUser()).to.be.null;

        var promise = appstax.signup("howard", "holy", true);

        setTimeout(function() {
            expect(requests[0].url).to.equal("http://localhost:3000/users?login=true");
            requests[0].respond(200, {}, JSON.stringify({}));
        }, 10);
        promise.then(function(user) {
            expect(appstax.currentUser()).to.not.be.null;
            expect(appstax.currentUser()).to.have.property("username", "howard");
            expect(appstax.currentUser()).to.have.property("collectionName", "users");
            expect(appstax.currentUser()).to.equal(user);
            done();
        }).done();
    });

    it("should not set current user when signup succeeds if login=false", function(done) {
        expect(appstax.currentUser()).to.be.null;

        var promise = appstax.signup("howard", "holy", false);

        setTimeout(function() {
            expect(requests[0].url).to.equal("http://localhost:3000/users?login=false");
            requests[0].respond(200, {}, JSON.stringify({}));
        }, 10);
        promise.then(function(user) {
            expect(appstax.currentUser()).to.be.null;
            done();
        }).done();
    });

    it("should use session id from signup when it succeeds", function(done) {
        expect(apiClient.sessionId()).to.be.null;
        var promise = appstax.signup("homer", "duff", true);

        setTimeout(function() {
            requests[0].respond(200, {}, JSON.stringify({sysSessionId:"the-session-id"}));
        }, 10);
        promise.then(function(user) {
            expect(apiClient.sessionId()).to.equal("the-session-id");
            done();
        }).done();
    });

    it("should store session id, username and user id on localstorage when signup succeeds", function(done) {
        expect(localStorage["appstax_session_" + appKey]).to.not.exist;

        var promise = appstax.signup("homer", "duff", true);

        setTimeout(function() {
            requests[0].respond(200, {}, JSON.stringify({sysSessionId:"the-other-session-id", user:{sysObjectId:"userid"}}));
        }, 10);
        promise.then(function(user) {
            var session = JSON.parse(localStorage["appstax_session_" + appKey]);
            expect(session).to.have.property("sessionId", "the-other-session-id");
            expect(session).to.have.property("username", "homer");
            expect(session).to.have.property("userId", "userid");
            done();
        }).done();
    });

    it("should reject promise when signup fails", function(done) {
        var promise = appstax.signup("homer", "duff");

        setTimeout(function() {
            requests[0].respond(422, {}, JSON.stringify({errorMessage:"The error"}));
        }, 10);
        promise
            .then(function() {
                throw new Error("Success handler should not be called!");
            })
            .fail(function(error) {
                expect(error).to.be.instanceOf(Error);
                expect(error.message).to.equal("The error");
                done();
            }).done();
    });

    it("should POST login", function(done) {
        appstax.login("frank", "secret");

        setTimeout(function() {
            expect(requests).to.have.length(1);
            expect(requests[0].method).to.equal("POST");
            expect(requests[0].url).to.equal("http://localhost:3000/sessions");
            expect(requests[0].requestBody).to.exist;
            var data = JSON.parse(requests[0].requestBody);
            expect(data).to.have.property("sysUsername", "frank");
            expect(data).to.have.property("sysPassword", "secret");
            done();
        }, 10);
    });

    it("should fulfill promise with user object when login succeeds", function(done) {
        var promise = appstax.login("fred", "holy");

        setTimeout(function() {
            requests[0].respond(200, {}, JSON.stringify({}));
        }, 10);
        promise.then(function(user) {
            expect(user).to.have.property("username", "fred");
            expect(user).to.have.property("collectionName", "users");
            expect(user).to.not.have.property("password");
            done();
        }).done();
    });

    it("should get user id from server on login", function(done) {
        var promise = appstax.login("fred", "holy");

        setTimeout(function() {
            requests[0].respond(200, {}, JSON.stringify({user:{sysObjectId:"the-user-id"}}));
        }, 10);
        promise.then(function(user) {
            expect(user).to.have.property("id", "the-user-id");
            done();
        }).done();
    });

    it("should get custom user properties from server on login", function(done) {
        var promise = appstax.login("homer", "duff");

        setTimeout(function() {
            requests[0].respond(200, {}, JSON.stringify({user:{sysObjectId:"the-user-id-3", fullname:"Homer Simpson"}}));
        }, 10);
        promise.then(function(user) {
            expect(user).to.have.property("fullname", "Homer Simpson");
            done();
        }).done();
    });

    it("should set current user when login succeeds", function(done) {
        var promise = appstax.login("howard", "holy");

        setTimeout(function() {
            requests[0].respond(200, {}, JSON.stringify({}));
        }, 10);
        promise.then(function(user) {
            expect(appstax.currentUser()).to.not.be.null;
            expect(appstax.currentUser()).to.have.property("username", "howard");
            expect(appstax.currentUser()).to.have.property("collectionName", "users");
            expect(appstax.currentUser()).to.equal(user);
            done();
        }).done();
    });

    it("should use session id from login when it succeeds", function(done) {
        expect(apiClient.sessionId()).to.be.null;
        var promise = appstax.login("homer", "duff");

        setTimeout(function() {
            requests[0].respond(200, {}, JSON.stringify({sysSessionId:"the-third-session-id"}));
        }, 10);
        promise.then(function(user) {
            expect(apiClient.sessionId()).to.equal("the-third-session-id");
            done();
        }).done();
    });

    it("should store session id and username on localstorage when login succeeds", function(done) {
        expect(localStorage["appstax_session_" + appKey]).to.not.exist;

        var promise = appstax.login("homer", "duff");

        setTimeout(function() {
            requests[0].respond(200, {}, JSON.stringify({sysSessionId:"the-4th-session-id", user:{sysObjectId:"user-id"}}));
        }, 10);
        promise.then(function(user) {
            var session = JSON.parse(localStorage["appstax_session_" + appKey]);
            expect(session).to.have.property("sessionId", "the-4th-session-id");
            expect(session).to.have.property("username", "homer");
            expect(session).to.have.property("userId", "user-id");
            done();
        }).done();
    });

    it("should reject promise when login fails", function(done) {
        var promise = appstax.login("homer", "duff");

        setTimeout(function() {
            requests[0].respond(422, {}, JSON.stringify({errorMessage:"The error"}));
        }, 10);
        promise
            .then(function() {
                throw new Error("Success handler should not be called!");
            })
            .fail(function(error) {
                expect(error).to.be.instanceOf(Error);
                expect(error.message).to.equal("The error");
                done();
            }).done();
    });

    it("should remove current user and session on logout", function(done) {
        var promise = appstax.login("foo", "bar");

        setTimeout(function() {
            requests[0].respond(200, {}, JSON.stringify({sysSessionId:"the-4th-session-id"}));
        }, 10);

        promise.then(function() {
            appstax.logout();
        }).then(function() {
            expect(appstax.currentUser()).to.be.null;
            expect(apiClient.sessionId()).to.be.null;
            expect(localStorage["appstax_session_" + appKey]).to.not.exist;
            done();
        }).done();
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

    it("should have read-only username and id", function(done) {
        var promise = appstax.login("homer", "duff");

        setTimeout(function() {
            requests[0].respond(200, {}, JSON.stringify({user:{sysObjectId:"hello-user"}}));
        }, 10);
        promise.then(function(user) {
            expect(function() { user.username = "bart" }).to.throw(Error);
            expect(function() { user.id = "1234-5678" }).to.throw(Error);
            done();
        }).done();
    });

    it("should PUT to objects/users when saving user", function(done) {
        _createUserSession("homer", "the-user-id", "the-session-id");
        var user = appstax.currentUser();

        user.save();

        setTimeout(function() {
            expect(requests).to.have.length(1);
            expect(requests[0].method).to.equal("PUT");
            expect(requests[0].url).to.equal("http://localhost:3000/objects/users/the-user-id");
            done();
        }, 10);
    });

    it("should PUT sysUsername + all custom properties", function(done) {
        _createUserSession("homer", "the-user-id-2", "the-session-id");
        var user = appstax.currentUser();

        user.fullName = "Homer Simpson";
        user.beer = "Duff";
        user.save();

        setTimeout(function() {
            var data = JSON.parse(requests[0].requestBody)
            expect(data).to.have.property("sysUsername", "homer");
            expect(data).to.have.property("fullName", "Homer Simpson");
            expect(data).to.have.property("beer", "Duff");
            expect(data).to.not.have.property("save");
            expect(data).to.not.have.property("collectionName");
            expect(data).to.not.have.property("id");
            expect(data).to.not.have.property("username");
            done();
        }, 10);
    });

    it("should fulfill promise with user when saving completes", function(done) {
        _createUserSession("homer", "the-user-id-2", "the-session-id");
        var user = appstax.currentUser();

        var promise = user.save();

        setTimeout(function() {
            requests[0].respond(200);
        }, 10);

        promise.then(function(savedUser) {
            expect(savedUser).to.equal(user);
            done();
        }).done();
    });

    it("should reject promise when saving fails", function(done) {
        _createUserSession("homer", "the-user-id-2", "the-session-id");
        var user = appstax.currentUser();

        var promise = user.save();

        setTimeout(function() {
            requests[0].respond(422, {}, JSON.stringify({errorMessage:"The user save error"}));
        }, 10);

        promise
            .then(function() {
                throw new Error("Success handler should not be called!");
            })
            .fail(function(error) {
                expect(error).to.have.property("message", "The user save error");
                done();
            }).done();
    });

    it("should refresh a user object", function(done) {
        _createUserSession("theuser", "a-user-id", "my-session");
        appstax.init();

        var promise = appstax.currentUser().refresh();

        setTimeout(function() {
            requests[0].respond(200, {}, JSON.stringify({sysObjectId:"a-user-id", fullName:"The Full Name"}));
        }, 10);

        promise.then(function(object) {
            var user = appstax.currentUser();
            expect(user.fullName).to.equal("The Full Name");
            expect(user).to.have.property("collectionName", "users");
            expect(user).to.not.have.property("sysObjectId");
            done();
        }).done();
    });

    it("should add username property to objects from users collection", function(done) {
        var promise = appstax.findAll("users");

        setTimeout(function() {
            requests[0].respond(200, {}, JSON.stringify({objects:[{sysObjectId:"a-user-id", sysUsername:"shortname", fullName:"The Full Name"}]}));
        }, 10);

        promise.then(function(users) {
            expect(users[0]).to.have.property("fullName", "The Full Name");
            expect(users[0]).to.have.property("collectionName", "users");
            expect(users[0]).to.have.property("id", "a-user-id");
            expect(users[0]).to.have.property("username", "shortname");
            done();
        }).done();
    });

    describe("Password reset", function() {

        it("should send request with email", function(done) {
            var promise = appstax.requestPasswordReset("my@email.com")

            expect(requests.length).equals(1);
            expect(requests[0].method).equals("POST");
            expect(requests[0].url).equals("http://localhost:3000/users/reset/email");

            var data = JSON.parse(requests[0].requestBody)
            expect(data.email).equals("my@email.com");

            requests[0].respond(200, {}, "");

            promise
                .then(function() {
                    done();
                })
                .done();
        });

        it("should fail if sendt request fails", function(done) {
            var promise = appstax.requestPasswordReset("my@email.com")

            requests[0].respond(422, {}, JSON.stringify({errorMessage: "It didn't work"}));

            promise
                .then(function() {
                    throw new Error("Should have been rejected");
                })
                .fail(function(error) {
                    expect(error.message).equals("It didn't work");
                    done();
                })
                .done();
        });

        it("should change password with username, new password and code", function(done) {
            var promise = appstax.changePassword({
                username: "the-user",
                password: "the-new-password",
                code: "the-super-secret"
            });

            expect(requests.length).equals(1);
            expect(requests[0].method).equals("POST");
            expect(requests[0].url).equals("http://localhost:3000/users/reset/password");

            var data = JSON.parse(requests[0].requestBody)
            expect(data.username).equals("the-user");
            expect(data.password).equals("the-new-password");
            expect(data.pinCode).equals("the-super-secret");

            requests[0].respond(200, {}, "");

            promise
                .then(function() {
                    done();
                })
                .done();
        });

        it("should fail if change request fails", function(done) {
            var promise = appstax.changePassword({
                username: "the-user",
                password: "the-new-password",
                code: "the-super-secret"
            });

            requests[0].respond(422, {}, JSON.stringify({errorMessage: "Nope, sorry"}));

            promise
                .then(function() {
                    throw new Error("Should have been rejected");
                })
                .fail(function(error) {
                    expect(error.message).equals("Nope, sorry");
                    done();
                })
                .done();
        });

        it("should not log in by default", function(done) {
            expect(appstax.currentUser()).equals(null);
            expect(appstax.sessionId()).equals(null);

            var promise = appstax.changePassword({
                username: "the-user",
                password: "the-new-password",
                code: "the-super-secret"
            });

            var data = JSON.parse(requests[0].requestBody)
            expect(data.login).equals(false);

            requests[0].respond(200, {}, "");

            promise
                .then(function(user) {
                    expect(user).equals(undefined);
                    expect(appstax.currentUser()).equals(null);
                    expect(appstax.sessionId()).equals(null);
                    done();
                })
                .done();
        });

        it("should log in and set current user if specified", function(done) {
            expect(appstax.currentUser()).equals(null);
            expect(appstax.sessionId()).equals(null);

            var promise = appstax.changePassword({
                username: "the-user",
                password: "the-new-password",
                code: "the-super-secret",
                login: true
            });

            var data = JSON.parse(requests[0].requestBody)
            expect(data.login).equals(true);

            requests[0].respond(200, {}, JSON.stringify({sysSessionId:"the-session-id", user:{sysObjectId:"userid", sysUsername:"theusername"}}));

            promise
                .then(function(user) {
                    expect(appstax.currentUser()).to.not.be.null;
                    expect(appstax.currentUser()).to.have.property("username", "theusername");
                    expect(appstax.currentUser()).to.equal(user);
                    expect(appstax.sessionId()).equals("the-session-id");
                    done();
                })
                .done();
        });

    })

});
