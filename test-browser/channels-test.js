

var appstax = require("../src/appstax");
var sinon = require("sinon");
require("mock-socket/src/main");

describe("Channels", function() {

    var xhr, requests;
    var httpServer;
    var wsServer;
    var nextSession = 1000;
    var realtimeSessionId;
    var socketUrl;
    var serverReceived;
    var serverSend;

    beforeEach(function() {
        appstax.init({appKey:"channeltestapikey", baseUrl: "http://localhost:3000/api/latest", log:false});

        realtimeSessionId = "rs-" + (nextSession++);
        socketUrl = "ws://localhost:3000/api/latest/messaging/realtime?rsession=" + realtimeSessionId;

        requests = [];
        httpServer = sinon.fakeServer.create();
        httpServer.respondWith("POST", "http://localhost:3000/api/latest/messaging/realtime/sessions", [200, {}, JSON.stringify({realtimeSessionId: realtimeSessionId})]);
        httpServer.autoRespond = true;

        wsServer = new MockServer(socketUrl);
        wsServer.on("connection", function(server) {
            server.on("message", function(jsonData) {
                var data = JSON.parse(jsonData);
                serverReceived.push(data);
            });
            serverSend = function(packet) {
                server.send(packet);
            }
        });
        serverReceived = [];
        window.WebSocket = MockSocket;
    });

    afterEach(function() {
        httpServer.restore();
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

    // it("should send 'error' event to client when connection fails", function(done) {
    //     delete window.MockSocket.services[socketUrl];

    //     var chat = appstax.channel("public/chat");
    //     chat.on("error", function(event) {
    //         expect(event.type).to.equal("error");
    //         expect(event.error.message).to.equal("Error connecting to realtime service");
    //         done();
    //     });
    // });

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
            serverSend(JSON.stringify({channel: "public/chat",   event: "message", message: "Hello World!"}));
            serverSend(JSON.stringify({channel: "public/chat",   event: "error",   error: "Bad dog!"}));
            serverSend(JSON.stringify({channel: "public/stocks", event: "message", message: {"AAPL": "127.61"}}));
            serverSend(JSON.stringify({channel: "public/stocks", event: "error",   error: "Bad stock!"}));

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

    it("should map server events to wildcard handlers", function(done) {
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
            serverSend(JSON.stringify({channel: "public/a/1", event: "message", message: "A1"}));
            serverSend(JSON.stringify({channel: "public/a/2", event: "message", message: "A2"}));
            serverSend(JSON.stringify({channel: "public/b/1", event: "message", message: "B1"}));
            serverSend(JSON.stringify({channel: "public/b/2", event: "message", message: "B2"}));

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

    it("should create a private channel", function(done) {
        var mychannel = appstax.channel("private/mychannel");

        setTimeout(function() {
            expect(serverReceived[0]).to.have.property("command", "channel.create");
            expect(serverReceived[0]).to.have.property("channel", "private/mychannel");
            done();
        }, 200);
    });

    it("should send 'subscribe' instead of 'create' for a private wildcard pattern", function(done) {
        appstax.channel("private/something/*");
        appstax.channel("private/foo/bar/*");

        setTimeout(function() {
            expect(serverReceived[0]).to.have.property("command", "subscribe");
            expect(serverReceived[1]).to.have.property("command", "subscribe");
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
            expect(serverReceived.length).to.equal(7);
            expect(serverReceived[1]).to.have.property("channel", "private/mychannel");
            expect(serverReceived[1]).to.have.property("command", "grant.read");
            expect(serverReceived[1]).to.have.deep.property("data[0]", "buddy");
            expect(serverReceived[2]).to.have.property("channel", "private/mychannel");
            expect(serverReceived[2]).to.have.property("command", "grant.read");
            expect(serverReceived[2]).to.have.deep.property("data[0]", "friend");
            expect(serverReceived[3]).to.have.property("channel", "private/mychannel");
            expect(serverReceived[3]).to.have.property("command", "grant.write");
            expect(serverReceived[3]).to.have.deep.property("data[0]", "friend");
            expect(serverReceived[4]).to.have.property("channel", "private/mychannel");
            expect(serverReceived[4]).to.have.property("command", "revoke.read");
            expect(serverReceived[4]).to.have.deep.property("data[0]", "buddy");
            expect(serverReceived[5]).to.have.property("channel", "private/mychannel");
            expect(serverReceived[5]).to.have.property("command", "revoke.write");
            expect(serverReceived[5]).to.have.deep.property("data[0]", "buddy");
            expect(serverReceived[6]).to.have.property("channel", "private/mychannel");
            expect(serverReceived[6]).to.have.property("command", "revoke.write");
            expect(serverReceived[6]).to.have.deep.property("data[0]", "friend");
            done();
        }, 200);
    });

    it("should create private channel with all permissions to a list of users", function(done) {
        var mychannel = appstax.channel("private/mychannel", ["buddy", "friend"]);

        setTimeout(function() {
            expect(serverReceived.length).to.equal(3);
            expect(serverReceived[1]).to.have.property("channel", "private/mychannel");
            expect(serverReceived[1]).to.have.property("command", "grant.read");
            expect(serverReceived[1]).to.have.deep.property("data[0]", "buddy");
            expect(serverReceived[1]).to.have.deep.property("data[1]", "friend");
            expect(serverReceived[2]).to.have.property("channel", "private/mychannel");
            expect(serverReceived[2]).to.have.property("command", "grant.write");
            expect(serverReceived[2]).to.have.deep.property("data[0]", "buddy");
            expect(serverReceived[2]).to.have.deep.property("data[1]", "friend");
            done();
        }, 200);
    })

});



