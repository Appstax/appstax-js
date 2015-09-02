
var extend = require("extend");

module.exports = createHub;

function createHub() {

    var handlers = [];

    return {
        on: on,
        pub: pub
    }

    function on(type, handler) {
        handlers.push({
            type: type,
            handler: handler
        });
    }

    function pub(type, data) {
        var event = extend({}, data, {type: type});
        handlers.forEach(function(handler) {
            if(handler.type == type) {
                handler.handler(event);
            }
        });
    }
}
