

var appstax = require("../src/appstax");
var sinon = require("sinon");
var wsmock = require("./lib/wsmock");

describe("Channels", function() {

    var xhr, requests;
    var httpServer;
    var nextSession = 1000;
    var realtimeSessionId;
    var socketUrl;
    var serverReceived;
    var ws;

    beforeEach(function() {
        appstax.init({appKey:"channeltestapikey", baseUrl: "http://localhost:3000/api/latest", log:false});

        realtimeSessionId = "rs-" + (nextSession++);
        socketUrl = "ws://localhost:3000/api/latest/messaging/realtime?rsession=" + realtimeSessionId;

        requests = [];
        httpServer = sinon.fakeServer.create();
        httpServer.respondWith("POST", /realtime\/sessions/, [200, {}, JSON.stringify({realtimeSessionId: realtimeSessionId})]);
        httpServer.autoRespond = true;

        serverReceived = [];
        ws = wsmock(socketUrl);
        ws.server.on("message", function(jsonData) {
            var data = JSON.parse(jsonData);
            serverReceived.push(data);
        });
    });

    afterEach(function() {
        ws.restore();
        httpServer.restore();
        appstax.apiClient.socket().disconnect();
    });

    it("should send 'subscribe' command to server and 'open' event to client", function(done) {
        var chat = appstax.channel("public/chat");
        chat.on("open", function(event) {
            setTimeout(function() {
                expect(serverReceived.length).to.equal(1);
                expect(serverReceived[0].channel).to.equal("public/chat");
                expect(serverReceived[0].command).to.equal("subscribe");
                done();
            }, 100);
        });
    });

    it("should send 'error' event to client when connection fails", function(done) {
        ws.simulateConnectionError = true;

        var errorEvent;
        var chat = appstax.channel("public/chat");
        chat.on("error", function(event) {
            errorEvent = event;
        });

        chat.on("open", function(event) {
            throw new Error("Should not dispatch 'open' event");
        });

        setTimeout(function() {
            expect(errorEvent).to.exist;
            expect(errorEvent.type).to.equal("error");
            expect(errorEvent.error.message).to.equal("Error connecting to realtime service");
            done();
        }, 1000);
    });

    it("should publish messages with id to server", function(done) {
        var chat = appstax.channel("public/chat");
        chat.send("This is my first message!");
        chat.send("This is my second message!");

        setTimeout(function() {
            expect(serverReceived.length).to.equal(3);
            expect(serverReceived[1].channel).to.equal("public/chat");
            expect(serverReceived[1].command).to.equal("publish");
            expect(serverReceived[1].message).to.equal("This is my first message!");
            expect(serverReceived[2].channel).to.equal("public/chat");
            expect(serverReceived[2].command).to.equal("publish");
            expect(serverReceived[2].message).to.equal("This is my second message!");

            expect(serverReceived[0]).to.have.property("id");
            expect(serverReceived[1]).to.have.property("id");
            expect(serverReceived[2]).to.have.property("id");
            expect(serverReceived[1].id).to.not.equal(serverReceived[2].id);

            done();
        }, 200);
    });

    it("should map server events to channel handlers", function(done) {
        var chat = appstax.channel("public/chat");
        var chatReceived = [];
        var chatHandler = function(event) {
            chatReceived.push(event);
        }
        chat.on("message", chatHandler);
        chat.on("error", chatHandler);

        var stocks = appstax.channel("public/stocks");
        var stocksReceived = [];
        var stocksHandler = function(event) {
            stocksReceived.push(event);
        }
        stocks.on("message", stocksHandler);
        stocks.on("error", stocksHandler);

        setTimeout(function() {
            ws.server.send(JSON.stringify({channel: "public/chat",   event: "message", message: "Hello World!"}));
            ws.server.send(JSON.stringify({channel: "public/chat",   event: "error",   error: "Bad dog!"}));
            ws.server.send(JSON.stringify({channel: "public/stocks", event: "message", message: {"AAPL": "127.61"}}));
            ws.server.send(JSON.stringify({channel: "public/stocks", event: "error",   error: "Bad stock!"}));

            setTimeout(function() {
                expect(chatReceived.length).to.equal(2);
                expect(stocksReceived.length).to.equal(2);

                expect(chatReceived[0]).to.have.property("channel", "public/chat");
                expect(chatReceived[1]).to.have.property("channel", "public/chat");
                expect(stocksReceived[0]).to.have.property("channel", "public/stocks");
                expect(stocksReceived[1]).to.have.property("channel", "public/stocks");

                done();
            }, 100);
        }, 200);
    });

    it("should map server events to wildcard channel handlers", function(done) {
        var a1 = appstax.channel("public/a/1");
        var a2 = appstax.channel("public/a/2");
        var aw = appstax.channel("public/a/*");
        var b1 = appstax.channel("public/b/1");
        var b2 = appstax.channel("public/b/2");
        var bw = appstax.channel("public/b/*");

        var received = {a1:[], a2:[], aw:[], b1:[], b2:[], bw:[]};
        a1.on("message", function(event) { received.a1.push(event.message) });
        a2.on("message", function(event) { received.a2.push(event.message) });
        aw.on("message", function(event) { received.aw.push(event.message) });
        b1.on("message", function(event) { received.b1.push(event.message) });
        b2.on("message", function(event) { received.b2.push(event.message) });
        bw.on("message", function(event) { received.bw.push(event.message) });

        setTimeout(function() {
            ws.server.send(JSON.stringify({channel: "public/a/1", event: "message", message: "A1"}));
            ws.server.send(JSON.stringify({channel: "public/a/2", event: "message", message: "A2"}));
            ws.server.send(JSON.stringify({channel: "public/b/1", event: "message", message: "B1"}));
            ws.server.send(JSON.stringify({channel: "public/b/2", event: "message", message: "B2"}));

            setTimeout(function() {
                expect(received.a1.length).to.equal(1);
                expect(received.a2.length).to.equal(1);
                expect(received.aw.length).to.equal(2);
                expect(received.b1.length).to.equal(1);
                expect(received.b2.length).to.equal(1);
                expect(received.bw.length).to.equal(2);

                done();
            }, 100);
        }, 200);
    });

    it("should map server events to wildcard event handler", function(done) {
        var a1 = appstax.channel("public/a/1");
        var a2 = appstax.channel("public/a/2");
        var aw = appstax.channel("public/a/*");
        var b1 = appstax.channel("public/b/1");
        var b2 = appstax.channel("public/b/2");
        var bw = appstax.channel("public/b/*");

        var received = {a1:[], a2:[], aw:[], b1:[], b2:[], bw:[]};
        a1.on("*", function(event) { received.a1.push(event) });
        a2.on("*", function(event) { received.a2.push(event) });
        aw.on("*", function(event) { received.aw.push(event) });
        b1.on("*", function(event) { received.b1.push(event) });
        b2.on("*", function(event) { received.b2.push(event) });
        bw.on("*", function(event) { received.bw.push(event) });

        setTimeout(function() {
            ws.server.send(JSON.stringify({channel: "public/a/1", event: "foo", foo1: "foo2"}));
            ws.server.send(JSON.stringify({channel: "public/a/2", event: "bar", bar1: "bar2"}));
            ws.server.send(JSON.stringify({channel: "public/b/1", event: "baz", baz1: "baz2"}));
            ws.server.send(JSON.stringify({channel: "public/b/2", event: "gaz", gaz1: "gaz2"}));

            setTimeout(function() {
                expect(received.a1[0].type).to.equal("open");
                expect(received.a2[0].type).to.equal("open");
                expect(received.aw[0].type).to.equal("open");
                expect(received.b1[0].type).to.equal("open");
                expect(received.b2[0].type).to.equal("open");
                expect(received.bw[0].type).to.equal("open");

                expect(received.a1[1].channel).to.equal("public/a/1");
                expect(received.a2[1].channel).to.equal("public/a/2");
                expect(received.aw[1].channel).to.equal("public/a/1");
                expect(received.aw[2].channel).to.equal("public/a/2");
                expect(received.b1[1].channel).to.equal("public/b/1");
                expect(received.b2[1].channel).to.equal("public/b/2");
                expect(received.bw[1].channel).to.equal("public/b/1");
                expect(received.bw[2].channel).to.equal("public/b/2");

                expect(received.a1[1].type).to.equal("foo");
                expect(received.a2[1].type).to.equal("bar");
                expect(received.aw[1].type).to.equal("foo");
                expect(received.aw[2].type).to.equal("bar");
                expect(received.b1[1].type).to.equal("baz");
                expect(received.b2[1].type).to.equal("gaz");
                expect(received.bw[1].type).to.equal("baz");
                expect(received.bw[2].type).to.equal("gaz");

                expect(received.a1[1].foo1).to.equal("foo2");
                expect(received.a2[1].bar1).to.equal("bar2");
                expect(received.aw[1].foo1).to.equal("foo2");
                expect(received.aw[2].bar1).to.equal("bar2");
                expect(received.b1[1].baz1).to.equal("baz2");
                expect(received.b2[1].gaz1).to.equal("gaz2");
                expect(received.bw[1].baz1).to.equal("baz2");
                expect(received.bw[2].gaz1).to.equal("gaz2");

                done();
            }, 100);
        }, 200);
    });

    it("should subscribe a private channel", function(done) {
        var mychannel = appstax.channel("private/mychannel");

        setTimeout(function() {
            expect(serverReceived[0]).to.have.property("command", "subscribe");
            expect(serverReceived[0]).to.have.property("channel", "private/mychannel");
            done();
        }, 200);
    });

    it("should grant permissions on private channels", function(done) {
        var mychannel = appstax.channel("private/mychannel");
        mychannel.grant("buddy", ["read"]);
        mychannel.grant("friend", ["read", "write"]);
        mychannel.revoke("buddy", ["read", "write"]);
        mychannel.revoke("friend", ["write"]);

        setTimeout(function() {
            expect(serverReceived.length).to.equal(8);
            expect(serverReceived[0]).to.have.property("channel", "private/mychannel");
            expect(serverReceived[0]).to.have.property("command", "subscribe");
            expect(serverReceived[1]).to.have.property("channel", "private/mychannel");
            expect(serverReceived[1]).to.have.property("command", "channel.create");
            expect(serverReceived[2]).to.have.property("channel", "private/mychannel");
            expect(serverReceived[2]).to.have.property("command", "grant.read");
            expect(serverReceived[2]).to.have.deep.property("data[0]", "buddy");
            expect(serverReceived[3]).to.have.property("channel", "private/mychannel");
            expect(serverReceived[3]).to.have.property("command", "grant.read");
            expect(serverReceived[3]).to.have.deep.property("data[0]", "friend");
            expect(serverReceived[4]).to.have.property("channel", "private/mychannel");
            expect(serverReceived[4]).to.have.property("command", "grant.write");
            expect(serverReceived[4]).to.have.deep.property("data[0]", "friend");
            expect(serverReceived[5]).to.have.property("channel", "private/mychannel");
            expect(serverReceived[5]).to.have.property("command", "revoke.read");
            expect(serverReceived[5]).to.have.deep.property("data[0]", "buddy");
            expect(serverReceived[6]).to.have.property("channel", "private/mychannel");
            expect(serverReceived[6]).to.have.property("command", "revoke.write");
            expect(serverReceived[6]).to.have.deep.property("data[0]", "buddy");
            expect(serverReceived[7]).to.have.property("channel", "private/mychannel");
            expect(serverReceived[7]).to.have.property("command", "revoke.write");
            expect(serverReceived[7]).to.have.deep.property("data[0]", "friend");
            done();
        }, 200);
    });

    it("should create private channel with all permissions to a list of users", function(done) {
        var mychannel = appstax.channel("private/mychannel", ["buddy", "friend"]);

        setTimeout(function() {
            expect(serverReceived.length).to.equal(4);
            expect(serverReceived[0]).to.have.property("channel", "private/mychannel");
            expect(serverReceived[0]).to.have.property("command", "subscribe");
            expect(serverReceived[1]).to.have.property("channel", "private/mychannel");
            expect(serverReceived[1]).to.have.property("command", "channel.create");
            expect(serverReceived[2]).to.have.property("channel", "private/mychannel");
            expect(serverReceived[2]).to.have.property("command", "grant.read");
            expect(serverReceived[2]).to.have.deep.property("data[0]", "buddy");
            expect(serverReceived[2]).to.have.deep.property("data[1]", "friend");
            expect(serverReceived[3]).to.have.property("channel", "private/mychannel");
            expect(serverReceived[3]).to.have.property("command", "grant.write");
            expect(serverReceived[3]).to.have.deep.property("data[0]", "buddy");
            expect(serverReceived[3]).to.have.deep.property("data[1]", "friend");
            done();
        }, 200);
    });

    it("should subscribe to object channel", function(done) {
        var ch = appstax.channel("objects/mycollection");
        setTimeout(function() {
            expect(serverReceived.length).to.equal(1);
            expect(serverReceived[0]).to.have.property("channel", "objects/mycollection");
            expect(serverReceived[0]).to.have.property("command", "subscribe");
            done();
        }, 200);
    });

    it("should subscribe to object channel with filter", function(done) {
        var ch = appstax.channel("objects/mycollection", "text like Hello%");
        setTimeout(function() {
            expect(serverReceived.length).to.equal(1);
            expect(serverReceived[0]).to.have.property("channel", "objects/mycollection");
            expect(serverReceived[0]).to.have.property("command", "subscribe");
            expect(serverReceived[0]).to.have.property("filter", "text like Hello%");
            done();
        }, 200);
    });

    it("should create different channels for same object collection with different filters", function(done) {
        var channel1a = appstax.channel("objects/collection1", "foo='bar'");
        var channel1b = appstax.channel("objects/collection1", "foo='bar'");
        var channel2a = appstax.channel("objects/collection1", "goo='gar'");

        setTimeout(function() {
            expect(serverReceived.length).to.equal(2);
            expect(serverReceived[0]).to.have.property("channel", "objects/collection1");
            expect(serverReceived[0]).to.have.property("command", "subscribe");
            expect(serverReceived[0]).to.have.property("filter", "foo='bar'");
            expect(serverReceived[1]).to.have.property("channel", "objects/collection1");
            expect(serverReceived[1]).to.have.property("command", "subscribe");
            expect(serverReceived[1]).to.have.property("filter", "goo='gar'");
            expect(channel1a === channel1b).to.equal(true);
            done();
        }, 200);
    });

    it("should convert received data to appstax objects", function(done) {
        var ch = appstax.channel("objects/mycollection");
        var receivedObjects = [];
        ch.on("object.created", function(event) { receivedObjects.push(event.object) });
        ch.on("object.updated", function(event) { receivedObjects.push(event.object) });
        ch.on("object.deleted", function(event) { receivedObjects.push(event.object) });

        setTimeout(function() {
            ws.server.send(JSON.stringify({
                channel: "objects/mycollection",
                event: "object.created",
                data: { sysObjectId: "id1", prop1: "value1" }
            }));
            ws.server.send(JSON.stringify({
                channel: "objects/mycollection",
                event: "object.updated",
                data: { sysObjectId: "id2", prop2: "value2" }
            }));
            ws.server.send(JSON.stringify({
                channel: "objects/mycollection",
                event: "object.deleted",
                data: { sysObjectId: "id3", prop3: "value3" }
            }));

            setTimeout(function() {
                expect(receivedObjects.length).to.equal(3);
                expect(receivedObjects[0].id).to.equal("id1");
                expect(receivedObjects[0].collectionName).to.equal("mycollection");
                expect(receivedObjects[0].prop1).to.equal("value1");
                expect(receivedObjects[1].id).to.equal("id2");
                expect(receivedObjects[1].collectionName).to.equal("mycollection");
                expect(receivedObjects[1].prop2).to.equal("value2");
                expect(receivedObjects[2].id).to.equal("id3");
                expect(receivedObjects[2].collectionName).to.equal("mycollection");
                expect(receivedObjects[2].prop3).to.equal("value3");
                done();
            }, 100)
        }, 200);
    });

});



