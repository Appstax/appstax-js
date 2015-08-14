
require("mocha");
var expect  = require("chai").expect;
var nock    = require("nock");
var appstax = require("../src/appstax");

describe("DataStore under node.js", function() {

    beforeEach(function() {
        appstax.init({appKey:"my-app-key", baseUrl:"http://localhost:1234/api/latest/"})
    });

    afterEach(function() {
        nock.cleanAll();
    });


    it("should POST object data", function(done) {
        var mock = nock("http://localhost:1234/")
                    .post("/api/latest/objects/mycollection", {prop:"value"}).reply(200, {})

        var object = appstax.object("mycollection");
        object.prop = "value";
        object.save();

        setTimeout(function() {
            mock.done();
            done();
        }, 10);
    });

});
