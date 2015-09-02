
var appstax = require("../src/appstax");
var sinon = require("sinon");
var Q = require("kew");
var wsmock = require("./lib/wsmock");

describe("Live data model", function() {

    var xhr, requests;
    var channelStub;
    var channels;

    beforeEach(function() {
        _appstaxInit({baseUrl: "http://localhost:3000/", log:false});
        _setupRequests();
    });

    afterEach(function() {
        xhr.restore();
        channelStub.restore();
        channelStub = null;
        appstax.logout();
    });

    function _appstaxInit(options) {
        appstax.init(options);
        _setupChannelStub();
    }

    function _setupRequests() {
        requests = [];
        xhr = sinon.useFakeXMLHttpRequest();
        xhr.onCreate = function(request) {
            requests.push(request);
        };
    }

    function _setupChannelStub() {
        if(channelStub != null) {
            channelStub.restore();
        }
        channels = {};
        channelStub = sinon.stub(appstax.channels, "getChannel", function(name, filter) {
            var channel = {
                on: function(event, handler) {
                    channel.handlers[event] = handler;
                }
            }
            channel.handlers = {};
            channels[name + "$" + (filter || "")] = channel;
            return channel;
        });
    }

    function fakeChannelReceive(name, filter, event) {
        var id = name + "$" + (filter || "");
        var channel = channels[id];
        if(channel) {
            var handler = channel.handlers[event.type];
            if(handler) {
                handler(event);
            }
        }
    }

    it("should add array property and update it with initial data", function() {
        var model = appstax.model();

        expect(model).to.not.have.property("posts");
        model.watch("posts");
        expect(model).to.have.property("posts");
        expect(model.posts).to.be.instanceof(Array);
        expect(model.posts.length).to.equal(0);

        expect(requests.length).to.equal(1);
        expect(requests[0].method).to.equal("GET");
        expect(requests[0].url).to.equal("http://localhost:3000/objects/posts");

        requests[0].respond(200, {}, JSON.stringify({objects:[
            {sysObjectId: "id1", content: "c1", sysCreated: "2015-08-19T11:00:00"},
            {sysObjectId: "id2", content: "c2", sysCreated: "2015-08-19T10:00:00"}
        ]}));

        expect(model.posts.length).to.equal(2);
        expect(model.posts[0].id).to.equal("id1");
        expect(model.posts[1].id).to.equal("id2");
        expect(model.posts[0].content).to.equal("c1")
        expect(model.posts[1].content).to.equal("c2")
        expect(model.posts[0].collectionName).to.equal("posts");
        expect(model.posts[1].collectionName).to.equal("posts");
    });

    it("should sort initial data by created date", function() {
        var model = appstax.model();
        model.watch("posts");

        requests[0].respond(200, {}, JSON.stringify({objects:[
            {sysObjectId: "id1", sysCreated: "2015-08-19T10:00:00"},
            {sysObjectId: "id2", sysCreated: "2015-08-19T12:00:00"},
            {sysObjectId: "id3", sysCreated: "2015-08-19T11:00:00"}
        ]}));

        var ids = model.posts.map(function(o) { return o.id }).join(",");
        expect(ids).to.equal("id2,id3,id1");
    });

    it("should order objects by given date property (asc)", function() {
        var model = appstax.model();
        model.watch("posts", {order: "updated"});

        requests[0].respond(200, {}, JSON.stringify({objects:[
            {sysObjectId: "id1", sysCreated: "2015-08-20", sysUpdated: "2015-08-21"},
            {sysObjectId: "id2", sysCreated: "2015-08-22", sysUpdated: "2015-08-20"},
            {sysObjectId: "id3", sysCreated: "2015-08-21", sysUpdated: "2015-08-22"}
        ]}));

        var ids = model.posts.map(function(o) { return o.id }).join(",");
        expect(ids).to.equal("id2,id1,id3");
    });

    it("should order objects by given date property (desc)", function() {
        var model = appstax.model();
        model.watch("posts", {order: "-updated"});

        requests[0].respond(200, {}, JSON.stringify({objects:[
            {sysObjectId: "id1", sysCreated: "2015-08-20", sysUpdated: "2015-08-21"},
            {sysObjectId: "id2", sysCreated: "2015-08-22", sysUpdated: "2015-08-20"},
            {sysObjectId: "id3", sysCreated: "2015-08-21", sysUpdated: "2015-08-22"}
        ]}));

        var ids = model.posts.map(function(o) { return o.id }).join(",");
        expect(ids).to.equal("id3,id1,id2");
    });

    it("should order objects by given string property (asc)", function() {
        var model = appstax.model();
        model.watch("posts", {order: "category"});

        requests[0].respond(200, {}, JSON.stringify({objects:[
            {sysObjectId: "id1", sysCreated: "2015-08-22", category: "gamma"},
            {sysObjectId: "id2", sysCreated: "2015-08-20", category: "alpha"},
            {sysObjectId: "id3", sysCreated: "2015-08-21", category: "beta"}
        ]}));

        var ids = model.posts.map(function(o) { return o.id }).join(",");
        expect(ids).to.equal("id2,id3,id1");
    });

    it("should order objects by given string property (desc)", function() {
        var model = appstax.model();
        model.watch("posts", {order: "-category"});

        requests[0].respond(200, {}, JSON.stringify({objects:[
            {sysObjectId: "id1", sysCreated: "2015-08-22", category: "gamma"},
            {sysObjectId: "id2", sysCreated: "2015-08-20", category: "alpha"},
            {sysObjectId: "id3", sysCreated: "2015-08-21", category: "beta"}
        ]}));

        var ids = model.posts.map(function(o) { return o.id }).join(",");
        expect(ids).to.equal("id1,id3,id2");
    });

    it("should trigger change event after loading initial data", function(done) {
        var model = appstax.model();
        model.watch("posts");

        model.on("change", function() {
            expect(model.posts.length).to.equal(1);
            done();
        });

        requests[0].respond(200, {}, JSON.stringify({objects:[
            {sysObjectId: "id1"}
        ]}));
    });

    it("should add objects when receiving realtime object.created", function() {
        var model = appstax.model();
        model.watch("posts");

        fakeChannelReceive("objects/posts", "", {
            type: "object.created",
            object: appstax.object("posts", {sysObjectId: "id3", content: "c3"})
        });

        expect(model.posts.length).to.equal(1);
        expect(model.posts[0].id).to.equal("id3");
        expect(model.posts[0].collectionName).to.equal("posts");
        expect(model.posts[0].content).to.equal("c3");
    });

    it("should keep order when inserting object from object.created", function() {
        var model = appstax.model();
        model.watch("posts");

        requests[0].respond(200, {}, JSON.stringify({objects:[
            {sysObjectId: "id1", sysCreated: "2015-08-19T10:00:00"},
            {sysObjectId: "id2", sysCreated: "2015-08-19T12:00:00"},
            {sysObjectId: "id3", sysCreated: "2015-08-19T11:00:00"}
        ]}));

        fakeChannelReceive("objects/posts", "", {
            type: "object.created",
            object: appstax.object("posts", {
                sysObjectId: "id4",
                sysCreated: "2015-08-19T11:30:00"
            })
        });

        var ids = model.posts.map(function(o) { return o.id }).join(",");
        expect(ids).to.equal("id2,id4,id3,id1");
    });

    it("should reorder when updating object from object.updated", function() {
        var model = appstax.model();
        model.watch("posts", {order: "-updated"});

        requests[0].respond(200, {}, JSON.stringify({objects:[
            {sysObjectId: "id1", sysUpdated: "2015-08-20"},
            {sysObjectId: "id2", sysUpdated: "2015-08-22"},
            {sysObjectId: "id3", sysUpdated: "2015-08-21"}
        ]}));

        var ids = model.posts.map(function(o) { return o.id }).join(",");
        expect(ids).to.equal("id2,id3,id1");

        fakeChannelReceive("objects/posts", "", {
            type: "object.updated",
            object: appstax.object("posts", {
                sysObjectId: "id1",
                sysUpdated: "2015-08-23"
            })
        });

        var ids = model.posts.map(function(o) { return o.id }).join(",");
        expect(ids).to.equal("id1,id2,id3");
    });

    it("should remove object when receiving object.deleted", function() {
        var model = appstax.model();
        model.watch("posts");

        requests[0].respond(200, {}, JSON.stringify({objects:[
            {sysObjectId: "id1"},
            {sysObjectId: "id2"},
            {sysObjectId: "id3"}
        ]}));

        fakeChannelReceive("objects/posts", "", {
            type: "object.deleted",
            object: appstax.object("posts", {
                sysObjectId: "id2"
            })
        });

        var ids = model.posts.map(function(o) { return o.id }).join(",");
        expect(ids).to.equal("id1,id3");
    });

    it("should update object in place when receiving object.deleted", function() {
        var model = appstax.model();
        model.watch("posts");

        requests[0].respond(200, {}, JSON.stringify({objects:[
            {sysObjectId: "id1", prop: "value1"}
        ]}));

        var oldObject = model.posts[0];

        fakeChannelReceive("objects/posts", "", {
            type: "object.updated",
            object: appstax.object("posts", {
                sysObjectId: "id1",
                prop: "value2"
            })
        });

        var updatedObject = model.posts[0];
        expect(updatedObject.prop).to.equal("value2")
        expect(updatedObject === oldObject).to.be.true
        expect(updatedObject).to.equal(oldObject);
    });

    it("should trigger change event after receiving realtime object events", function() {
        var model = appstax.model();
        model.watch("posts");

        var changes = 0;
        model.on("change", function() {
            changes++;
        });

        fakeChannelReceive("objects/posts", "", {
            type: "object.created",
            object: appstax.object("posts", {sysObjectId: "id1"})
        });
        fakeChannelReceive("objects/posts", "", {
            type: "object.updated",
            object: appstax.object("posts", {sysObjectId: "id1"})
        });
        fakeChannelReceive("objects/posts", "", {
            type: "object.deleted",
            object: appstax.object("posts", {sysObjectId: "id1"})
        });

        expect(changes).to.equal(3);
    });

    describe(".has() filter", function() {

        it("should match string properties", function() {
            var model = appstax.model();
            model.watch("messages");

            requests[0].respond(200, {}, JSON.stringify({objects:[
                {sysObjectId: "id1", category:"foo", sysCreated: "2015-08-22"},
                {sysObjectId: "id2", category:"bar", sysCreated: "2015-08-21"},
                {sysObjectId: "id3", category:"foo", sysCreated: "2015-08-20"}
            ]}));

            var filtered = model.messages.has("category", "foo");
            expect(filtered).to.be.instanceOf(Array);
            expect(filtered.length).to.equal(2);
            expect(filtered[0].id).to.equal("id1");
            expect(filtered[1].id).to.equal("id3");
        });

        it("should match number properties", function() {
            var model = appstax.model();
            model.watch("messages");

            requests[0].respond(200, {}, JSON.stringify({objects:[
                {sysObjectId: "id1", value: 1, sysCreated: "2015-08-22"},
                {sysObjectId: "id2", value: 2, sysCreated: "2015-08-21"},
                {sysObjectId: "id3", value: 2, sysCreated: "2015-08-20"}
            ]}));

            var filtered = model.messages.has("value", 2);
            expect(filtered).to.be.instanceOf(Array);
            expect(filtered.length).to.equal(2);
            expect(filtered[0].id).to.equal("id2");
            expect(filtered[1].id).to.equal("id3");
        });

        it("should match number properties", function() {
            var model = appstax.model();
            model.watch("messages");

            requests[0].respond(200, {}, JSON.stringify({objects:[
                {sysObjectId: "id1", value: 1, sysCreated: "2015-08-22"},
                {sysObjectId: "id2", value: 2, sysCreated: "2015-08-21"},
                {sysObjectId: "id3", value: 2, sysCreated: "2015-08-20"}
            ]}));

            var filtered = model.messages.has("value", 2);
            expect(filtered).to.be.instanceOf(Array);
            expect(filtered.length).to.equal(2);
            expect(filtered[0].id).to.equal("id2");
            expect(filtered[1].id).to.equal("id3");
        });

        it("should match array properties, single value", function() {
            var model = appstax.model();
            model.watch("messages");

            requests[0].respond(200, {}, JSON.stringify({objects:[
                {sysObjectId: "id1", tags: ["foo", "bar"], sysCreated: "2015-08-22"},
                {sysObjectId: "id2", tags: ["bar", "baz"], sysCreated: "2015-08-21"},
                {sysObjectId: "id3", tags: ["baz", "gaz"], sysCreated: "2015-08-20"}
            ]}));

            var filtered = model.messages.has("tags", "bar");
            expect(filtered).to.be.instanceOf(Array);
            expect(filtered.length).to.equal(2);
            expect(filtered[0].id).to.equal("id1");
            expect(filtered[1].id).to.equal("id2");
        });

        it("should match array properties, multiple values (OR)", function() {
            var model = appstax.model();
            model.watch("messages");

            requests[0].respond(200, {}, JSON.stringify({objects:[
                {sysObjectId: "id1", tags: ["foo", "bar"], sysCreated: "2015-08-22"},
                {sysObjectId: "id2", tags: ["bar", "baz"], sysCreated: "2015-08-21"},
                {sysObjectId: "id3", tags: ["baz", "gaz"], sysCreated: "2015-08-20"}
            ]}));

            var filtered = model.messages.has("tags", ["foo", "bar"]);
            expect(filtered).to.be.instanceOf(Array);
            expect(filtered.length).to.equal(2);
            expect(filtered[0].id).to.equal("id1");
            expect(filtered[1].id).to.equal("id2");
        });

        it("should match relation properties", function() {
            var model = appstax.model();
            model.watch("messages");

            requests[0].respond(200, {}, JSON.stringify({objects:[
                { sysObjectId: "id1", sysCreated: "2015-08-22",
                  comments: {
                      sysDatatype: "relation",
                      sysRelationType: "array",
                      sysObjects: ["rel1", "rel2"]
                  }},
                { sysObjectId: "id2", sysCreated: "2015-08-21",
                  comments: {
                      sysDatatype: "relation",
                      sysRelationType: "array",
                      sysObjects: [{sysObjectId:"rel2"}, {sysObjectId:"rel3"}]
                  }},
                { sysObjectId: "id3", sysCreated: "2015-08-20",
                  comments: {
                      sysDatatype: "relation",
                      sysRelationType: "array",
                      sysObjects: ["rel4"]
                  }}
            ]}));

            var filtered = model.messages.has("comments", ["rel3", appstax.object("foo", {sysObjectId:"rel4"})]);
            expect(filtered).to.be.instanceOf(Array);
            expect(filtered.length).to.equal(2);
            expect(filtered[0].id).to.equal("id2");
            expect(filtered[1].id).to.equal("id3");
        });

    });

    describe("currentUser observer", function() {

        it("should be null before login", function() {
            var model = appstax.model();
            model.watch("currentUser");

            expect(model.currentUser).to.equal(null);
        });

        it("should get loaded with properties if user is already logged in", function() {
            var appKey   = "appkey_" + (Math.random() * 10000);
            var localKey = "appstax_session_" + appKey;
            localStorage.setItem(localKey, JSON.stringify({
                username:  "bart",
                userId:    "id1001",
                sessionId: "sid1002"
            }));
            _appstaxInit({appKey: appKey, baseUrl: "http://localhost:3000/"});

            var model = appstax.model();
            model.watch("currentUser");

            expect(model.currentUser).to.equal(null);
            expect(requests.length).to.equal(1);
            expect(requests[0].url).to.equal("http://localhost:3000/objects/users/id1001");

            requests[0].respond(200, {}, JSON.stringify({sysObjectId: "id1001", fullName:"Bart Simpson"}));

            expect(model.currentUser).to.have.property("fullName", "Bart Simpson");

            delete localStorage[localKey];
        });

        it("should get loaded with properties after login", function() {
            var model = appstax.model();
            model.watch("currentUser");

            appstax.login("homer", "secret");

            expect(model.currentUser).to.equal(null);
            expect(requests.length).to.equal(1);
            expect(requests[0].method).to.equal("POST");
            expect(requests[0].url).to.equal("http://localhost:3000/sessions");

            requests[0].respond(200, {}, JSON.stringify({
                sysSessionId: "sid1003",
                user: {sysObjectId: "id1004", fullName: "Homer Simpson"}
            }));

            expect(model.currentUser).to.exist;
            expect(model.currentUser).to.have.property("fullName", "Homer Simpson");
        });

        it("should get loaded with properties after signup", function() {
            var model = appstax.model();
            model.watch("currentUser");

            appstax.signup("smithers", "secret");

            expect(model.currentUser).to.equal(null);
            expect(requests.length).to.equal(1);
            expect(requests[0].method).to.equal("POST");
            expect(requests[0].url).to.equal("http://localhost:3000/users?login=true");

            requests[0].respond(200, {}, JSON.stringify({
                sysSessionId: "sid1003",
                user: {sysObjectId: "id1005", fullName: "Mr. Smithers"}
            }));

            expect(model.currentUser).to.exist;
            expect(model.currentUser).to.have.property("fullName", "Mr. Smithers");
        });

        it("should be removed after logout", function() {
            var model = appstax.model();
            model.watch("currentUser");

            appstax.login("smithers", "secret");
            requests[0].respond(200, {}, JSON.stringify({sysSessionId: "sid1003", user: {sysObjectId: "id1005"}}));

            expect(model.currentUser).to.exist;

            appstax.logout();
            expect(model.currentUser).to.equal(null);
        });

        it("should be updated on object.updated", function() {
            var model = appstax.model();
            model.watch("currentUser");

            appstax.login("homer", "secret");
            requests[0].respond(200, {}, JSON.stringify({
                sysSessionId: "sid1003",
                user: {sysObjectId: "id1005", fullName: "Homer S"}
            }));

            expect(model.currentUser).to.have.property("fullName", "Homer S");

            fakeChannelReceive("objects/users", "", {
                type: "object.updated",
                object: appstax.object("users", {sysObjectId: "id1005", fullName: "Homer Jay Simpson"})
            });

            expect(model.currentUser).to.have.property("fullName", "Homer Jay Simpson");
        });

    });

    describe("status observer", function() {

        var realtimeSessionId = "rsid1234";
        var socketUrl;
        var ws;

        beforeEach(function() {
            socketUrl = "ws://localhost:3000/api/latest/messaging/realtime?rsession=" + realtimeSessionId;
            ws = wsmock(socketUrl);
        })

        it("should trigger 'change' events and update model.status throughout connection/reconnection lifecycle", function(done) {
            var socket = appstax.apiClient.socket();
            var changeSpy = sinon.spy();
            var model = appstax.model();

            model.on("change", changeSpy);
            model.watch("status");

            expect(model.status).to.equal("disconnected");
            expect(changeSpy.callCount).to.equal(1);

            socket.connect();
            expect(model.status).to.equal("connecting");
            expect(changeSpy.callCount).to.equal(2);

            setTimeout(function() {
                expect(requests.length).to.equal(1);
                requests[0].respond(200, {}, JSON.stringify({realtimeSessionId: realtimeSessionId}));
            }, 20);

            setTimeout(function() {
                expect(model.status).to.equal("connected");
                expect(changeSpy.callCount).to.equal(3);
                ws.server.close();

                setTimeout(function() {
                    expect(model.status).to.equal("disconnected");
                    expect(changeSpy.callCount).to.equal(4);
                    done();
                }, 10);
            }, 250);

        });
    });

});
