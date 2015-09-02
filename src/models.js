
module.exports = createModelContext;

function createModelContext(objects, users, channels, socket, hub) {
    return {
        create: function() {
            return createModel(objects, users, channels, socket, hub);
        }
    }
}

function createModel(objects, users, channels, socket, hub) {
    var observers = [];
    var handlers = [];
    var allObjects = {};

    var api = {
        watch: addObserver,
        on: addHandler
    }
    var model = {
        root: api,
        normalize: normalize,
        notifyHandlers: notifyHandlers,
        updateObject: updateObject
    }
    return api;

    function addObserver(name, options) {
        options = options || {};

        var observer;
        if("currentUser" == name) {
            observer = createCurrentUserObserver(model, objects, users, channels, hub);
        } else if("status" == name) {
            observer = createConnectionStatusObserver(model, socket);
        } else {
            observer = createArrayObserver(name, options, model, objects, channels);
        }
        observers.push(observer);
        observer.load();
        observer.connect();
    }

    function addHandler(event, handler) {
        handlers.push({event:event, handler:handler});
    }

    function notifyHandlers(event, data) {
        handlers.forEach(function(handler) {
            if(handler.event == event) {
                handler.handler(data);
            }
        });
    }

    function normalize(object) {
        if(!object) {
            return object;
        }
        var id = object.id;
        if(!allObjects[id]) {
            allObjects[id] = object;
        }
        return allObjects[id]
    }

    function updateObject(updated) {
        var object = allObjects[updated.id];
        if(object) {
            objects.copy(updated, object);
        } else {
            allObjects[updated.id] = updated;
        }
        observers.forEach(function(observer) {
            observer.sort && observer.sort();
        });
        notifyHandlers("change");
    }
}

function createArrayObserver(name, options, model, objects, channels) {
    var observer = {};
    observer.name = name;
    observer.collection = name;
    observer.order = options.order || "-created";
    observer.sort = sort;
    observer.load = load;
    observer.connect = connect;

    set([]);
    return observer;

    function set(o) {
        o = o.map(model.normalize);
        extendArray(o);
        model.root[observer.name] = o;
        sort();
        model.notifyHandlers("change");
    }

    function get() {
        return model.root[observer.name];
    }

    function add(o) {
        o = model.normalize(o);
        get().push(o);
        observer.sort();
        model.notifyHandlers("change");
    }

    function remove(o) {
        get().splice(indexOf(o), 1);
        model.notifyHandlers("change");
    }

    function indexOf(o) {
        var index = -1;
        get().some(function(a, i) {
            if(a.id == o.id) {
                index = i;
                return true;
            }
            return false;
        });
        return index;
    }

    function sort() {
        objects.sort(get(), observer.order);
    }

    function load() {
        objects.findAll(observer.collection).then(set);
    }

    function connect() {
        var channel = channels.getChannel("objects/" + observer.collection);
        channel.on("object.created", function(event) {
            add(event.object);
        });
        channel.on("object.deleted", function(event) {
            remove(event.object);
        });
        channel.on("object.updated", function(event) {
            model.updateObject(event.object);
        });
    }

    function extendArray(array) {
        array.has = _filterHas;

        function _filterHas(key, value) {
            var filtered = array.filter(function(o) {
                var expected = [].concat(value);
                var actual   = [].concat(o[key]);
                return expected.some(function(v1) {
                    return actual.some(function(v2) {
                        return (v1.id || v1) == (v2.id || v2);
                    });
                });
            });
            extendArray(filtered);
            return filtered;
        }
    }
}

function createCurrentUserObserver(model, objects, users, channels, hub) {
    var observer = {}
    observer.name = "currentUser";
    observer.load = load;
    observer.connect = connect;

    init();
    return observer;

    function init() {
        set(null);
        hub.on("users.login", function(event) {
            set(event.user);
        });
        hub.on("users.signup", function(event) {
            set(event.user);
        });
        hub.on("users.logout", function() {
            set(null);
        });
    }

    function set(o) {
        o = model.normalize(o);
        model.root[observer.name] = o;
    }

    function load() {
        var user = users.currentUser();
        if(user) {
            user.refresh().then(set);
        }
    }

    function connect() {
        var ch = channels.getChannel("objects/users");
        ch.on("object.updated", function(event) {
            model.updateObject(event.object);
        });
    }
}

function createConnectionStatusObserver(model, socket) {
    var observer = {};
    observer.name = "status";
    observer.load = load;
    observer.connect = connect;

    init();
    return observer;

    function init() {
        set(socket.status());
        socket.on("status", function(event) {
            set(socket.status());
        });
    }

    function set(o) {
        model.root[observer.name] = o;
        model.notifyHandlers("change");
    }

    function load() {

    }

    function connect() {

    }
}
