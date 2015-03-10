
var appstax = require("../src/appstax");
var sinon = require("sinon");
var Q = require("kew");

describe("DataStore", function() {

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

    it("should create objects with given collection", function() {
        var object = appstax.object("MyCollection");
        expect(object).to.exist;
        expect(object).to.have.property("collectionName", "MyCollection");
    });

    it("should create object with given properties", function() {
        var object = appstax.object("MyObjects", {foo:"bar", baz:1002});
        expect(object).to.have.property("foo", "bar");
        expect(object).to.have.property("baz", 1002);
        expect(object).to.have.property("collectionName", "MyObjects");
    });

    it("should POST when saving objects", function() {
        var object = appstax.object("foo");
        object.save();

        expect(requests).to.have.length(1);
        expect(requests[0].method).to.equal("POST");
        expect(requests[0].url).to.equal("http://localhost:3000/objects/foo");
    });

    it("should POST all non-internal properties as data", function() {
        var object = appstax.object("MyObjects", {property1: "value1"});
        object.property2 = "value2";
        object.save();

        var data = JSON.parse(requests[0].requestBody)
        expect(data).to.have.property("property1", "value1");
        expect(data).to.have.property("property2", "value2");
        expect(data).to.not.have.property("save");
        expect(data).to.not.have.property("remove");
        expect(data).to.not.have.property("collectionName");
        expect(data).to.not.have.property("id");
        expect(data).to.not.have.property("internalId");
    });

    it("should ignore properties not starting with a letter when saving", function() {
        var object = appstax.object("MyObjects", {property1: "value1"});
        object.$$hashKey = "foo";
        object._private = "bar";
        object.save();

        var data = JSON.parse(requests[0].requestBody)
        expect(data).to.have.property("property1", "value1");
        expect(data).to.not.have.property("$$hashKey");
        expect(data).to.not.have.property("_private");
    });

    it("should fulfill promise with object when saving completes", function() {
        var object = appstax.object("foo");
        var promise = object.save();
        requests[0].respond(200);
        return promise.then(function(savedObject) {
            expect(savedObject).to.equal(object);
        });
    });

    it("should reject promise when saving fails", function() {
        var object = appstax.object("foo");
        var promise = object.save();

        requests[0].respond(422, {}, JSON.stringify({errorMessage:"The POST error"}));

        return promise.fail(function(error) {
            expect(error).to.have.property("message", "The POST error");
        });
    });

    it("should set id when saving completes", function() {
        var object = appstax.object("foo");
        expect(object.id).to.equal(null);

        var promise = object.save();
        requests[0].respond(200, {}, JSON.stringify({sysObjectId:"the-object-id"}));

        return promise.then(function() {
            expect(object.id).equals("the-object-id");
        });
    });

    it("should have read-only 'id' and 'collectionName'", function() {
        var object = appstax.object("foo", {sysObjectId:"bar"});

        expect(function() { object.id = "otherid" }).to.throw(Error);
        expect(function() { object.collectionName = "othername" }).to.throw(Error);
        expect(object).to.have.property("id", "bar");
        expect(object).to.have.property("collectionName", "foo");
    });

    it("should PUT when updating an already saved object", function() {
        var object = appstax.object("foo", {sysObjectId:"the-stored-id"});

        object.save();

        expect(requests).to.have.length(1);
        expect(requests[0].method).to.equal("PUT");
        expect(requests[0].url).to.equal("http://localhost:3000/objects/foo/the-stored-id");
    });

    it("should reject promise when update fails", function() {
        var object = appstax.object("foo", {sysObjectId:"the-id"});
        var promise = object.save();

        requests[0].respond(422, {}, JSON.stringify({errorMessage:"The PUT error"}));

        return promise.fail(function(error) {
            expect(error).to.have.property("message", "The PUT error");
        });
    });

    it("should put sysUpdated field with same value as received", function() {
        var promise = appstax.find("foobar", "1234-5678");
        requests[0].respond(200, {}, JSON.stringify({sysObjectId:"3ac45e58-eba6-4ead-6f42-44042af923d3",
                                                     sysCreated:"2014-09-09T14:41:28.430418034+02:00",
                                                     sysUpdated:"2014-09-09T14:53:32.655640375+02:00",
                                                     myProperty:"MyValue"}));

        return promise.then(function(object) {
            object.save();
            var putData = JSON.parse(requests[1].requestBody);
            expect(putData).to.have.property("sysCreated", "2014-09-09T14:41:28.430418034+02:00");
        });
    });

    it("should DELETE when removing an object", function() {
        var object = appstax.object("foo", {sysObjectId:"the-id"});

        object.remove();

        expect(requests).to.have.length(1);
        expect(requests[0].method).to.equal("DELETE");
        expect(requests[0].url).to.equal("http://localhost:3000/objects/foo/the-id");
    });

    it("should fulfill promise when removing completes", function() {
        var object = appstax.object("foo", {sysObjectId:"the-id"});
        var promise = object.remove();
        requests[0].respond(200);
        return promise.then(function() {
            return true;
        });
    });

    it("should reject promise when removing fails", function() {
        var object = appstax.object("foo", {sysObjectId:"the-id"});
        var promise = object.remove();

        requests[0].respond(422, {}, JSON.stringify({errorMessage:"The remove error"}));

        return promise.fail(function(error) {
            expect(error).to.have.property("message", "The remove error");
        });
    });

    it("should track object status", function() {
        var object1 = appstax.object("foo");
        var object2 = appstax.object("foo");
        expect(appstax.status(object1)).to.equal("new");
        expect(appstax.status(object2)).to.equal("new");

        var promise1 = object1.save();
        expect(appstax.status(object1)).to.equal("saving");
        expect(appstax.status(object2)).to.equal("new");

        var promise2 = object2.save();
        expect(appstax.status(object1)).to.equal("saving");
        expect(appstax.status(object2)).to.equal("saving");

        requests[0].respond(200, {}, JSON.stringify({sysObjectId:"server-object-id"}));

        return promise1.then(function() {
            expect(appstax.status(object1)).equals("saved");
            expect(appstax.status(object2)).equals("saving");
        });
    });

    it("should set status 'error' when saving fails", function() {
        var object = appstax.object("foo");
        var promise = object.save();

        requests[0].respond(422, {}, JSON.stringify({errorMessage:"The POST error"}));

        expect(appstax.status(object)).to.equal("error");
    });

    it("should return undefined status for unknown objects", function() {
        expect(appstax.status({})).to.be.undefined;
    });

    it("should delay save requests when there is already one in progress", function() {
        var object = appstax.object("foobar");
        expect(appstax.status(object)).to.equal("new");

        object.foo = "bar";
        var promise = object.save();
        object.foo = "baz";
        object.save();

        expect(appstax.status(object)).to.equal("saving");
        expect(requests.length).to.equal(1);
        expect(requests[0].url).to.equal("http://localhost:3000/objects/foobar");
        requests[0].respond(200, {}, JSON.stringify({sysObjectId:"server-object-id"}));

        return Q.delay(400).then(function() {
            expect(requests.length).to.equal(2);
            expect(requests[1].url).to.equal("http://localhost:3000/objects/foobar/server-object-id");
            expect(appstax.status(object)).to.equal("saving");
            expect(object.id).to.equal("server-object-id");
        });
    });

    it("should load all objects in collection", function() {
        var promise = appstax.findAll("goo");

        var req = requests[0];
        req.respond(200, {}, JSON.stringify({objects:[
            {sysObjectId:"1234", foo:"bar", sysCreated:"0001", sysUpdated:"0002"},
            {sysObjectId:"5678", baz:"gaz", sysCreated:"0003", sysUpdated:"0004"}
        ]}));

        return promise.then(function(objects) {
            expect(req.url).to.equal("http://localhost:3000/objects/goo");
            expect(objects.length).equals(2);
            expect(objects[0]).to.have.property("foo", "bar");
            expect(objects[1]).to.have.property("baz", "gaz");
            expect(objects[0]).to.have.property("id", "1234");
            expect(objects[1]).to.have.property("id", "5678");
            expect(objects[0]).to.have.property("collectionName", "goo");
            expect(objects[1]).to.have.property("collectionName", "goo");
            expect(objects[0]).to.not.have.property("sysObjectId");
            expect(objects[1]).to.not.have.property("sysObjectId");
            expect(objects[0]).to.not.have.property("sysCreated");
            expect(objects[1]).to.not.have.property("sysCreated");
            expect(objects[0]).to.not.have.property("sysUpdated");
            expect(objects[1]).to.not.have.property("sysUpdated");
        });
    });

    it("should reject promise when load all fails", function() {
        var promise = appstax.findAll("goo");

        requests[0].respond(422, {}, JSON.stringify({errorMessage:"The load all error"}));

        return promise.fail(function(error) {
            expect(error).to.have.property("message", "The load all error");
        });
    });

    it("should load a single object from a collection", function() {
        var promise = appstax.find("foobar", "1234-5678");

        var req = requests[0];
        req.respond(200, {}, JSON.stringify({sysObjectId:"1234-5678", zoo:"baz", sysCreated:"0001", sysUpdated:"0002"}));

        return promise.then(function(object) {
            expect(req.url).to.equal("http://localhost:3000/objects/foobar/1234-5678");
            expect(object).to.have.property("zoo", "baz");
            expect(object).to.have.property("id", "1234-5678");
            expect(object).to.have.property("collectionName", "foobar");
            expect(object).to.not.have.property("sysObjectId");
            expect(object).to.not.have.property("sysCreated");
            expect(object).to.not.have.property("sysUpdated");
        });
    });

    it("should reject promise when load all fails", function() {
        var promise = appstax.find("foobar", "1234-5678");

        requests[0].respond(422, {}, JSON.stringify({errorMessage:"The load single error"}));

        return promise.fail(function(error) {
            expect(error).to.have.property("message", "The load single error");
        });
    });

    it("should refresh a previously loaded object", function() {
        var object = appstax.object("foo", {sysObjectId:"obj1", bar:"baz"});

        var promise = object.refresh();
        requests[0].respond(200, {}, JSON.stringify({sysObjectId:"obj1", bar:"bazz"}));

        return promise.then(function(object) {
            expect(object.bar).to.equal("bazz");
        });
    });

    it("should not refresh from server if the object is new", function() {
        var object = appstax.object("foo", {bar:"baz"});

        var promise = object.refresh();

        return promise.then(function(object) {
            expect(requests.length).to.equal(0);
            expect(object.bar).to.equal("baz");
        });
    });

});







