

var appstax = require("../src/appstax");
var sinon = require("sinon");
var Q = require("q");
var wsmock = require("./lib/wsmock");

describe("Sockets", function() {

    var xhr, requests;
    var nextSession = 1;
    var realtimeSessionId;
    var socketUrl;
    var ws;

    beforeEach(function() {
        appstax.init({appKey:"sockettestapikey", baseUrl: "http://localhost:3000/api/latest", log:false});
        requests = [];
        xhr = sinon.useFakeXMLHttpRequest();
        xhr.onCreate = function(request) {
            requests.push(request);
        };
        realtimeSessionId = "rs-" + (nextSession++);
        socketUrl = "ws://localhost:3000/api/latest/messaging/realtime?rsession=" + realtimeSessionId;
        ws = wsmock(socketUrl);
    });

    afterEach(function() {
        xhr.restore();
        ws.restore();
        appstax.apiClient.socket().disconnect();
    });

    it("should verify wsmock works", function(done) {
        var socketOpen = false;
        var serverReceived = undefined;

        ws.server.on("connection", function(server) {
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
        expect(requests[0].url).to.include("http://localhost:3000/api/latest/messaging/realtime/sessions");
        expect(requests[0].requestHeaders).to.have.property("x-appstax-appkey", "sockettestapikey");
        requests[0].respond(200, {}, JSON.stringify({realtimeSessionId: realtimeSessionId}));
    });

    it("should auto-connect on send and queue messages while connecting", function(done) {
        var serverReceived = [];
        ws.server.on("message", function(data) {
            serverReceived.push(data);
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
        ws.server.on("connection", function(server) {
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
        ws.server.on("connection", function(server) {
            serverConnected = true;

            setTimeout(function() {
                serverConnected = false;
                server.close();
            }, 40);
        });
        ws.server.on("message", function(data) {
            if(serverConnected) {
                serverReceived.push(data);
            }
        });

        var socket = appstax.apiClient.socket();
        var sendCounter = 1;
        var sendIntervalId = setInterval(function() {
            socket.send("message" + sendCounter);
            if(++sendCounter > 30) {
                clearInterval(sendIntervalId);
            }
        }, 5);

        setTimeout(function() {
            requests[0].respond(200, {}, JSON.stringify({realtimeSessionId: realtimeSessionId}));
        }, 20);

        setTimeout(function() {
            expect(serverReceived.length).to.be.greaterThan(20);
            expect(serverReceived.length).to.be.lessThan(30);
            expect(serverReceived[serverReceived.length - 1]).to.equal("message30");
            expect(serverReceived[serverReceived.length - 2]).to.not.equal("message30");
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

    it("should trigger 'error' event when there is an error with initial websocket request", function(done) {
        ws.simulateConnectionError = true;

        var socket = appstax.apiClient.socket();
        var errorEvent;
        socket.on("error", function(event) {
            errorEvent = event;
        });
        socket.on("open", function(event) {
            throw new Error("Should not trigger 'open' event");
        });
        socket.connect();

        setTimeout(function() {
            requests[0].respond(200, {}, JSON.stringify({realtimeSessionId: realtimeSessionId}));
        }, 20);

        setTimeout(function() {
            expect(errorEvent.type).to.equal("error");
            done();
        }, 200)
    });

    it("should trigger 'status' events throughout connection/reconnection lifecycle", function(done) {
        var socket = appstax.apiClient.socket();
        var statusSpy = sinon.spy();
        socket.on("status", statusSpy);

        expect(socket.status()).to.equal("disconnected");
        expect(statusSpy.callCount).to.equal(0);

        socket.connect();
        expect(statusSpy.callCount).to.equal(1);
        expect(statusSpy.args[0][0].type).to.equal("status");
        expect(statusSpy.args[0][0].status).to.equal("connecting");
        expect(socket.status()).to.equal("connecting");

        setTimeout(function() {
            requests[0].respond(200, {}, JSON.stringify({realtimeSessionId: realtimeSessionId}));
        }, 20);

        setTimeout(function() {
            expect(statusSpy.callCount).to.equal(2);
            expect(statusSpy.args[1][0].status).to.equal("connected");
            expect(socket.status()).to.equal("connected");
            ws.server.close();

            setTimeout(function() {
                expect(statusSpy.callCount).to.equal(3);
                expect(statusSpy.args[2][0].status).to.equal("disconnected");
                expect(socket.status()).to.equal("disconnected");
            }, 10);
        }, 250);

        setTimeout(function() {
            expect(statusSpy.callCount).to.equal(5);
            expect(statusSpy.args[3][0].status).to.equal("connecting");
            expect(statusSpy.args[4][0].status).to.equal("connected");
            expect(socket.status()).to.equal("connected");
            done();
        }, 1000);
    });

});



