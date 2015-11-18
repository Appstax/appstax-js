
var appstax = require("../src/appstax");
var sinon = require("sinon");
var Q = require("q");

describe("Object permissions", function() {

    var xhr, requests;

    beforeEach(function() {
        appstax.init({baseUrl: "http://localhost:3000/", log:false});
        requests = [];
        xhr = sinon.useFakeXMLHttpRequest();
        xhr.onCreate = function(request) {
            requests.push(request);
        };
    });

    afterEach(function() {
        xhr.restore();
    });

    it("should should POST permission grants after saving existing object", function(done) {
        var object = appstax.object("MyObjects", {sysObjectId:"theobjectid"});

        object.grant("buddy", ["read", "update"]);
        object.grant("bff", ["read", "delete", "update"]);
        object.save();

        setTimeout(function() {
            requests[0].respond(200);

            setTimeout(function() {
                expect(requests.length).to.equal(2);
                expect(requests[1].url).to.equal("http://localhost:3000/permissions");
                expect(requests[1].method).to.equal("POST");
                var data = JSON.parse(requests[1].requestBody);
                expect(data).to.exist;
                expect(data.grants[0]).to.have.property("sysObjectId", "theobjectid");
                expect(data.grants[0]).to.have.property("username", "buddy");
                expect(data.grants[0]).to.have.deep.property("permissions[0]", "read");
                expect(data.grants[0]).to.have.deep.property("permissions[1]", "update");
                expect(data.grants[1]).to.have.property("sysObjectId", "theobjectid");
                expect(data.grants[1]).to.have.property("username", "bff");
                expect(data.grants[1]).to.have.deep.property("permissions[0]", "read");
                expect(data.grants[1]).to.have.deep.property("permissions[1]", "delete");
                expect(data.grants[1]).to.have.deep.property("permissions[2]", "update");
                done();
            }, 10);
        }, 10);
    });

    it("should should POST permission grants with correct object id after saving a new object", function(done) {
        var object = appstax.object("MyObjects");

        object.grant("buddy", ["read", "update"]);
        object.grant("bff", ["read", "delete", "update"]);
        object.save();

        setTimeout(function() {
            requests[0].respond(200, {}, JSON.stringify({sysObjectId:"server-created-id"}));

            setTimeout(function() {
                expect(requests.length).to.equal(2);
                var data = JSON.parse(requests[1].requestBody);
                expect(data).to.exist;
                expect(data.grants[0]).to.have.property("sysObjectId", "server-created-id");
                expect(data.grants[1]).to.have.property("sysObjectId", "server-created-id");
                done();
            }, 10);
        }, 10);
    });

    it("should fulfill promise with object after permissions are saved", function(done) {
        var object = appstax.object("MyObjects", {sysObjectId:"id1"});

        object.grant("buddy", ["read", "update"]);
        var promise = object.save();

        setTimeout(function() {
            requests[0].respond(200);
            setTimeout(function() {
                requests[1].respond(200);
            }, 10);
        }, 10);
        promise.then(function(promisedObject) {
            expect(promisedObject).to.equal(object);
            done();
        }).done();
    });

    it("should not POST the same permission grants the next time the object is saved", function(done) {
        var object = appstax.object("MyObjects");

        object.grant("buddy", ["read", "update"]);
        var promise = object.save();

        setTimeout(function() {
            requests[0].respond(200, {}, JSON.stringify({sysObjectId:"id1"}));
            setTimeout(function() {
                requests[1].respond(200);
            }, 10);
        }, 10);
        promise.then(function() {
            expect(requests.length).to.equal(2);
            object.save();
            setTimeout(function() {
                requests[2].respond(200);
                expect(requests.length).to.equal(3);
                done();
            }, 10);
        }).done();
    });

    it("should reject promise with error if save completes but permission change fails", function(done) {
        var object = appstax.object("MyObjects");

        object.grant("buddy", ["read", "update"]);
        var promise = object.save();

        setTimeout(function() {
            requests[0].respond(200, {}, JSON.stringify({sysObjectId:"id1"}));
            setTimeout(function() {
                requests[1].respond(422, {}, JSON.stringify({errorMessage:"Permission error"}));
            }, 10);
        }, 10);
        promise
            .then(function() {
                throw new Error("Success handler should not be called!");
            })
            .fail(function(error) {
                expect(error).to.have.property("message", "Permission error");
                done();
            }).done();
    });

    it("should not perform permission changes if save fails", function(done) {
        var object = appstax.object("MyObjects");

        object.grant("buddy", ["read", "update"]);
        var promise = object.save();

        setTimeout(function() {
            requests[0].respond(422, {}, JSON.stringify({errorMessage:"Save error"}));
        }, 10);
        promise.fail(function(error) {
            expect(error).to.have.property("message", "Save error");
            expect(requests.length).to.equal(1);
            done();
        }).done();
    });

    it("should grant permissions to multiple users at once", function(done) {
        var object = appstax.object("MyObjects", {sysObjectId:"id2"});

        object.grant(["friend1", "friend2", "friend3"], ["read", "update", "delete"]);
        object.save();

        setTimeout(function() {
            requests[0].respond(200);
            setTimeout(function() {
                var data = JSON.parse(requests[1].requestBody);
                expect(data.grants[0]).to.have.property("sysObjectId", "id2");
                expect(data.grants[0]).to.have.property("username", "friend1");
                expect(data.grants[0]).to.have.deep.property("permissions[0]", "read");
                expect(data.grants[0]).to.have.deep.property("permissions[1]", "update");
                expect(data.grants[0]).to.have.deep.property("permissions[2]", "delete");
                expect(data.grants[1]).to.have.property("sysObjectId", "id2");
                expect(data.grants[1]).to.have.property("username", "friend2");
                expect(data.grants[1]).to.have.deep.property("permissions[0]", "read");
                expect(data.grants[1]).to.have.deep.property("permissions[1]", "update");
                expect(data.grants[1]).to.have.deep.property("permissions[2]", "delete");
                expect(data.grants[2]).to.have.property("sysObjectId", "id2");
                expect(data.grants[2]).to.have.property("username", "friend3");
                expect(data.grants[2]).to.have.deep.property("permissions[0]", "read");
                expect(data.grants[2]).to.have.deep.property("permissions[1]", "update");
                expect(data.grants[2]).to.have.deep.property("permissions[2]", "delete");
                done();
            }, 10);
        }, 10);
    });

    it("should should POST permission revokes after saving existing object", function(done) {
        var object = appstax.object("MyObjects", {sysObjectId:"id4"});

        object.revoke("badboy", ["update"]);
        object.revoke(["ex1", "ex2"], ["read", "delete", "update"]);
        object.save();

        setTimeout(function() {
            requests[0].respond(200);
            setTimeout(function() {
                expect(requests.length).to.equal(2);
                expect(requests[1].url).to.equal("http://localhost:3000/permissions");
                expect(requests[1].method).to.equal("POST");
                var data = JSON.parse(requests[1].requestBody);
                expect(data).to.exist;
                expect(data.revokes[0]).to.have.property("sysObjectId", "id4");
                expect(data.revokes[0]).to.have.property("username", "badboy");
                expect(data.revokes[0]).to.have.deep.property("permissions[0]", "update");
                expect(data.revokes[1]).to.have.property("sysObjectId", "id4");
                expect(data.revokes[1]).to.have.property("username", "ex1");
                expect(data.revokes[1]).to.have.deep.property("permissions[0]", "read");
                expect(data.revokes[1]).to.have.deep.property("permissions[1]", "delete");
                expect(data.revokes[1]).to.have.deep.property("permissions[2]", "update");
                expect(data.revokes[2]).to.have.property("sysObjectId", "id4");
                expect(data.revokes[2]).to.have.property("username", "ex2");
                expect(data.revokes[2]).to.have.deep.property("permissions[0]", "read");
                expect(data.revokes[2]).to.have.deep.property("permissions[1]", "delete");
                expect(data.revokes[2]).to.have.deep.property("permissions[2]", "update");
                done();
            }, 10);
        }, 10);
    });

    it("should POST grants and revokes in same request", function(done) {
        var object = appstax.object("foo");
        object.grant("friend", ["update"]);
        object.revoke("foe", ["read"]);
        object.save();

        setTimeout(function() {
            requests[0].respond(200, {}, JSON.stringify({sysObjectId:"objid1001"}));

            setTimeout(function() {
                expect(requests.length).to.equal(2);
                expect(requests[0].url).to.equal("http://localhost:3000/objects/foo");
                expect(requests[0].method).to.equal("POST");
                expect(requests[1].url).to.equal("http://localhost:3000/permissions");
                expect(requests[1].method).to.equal("POST");

                var data = JSON.parse(requests[1].requestBody);
                expect(data.grants[0]).to.have.property("sysObjectId", "objid1001");
                expect(data.grants[0]).to.have.property("username", "friend");
                expect(data.revokes[0]).to.have.property("sysObjectId", "objid1001");
                expect(data.revokes[0]).to.have.property("username", "foe");

                done();
            }, 10);
        }, 10);
    });

    it("should not PUT sysPermissions", function(done) {
        var promise = appstax.find("foobar", "1234-5678");
        setTimeout(function() {
            requests[0].respond(200, {}, JSON.stringify({sysObjectId:"3ac45e58-eba6-4ead-6f42-44042af923d3",
                                                         sysCreated:"2014-09-09T14:41:28.430418034+02:00",
                                                         sysUpdated:"2014-09-09T14:53:32.655640375+02:00",
                                                         sysPermissions:["read", "update"],
                                                         MyProperty:"MyValue"}));
        }, 10);

        promise.then(function(object) {
            object.save();
            setTimeout(function() {
                var putData = JSON.parse(requests[1].requestBody);
                expect(putData).to.not.have.property("sysPermissions");
                done();
            }, 10);
        }).done();
    });

    it("should grant public access with *", function(done) {
        var object = appstax.object("MyObjects", {sysObjectId:"obj1"});

        object.grantPublic(["update", "read"]);
        var promise = object.save();

        setTimeout(function() {
            requests[0].respond(200);
            setTimeout(function() {
                expect(requests.length).to.equal(2);
                expect(requests[1].url).to.equal("http://localhost:3000/permissions");
                expect(requests[1].method).to.equal("POST");
                var data = JSON.parse(requests[1].requestBody);
                expect(data).to.exist;
                expect(data.grants[0]).to.have.property("sysObjectId", "obj1");
                expect(data.grants[0]).to.have.property("username", "*");
                expect(data.grants[0]).to.have.deep.property("permissions[0]", "update");
                expect(data.grants[0]).to.have.deep.property("permissions[1]", "read");
                done();
            }, 10);
        }, 10);
    });

    it("should revoke public access with *", function(done) {
        var object = appstax.object("MyObjects", {sysObjectId:"obj2"});

        object.revokePublic(["update"]);
        var promise = object.save();

        setTimeout(function() {
            requests[0].respond(200);
            setTimeout(function() {
                expect(requests.length).to.equal(2);
                expect(requests[1].url).to.equal("http://localhost:3000/permissions");
                expect(requests[1].method).to.equal("POST");
                var data = JSON.parse(requests[1].requestBody);
                expect(data).to.exist;
                expect(data.revokes[0]).to.have.property("sysObjectId", "obj2");
                expect(data.revokes[0]).to.have.property("username", "*");
                expect(data.revokes[0]).to.have.deep.property("permissions[0]", "update");
                done();
            }, 10);
        }, 10);
    });

    it("should expose current permissions", function() {
        var object = appstax.object("post", {sysObjectId:"p1", sysPermissions:["read", "update"]});

        expect(object.permissions).to.contain("read");
        expect(object.permissions).to.contain("update");
        expect(object.permissions).to.not.contain("delete");

        expect(object.hasPermission("read")).to.be.true
        expect(object.hasPermission("delete")).to.be.false
    });

});
