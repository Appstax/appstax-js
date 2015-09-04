
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
        var object = appstax.object("MyObjects", {property1: "value1", sysCreated:"1", sysUpdated: "2"});
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
        expect(data).to.not.have.property("sysCreated");
        expect(data).to.not.have.property("sysUpdated");
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

        return promise
            .then(function() {
                throw new Error("Success handler should not be called!");
            })
            .fail(function(error) {
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

    it("should have read-only created/updated date properties", function() {
        var object = appstax.object("foo", {
            sysCreated: "2015-08-19T10:38:33.721658846Z",
            sysUpdated: "2016-09-20T15:39:34.721658846Z"
        });

        expect(object.created).to.be.instanceof(Date);
        expect(object.updated).to.be.instanceof(Date);

        expect(function() { object.created = new Date() }).to.throw(Error);
        expect(function() { object.updated = new Date() }).to.throw(Error);

        expect(object.created.toUTCString()).to.equal("Wed, 19 Aug 2015 10:38:33 GMT");
        expect(object.updated.toUTCString()).to.equal("Tue, 20 Sep 2016 15:39:34 GMT");
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

        return promise
            .then(function() {
                throw new Error("Success handler should not be called!");
            })
            .fail(function(error) {
                expect(error).to.have.property("message", "The PUT error");
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

        return promise
            .then(function() {
                throw new Error("Success handler should not be called!");
            })
            .fail(function(error) {
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

        return promise
            .then(function() {
                throw new Error("Success handler should not be called!");
            })
            .fail(function(error) {
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

        return promise
            .then(function() {
                throw new Error("Success handler should not be called!");
            })
            .fail(function(error) {
                expect(error).to.have.property("message", "The load single error");
            });
    });

    it("should refresh a previously loaded object", function() {
        var object = appstax.object("foo", {sysObjectId:"obj1", bar:"baz"});

        var promise = object.refresh();
        requests[0].respond(200, {}, JSON.stringify({sysObjectId:"obj1", bar:"bazz"}));

        return promise.then(function(object) {
            expect(object.bar).to.equal("bazz");
            expect(object).to.not.have.property("sysObjectId");
            expect(object).to.not.have.property("sysCreated");
            expect(object).to.not.have.property("sysUpdated");
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

    describe("using object factory", function() {

        var resultSpy, factorySpy;

        beforeEach(function() {
            resultSpy = sinon.spy();
            factorySpy = sinon.spy(function(collectionName, properties) {
                return {
                    id: properties.sysObjectId,
                    spy: true
                }
            });
        });

        function respond(o) {
            requests[0].respond(200, {}, JSON.stringify(o));
        }

        it("should work with findAll(collection)", function() {
            appstax.findAll("coll1", {factory: factorySpy}).then(resultSpy);
            respond({objects:[{sysObjectId: "id1"}, {sysObjectId: "id2"}]});

            expect(factorySpy.callCount).to.equal(2);
            expect(factorySpy.args[0][0]).to.equal("coll1");
            expect(factorySpy.args[1][0]).to.equal("coll1");
            expect(factorySpy.args[0][1]).to.have.property("sysObjectId", "id1");
            expect(factorySpy.args[1][1]).to.have.property("sysObjectId", "id2");

            expect(resultSpy.callCount).to.equal(1);
            expect(resultSpy.args[0][0][0]).to.have.property("id", "id1");
            expect(resultSpy.args[0][0][1]).to.have.property("id", "id2");
            expect(resultSpy.args[0][0][0]).to.have.property("spy", true);
            expect(resultSpy.args[0][0][1]).to.have.property("spy", true);
        });

        it("should work with find(collection, id)", function() {
            appstax.find("coll2", "id3", {factory: factorySpy}).then(resultSpy);
            respond({sysObjectId: "id3"});

            expect(factorySpy.callCount).to.equal(1);
            expect(factorySpy.args[0][0]).to.equal("coll2");
            expect(factorySpy.args[0][1]).to.have.property("sysObjectId", "id3");

            expect(resultSpy.callCount).to.equal(1);
            expect(resultSpy.args[0][0]).to.have.property("id", "id3");
            expect(resultSpy.args[0][0]).to.have.property("spy", true);
        });

        it("should work with find(collection, queryFunction)", function() {
            var query = function() {}
            appstax.find("coll3", query, {factory: factorySpy}).then(resultSpy);
            respond({objects:[{sysObjectId: "id4"}, {sysObjectId: "id5"}]});

            expect(factorySpy.callCount).to.equal(2);
            expect(factorySpy.args[0][0]).to.equal("coll3");
            expect(factorySpy.args[1][0]).to.equal("coll3");
            expect(factorySpy.args[0][1]).to.have.property("sysObjectId", "id4");
            expect(factorySpy.args[1][1]).to.have.property("sysObjectId", "id5");

            expect(resultSpy.callCount).to.equal(1);
            expect(resultSpy.args[0][0][0]).to.have.property("id", "id4");
            expect(resultSpy.args[0][0][1]).to.have.property("id", "id5");
            expect(resultSpy.args[0][0][0]).to.have.property("spy", true);
            expect(resultSpy.args[0][0][1]).to.have.property("spy", true);
        });

        it("should work with find(collection, queryObject)", function() {
            var query = {queryString: function() { return "foo" }};
            appstax.find("coll4", query, {factory: factorySpy}).then(resultSpy);
            respond({objects:[{sysObjectId: "id6"}, {sysObjectId: "id7"}]});

            expect(factorySpy.callCount).to.equal(2);
            expect(factorySpy.args[0][0]).to.equal("coll4");
            expect(factorySpy.args[1][0]).to.equal("coll4");
            expect(factorySpy.args[0][1]).to.have.property("sysObjectId", "id6");
            expect(factorySpy.args[1][1]).to.have.property("sysObjectId", "id7");

            expect(resultSpy.callCount).to.equal(1);
            expect(resultSpy.args[0][0][0]).to.have.property("id", "id6");
            expect(resultSpy.args[0][0][1]).to.have.property("id", "id7");
            expect(resultSpy.args[0][0][0]).to.have.property("spy", true);
            expect(resultSpy.args[0][0][1]).to.have.property("spy", true);
        });

        it("should work with find(collection, queryString)", function() {
            var query = "foo";
            appstax.find("coll5", query, {factory: factorySpy}).then(resultSpy);
            respond({objects:[{sysObjectId: "id8"}, {sysObjectId: "id9"}]});

            expect(factorySpy.callCount).to.equal(2);
            expect(factorySpy.args[0][0]).to.equal("coll5");
            expect(factorySpy.args[1][0]).to.equal("coll5");
            expect(factorySpy.args[0][1]).to.have.property("sysObjectId", "id8");
            expect(factorySpy.args[1][1]).to.have.property("sysObjectId", "id9");

            expect(resultSpy.callCount).to.equal(1);
            expect(resultSpy.args[0][0][0]).to.have.property("id", "id8");
            expect(resultSpy.args[0][0][1]).to.have.property("id", "id9");
            expect(resultSpy.args[0][0][0]).to.have.property("spy", true);
            expect(resultSpy.args[0][0][1]).to.have.property("spy", true);
        });

        it("should work with find(collection, propertyValues)", function() {
            appstax.find("coll6", {foo:"bar"}, {factory: factorySpy}).then(resultSpy);
            respond({objects:[{sysObjectId: "id1"}, {sysObjectId: "id2"}]});

            expect(factorySpy.callCount).to.equal(2);
            expect(factorySpy.args[0][0]).to.equal("coll6");
            expect(factorySpy.args[1][0]).to.equal("coll6");
            expect(factorySpy.args[0][1]).to.have.property("sysObjectId", "id1");
            expect(factorySpy.args[1][1]).to.have.property("sysObjectId", "id2");

            expect(resultSpy.callCount).to.equal(1);
            expect(resultSpy.args[0][0][0]).to.have.property("id", "id1");
            expect(resultSpy.args[0][0][1]).to.have.property("id", "id2");
            expect(resultSpy.args[0][0][0]).to.have.property("spy", true);
            expect(resultSpy.args[0][0][1]).to.have.property("spy", true);
        });

        it("should work with search(collection, propertyValues)", function() {
            appstax.search("coll7", {foo:"bar"}, {factory: factorySpy}).then(resultSpy);
            respond({objects:[{sysObjectId: "id3"}, {sysObjectId: "id4"}]});

            expect(factorySpy.callCount).to.equal(2);
            expect(factorySpy.args[0][0]).to.equal("coll7");
            expect(factorySpy.args[1][0]).to.equal("coll7");
            expect(factorySpy.args[0][1]).to.have.property("sysObjectId", "id3");
            expect(factorySpy.args[1][1]).to.have.property("sysObjectId", "id4");

            expect(resultSpy.callCount).to.equal(1);
            expect(resultSpy.args[0][0][0]).to.have.property("id", "id3");
            expect(resultSpy.args[0][0][1]).to.have.property("id", "id4");
            expect(resultSpy.args[0][0][0]).to.have.property("spy", true);
            expect(resultSpy.args[0][0][1]).to.have.property("spy", true);
        });

        it("should work with search(collection, propertyValue, propertyNames)", function() {
            appstax.search("coll8", "needle", ["haystack1", "haystack2"], {factory: factorySpy}).then(resultSpy);
            respond({objects:[{sysObjectId: "id5"}, {sysObjectId: "id6"}]});

            expect(factorySpy.callCount).to.equal(2);
            expect(factorySpy.args[0][0]).to.equal("coll8");
            expect(factorySpy.args[1][0]).to.equal("coll8");
            expect(factorySpy.args[0][1]).to.have.property("sysObjectId", "id5");
            expect(factorySpy.args[1][1]).to.have.property("sysObjectId", "id6");

            expect(resultSpy.callCount).to.equal(1);
            expect(resultSpy.args[0][0][0]).to.have.property("id", "id5");
            expect(resultSpy.args[0][0][1]).to.have.property("id", "id6");
            expect(resultSpy.args[0][0][0]).to.have.property("spy", true);
            expect(resultSpy.args[0][0][1]).to.have.property("spy", true);
        });

        it("should work with expanded relations", function() {
            factorySpy = sinon.spy(function(collectionName, properties, factory) {
                var obj = appstax.object(collectionName, properties, factory);
                obj.spy = true;
                return obj;
            });

            appstax.find("coll1", "id1", {factory: factorySpy}).then(resultSpy);

            respond({
                sysObjectId: "id1",
                prop1: {
                    sysDatatype: "relation",
                    sysRelationType: "single",
                    sysCollection: "coll2",
                    sysObjects: [{sysObjectId:"id2"}]
                },
                prop2: {
                    sysDatatype: "relation",
                    sysRelationType: "array",
                    sysCollection: "coll3",
                    sysObjects: [
                        {sysObjectId:"id3"},
                        {sysObjectId:"id4", prop3: {
                            sysDatatype: "relation",
                            sysRelationType: "single",
                            sysCollection: "coll4",
                            sysObjects: [{sysObjectId:"id5"}]
                        }}]
                }
            });

            expect(factorySpy.callCount).to.equal(5);
            expect(factorySpy.args[0][0]).to.equal("coll1");
            expect(factorySpy.args[1][0]).to.equal("coll2");
            expect(factorySpy.args[2][0]).to.equal("coll3");
            expect(factorySpy.args[3][0]).to.equal("coll3");
            expect(factorySpy.args[4][0]).to.equal("coll4");
            expect(factorySpy.args[0][1]).to.have.property("sysObjectId", "id1");
            expect(factorySpy.args[1][1]).to.have.property("sysObjectId", "id2");
            expect(factorySpy.args[2][1]).to.have.property("sysObjectId", "id3");
            expect(factorySpy.args[3][1]).to.have.property("sysObjectId", "id4");
            expect(factorySpy.args[4][1]).to.have.property("sysObjectId", "id5");

            expect(resultSpy.callCount).to.equal(1);
            expect(resultSpy.args[0][0]).to.have.property("id", "id1");
            expect(resultSpy.args[0][0].prop1).to.have.property("id", "id2");
            expect(resultSpy.args[0][0].prop2[0]).to.have.property("id", "id3");
            expect(resultSpy.args[0][0].prop2[1]).to.have.property("id", "id4");
            expect(resultSpy.args[0][0].prop2[1].prop3).to.have.property("id", "id5");

            expect(resultSpy.args[0][0]).to.have.property("spy", true);
            expect(resultSpy.args[0][0].prop1).to.have.property("spy", true);
            expect(resultSpy.args[0][0].prop2[0]).to.have.property("spy", true);
            expect(resultSpy.args[0][0].prop2[1]).to.have.property("spy", true);
            expect(resultSpy.args[0][0].prop2[1].prop3).to.have.property("spy", true);
        });

    });

});







