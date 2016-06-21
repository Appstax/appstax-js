
var appstax = require("../src/appstax");
var sinon = require("sinon");
var Q = require("q");
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

    it("should add array property and update it with initial data", function(done) {
        var model = appstax.model();

        expect(model).to.not.have.property("posts");
        model.watch("posts");
        expect(model).to.have.property("posts");
        expect(model.posts).to.be.instanceof(Array);
        expect(model.posts.length).to.equal(0);

        expect(requests.length).to.equal(1);
        expect(requests[0].method).to.equal("GET");
        expect(requests[0].url).to.equal("http://localhost:3000/objects/posts");

        setTimeout(function() {
            requests[0].respond(200, {}, JSON.stringify({objects:[
                {sysObjectId: "id1", content: "c1", sysCreated: "2015-08-19T11:00:00"},
                {sysObjectId: "id2", content: "c2", sysCreated: "2015-08-19T10:00:00"}
            ]}));

            setTimeout(function() {
                expect(model.posts.length).to.equal(2);
                expect(model.posts[0].id).to.equal("id1");
                expect(model.posts[1].id).to.equal("id2");
                expect(model.posts[0].content).to.equal("c1")
                expect(model.posts[1].content).to.equal("c2")
                expect(model.posts[0].collectionName).to.equal("posts");
                expect(model.posts[1].collectionName).to.equal("posts");
                done();
            }, 10);
        }, 10);
    });

    it("should sort initial data by created date", function(done) {
        var model = appstax.model();
        model.watch("posts");

        setTimeout(function() {
            requests[0].respond(200, {}, JSON.stringify({objects:[
                {sysObjectId: "id1", sysCreated: "2015-08-19T10:00:00"},
                {sysObjectId: "id2", sysCreated: "2015-08-19T12:00:00"},
                {sysObjectId: "id3", sysCreated: "2015-08-19T11:00:00"}
            ]}));

            setTimeout(function() {
                var ids = model.posts.map(function(o) { return o.id }).join(",");
                expect(ids).to.equal("id2,id3,id1");
                done();
            }, 10);
        }, 10);
    });

    it("should order objects by given date property (asc)", function(done) {
        var model = appstax.model();
        model.watch("posts", {order: "updated"});

        setTimeout(function() {
            requests[0].respond(200, {}, JSON.stringify({objects:[
                {sysObjectId: "id1", sysCreated: "2015-08-20", sysUpdated: "2015-08-21"},
                {sysObjectId: "id2", sysCreated: "2015-08-22", sysUpdated: "2015-08-20"},
                {sysObjectId: "id3", sysCreated: "2015-08-21", sysUpdated: "2015-08-22"}
            ]}));

            setTimeout(function() {
                var ids = model.posts.map(function(o) { return o.id }).join(",");
                expect(ids).to.equal("id2,id1,id3");
                done();
            }, 10);
        }, 10);
    });

    it("should order objects by given date property (desc)", function(done) {
        var model = appstax.model();
        model.watch("posts", {order: "-updated"});

        setTimeout(function() {
            requests[0].respond(200, {}, JSON.stringify({objects:[
                {sysObjectId: "id1", sysCreated: "2015-08-20", sysUpdated: "2015-08-21"},
                {sysObjectId: "id2", sysCreated: "2015-08-22", sysUpdated: "2015-08-20"},
                {sysObjectId: "id3", sysCreated: "2015-08-21", sysUpdated: "2015-08-22"}
            ]}));

            setTimeout(function() {
                var ids = model.posts.map(function(o) { return o.id }).join(",");
                expect(ids).to.equal("id3,id1,id2");
                done();
            }, 10);
        }, 10);
    });

    it("should order objects by given string property (asc)", function(done) {
        var model = appstax.model();
        model.watch("posts", {order: "category"});

        setTimeout(function() {
            requests[0].respond(200, {}, JSON.stringify({objects:[
                {sysObjectId: "id1", sysCreated: "2015-08-22", category: "gamma"},
                {sysObjectId: "id2", sysCreated: "2015-08-20", category: "alpha"},
                {sysObjectId: "id3", sysCreated: "2015-08-21", category: "beta"}
            ]}));

            setTimeout(function() {
                var ids = model.posts.map(function(o) { return o.id }).join(",");
                expect(ids).to.equal("id2,id3,id1");
                done();
            }, 10);
        }, 10);
    });

    it("should order objects by given string property (desc)", function(done) {
        var model = appstax.model();
        model.watch("posts", {order: "-category"});

        setTimeout(function() {
            requests[0].respond(200, {}, JSON.stringify({objects:[
                {sysObjectId: "id1", sysCreated: "2015-08-22", category: "gamma"},
                {sysObjectId: "id2", sysCreated: "2015-08-20", category: "alpha"},
                {sysObjectId: "id3", sysCreated: "2015-08-21", category: "beta"}
            ]}));

            setTimeout(function() {
                var ids = model.posts.map(function(o) { return o.id }).join(",");
                expect(ids).to.equal("id1,id3,id2");
                done();
            }, 10);
        }, 10);
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

    it("should trigger change event before saving object", function(done) {
        var model = appstax.model();

        var object = appstax.object("posts");
        var changeSpy = sinon.spy();
        var saveSpy = sinon.spy(object, "save");

        model.on("change", changeSpy);

        model.save(object).then(function() {
            expect(saveSpy.callCount).equals(1);
            expect(changeSpy.callCount).equals(1);
            done();
        }).done(done);

        setTimeout(function() {
            expect(requests.length).equals(1);
            requests[0].respond(200, {}, JSON.stringify({objects:[
                {sysObjectId: "id1"}
            ]}));
        }, 20);
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

    it("should keep order when inserting object from object.created", function(done) {
        var model = appstax.model();
        model.watch("posts");

        setTimeout(function() {
            requests[0].respond(200, {}, JSON.stringify({objects:[
                {sysObjectId: "id1", sysCreated: "2015-08-19T10:00:00"},
                {sysObjectId: "id2", sysCreated: "2015-08-19T12:00:00"},
                {sysObjectId: "id3", sysCreated: "2015-08-19T11:00:00"}
            ]}));

            setTimeout(function() {
                fakeChannelReceive("objects/posts", "", {
                    type: "object.created",
                    object: appstax.object("posts", {
                        sysObjectId: "id4",
                        sysCreated: "2015-08-19T11:30:00"
                    })
                });

                var ids = model.posts.map(function(o) { return o.id }).join(",");
                expect(ids).to.equal("id2,id4,id3,id1");
                done();
            }, 10);
        }, 10);
    });

    it("should reorder when updating object from object.updated", function(done) {
        var model = appstax.model();
        model.watch("posts", {order: "-updated"});

        setTimeout(function() {
            requests[0].respond(200, {}, JSON.stringify({objects:[
                {sysObjectId: "id1", sysUpdated: "2015-08-20"},
                {sysObjectId: "id2", sysUpdated: "2015-08-22"},
                {sysObjectId: "id3", sysUpdated: "2015-08-21"}
            ]}));

            setTimeout(function() {
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
                done();
            }, 10);
        }, 10);
    });

    it("should remove object when receiving object.deleted", function(done) {
        var model = appstax.model();
        model.watch("posts");

        setTimeout(function() {
            requests[0].respond(200, {}, JSON.stringify({objects:[
                {sysObjectId: "id1"},
                {sysObjectId: "id2"},
                {sysObjectId: "id3"}
            ]}));

            setTimeout(function() {
                fakeChannelReceive("objects/posts", "", {
                    type: "object.deleted",
                    object: appstax.object("posts", {
                        sysObjectId: "id2"
                    })
                });

                var ids = model.posts.map(function(o) { return o.id }).join(",");
                expect(ids).to.equal("id1,id3");
                done();
            }, 10);
        }, 10);
    });

    it("should update object in place when receiving object.updated", function(done) {
        var model = appstax.model();
        model.watch("posts");

        setTimeout(function() {
            requests[0].respond(200, {}, JSON.stringify({objects:[
                {sysObjectId: "id1", prop: "value1"}
            ]}));

            setTimeout(function() {
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
                done();
            }, 10);
        }, 10);
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

    it("should add filtered array property and subscribe to filtered objects", function(done) {
        var model = appstax.model();

        expect(model).to.not.have.property("items");
        model.watch("items", {filter: "foo='bar'"});
        expect(model).to.have.property("items");
        expect(model.items).to.be.instanceof(Array);
        expect(model.items.length).to.equal(0);

        expect(requests.length).to.equal(1);
        expect(requests[0].method).to.equal("GET");
        expect(requests[0].url).to.equal("http://localhost:3000/objects/items?filter=foo%3D%27bar%27");

        setTimeout(function() {
            expect(channelStub.callCount).to.equal(1);
            expect(channelStub.args[0][0]).to.equal("objects/items");
            expect(channelStub.args[0][1]).to.equal("foo='bar'");

            requests[0].respond(200, {}, JSON.stringify({objects:[
                {sysObjectId: "id1", content: "c1", sysCreated: "2015-08-19T11:00:00"},
                {sysObjectId: "id2", content: "c2", sysCreated: "2015-08-19T10:00:00"}
            ]}));

            setTimeout(function() {
                expect(model.items.length).to.equal(2);
                expect(model.items[0].id).to.equal("id1");
                expect(model.items[1].id).to.equal("id2");
                expect(model.items[0].content).to.equal("c1")
                expect(model.items[1].content).to.equal("c2")
                expect(model.items[0].collectionName).to.equal("items");
                expect(model.items[1].collectionName).to.equal("items");
                done();
            }, 10);
        }, 10);
    });

    it("should add array property with name alias", function(done) {
        var model = appstax.model();

        expect(model).to.not.have.property("barItems");
        expect(model).to.not.have.property("bazItems");

        model.watch("barItems", {collection: "items", filter: "foo='bar'"});
        model.watch("bazItems", {collection: "items", filter: "foo='baz'"});

        expect(model).to.have.property("barItems");
        expect(model.barItems).to.be.instanceof(Array);
        expect(model.barItems.length).to.equal(0);

        expect(model).to.have.property("bazItems");
        expect(model.bazItems).to.be.instanceof(Array);
        expect(model.bazItems.length).to.equal(0);

        expect(requests.length).to.equal(2);
        expect(requests[0].method).to.equal("GET");
        expect(requests[0].url).to.equal("http://localhost:3000/objects/items?filter=foo%3D%27bar%27");
        expect(requests[1].method).to.equal("GET");
        expect(requests[1].url).to.equal("http://localhost:3000/objects/items?filter=foo%3D%27baz%27");

        setTimeout(function() {
            expect(channelStub.callCount).to.equal(2);
            expect(channelStub.args[0][0]).to.equal("objects/items");
            expect(channelStub.args[0][1]).to.equal("foo='bar'");
            expect(channelStub.args[1][0]).to.equal("objects/items");
            expect(channelStub.args[1][1]).to.equal("foo='baz'");

            requests[0].respond(200, {}, JSON.stringify({objects:[
                {sysObjectId: "id1", content: "c1", sysCreated: "2015-08-19T11:00:00"},
                {sysObjectId: "id2", content: "c2", sysCreated: "2015-08-19T10:00:00"}
            ]}));
            requests[1].respond(200, {}, JSON.stringify({objects:[
                {sysObjectId: "id3", content: "c3", sysCreated: "2015-08-19T11:00:00"},
                {sysObjectId: "id4", content: "c4", sysCreated: "2015-08-19T10:00:00"}
            ]}));

            setTimeout(function() {
                expect(model.barItems.length).to.equal(2);
                expect(model.barItems[0].id).to.equal("id1");
                expect(model.barItems[1].id).to.equal("id2");
                expect(model.barItems[0].collectionName).to.equal("items");
                expect(model.barItems[1].collectionName).to.equal("items");
                expect(model.bazItems.length).to.equal(2);
                expect(model.bazItems[0].id).to.equal("id3");
                expect(model.bazItems[1].id).to.equal("id4");
                expect(model.bazItems[0].collectionName).to.equal("items");
                expect(model.bazItems[1].collectionName).to.equal("items");
                done();
            }, 10);
        }, 10);
    });

    describe("relations", function() {

        var itemsResponse = {objects:[{
            sysObjectId: "id0",
            prop1: {
                sysDatatype: "relation",
                sysRelationType: "single",
                sysCollection: "collection2",
                sysObjects: [{
                    sysObjectId:"id1",
                    prop3: "value3"
                }]
            },
            prop2: {
                sysDatatype: "relation",
                sysRelationType: "array",
                sysCollection: "collection3",
                sysObjects: [{
                    sysObjectId:"id2",
                    prop4: "value4a"
                }, {
                    sysObjectId:"id3",
                    prop4: "value4b"
                }]
            }
        }]}

        var itemsResponseDeep = {objects:[{
            sysObjectId: "id0",
            prop1: {
                sysDatatype: "relation",
                sysRelationType: "single",
                sysCollection: "collection2",
                sysObjects: [{
                    sysObjectId:"id1",
                    prop2: "value2",
                    prop3: {
                        sysDatatype: "relation",
                        sysRelationType: "single",
                        sysCollection: "collection3",
                        sysObjects: [{
                            sysObjectId:"id2",
                            prop4: "value4"
                        }]
                    }
                }]
            }
        }]}

        var itemsResponseDeepArray = {objects:[{
            sysObjectId: "id0",
            prop1: {
                sysDatatype: "relation",
                sysRelationType: "array",
                sysCollection: "collection2",
                sysObjects: [{
                    sysObjectId:"id1",
                    prop2: "value2",
                    prop3: {
                        sysDatatype: "relation",
                        sysRelationType: "single",
                        sysCollection: "collection3",
                        sysObjects: [{
                            sysObjectId:"id2",
                            prop4: "value4"
                        }]
                    }
                }]
            }
        }]}

        it("should be loaded initially when expand is specified", function(done) {
            var model = appstax.model();

            expect(model).to.not.have.property("items");
            model.watch("items", {expand: 2});
            expect(model).to.have.property("items");

            expect(requests.length).to.equal(1);
            expect(requests[0].method).to.equal("GET");
            expect(requests[0].url).to.equal("http://localhost:3000/objects/items?expanddepth=2");

            setTimeout(function() {
                expect(channelStub.callCount).to.equal(1);
                expect(channelStub.args[0][0]).to.equal("objects/items");

                requests[0].respond(200, {}, JSON.stringify(itemsResponse));

                setTimeout(function() {
                    expect(model.items.length).to.equal(1);
                    expect(model.items[0].prop1.id).to.equal("id1");
                    expect(model.items[0].prop2[0].id).to.equal("id2");
                    expect(model.items[0].prop2[1].id).to.equal("id3");
                    done();
                }, 10);
            }, 10);
        });

        it("should subscribe to unfiltered object channels for related collections", function(done) {
            var model = appstax.model();
            model.watch("items", {expand: 2});

            setTimeout(function() {
                requests[0].respond(200, {}, JSON.stringify(itemsResponse));

                setTimeout(function() {
                    expect(channelStub.callCount).to.equal(3);
                    expect(channelStub.args[0][0]).to.equal("objects/items");
                    expect(channelStub.args[1][0]).to.equal("objects/collection2");
                    expect(channelStub.args[2][0]).to.equal("objects/collection3");
                    done();
                }, 10);
            }, 10);
        });

        it("should update related objects in place", function(done) {
            var model = appstax.model();
            model.watch("items", {expand: 1});

            setTimeout(function() {
                requests[0].respond(200, {}, JSON.stringify(itemsResponse));

                setTimeout(function() {
                    var cached = {
                        item0: model.items[0],
                        item0_prop1: model.items[0].prop1,
                        item0_prop2_1: model.items[0].prop2[1]
                    }

                    fakeChannelReceive("objects/collection2", "", {
                        type: "object.updated",
                        object: appstax.object("collection2", {
                            sysObjectId: "id1",
                            prop3: "value3 new!"
                        })
                    });

                    fakeChannelReceive("objects/collection3", "", {
                        type: "object.updated",
                        object: appstax.object("collection3", {
                            sysObjectId: "id3",
                            prop4: "value4b new!"
                        })
                    });

                    setTimeout(function() {
                        expect(requests.length).to.equal(1);
                        expect(model.items[0].prop1.prop3).to.equal("value3 new!");
                        expect(model.items[0].prop2[1].prop4).to.equal("value4b new!");

                        // check object normalization
                        expect(cached.item0).to.equal(model.items[0]);
                        expect(cached.item0_prop1).to.equal(model.items[0].prop1);
                        expect(cached.item0_prop2_1).to.equal(model.items[0].prop2[1]);

                        done();
                    }, 10);
                }, 10);
            }, 10);
        });

        it("should re-expand relations when updating an object loaded with relations", function(done) {
            var model = appstax.model();
            model.watch("items", {expand: 1});

            setTimeout(function() {
                requests[0].respond(200, {}, JSON.stringify(itemsResponse));

                setTimeout(function() {

                    var cached = {
                        item0: model.items[0],
                        item0_prop1: model.items[0].prop1,
                        item0_prop2_1: model.items[0].prop2[1]
                    }

                    fakeChannelReceive("objects/items", "", {
                        type: "object.updated",
                        object: appstax.object("items", {
                            sysObjectId: "id0",
                            prop1: {
                                sysDatatype: "relation",
                                sysRelationType: "single",
                                sysCollection: "collection2",
                                sysObjects: ["id1"] // realtime updates are not expanded
                            },
                            prop2: {
                                sysDatatype: "relation",
                                sysRelationType: "array",
                                sysCollection: "collection3",
                                sysObjects: ["id2", "id3"] // realtime updates are not expanded
                            },
                            prop2b: "prop2b is new"
                    })});

                    setTimeout(function() {
                        // keep old object state until expand finishes
                        expect(model.items[0].prop2b).to.equal(undefined);

                        // check object normalization
                        expect(cached.item0).to.equal(model.items[0]);
                        expect(cached.item0_prop1).to.equal(model.items[0].prop1);
                        expect(cached.item0_prop2_1).to.equal(model.items[0].prop2[1]);

                        expect(requests.length).to.equal(2);
                        expect(requests[1].url).to.equal("http://localhost:3000/objects/items/id0?expanddepth=1");

                        requests[1].respond(200, {}, JSON.stringify({
                            sysObjectId: "id0",
                            prop1: {
                                sysDatatype: "relation",
                                sysRelationType: "single",
                                sysCollection: "collection2",
                                sysObjects: [{
                                    sysObjectId:"id1",
                                    prop3: "value3"
                                }]
                            },
                            prop2: {
                                sysDatatype: "relation",
                                sysRelationType: "array",
                                sysCollection: "collection3",
                                sysObjects: [{
                                    sysObjectId:"id2",
                                    prop4: "value4a"
                                }, {
                                    sysObjectId:"id3",
                                    prop4: "value4b"
                                }]
                            },
                            prop2b: "prop2b is new"
                        }));

                        setTimeout(function() {
                            expect(model.items[0].prop2b).to.equal("prop2b is new");
                            expect(model.items[0].prop1.prop3).to.equal("value3");
                            expect(model.items[0].prop2[1].prop4).to.equal("value4b");

                            // check object normalization
                            expect(cached.item0).to.equal(model.items[0]);
                            expect(cached.item0_prop1).to.equal(model.items[0].prop1);
                            expect(cached.item0_prop2_1).to.equal(model.items[0].prop2[1]);

                            done();
                        }, 10);
                    }, 10);
                }, 10);
            }, 10);
        });

        it("should expand relations when newly created objects appear", function(done) {
            var model = appstax.model();
            model.watch("items", {expand: 1});

            setTimeout(function() {
                requests[0].respond(200, {}, JSON.stringify({objects:[]}));

                setTimeout(function() {

                    fakeChannelReceive("objects/items", "", {
                        type: "object.created",
                        object: appstax.object("items", {
                            sysObjectId: "id0",
                            prop1: {
                                sysDatatype: "relation",
                                sysRelationType: "single",
                                sysCollection: "collection2",
                                sysObjects: ["id1"] // realtime updates are not expanded
                            },
                            prop2: {
                                sysDatatype: "relation",
                                sysRelationType: "array",
                                sysCollection: "collection3",
                                sysObjects: ["id2", "id3"] // realtime updates are not expanded
                            },
                            prop2b: "prop2b is new"
                    })});

                    setTimeout(function() {
                        // keep old object state until expand finishes
                        expect(model.items[0]).to.equal(undefined);

                        expect(requests.length).to.equal(2);
                        expect(requests[1].url).to.equal("http://localhost:3000/objects/items/id0?expanddepth=1");

                        requests[1].respond(200, {}, JSON.stringify({
                            sysObjectId: "id0",
                            prop1: {
                                sysDatatype: "relation",
                                sysRelationType: "single",
                                sysCollection: "collection2",
                                sysObjects: [{
                                    sysObjectId:"id1",
                                    prop3: "value3"
                                }]
                            },
                            prop2: {
                                sysDatatype: "relation",
                                sysRelationType: "array",
                                sysCollection: "collection3",
                                sysObjects: [{
                                    sysObjectId:"id2",
                                    prop4: "value4a"
                                }, {
                                    sysObjectId:"id3",
                                    prop4: "value4b"
                                }]
                            },
                            prop2b: "prop2b is new"
                        }));

                        setTimeout(function() {
                            expect(model.items[0].prop2b).to.equal("prop2b is new");
                            expect(model.items[0].prop1.prop3).to.equal("value3");
                            expect(model.items[0].prop2[1].prop4).to.equal("value4b");

                            done();
                        }, 10);
                    }, 10);
                }, 10);
            }, 10);
        });

        it("should update deep objects and re-expand relations", function(done) {
            var model = appstax.model();
            model.watch("items", {expand: 2});

            setTimeout(function() {
                requests[0].respond(200, {}, JSON.stringify(itemsResponseDeep));

                setTimeout(function() {

                    var cached = {
                        item0: model.items[0],
                        item0_prop1: model.items[0].prop1,
                        item0_prop1_prop3: model.items[0].prop1.prop3
                    }

                    fakeChannelReceive("objects/collection2", "", {
                        type: "object.updated",
                        object: appstax.object("collection2", {
                            sysObjectId: "id1",
                            prop2: "value2 new!",
                            prop3: {
                                sysDatatype: "relation",
                                sysRelationType: "single",
                                sysCollection: "collection3",
                                sysObjects: ["id2"]
                            }
                        })
                    });

                    setTimeout(function() {
                        expect(requests.length).to.equal(2);
                        expect(requests[1].url).to.equal("http://localhost:3000/objects/collection2/id1?expanddepth=1");
                        requests[1].respond(200, {}, JSON.stringify({
                            sysObjectId:"id1",
                            prop2: "value2 new!",
                            prop3: {
                                sysDatatype: "relation",
                                sysRelationType: "single",
                                sysCollection: "collection3",
                                sysObjects: [{
                                    sysObjectId:"id2",
                                    prop4: "value4 new!"
                                }]
                            }
                        }));

                        setTimeout(function() {
                            expect(model.items[0].prop1.prop2).to.equal("value2 new!");
                            expect(model.items[0].prop1.prop3.prop4).to.equal("value4 new!");

                            // check object normalization
                            expect(cached.item0).to.equal(model.items[0]);
                            expect(cached.item0_prop1).to.equal(model.items[0].prop1);
                            expect(cached.item0_prop1_prop3).to.equal(model.items[0].prop1.prop3);

                            done();
                        }, 10);
                    }, 10);
                }, 10);
            }, 10);
        });

        it("should update deep objects in array and re-expand relations", function(done) {
            var model = appstax.model();
            model.watch("items", {expand: 2});

            setTimeout(function() {
                requests[0].respond(200, {}, JSON.stringify(itemsResponseDeepArray));

                setTimeout(function() {
                    var cached = {
                        item0: model.items[0],
                        item0_prop1_0: model.items[0].prop1[0],
                        item0_prop1_0_prop3: model.items[0].prop1[0].prop3
                    }

                    fakeChannelReceive("objects/collection2", "", {
                        type: "object.updated",
                        object: appstax.object("collection2", {
                            sysObjectId: "id1",
                            prop2: "value2 new!",
                            prop3: {
                                sysDatatype: "relation",
                                sysRelationType: "single",
                                sysCollection: "collection3",
                                sysObjects: ["id2"]
                            }
                        })
                    });

                    setTimeout(function() {
                        expect(requests.length).to.equal(2);
                        expect(requests[1].url).to.equal("http://localhost:3000/objects/collection2/id1?expanddepth=1");
                        requests[1].respond(200, {}, JSON.stringify({
                            sysObjectId:"id1",
                            prop2: "value2 new!",
                            prop3: {
                                sysDatatype: "relation",
                                sysRelationType: "single",
                                sysCollection: "collection3",
                                sysObjects: [{
                                    sysObjectId:"id2",
                                    prop4: "value4 new!"
                                }]
                            }
                        }));

                        setTimeout(function() {
                            expect(model.items[0].prop1[0].prop2).to.equal("value2 new!");
                            expect(model.items[0].prop1[0].prop3.prop4).to.equal("value4 new!");

                            // check object normalization
                            expect(cached.item0).to.equal(model.items[0]);
                            expect(cached.item0_prop1_0).to.equal(model.items[0].prop1[0]);
                            expect(cached.item0_prop1_0_prop3).to.equal(model.items[0].prop1[0].prop3);

                            done();
                        }, 10);
                    }, 10);
                }, 10);
            }, 10);
        });

        it("should get updates for related objects appearing after initial load", function(done) {
            var model = appstax.model();
            model.watch("items", {expand: 1});

            setTimeout(function() {
                requests[0].respond(200, {}, JSON.stringify({objects:[{sysObjectId: "id000"}]}));

                setTimeout(function() {
                    fakeChannelReceive("objects/items", "", {
                        type: "object.updated",
                        object: appstax.object("items", {
                            sysObjectId: "id000",
                            prop1: {
                                sysDatatype: "relation",
                                sysRelationType: "single",
                                sysCollection: "collection2",
                                sysObjects: ["id001"]
                            }
                        })
                    });

                    setTimeout(function() {
                        expect(requests.length).to.equal(2);
                        expect(requests[1].url).to.equal("http://localhost:3000/objects/items/id000?expanddepth=1");
                        requests[1].respond(200, {}, JSON.stringify({
                            sysObjectId: "id000",
                            prop1: {
                                sysDatatype: "relation",
                                sysRelationType: "single",
                                sysCollection: "collection2",
                                sysObjects: [{sysObjectId:"id001", prop2: "value2"}]
                            }
                        }));

                        setTimeout(function() {
                            expect(model.items[0].prop1.prop2).to.equal("value2");

                            fakeChannelReceive("objects/collection2", "", {
                                type: "object.updated",
                                object: appstax.object("collection2", {
                                    sysObjectId: "id001",
                                    prop2: "value2 new!"
                                })
                            });

                            setTimeout(function() {
                                expect(model.items[0].prop1.prop2).to.equal("value2 new!");
                                done();
                            }, 10);
                        }, 10);
                    }, 10);
                }, 10);
            }, 10);
        });
    });

    describe(".has() filter", function() {

        it("should match string properties", function(done) {
            var model = appstax.model();
            model.watch("messages");

            setTimeout(function() {
                requests[0].respond(200, {}, JSON.stringify({objects:[
                    {sysObjectId: "id1", category:"foo", sysCreated: "2015-08-22"},
                    {sysObjectId: "id2", category:"bar", sysCreated: "2015-08-21"},
                    {sysObjectId: "id3", category:"foo", sysCreated: "2015-08-20"}
                ]}));

                setTimeout(function() {
                    var filtered = model.messages.has("category", "foo");
                    expect(filtered).to.be.instanceOf(Array);
                    expect(filtered.length).to.equal(2);
                    expect(filtered[0].id).to.equal("id1");
                    expect(filtered[1].id).to.equal("id3");
                    done();
                }, 10);
            }, 10);
        });

        it("should match number properties", function(done) {
            var model = appstax.model();
            model.watch("messages");

            setTimeout(function() {
                requests[0].respond(200, {}, JSON.stringify({objects:[
                    {sysObjectId: "id1", value: 1, sysCreated: "2015-08-22"},
                    {sysObjectId: "id2", value: 2, sysCreated: "2015-08-21"},
                    {sysObjectId: "id3", value: 2, sysCreated: "2015-08-20"}
                ]}));

                setTimeout(function() {
                    var filtered = model.messages.has("value", 2);
                    expect(filtered).to.be.instanceOf(Array);
                    expect(filtered.length).to.equal(2);
                    expect(filtered[0].id).to.equal("id2");
                    expect(filtered[1].id).to.equal("id3");
                    done();
                }, 10);
            }, 10);
        });

        it("should match number properties", function(done) {
            var model = appstax.model();
            model.watch("messages");

            setTimeout(function() {
                requests[0].respond(200, {}, JSON.stringify({objects:[
                    {sysObjectId: "id1", value: 1, sysCreated: "2015-08-22"},
                    {sysObjectId: "id2", value: 2, sysCreated: "2015-08-21"},
                    {sysObjectId: "id3", value: 2, sysCreated: "2015-08-20"}
                ]}));

                setTimeout(function() {
                    var filtered = model.messages.has("value", 2);
                    expect(filtered).to.be.instanceOf(Array);
                    expect(filtered.length).to.equal(2);
                    expect(filtered[0].id).to.equal("id2");
                    expect(filtered[1].id).to.equal("id3");
                    done();
                }, 10);
            }, 10);
        });

        it("should match array properties, single value", function(done) {
            var model = appstax.model();
            model.watch("messages");

            setTimeout(function() {
                requests[0].respond(200, {}, JSON.stringify({objects:[
                    {sysObjectId: "id1", tags: ["foo", "bar"], sysCreated: "2015-08-22"},
                    {sysObjectId: "id2", tags: ["bar", "baz"], sysCreated: "2015-08-21"},
                    {sysObjectId: "id3", tags: ["baz", "gaz"], sysCreated: "2015-08-20"}
                ]}));

                setTimeout(function() {
                    var filtered = model.messages.has("tags", "bar");
                    expect(filtered).to.be.instanceOf(Array);
                    expect(filtered.length).to.equal(2);
                    expect(filtered[0].id).to.equal("id1");
                    expect(filtered[1].id).to.equal("id2");
                    done();
                }, 10);
            }, 10);
        });

        it("should match array properties, multiple values (OR)", function(done) {
            var model = appstax.model();
            model.watch("messages");

            setTimeout(function() {
                requests[0].respond(200, {}, JSON.stringify({objects:[
                    {sysObjectId: "id1", tags: ["foo", "bar"], sysCreated: "2015-08-22"},
                    {sysObjectId: "id2", tags: ["bar", "baz"], sysCreated: "2015-08-21"},
                    {sysObjectId: "id3", tags: ["baz", "gaz"], sysCreated: "2015-08-20"}
                ]}));

                setTimeout(function() {
                    var filtered = model.messages.has("tags", ["foo", "bar"]);
                    expect(filtered).to.be.instanceOf(Array);
                    expect(filtered.length).to.equal(2);
                    expect(filtered[0].id).to.equal("id1");
                    expect(filtered[1].id).to.equal("id2");
                    done();
                }, 10);
            }, 10);
        });

        it("should match relation properties", function(done) {
            var model = appstax.model();
            model.watch("messages");

            setTimeout(function() {
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

                setTimeout(function() {
                    var filtered = model.messages.has("comments", ["rel3", appstax.object("foo", {sysObjectId:"rel4"})]);
                    expect(filtered).to.be.instanceOf(Array);
                    expect(filtered.length).to.equal(2);
                    expect(filtered[0].id).to.equal("id2");
                    expect(filtered[1].id).to.equal("id3");
                    done();
                }, 10);
            }, 10);
        });

    });

    describe("currentUser observer", function() {

        it("should be null before login", function() {
            var model = appstax.model();
            model.watch("currentUser");

            expect(model.currentUser).to.equal(null);
        });

        it("should get loaded with properties if user is already logged in", function(done) {
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

            var changes = 0;
            model.on("change", function() {
                changes++;
            });

            expect(model.currentUser).to.equal(null);
            expect(requests.length).to.equal(1);

            setTimeout(function() {
                expect(requests[0].url).to.equal("http://localhost:3000/objects/users/id1001");
                requests[0].respond(200, {}, JSON.stringify({sysObjectId: "id1001", fullName:"Bart Simpson"}));

                setTimeout(function() {
                    expect(model.currentUser).to.have.property("fullName", "Bart Simpson");
                    expect(changes).to.equal(1);
                    delete localStorage[localKey];
                    done();
                }, 10);
            }, 10);
        });

        it("should get loaded with properties after login", function(done) {
            var model = appstax.model();
            model.watch("currentUser");

            var changes = 0;
            model.on("change", function() {
                changes++;
            });

            appstax.login("homer", "secret");
            expect(model.currentUser).to.equal(null);

            setTimeout(function() {
                expect(requests.length).to.equal(1);
                expect(requests[0].method).to.equal("POST");
                expect(requests[0].url).to.equal("http://localhost:3000/sessions");

                requests[0].respond(200, {}, JSON.stringify({
                    sysSessionId: "sid1003",
                    user: {sysObjectId: "id1004", fullName: "Homer Simpson"}
                }));

                setTimeout(function() {
                    expect(model.currentUser).to.exist;
                    expect(model.currentUser).to.have.property("fullName", "Homer Simpson");
                    expect(changes).to.equal(1);
                    done();
                }, 10);
            }, 10);
        });

        it("should get loaded with properties after signup", function(done) {
            var model = appstax.model();
            model.watch("currentUser");

            var changes = 0;
            model.on("change", function() {
                changes++;
            });

            appstax.signup("smithers", "secret");
            expect(model.currentUser).to.equal(null);

            setTimeout(function() {
                expect(requests.length).to.equal(1);
                expect(requests[0].method).to.equal("POST");
                expect(requests[0].url).to.equal("http://localhost:3000/users?login=true");

                requests[0].respond(200, {}, JSON.stringify({
                    sysSessionId: "sid1003",
                    user: {sysObjectId: "id1005", fullName: "Mr. Smithers"}
                }));

                setTimeout(function() {
                    expect(model.currentUser).to.exist;
                    expect(model.currentUser).to.have.property("fullName", "Mr. Smithers");
                    expect(changes).to.equal(1);
                    done();
                }, 10);
            }, 10);
        });

        it("should be removed after logout", function(done) {
            var model = appstax.model();
            model.watch("currentUser");

            var changes = 0;
            model.on("change", function() {
                changes++;
            });

            appstax.login("smithers", "secret");
            setTimeout(function() {
                requests[0].respond(200, {}, JSON.stringify({sysSessionId: "sid1003", user: {sysObjectId: "id1005"}}));

                setTimeout(function() {
                    expect(model.currentUser).to.exist;
                    appstax.logout();
                    expect(model.currentUser).to.equal(null);
                    expect(changes).to.equal(2);
                    done();
                }, 10);
            }, 10);
        });

        it("should be updated on object.updated", function(done) {
            var model = appstax.model();
            model.watch("currentUser");

            var changes = 0;
            model.on("change", function() {
                changes++;
            });

            appstax.login("homer", "secret");
            setTimeout(function() {
                requests[0].respond(200, {}, JSON.stringify({
                    sysSessionId: "sid1003",
                    user: {sysObjectId: "id1005", fullName: "Homer S"}
                }));

                setTimeout(function() {
                    expect(model.currentUser).to.have.property("fullName", "Homer S");
                    fakeChannelReceive("objects/users", "", {
                        type: "object.updated",
                        object: appstax.object("users", {sysObjectId: "id1005", fullName: "Homer Jay Simpson"})
                    });
                    expect(model.currentUser).to.have.property("fullName", "Homer Jay Simpson");
                    expect(changes).to.equal(2);
                    done();
                }, 10);
            }, 10);
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
