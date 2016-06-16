
var createNormalizer = require("./normalizer");

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
    var normalizer = createNormalizer(objects);

    var api = {
        watch: addObserver,
        on: addHandler,
        observable: function(o) { return createObservable(api, o, objects) }
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

    function normalize(object, depth) {
        return normalizer.normalize(object, depth);
    }

    function updateObject(updated, depth) {
        normalize(updated, depth);
        observers.forEach(function(observer) {
            observer.sort && observer.sort();
        });
        notifyHandlers("change");
    }
}

function createArrayObserver(name, options, model, objects, channels) {
    var observer = {};
    observer.name = name;
    observer.collection = options.collection || name;
    observer.order = options.order || "-created";
    observer.filter = options.filter;
    observer.expand = options.expand + 0 || undefined;
    observer.sort = sort;
    observer.load = load;
    observer.connect = connect;

    var connectedRelations = {}; // collection:bool
    var expandedObjects = {}; // id:depth

    set([]);
    return observer;

    function set(o) {
        o.map(function(x) {
            x = model.normalize(x, observer.expand);
            registerRelations(x);
            return x;
        });
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
        registerRelations(o);

        var depth = expandedObjects[o.id];
        if(typeof depth != "undefined" && depth > 0) {
            o.expand(depth).then(_add);
        } else {
            _add();
        }

        function _add() {
            get().push(o);
            observer.sort();
            model.notifyHandlers("change");
        }
    }

    function update(o) {
        var depth = expandedObjects[o.id];
        if(typeof depth != "undefined" && depth > 0) {
            o.expand(depth).then(_update);
        } else {
            _update();
        }

        function _update() {
            model.updateObject(o, depth);
            registerRelations(o);
        }
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
        var options = {expand: observer.expand};
        if(typeof observer.filter == "string") {
            objects.find(observer.collection, observer.filter, options).then(set);
        } else {
            objects.findAll(observer.collection, options).then(set);
        }
    }

    function connect() {
        var channel = channels.getChannel("objects/" + observer.collection, observer.filter);
        channel.on("object.created", function(event) {
            add(event.object);
        });
        channel.on("object.deleted", function(event) {
            remove(event.object);
        });
        channel.on("object.updated", function(event) {
            update(event.object);
        });
    }

    function connectRelation(collection) {
        if(!connectedRelations[collection]) {
            connectedRelations[collection] = true;
            var channel = channels.getChannel("objects/" + collection);
            channel.on("object.updated", function(event) {
                update(event.object);
            });
        }
    }

    function registerRelations(object, depth) {
        var depth = (typeof depth != "undefined") ? depth : observer.expand || 0;

        expandedObjects[object.id] = depth;
        if(depth > 0) {
            objects.getRelatedObjects(object).forEach(function(x) {
                connectRelation(x.collectionName);
                registerRelations(x, depth - 1);
            });
        }
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
        model.root[observer.name] = null;
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
        model.notifyHandlers("change");
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

function createObservable(model, Observable, objects) {
    var root = Observable({});
    model.on("change", update);

    update();
    return root;

    function update() {
        var values = {};
        keys().forEach(function(k) {
            var v = root.value[k]
            if(typeof v == "undefined") {
                v = Observable();
            }
            v.replaceAll(model[k]);
            values[k] = v;
        });
        root.value = values;
    }

    function compareObjects(o1, o2) {
        return o1.id == o2.id;
    }

    function updateObject(oldObject, newObject) {}

    function mapObject(newObject) {
        return newObject;
    }

    function keys() {
        return Object.keys(model)
                     .filter(function(k) { return typeof model[k] != "function" });
    }
}
