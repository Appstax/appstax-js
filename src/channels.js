
module.exports = createChannelsContext;

function createChannelsContext(socket, objects) {
    var channels;
    var handlers;
    var idCounter = 0;

    init();
    return {
        getChannel: getChannel
    };

    function init() {
        socket.on("open", handleSocketOpen);
        socket.on("error", handleSocketError);
        socket.on("message", handleSocketMessage);
        channels = {};
        handlers = [];
    }

    function createChannel(channelName, options) {
        var nameParts = channelName.split("/");
        var channel = channels[channelName] = {
            type: nameParts[0],
            created: false,
            wildcard: channelName.indexOf("*") != -1,
            on: function(eventName, handler) {
                addHandler(channelName, eventName, handler)
            },
            send: function(message) {
                sendPacket({
                    channel:channelName,
                    command:"publish",
                    message: message
                });
            },
            grant: function(username, permissions) {
                sendPermission(channelName, "grant", [username], permissions);
            },
            revoke: function(username, permissions) {
                sendPermission(channelName, "revoke", [username], permissions);
            }
        };


        switch(channel.type) {

            case "private":
                sendPacket({channel:channelName, command:"subscribe"});
                if(options != undefined) {
                    var usernames = options;
                    sendPermission(channelName, "grant", usernames, ["read", "write"]);
                }
                break;

            case "objects":
                sendPacket({channel:channelName, command:"subscribe", filter: options || ""});
                break;

            default:
                sendPacket({channel:channelName, command:"subscribe"});
        }

        return channel;
    }

    function sendPermission(channelName, change, usernames, permissions) {
        sendCreate(channelName);
        permissions.forEach(function(permission) {
            sendPacket({
                channel: channelName,
                command: change + "." + permission,
                data: usernames
            })
        });
    }

    function sendCreate(channelName) {
        var channel = getChannel(channelName);
        if(!channel.created) {
            channel.created = true;
            sendPacket({channel:channelName, command:"channel.create"});
        }
    }

    function getChannel(name, permissions) {
        if(!channels[name]) {
            createChannel(name, permissions);
        }
        return channels[name];
    }

    function sendPacket(packet) {
        packet.id = String(idCounter++);
        socket.send(packet);
    }

    function notifyHandlers(channelName, eventName, event) {
        getHandlers(channelName, eventName).forEach(function(handler) {
            handler(event);
        });
    }

    function getHandlers(channelName, eventName) {
        var filtered = [];
        if(channelName == "*") {
            filtered = handlers.filter(function(handler) {
                return handler.eventName == "*" || handler.eventName == eventName;
            });
        } else {
            filtered = handlers.filter(function(handler) {
                return (handler.eventName == "*" || handler.eventName == eventName) &&
                       handler.regexp.test(channelName)
            });
        }
        return filtered.map(function(handler) {
            return handler.fn;
        });
    }

    function addHandler(channelPattern, eventName, handler) {
        var regexp;
        if(channelPattern.lastIndexOf("*") == channelPattern.length - 1) {
            regexp = new RegExp("^" + channelPattern.replace("*", ""));
        } else {
            regexp = new RegExp("^" + channelPattern + "$");
        }
        handlers.push({
            regexp: regexp,
            eventName: eventName,
            fn: handler
        });
    }

    function handleSocketOpen(event) {
        notifyHandlers("*", "open", {type: "open"});
    }

    function handleSocketError(event) {
        notifyHandlers("*", "error", {
            type:"error",
            error: new Error("Error connecting to realtime service")
        });
    }

    function handleSocketMessage(socketEvent) {
        var event = {};
        try {
            event = JSON.parse(socketEvent.data);
        } catch(e) {}

        if(typeof event.channel === "string" &&
           typeof event.event   === "string") {
            event.type = event.event;
            if(event.type.indexOf("object.") == 0) {
                var collection = event.channel.split("/")[1];
                event.object = objects.createObject(collection, event.data);
            }
            notifyHandlers(event.channel, event.type, event);
        }
    }
}

