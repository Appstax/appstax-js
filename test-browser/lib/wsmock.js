
module.exports = createWsContext;

function createWsContext(url) {
    var realWebSocket = null;
    var context = {};
    context.server = createServer();
    context.clients = [];
    context.createClient = createClient;
    context.restore = restore;
    context.simulateConnectionError = false;
    context.active = false;

    enable();
    return context;

    function enable() {
        if(typeof window != "undefined" && realWebSocket == null) {
            realWebSocket = window.WebSocket;
            window.WebSocket = context.createClient;
            context.active = true;
        }
    }

    function restore() {
        context.active = false;
        if(typeof window != "undefined" && realWebSocket != null) {
            window.WebSocket = realWebSocket;
            realWebSocket = null;
        }
    }

    function closeServer() {
        context.clients.forEach(function(client) {
            client.serverClosed();
        });
        context.clients = [];
    }

    function createClient() {
        var eventHub = createEventHub();
        var client = {};

        client.on      = eventHub.on;
        client.send    = send;
        client.receive = receive;
        client.serverClosed = serverClosed;
        client.close   = close;
        client.readyState = 0;

        eventHub.addProperty(client, "onopen", "open");
        eventHub.addProperty(client, "onclose", "close");
        eventHub.addProperty(client, "onerror", "error");
        eventHub.addProperty(client, "onmessage", "message");

        init();
        return client;

        function init() {
            if(context.simulateConnectionError) {
                client.readyState = 4;
                eventHub.dispatch("error", {}, 1);
            } else {
                context.server.addClient(client);
                client.readyState = 1;
                eventHub.dispatch("open", {}, 2);
            }
        }

        function send(message) {
            if(client.readyState == 1) {
                context.server.receive(message);
            }
        }

        function receive(message) {
            eventHub.dispatch("message", {data:message}, 1);
        }

        function serverClosed() {
            client.readyState = 3;
            eventHub.dispatch("close", {}, 1);
        }

        function close() {
            client.readyState = 3;
            eventHub.dispatch("close", {}, 1);
        }
    }

    function createServer() {
        var eventHub = createEventHub();

        var server = {
            on: eventHub.on,
            addClient: addClient,
            receive: receive,
            send: send,
            close: close
        }
        return server;

        function addClient(client) {
            context.clients.push(client);
            eventHub.dispatch("connection", server, 1);
        }

        function receive(message) {
            eventHub.dispatch("message", message, 1);
        }

        function send(message) {
            context.clients.forEach(function(client) {
                client.receive(message);
            });
        }

        function close() {
            closeServer();
        }

    }

    function createEventHub() {
        var listeners = [];

        return {
            on: on,
            dispatch: dispatch,
            addProperty: addProperty
        }

        function on(event, handler) {
            listeners.push({
                event: event,
                handler: handler
            });
        }

        function dispatch(event, data, delay) {
            if(!context.active) {
                return;
            }
            if(delay > 0) {
                setTimeout(function() {
                    dispatch(event, data, 0);
                }, delay);
                return;
            }
            if(data && !data.type) {
                data.type = event;
            }
            listeners.forEach(function(listener) {
                if(listener.event == event) {
                    listener.handler(data);
                }
            });
        }

        function addProperty(object, property, event) {
            Object.defineProperty(object, property, {
                set: function(handler) {
                    on(event, handler);
                }
            })
        }
    }
}
