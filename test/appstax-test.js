
var appstax = require("../src/appstax");
var sinon = require("sinon");

describe("Appstax", function() {

    it("should exist", function() {
        expect(appstax).to.exist;
    });

    it("should init global context with appkey and default baseUrl", function() {
        appstax.init("1234-my-app-key");
        appstax.sessionId("mysessionid");

        expect(appstax.apiClient.appKey()).to.equal("1234-my-app-key");
        expect(appstax.apiClient.baseUrl()).to.equal("https://appstax.com/api/latest/");
        expect(appstax.apiClient.sessionId()).to.equal("mysessionid");
    });

    it("should re-initialize global context", function() {
        appstax.init({appKey:"1234-my-app-key"});
        appstax.sessionId("mysessionid");
        appstax.init({appKey:"5678-my-app-key", baseUrl:"http://example.com/api/"})

        expect(appstax.apiClient.appKey()).to.equal("5678-my-app-key");
        expect(appstax.apiClient.baseUrl()).to.equal("http://example.com/api/");
        expect(appstax.apiClient.sessionId()).to.equal(null);
    });

    it("should create multiple app contexts", function() {
        var app1 = appstax.app({appKey: "appkey1", baseUrl:"http://server1/api/"});
        var app2 = appstax.app({appKey: "appkey2", baseUrl:"http://server2/api/"});
        app1.sessionId("session1");
        app2.sessionId("session2");

        expect(app1.apiClient.appKey()).to.equal("appkey1");
        expect(app2.apiClient.appKey()).to.equal("appkey2");
        expect(app1.apiClient.baseUrl()).to.equal("http://server1/api/");
        expect(app2.apiClient.baseUrl()).to.equal("http://server2/api/");
        expect(app1.apiClient.sessionId()).to.equal("session1");
        expect(app2.apiClient.sessionId()).to.equal("session2");
    })


});
