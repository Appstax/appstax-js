
require("mocha");
var expect  = require("chai").expect;
var nock    = require("nock");
var appstax = require("../src/appstax");
var createApiClient = require("../src/apiclient");

describe("API Client under node.js", function() {

    var apiClient;

    beforeEach(function() {
        apiClient = createApiClient();
    });

    afterEach(function() {
        nock.cleanAll();
    });

    it("should send appkey header", function(done) {
        apiClient = createApiClient({appKey:"1001-1002-1003"});

        var mock = nock("http://example.com/")
                    .matchHeader("x-appstax-appkey", "1001-1002-1003")
                    .post("/", {foo:"bar"}).reply(200)
                    .put("/", {foo:"bar"}).reply(200)
                    .get("/").reply(200)
                    .delete("/").reply(200);

        apiClient.request("post", "http://example.com/", {foo:"bar"});
        apiClient.request("put", "http://example.com", {foo:"bar"});
        apiClient.request("get", "http://example.com");
        apiClient.request("delete", "http://example.com");

        setTimeout(function() {
            mock.done();
            done();
        }, 10);
    });

    it("should send sessionid header", function(done) {
        apiClient.sessionId("my-session");

        var mock = nock("http://example.com/")
                    .matchHeader("x-appstax-sessionid", "my-session")
                    .post("/", {foo:"bar"}).reply(200)
                    .put("/", {foo:"bar"}).reply(200)
                    .get("/").reply(200)
                    .delete("/").reply(200);

        apiClient.request("post", "http://example.com", {foo:"bar"});
        apiClient.request("put", "http://example.com", {foo:"bar"});
        apiClient.request("get", "http://example.com");
        apiClient.request("delete", "http://example.com");

        setTimeout(function() {
            mock.done();
            done();
        }, 10);
    });

    it("should not send sessionid header for anonymous users", function(done) {
        var mock = nock("http://example.com/")
                    .matchHeader("x-appstax-sessionid", undefined)
                    .post("/", {foo:"bar"}).reply(200)
                    .put("/", {foo:"bar"}).reply(200)
                    .get("/").reply(200)
                    .delete("/").reply(200);

        apiClient.request("post", "http://example.com", {foo:"bar"});
        apiClient.request("put", "http://example.com", {foo:"bar"});
        apiClient.request("get", "http://example.com");
        apiClient.request("delete", "http://example.com");

        setTimeout(function() {
            mock.done();
            done();
        }, 10);
    });

    it("should GET, POST, PUT, DELETE", function(done) {
        var mock = nock("http://example.com/")
                    .get("/get").reply(200)
                    .post("/post", {myData1:"postData"}).reply(200)
                    .put("/put", {myData2:"putData"}).reply(200)
                    .delete("/delete").reply(200);

        apiClient.request("get", "http://example.com/get");
        apiClient.request("post", "http://example.com/post", {myData1:"postData"});
        apiClient.request("put", "http://example.com/put", {myData2:"putData"});
        apiClient.request("delete", "http://example.com/delete");

        setTimeout(function() {
            mock.done();
            done();
        }, 10);
    });

    it("should resolve promise with response when request succeeds", function() {
        nock("http://server").get("/data").reply(200, {param:"value"});

        return apiClient.request("get", "http://server/data").then(function(response) {
            expect(response).to.have.property("param", "value");
        });
    });

    it("should parse json string responses", function() {
        nock("http://server").get("/data").reply(200, JSON.stringify({param:"value"}));

        return apiClient.request("get", "http://server/data").then(function(response) {
            expect(response).to.have.property("param", "value");
        });
    });

    it("should not parse regular string response", function() {
        nock("http://server").get("/data").reply(200, "foo");

        return apiClient.request("get", "http://server/data").then(function(response) {
            expect(response).to.equal("foo");
        });
    });

    it("should reject promise with returned error when request fails", function() {
        nock("http://server").get("/data").reply(422, {errorMessage:"No success!"});

        return apiClient.request("get", "http://server/data")
        .then(function() {
            throw(new Error("Not supposed to succeed!"));
        })
        .fail(function(error) {
            expect(error).to.have.property("message", "No success!");
        });
    });

    it("should reject promise with returned error when request fails, ensure json parsing", function() {
        nock("http://server").get("/data").reply(422, JSON.stringify({errorMessage:"No success!"}));

        return apiClient.request("get", "http://server/data")
        .then(function() {
            throw(new Error("Not supposed to succeed!"));
        })
        .fail(function(error) {
            expect(error).to.have.property("message", "No success!");
        });
    });

});
