
var Q  = require("q");
var WS = require("ws");

module.exports = createSocket;

function createSocket(apiClient) {
    var queue = [];
    var realtimeSessionPromise = null;
    var realtimeSessionId = "";
    var webSocket = null;
    var connectionIntervalId = null;
    var status = "disconnected";
    var handlers = {
        open: [],
        message: [],
        error: [],
        close: [],
        status: []
    };

    return {
        connect: connect,
        disconnect: disconnect,
        status: function() { return status },
        send: send,
        on: on
    }

    function send(packet) {
        if(typeof packet == "object") {
            packet = JSON.stringify(packet);
        }
        if(webSocket && webSocket.readyState == 1) {
            sendQueue();
            webSocket.send(packet);
        } else {
            queue.push(packet);
            connect();
        }
    }

    function sendQueue() {
        while(queue.length > 0) {
            if(webSocket && webSocket.readyState == 1) {
                var packet = queue.shift();
                webSocket.send(packet);
            } else {
                connect();
                break;
            }
        }
    }

    function on(event, handler) {
        handlers[event].push(handler);
    }

    function disconnect() {
        clearInterval(connectionIntervalId);
        webSocket && webSocket.close();
        realtimeSessionPromise = null;
    }

    function connect() {
        if(!realtimeSessionPromise) {
            connectSession();
        }
        if(!connectionIntervalId) {
            connectionIntervalId = setInterval(function() {
                if(!webSocket || webSocket.readyState > 1) {
                    setStatus("connecting");
                    realtimeSessionPromise.then(connectSocket);
                }
            }, 100);
        }
    }

    function connectSession() {
        setStatus("connecting");
        var defer = Q.defer();
        realtimeSessionPromise = defer.promise;
        var url = apiClient.url("/messaging/realtime/sessions", {}, {unique: (Math.random() * Date.now()).toString(16)});
        apiClient.request("post", url)
                 .then(function(response) {
                     realtimeSessionId = response.realtimeSessionId;
                     defer.resolve();
                 })
                 .fail(function(error) {
                     notifyHandlers("error", {error:error});
                 });
        return realtimeSessionPromise;
    }

    function connectSocket() {
        var url = apiClient.url("/messaging/realtime", {}, {rsession: realtimeSessionId});
        url = url.replace("http", "ws");
        webSocket = createWebSocket(url);
        webSocket.onopen = handleSocketOpen;
        webSocket.onerror = handleSocketError;
        webSocket.onmessage = handleSocketMessage;
        webSocket.onclose = handleSocketClose;
    }

    function createWebSocket(url) {
        if(typeof WebSocket != "undefined") {
            return new WebSocket(url);
        } else if(typeof WS != "undefined") {
            return new WS(url);
        }
    }

    function handleSocketOpen(event) {
        notifyHandlers("open", event);
        setStatus("connected");
        sendQueue();
    }

    function handleSocketError(event) {
        notifyHandlers("error", event);
    }

    function handleSocketMessage(event) {
        notifyHandlers("message", event);
    }

    function handleSocketClose(event) {
        notifyHandlers("close", event);
        setStatus("disconnected");
    }

    function notifyHandlers(eventName, event) {
        handlers[eventName].forEach(function(handler) {
            handler(event);
        });
    }

    function setStatus(newStatus) {
        var oldStatus = status;
        status = newStatus;
        if(newStatus != oldStatus) {
            notifyHandlers("status", {
                type: "status",
                status: status
            });
        }
    }

}
