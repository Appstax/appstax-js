
var Q = require("kew");

module.exports = createSocket;

function createSocket(apiClient) {
    var queue = [];
    var realtimeSessionPromise = null;
    var realtimeSessionId = "";
    var webSocket = null;
    var connectionIntervalId = null;
    var handlers = {
        open: [],
        message: [],
        error: [],
        close: []
    };

    return {
        connect: connect,
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

    function connect() {
        if(!realtimeSessionPromise) {
            connectSession();
        }
        if(!connectionIntervalId) {
            connectionIntervalId = setInterval(function() {
                if(!webSocket || webSocket.readyState > 1) {
                    realtimeSessionPromise.then(connectSocket);
                }
            }, 100);
        }
    }

    function connectSession() {
        var defer = Q.defer();
        realtimeSessionPromise = defer.promise;
        var url = apiClient.url("/messaging/realtime/sessions");
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
        webSocket = new WebSocket(url);
        webSocket.onopen = handleSocketOpen;
        webSocket.onerror = handleSocketError;
        webSocket.onmessage = handleSocketMessage;
        webSocket.onclose = handleSocketClose;
    }

    function handleSocketOpen(event) {
        sendQueue();
        notifyHandlers("open", event);
    }

    function handleSocketError(event) {
        notifyHandlers("error", event);
    }

    function handleSocketMessage(event) {
        notifyHandlers("message", event);
    }

    function handleSocketClose(event) {
        notifyHandlers("close", event);
    }

    function notifyHandlers(eventName, event) {
        handlers[eventName].forEach(function(handler) {
            handler(event);
        });
    }

}
