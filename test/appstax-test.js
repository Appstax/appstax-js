
var appstax = require("../src/appstax");
var sinon = require("sinon");

describe("AppStax", function() {

    var apiClient;
    var initSpy;

    beforeEach(function() {
        apiClient = require("../src/apiclient");
        initSpy = sinon.stub(apiClient, "init");
    });

    afterEach(function() {
        initSpy.restore();
    });

    it("should exist", function() {
        expect(appstax).to.exist;
    });

    it("should init apiclient with appkey and default baseUrl", function() {
        appstax.init("1234-my-app-key");
        var options = initSpy.getCall(0).args[0];
        expect(options).to.have.property("appKey", "1234-my-app-key");
        expect(options).to.have.property("baseUrl", "https://appstax.com/api/latest/");
    });

});
