
module.exports = createChannelsContext;

function createChannelsContext(socket) {
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

    function createChannel(channelName, usernames) {
        var nameParts = channelName.split("/");
        var channel = {
            type: nameParts[0],
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
        if(channel.type == "private" && !channel.wildcard) {
            sendPacket({channel:channelName, command:"channel.create"});
            if(usernames && usernames.length > 0) {
                sendPermission(channelName, "grant", usernames, ["read", "write"]);
            }
        } else {
            sendPacket({channel:channelName, command:"subscribe"});
        }
        return channel;
    }

    function sendPermission(channelName, change, usernames, permissions) {
        permissions.forEach(function(permission) {
            sendPacket({
                channel: channelName,
                command: change + "." + permission,
                data: usernames
            })
        });
    }

    function getChannel(name, permissions) {
        var channel = channels[name];
        if(!channel) {
            channels[name] = channel = createChannel(name, permissions);
        }
        return channel;
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
                return handler.eventName == eventName;
            });
        } else {
            filtered = handlers.filter(function(handler) {
                return handler.eventName == eventName &&
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
        notifyHandlers("*", "open");
    }

    function handleSocketError(event) {
        notifyHandlers("*", "error", {
            type:"error",
            error: new Error("Error connecting to realtime service")
        });
    }

    function handleSocketMessage(event) {
        var data = {};
        try {
            data = JSON.parse(event.data);
        } catch(e) {}

        if(typeof data.channel === "string" &&
           typeof data.event   === "string") {
            notifyHandlers(data.channel, data.event, data);
        }
    }
}

