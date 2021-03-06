
var createApiClient = require("../src/apiclient");
var sinon = require("sinon");
var encoding = require("../src/encoding");

describe("API Client", function() {

    var apiClient;
    var xhr, requests;

    beforeEach(function() {
        requests = [];
        xhr = sinon.useFakeXMLHttpRequest();
        xhr.onCreate = function(request) {
            requests.push(request);
        };
        apiClient = createApiClient();
    });

    afterEach(function() {
        xhr.restore();
    });

    it("should send appkey header", function() {
        apiClient = createApiClient({appKey:"1001-1002-1003"});
        apiClient.request("post", "http://example.com", {foo:"bar"});
        apiClient.request("put", "http://example.com", {foo:"bar"});
        apiClient.request("get", "http://example.com");
        apiClient.request("delete", "http://example.com");

        expect(requests[0].requestHeaders).has.property("x-appstax-appkey", "1001-1002-1003");
        expect(requests[1].requestHeaders).has.property("x-appstax-appkey", "1001-1002-1003");
        expect(requests[2].requestHeaders).has.property("x-appstax-appkey", "1001-1002-1003");
        expect(requests[3].requestHeaders).has.property("x-appstax-appkey", "1001-1002-1003");
    });

    it("should send sessionid header", function() {
        apiClient.sessionId("my-session");
        apiClient.request("post", "http://example.com", {foo:"bar"});
        apiClient.request("put", "http://example.com", {foo:"bar"});
        apiClient.request("get", "http://example.com");
        apiClient.request("delete", "http://example.com");

        expect(requests[0].requestHeaders).has.property("x-appstax-sessionid", "my-session");
        expect(requests[1].requestHeaders).has.property("x-appstax-sessionid", "my-session");
        expect(requests[2].requestHeaders).has.property("x-appstax-sessionid", "my-session");
        expect(requests[3].requestHeaders).has.property("x-appstax-sessionid", "my-session");
    });

    it("should not send sessionid header for anonymous users", function() {
        apiClient.request("post", "http://example.com", {foo:"bar"});
        apiClient.request("put", "http://example.com", {foo:"bar"});
        apiClient.request("get", "http://example.com");
        apiClient.request("delete", "http://example.com");

        expect(requests[0].requestHeaders).to.not.contain.keys("x-appstax-sessionid");
        expect(requests[1].requestHeaders).to.not.contain.keys("x-appstax-sessionid");
        expect(requests[2].requestHeaders).to.not.contain.keys("x-appstax-sessionid");
        expect(requests[3].requestHeaders).to.not.contain.keys("x-appstax-sessionid");
    });

    it("should use session if from a session id provider function", function() {
        apiClient.sessionId(function() {
            return "othersession"
        });
        apiClient.request("post", "http://example.com", {foo:"bar"});
        apiClient.request("put", "http://example.com", {foo:"bar"});
        apiClient.request("get", "http://example.com");
        apiClient.request("delete", "http://example.com");

        expect(requests[0].requestHeaders).has.property("x-appstax-sessionid", "othersession");
        expect(requests[1].requestHeaders).has.property("x-appstax-sessionid", "othersession");
        expect(requests[2].requestHeaders).has.property("x-appstax-sessionid", "othersession");
        expect(requests[3].requestHeaders).has.property("x-appstax-sessionid", "othersession");
    });

    it("should send extra header for preflight requests without session", function() {
        var appKey64 = "NjRlNjQxYzktMzA2OS00ZDcxLTQ4OGItMWNiYzNiMjlhY2I1";
        var appKey32 = encoding.base32.encode(appKey64);

        apiClient = createApiClient({appKey:appKey64});
        apiClient.request("post", "http://example.com", {foo:"bar"});
        apiClient.request("put", "http://example.com", {foo:"bar"});
        apiClient.request("get", "http://example.com");
        apiClient.request("delete", "http://example.com");

        var header = "x-appstax-xn" + appKey32;
        expect(requests[0].requestHeaders).has.property(header, header);
        expect(requests[1].requestHeaders).has.property(header, header);
        expect(requests[2].requestHeaders).has.property(header, header);
        expect(requests[3].requestHeaders).has.property(header, header);
    });

    it("should send extra header for preflight requests with session", function() {
        var appKey64 = "NjRlNjQxYzktMzA2OS00ZDcxLTQ4OGItMWNiYzNiMjlhY2I1";
        var appKey32 = encoding.base32.encode(appKey64);

        apiClient = createApiClient({appKey:appKey64});
        apiClient.sessionId("987654321");
        apiClient.request("post", "http://example.com", {foo:"bar"});
        apiClient.request("put", "http://example.com", {foo:"bar"});
        apiClient.request("get", "http://example.com");
        apiClient.request("delete", "http://example.com");

        var header = "x-appstax-xu" + appKey32;
        expect(requests[0].requestHeaders).has.property(header, header);
        expect(requests[1].requestHeaders).has.property(header, header);
        expect(requests[2].requestHeaders).has.property(header, header);
        expect(requests[3].requestHeaders).has.property(header, header);
    });

    it("should GET, POST, PUT, DELETE", function() {
        apiClient.request("get", "http://example.com/get");
        apiClient.request("post", "http://example.com/post");
        apiClient.request("put", "http://example.com/put");
        apiClient.request("delete", "http://example.com/delete");

        expect(requests[0]).to.have.property("method", "GET");
        expect(requests[1]).to.have.property("method", "POST");
        expect(requests[2]).to.have.property("method", "PUT");
        expect(requests[3]).to.have.property("method", "DELETE");
    });

    it("should create urls with baseUrl", function() {
        apiClient = createApiClient({baseUrl:"http://localhost:1001/"});
        expect(apiClient.url("/knock/knock")).to.equal("http://localhost:1001/knock/knock");
    });

    it("should add trailing slash to baseUrl", function() {
        apiClient = createApiClient({baseUrl:"http://localhost:1001/"});
        expect(apiClient.baseUrl()).to.equal("http://localhost:1001/");
    });

    it("should create parametrized urls on top of baseUrl", function() {
        apiClient = createApiClient({baseUrl:"http://localhost:1337/"});
        expect(apiClient.url("/hello/:who", {who:"world"})).to.equal("http://localhost:1337/hello/world");
    });

    it("should url encode parameters", function() {
        apiClient = createApiClient({baseUrl:"http://localhost:1337/"});
        expect(apiClient.url("/hello/:who", {who:"w ø r l d"})).to.equal("http://localhost:1337/hello/w%20%C3%B8%20r%20l%20d");
    });

    it("should append query parameters", function() {
        apiClient = createApiClient({baseUrl:"http://localhost:1337/"});
        expect(apiClient.url("/hello/:who", {who:"world"}, {knock:"true"})).to.equal("http://localhost:1337/hello/world?knock=true");
    });

    it("should append query parameters to existing query", function() {
        apiClient = createApiClient({baseUrl:"http://localhost:1337/"});
        expect(apiClient.url("/hello/:who?woods=yes", {who:"world"}, {knock:"true"})).to.equal("http://localhost:1337/hello/world?woods=yes&knock=true");
    });

    it("should encode query parameters to existing query", function() {
        apiClient = createApiClient({baseUrl:"http://localhost:1337/"});
        expect(apiClient.url("/hello", {}, {who:"w ø r l d"})).to.equal("http://localhost:1337/hello?who=w%20%C3%B8%20r%20l%20d");
    });

    it("should request url token", function() {
        apiClient.request("post", "http://example.com", {foo:"bar"});
        apiClient.request("put", "http://example.com", {foo:"bar"});
        apiClient.request("get", "http://example.com");
        apiClient.request("delete", "http://example.com");

        expect(requests[0].requestHeaders).has.property("x-appstax-urltoken");
        expect(requests[1].requestHeaders).has.property("x-appstax-urltoken");
        expect(requests[2].requestHeaders).has.property("x-appstax-urltoken");
        expect(requests[3].requestHeaders).has.property("x-appstax-urltoken");
    });

    it("should pick up url token from response header", function(done) {
        apiClient.request("get", "http://example.com");
        requests[0].respond(200, {"x-appstax-urltoken": "the-url-token"}, "{}");

        setTimeout(function() {
            expect(apiClient.urlToken()).to.equal("the-url-token");
            done();
        }, 10);
    });

    it("should not overwrite with blank urltoken when no response header is present", function(done) {
        apiClient.urlToken("initial-url-token");
        apiClient.request("get", "http://example.com");
        requests[0].respond(200, {}, "{}");

        setTimeout(function() {
            expect(apiClient.urlToken()).to.equal("initial-url-token");
            done();
        }, 10);
    });

});
