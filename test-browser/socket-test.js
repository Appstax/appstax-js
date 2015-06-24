

var appstax = require("../src/appstax");
var sinon = require("sinon");
var Q = require("kew");
require("mock-socket/src/main");

describe("Sockets", function() {

    var xhr, requests;
    var socketServer;
    var nextSession = 1;
    var realtimeSessionId;
    var socketUrl;

    beforeEach(function() {
        appstax.init({appKey:"sockettestapikey", baseUrl: "http://localhost:3000/api/latest", log:false});
        requests = [];
        xhr = sinon.useFakeXMLHttpRequest();
        xhr.onCreate = function(request) {
            requests.push(request);
        };
        realtimeSessionId = "rs-" + (nextSession++);
        socketUrl = "ws://localhost:3000/api/latest/messaging/realtime?rsession=" + realtimeSessionId;
        socketServer = new MockServer(socketUrl);
        window.WebSocket = MockSocket;
    });

    afterEach(function() {
        xhr.restore();
    });

    it("should verify mock-socket works", function(done) {
        var socketOpen = false;
        var serverReceived = undefined;

        socketServer.on("connection", function(server) {
            server.on("message", function(data) {
                serverReceived = data;
                server.send("hello");
            });
        });

        var webSocket = new WebSocket("ws://localhost:3000/api/latest/messaging/realtime?rsession=" + realtimeSessionId);
        webSocket.onopen = function(e) {
            socketOpen = true;
            webSocket.send("world");
        };
        webSocket.onmessage = function(event) {
            expect(socketOpen).equals(true);
            expect(serverReceived).equals("world");
            expect(event.data).equals("hello");
            done();
        };
    });

    it("should connect with realtimeSessionId", function(done) {
        var socket = appstax.apiClient.socket();
        socket.on("open", function(event) {
            done();
        });
        socket.connect();

        expect(requests.length).to.equal(1);
        expect(requests[0].method).to.equal("POST");
        expect(requests[0].url).to.equal("http://localhost:3000/api/latest/messaging/realtime/sessions");
        expect(requests[0].requestHeaders).to.have.property("x-appstax-appkey", "sockettestapikey");
        requests[0].respond(200, {}, JSON.stringify({realtimeSessionId: realtimeSessionId}));
    });

    it("should auto-connect on send and queue messages while connecting", function(done) {
        var serverReceived = [];
        socketServer.on("connection", function(server) {
            server.on("message", function(data) {
                serverReceived.push(data);
            });
        });

        var socket = appstax.apiClient.socket();
        socket.send("foo");
        socket.send("bar");
        expect(serverReceived.length).to.equal(0);

        requests[0].respond(200, {}, JSON.stringify({realtimeSessionId: realtimeSessionId}));
        setTimeout(function() {
            expect(serverReceived.length).to.equal(2);
            expect(serverReceived[0]).to.equal("foo");
            expect(serverReceived[1]).to.equal("bar");
            done();
        }, 200);
    });

    it("should receive socket messages", function(done) {
        socketServer.on("connection", function(server) {
            server.send("foo");
            server.send({foo:"bar"});
        });

        var clientReceived = [];
        var socket = appstax.apiClient.socket();
        socket.connect();
        socket.on("message", function(event) {
            clientReceived.push(event);
        });

        requests[0].respond(200, {}, JSON.stringify({realtimeSessionId: realtimeSessionId}));
        setTimeout(function() {
            expect(clientReceived.length).to.equal(2);
            expect(clientReceived[0].data).to.equal("foo");
            expect(clientReceived[1].data).to.contain({foo:"bar"});
            done();
        }, 200);
    });

    it("should queue messages and reconnect when connection is closed", function(done) {
        var serverReceived = [];
        var serverConnected = false;
        socketServer.on("connection", function(server) {
            serverConnected = true;
            server.on("message", function(data) {
                if(serverConnected) {
                    serverReceived.push(data);
                }
            });
            setTimeout(function() {
                serverConnected = false;
                server.close();
            }, 60);
        });

        var socket = appstax.apiClient.socket();
        var sendCounter = 1;
        var sendIntervalId = setInterval(function() {
            socket.send("message" + sendCounter);
            if(++sendCounter > 30) {
                clearInterval(sendIntervalId);
            }
        }, 10);

        setTimeout(function() {
            requests[0].respond(200, {}, JSON.stringify({realtimeSessionId: realtimeSessionId}));
        }, 20);

        setTimeout(function() {
            expect(serverReceived.length).to.be.greaterThan(20);
            expect(serverReceived[serverReceived.length - 1]).to.equal("message30");
            expect(requests.length).to.equal(1);
            done();
        }, 500);
    });

    it("should trigger 'error' event when there is an error with initial session request", function(done) {
        var socket = appstax.apiClient.socket();
        socket.on("error", function(event) {
            expect(event.error.message).to.equal("Oh no!");
            done();
        });
        socket.connect();

        expect(requests.length).to.equal(1);
        requests[0].respond(422, {}, JSON.stringify({errorMessage:"Oh no!"}));
    });

    // it("should trigger 'error' event when there is an error with initial websocket request", function(done) {
    //     delete window.MockSocket.services[socketUrl];

    //     var socket = appstax.apiClient.socket();
    //     socket.on("error", function(event) {
    //         expect(event.type).to.equal("error");
    //         done();
    //     });
    //     socket.connect();

    //     setTimeout(function() {
    //         requests[0].respond(200, {}, JSON.stringify({realtimeSessionId: realtimeSessionId}));
    //     }, 20);
    // });

});



