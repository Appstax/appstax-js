
var appstax = require("../src/appstax");
var sinon = require("sinon");

describe("Request API", function() {

    var xhr, requests;

    beforeEach(function() {
        appstax.init({appKey: "appkey-12345", baseUrl: "http://localhost:3000/api/latest", log:false});
        requests = [];
        xhr = sinon.useFakeXMLHttpRequest();
        xhr.onCreate = function(request) {
            requests.push(request);
        };
    });

    afterEach(function() {
        xhr.restore();
    });

    it("should send requests to server code", function() {
        appstax.sessionId("session-12345");

        appstax.request("get", "/my/backend1");
        appstax.request("post", "/my/backend2", {my:"data"});
        appstax.request("put", "/my/backend3", "some text");
        appstax.request("delete", "/my/backend4");

        expect(requests.length).to.equal(4);
        expect(requests[0].method).to.equal("GET");
        expect(requests[1].method).to.equal("POST");
        expect(requests[2].method).to.equal("PUT");
        expect(requests[3].method).to.equal("DELETE");

        expect(requests[1].requestBody).to.equal("{\"my\":\"data\"}");
        expect(requests[2].requestBody).to.equal("some text");

        expect(requests[0].url).to.equal("http://localhost:3000/api/latest/server/my/backend1");
        expect(requests[1].url).to.equal("http://localhost:3000/api/latest/server/my/backend2");
        expect(requests[2].url).to.equal("http://localhost:3000/api/latest/server/my/backend3");
        expect(requests[3].url).to.equal("http://localhost:3000/api/latest/server/my/backend4");

        expect(requests[0].requestHeaders).has.property("x-appstax-appkey", "appkey-12345");
        expect(requests[1].requestHeaders).has.property("x-appstax-appkey", "appkey-12345");
        expect(requests[2].requestHeaders).has.property("x-appstax-appkey", "appkey-12345");
        expect(requests[3].requestHeaders).has.property("x-appstax-appkey", "appkey-12345");

        expect(requests[0].requestHeaders).has.property("x-appstax-sessionid", "session-12345");
        expect(requests[1].requestHeaders).has.property("x-appstax-sessionid", "session-12345");
        expect(requests[2].requestHeaders).has.property("x-appstax-sessionid", "session-12345");
        expect(requests[3].requestHeaders).has.property("x-appstax-sessionid", "session-12345");
    });

    it("should return promise, resolving with value if request succeeds", function() {
        var promise = appstax.request("get", "/foo/bar");

        expect(requests.length).to.equal(1);
        requests[0].respond(200, {}, JSON.stringify({bar:"foo"}))

        return promise.then(function(result) {
            expect(result).to.have.property("bar", "foo");
        });
    });

    it("should reject with error if response has .errorMessage", function() {
        var promise = appstax.request("get", "/foo/bar");

        expect(requests.length).to.equal(1);
        requests[0].respond(422, {}, JSON.stringify({errorMessage:"Oh, no!"}))

        return promise
            .then(function(result) {
                throw new Error("Promise should have failed")
            })
            .fail(function(error) {
                expect(error).to.be.instanceof(Error);
                expect(error.message).to.equal("Oh, no!");
            });
    });

    it("should reject with string if response is string", function() {
        var promise = appstax.request("get", "/foo/bar");

        expect(requests.length).to.equal(1);
        requests[0].respond(422, {}, "Didn't work!");

        return promise
            .then(function(result) {
                throw new Error("Promise should have failed")
            })
            .fail(function(error) {
                expect(error).to.be.instanceof(Error);
                expect(error.message).to.equal("Didn't work!");
            });
    });

    it("should reject with object if response is json", function() {
        var promise = appstax.request("get", "/foo/bar");

        expect(requests.length).to.equal(1);
        requests[0].respond(422, {}, JSON.stringify({my:"error"}));

        return promise
            .then(function(result) {
                throw new Error("Promise should have failed")
            })
            .fail(function(error) {
                expect(typeof error).to.equal("object");
                expect(error).to.not.be.instanceof(Error);
            });
    });


});
