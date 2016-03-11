var appstax = require("../src/appstax");
var sinon = require("sinon");
var Q = require("q");

describe("Social login", function() {

    var xhr, requests;
    var appKey;
    var appKeyCounter = 0;
    var authOpenStub;
    var authRunStub;

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
        authOpenStub.restore();
    });

    function _deleteLocalStorage() {
        var key = "appstax_session_" + appKey;
        delete localStorage[key];
    }

    function _appstaxInit() {
        appstax.init({appKey:appKey, baseUrl: "http://localhost:3000/", log:false});
        authRunStub = sinon.stub().returns(Q.resolve({}));
        authOpenStub = sinon.stub(appstax.auth, "open").returns({ run: authRunStub });
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

    describe("facebook", function() {

        it("should open auth dialog with options", function(done) {
            appstax.login({provider: "facebook"}).fail(done);

            expect(requests.length).equals(1);
            expect(requests[0].method).equals("GET");
            expect(requests[0].url).equals("http://localhost:3000/sessions/providers/facebook");

            requests[0].respond(200, {}, JSON.stringify({clientId: "fb-client-id-001"}));

            setTimeout(function() {
                expect(authOpenStub.callCount).equals(1);
                expect(authRunStub.callCount).equals(1);

                var authOptions = authRunStub.args[0][0];
                expect(authOptions).has.property("type", "oauth");
                expect(authOptions).has.property("uri", "https://www.facebook.com/dialog/oauth?display=popup&client_id={clientId}&redirect_uri={redirectUri}");
                expect(authOptions).has.property("redirectUri", window.location.href);
                expect(authOptions).has.property("clientId", "fb-client-id-001");
                done();
            }, 10);
        });

        it("should send authCode and redirectUri from auth dialog to server and resolve with session + user", function(done) {
            var promise = appstax.login({provider: "facebook"});

            authRunStub.returns(Q.resolve({authCode: "the-auth-code-1234", redirectUri:"/the/uri"}))
            requests[0].respond(200, {}, JSON.stringify({clientId: "fb-client-id-001"}));

            setTimeout(function() {
                expect(requests.length).equals(2);
                expect(requests[1].method).equals("POST");
                expect(requests[1].url).equals("http://localhost:3000/sessions");
                expect(requests[1].requestBody).to.exist;
                var data = JSON.parse(requests[1].requestBody);
                expect(data).to.have.deep.property("sysProvider.type", "facebook");
                expect(data).to.have.deep.property("sysProvider.data.code", "the-auth-code-1234");
                expect(data).to.have.deep.property("sysProvider.data.redirectUri", "/the/uri");

                requests[1].respond(200, {}, JSON.stringify({sysSessionId:"the-session-id", user:{sysObjectId:"the-user-id", sysUsername:"the-username"}}));
            }, 10)

            promise
                .then(function(user) {
                    expect(appstax.sessionId()).equals("the-session-id");

                    expect(user).to.have.property("id", "the-user-id");
                    expect(user).to.have.property("username", "the-username");

                    done();
                })
                .fail(done);
        });

        it("should reject if provider config call fails", function(done) {
            var promise = appstax.login({provider: "facebook"});
            requests[0].respond(422, {}, JSON.stringify({errorMessage:"The config error"}));

            promise
                .then(function(user) {
                    done(new Error("Should have been rejected"));
                })
                .fail(function(error) {
                    expect(error).has.property("message", "The config error");
                    done();
                })
                .fail(done);
        });

        it("should reject if auth dialog fails", function(done) {
            var promise = appstax.login({provider: "facebook"});

            authRunStub.returns(Q.reject(new Error("Auth dialog error")))
            requests[0].respond(200, {}, JSON.stringify({clientId: "fb-client-id-002"}));

            promise
                .then(function(user) {
                    done(new Error("Should have been rejected"));
                })
                .fail(function(error) {
                    expect(error).has.property("message", "Auth dialog error");
                    done();
                })
                .fail(done);
        });

        it("should reject if auth result has error", function(done) {
            var promise = appstax.login({provider: "facebook"});

            authRunStub.returns(Q.resolve({error: "Something went wrong"}))
            requests[0].respond(200, {}, JSON.stringify({clientId: "fb-client-id-002"}));

            promise
                .then(function(user) {
                    done(new Error("Should have been rejected"));
                })
                .fail(function(error) {
                    expect(error).has.property("message", "Something went wrong");
                    done();
                })
                .fail(done);
        });

        it("should reject if /sessions call fails", function(done) {
            var promise = appstax.login({provider: "facebook"});

            authRunStub.returns(Q.resolve({authCode: "the-auth-code-1234"}))
            requests[0].respond(200, {}, JSON.stringify({clientId: "fb-client-id-001"}));

            setTimeout(function() {
                requests[1].respond(422, {}, JSON.stringify({errorMessage:"The server error"}));
            }, 10)

            promise
                .then(function(user) {
                    done(new Error("Should have been rejected"));
                })
                .fail(function(error) {
                    expect(error).has.property("message", "The server error");
                    done();
                })
                .fail(done);
        });

    });

});
