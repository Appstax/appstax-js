
var extend      = require("extend");
var query       = require("./query");
var failLogger  = require("./faillogger");
var Q           = require("q");

module.exports = createObjectsContext;

var nextContextId = 0;

function getInternalProperties(collectionName) {
    var properties = ["collectionName", "id", "internalId", "created", "updated", "permissions", "save", "saveAll", "remove", "grant", "revoke", "sysCreated", "sysUpdated", "sysPermissions"];
    if(collectionName == "users") {
        properties.push("username");
    }
    return properties;
}

function createObjectsContext(apiClient, files, collections) {
    var contextId = nextContextId++;
    var internalIds = 0;

    var prototype = {
        save: function() {
            return failOnUnsavedRelations(this)
                    .then(saveObject)
                    .then(savePermissionChanges)
                    .then(saveFileProperties)
                    .fail(failLogger.log);
        },
        saveAll: function() {
            return saveObjectsInGraph(this).fail(failLogger.log);
        },
        remove: function() {
            return removeObject(this).fail(failLogger.log);
        },
        refresh: function() {
            return refreshObject(this).fail(failLogger.log);
        },
        expand: function(options) {
            return expandObject(this, options).fail(failLogger.log);
        },
        grant: function(usernames, permissions) {
            if(typeof usernames === "string") {
                usernames = [usernames];
            }
            var internal = this.internalObject;
            usernames.forEach(function(username) {
                internal.grants.push({
                    username: username,
                    permissions: permissions
                });
            });
        },
        revoke: function(usernames, permissions) {
            if(typeof usernames === "string") {
                usernames = [usernames];
            }
            var internal = this.internalObject;
            usernames.forEach(function(username) {
                internal.revokes.push({
                    username: username,
                    permissions: permissions
                });
            });
        },
        grantPublic: function(permissions) {
            this.grant("*", permissions);
        },
        revokePublic: function(permissions) {
            this.revoke("*", permissions);
        },
        hasPermission: function(permission) {
            return this.permissions.indexOf(permission) != -1;
        }
    };

    return {
        create: createObject,
        createQuery: createQuery,
        getProperties: getProperties,
        createObject: createObject,
        getObjectStatus: getObjectStatus,
        findAll: findAll,
        find: find,
        search: search,
        sort: sortObjects,
        copy: copyValues
    };

    function createObject(collectionName, properties, factory) {
        var internal = createInternalObject(collectionName);
        var object = Object.create(prototype);
        Object.defineProperty(object, "id", { get: function() { return internal.id; }, enumerable:true });
        Object.defineProperty(object, "internalId", { writable: false, value: internal.internalId, enumerable:true });
        Object.defineProperty(object, "internalObject", { writable: false, value: internal, enumerable: false });
        Object.defineProperty(object, "collectionName", { get: function() { return internal.collectionName; }, enumerable:true });
        Object.defineProperty(object, "created", { get: function() { return new Date(internal.sysValues.sysCreated); }, enumerable:true });
        Object.defineProperty(object, "updated", { get: function() { return new Date(internal.sysValues.sysUpdated); }, enumerable:true });
        Object.defineProperty(object, "permissions", { get: function() { return internal.sysValues.sysPermissions; }, enumerable: true });
        if(collectionName == "users") {
            Object.defineProperty(object, "username", { get:function() { return internal.sysValues.sysUsername; }, enumerable:true });
        }

        properties = extend({}, collections.defaultValues(collectionName), properties);
        fillObjectWithValues(object, properties, factory || createObject);

        if(object.id !== null) {
            internal.status = "saved";
        }
        return object;
    }

    function fillObjectWithValues(object, properties, factory) {
        var internal = object.internalObject;
        var filteredProperties = {};
        if(typeof properties === "object") {
            var sysValues = internal.sysValues;
            internal.setId(properties.sysObjectId);
            Object.keys(properties).forEach(function(key) {
                var value = properties[key];
                if(key.indexOf("sys") === 0) {
                    sysValues[key] = value;
                } else if(typeof value.sysDatatype == "string") {
                    filteredProperties[key] = createPropertyWithDatatype(key, value, object, factory);
                    if(value.sysDatatype == "relation") {
                        internal.relations[key] = {
                            type: value.sysRelationType,
                            ids: (value.sysObjects || []).map(function(object) {
                                return object.sysObjectId || object;
                            })
                        }
                    }
                } else {
                    filteredProperties[key] = value;
                }
            });
        }
        extend(object, filteredProperties);
    }

    function createPropertyWithDatatype(key, value, object, factory) {
        switch(value.sysDatatype) {
            case "relation": return _createRelationProperty(value, factory);
            case "file": return files.create({
                filename: value.filename,
                url: files.urlForFile(object.collectionName, object.id, key, value.filename)
            });
        }
        return null;

        function _createRelationProperty(value, factory) {
            var results = [];
            if(typeof value.sysObjects !== "undefined") {
                results = value.sysObjects.map(function(object) {
                    if(typeof object === "string") {
                        return object
                    } else {
                        return factory(value.sysCollection, object, factory);
                    }
                });
            }
            if("single" === value.sysRelationType) {
                return results[0];
            } else {
                return results;
            }
        }
    }

    function createInternalObject(collectionName) {
        var object = {
            id: null,
            internalId: createInternalId(),
            collectionName: collectionName,
            sysValues: {},
            initialValues: {},
            created: new Date(),
            updated: new Date(),
            status: "new",
            grants: [],
            revokes: [],
            relations: {},
            setId: function(id) { if(id) { this.id = id; }},
            resetPermissions: function() { this.grants = []; this.revokes = []; }
        }
        return object;
    }

    function refreshObject(object) {
        var defer = Q.defer();
        var internal = object.internalObject;
        var internalProperties = getInternalProperties(object.collectionName);
        if(internal.status === "new") {
            defer.resolve(object);
        } else {
            findById(object.collectionName, object.id).then(function(updated) {
                Object.keys(updated)
                    .filter(function(key) {
                        return internalProperties.indexOf(key) == -1
                    })
                    .forEach(function(key) {
                        object[key] = updated[key];
                    });
                defer.resolve(object);
            });
        }
        return defer.promise;
    }

    function saveObject(object, defer) {
        var internal = object.internalObject
        var defer = typeof defer == "object" ? defer : Q.defer();
        if(internal.status === "saving") {
            setTimeout(function() {
                saveObject(object, defer);
            }, 100);
            return defer.promise;
        }

        var url, method, objectData, formData;
        if(object.id == null) {
            url = apiClient.url("/objects/:collection", {collection: object.collectionName});
            method = "post";
            formData = getDataForSaving(object)
            objectData = getPropertiesForSaving(object);
        } else {
            url = apiClient.url("/objects/:collection/:id", {collection: object.collectionName, id: object.id});
            method = "put";
            objectData = getPropertiesForSaving(object);
        }
        internal.status = "saving";
        apiClient.request(method, url, formData || objectData)
                 .progress(function(progress) {
                     if(typeof formData != "undefined") {
                         defer.notify(progress);
                     }
                 })
                 .then(function(response) {
                     internal.setId(response.sysObjectId);
                     internal.status = "saved";
                     applyRelationChanges(object, objectData);
                     if(typeof FormData != "undefined" && formData instanceof FormData) {
                         markFilesSaved(object);
                     }
                     defer.resolve(object);
                 })
                 .fail(function(error) {
                     internal.status = "error";
                     defer.reject(error);
                 });
        return defer.promise;
    }

    function removeObject(object) {
        var defer = Q.defer();
        var url = apiClient.url("/objects/:collection/:id", {collection: object.collectionName, id: object.id});
        apiClient.request("DELETE", url)
                 .then(function(response) {
                     defer.resolve();
                 })
                 .fail(function(error) {
                     defer.reject(error);
                 });
        return defer.promise;
    }

    function expandObject(object, options) {
        if(isUnsaved(object)) {
            throw new Error("Error calling expand() on unsaved object.")
        }
        var defer = Q.defer();
        var depth = 1;
        if(typeof options === "number") {
            depth = options;
        }
        findById(object.collectionName, object.id, {expand:depth}).then(function(expanded) {
            var internal = object.internalObject;
            var relations = Object.keys(internal.relations);
            relations.forEach(function(relation) {
                object[relation] = expanded[relation];
            });
            defer.resolve(object);
        });
        return defer.promise;
    }

    function markFilesSaved(object) {
        var fileProperties = getFileProperties(object);
        return Object.keys(fileProperties).map(function(key) {
            var file = fileProperties[key];
            var url  = files.urlForFile(object.collectionName, object.id, key, file.filename);
            files.status(file, "saved");
            files.setUrl(file, url);
        });
    }

    function saveFileProperties(object) {
        var fileProperties = getFileProperties(object);
        var keys = Object.keys(fileProperties);
        var promises = [];
        var progress = [];
        keys.forEach(function(key) {
            var file = fileProperties[key];
            if(files.status(file) !== "saved") {
                var promise = files.saveFile(object.collectionName, object.id, key, file)
                promises.push(promise);
                progress.push(0);
            }
        });

        var defer = Q.defer();
        Q.all(promises)
            .progress(function(item) {
                progress[item.index] = item.value.percent;
                var percent = progress.reduce(function(previous, current, index, array) {
                    return previous + (current / array.length);
                }, 0);
                defer.notify({percent: Math.round(percent)});
            })
            .then(function() {
                defer.resolve(object);
            })
            .fail(function(error) {
                defer.reject(error);
            });
        return defer.promise;
    }

    function savePermissionChanges(object) {
        var defer = Q.defer();
        var url = apiClient.url("/permissions");
        var internal = object.internalObject;
        var grants = internal.grants.map(_convertChange);
        var revokes = internal.revokes.map(_convertChange);
        internal.resetPermissions();

        if(grants.length + revokes.length === 0) {
            defer.resolve(object);
        } else {
            var data = {grants:grants, revokes:revokes};
            apiClient.request("POST", url, data)
                     .then(function(response) {
                         defer.resolve(object);
                     })
                     .fail(function(error) {
                         defer.reject(error);
                     });
        }
        return defer.promise;

        function _convertChange(change) {
            return {
                sysObjectId: object.id,
                username: change.username,
                permissions: change.permissions
            }
        }
    }

    function failOnUnsavedRelations(object) {
        detectUndeclaredRelations(object);
        var related = getRelatedObjects(object);
        if(related.some(isUnsaved)) {
            throw new Error("Error saving object. Found unsaved related objects. Save related objects first or consider using saveAll().")
        } else {
            var defer = Q.defer();
            defer.fulfill(object);
            return defer.promise;
        }
    }

    function saveObjectsInGraph(rootObject) {
        var objects = getObjectsInGraph(rootObject);
        var unsavedInbound = objects.inbound.filter(isUnsaved);
        var outbound = objects.outbound;
        var remaining = objects.inbound.filter(function(o) { return !isUnsaved(o) });

        if(0 == outbound.length + unsavedInbound.length + remaining.length) {
            return rootObject.save();
        } else {
            return _saveUnsavedInbound().then(_saveOutbound).then(_saveRemaining);
        }

        function _saveUnsavedInbound() {
            return Q.all(unsavedInbound.map(saveObject));
        }
        function _saveOutbound() {
            return Q.all(outbound.map(saveObject));
        }
        function _saveRemaining() {
            return Q.all(remaining.map(saveObject));
        }
    }

    function getObjectsInGraph(rootObject) {
        var queue = [rootObject];
        var all      = {};
        var inbound  = {};
        var outbound = {};

        while(queue.length > 0) {
            var object = queue.shift();
            detectUndeclaredRelations(object);
            if(all[object.internalId] == null) {
                all[object.internalId] = object;
                var allRelated = getRelatedObjects(object).filter(function(a) { return typeof a == "object" });
                allRelated.forEach(function(related) {
                    inbound[related.internalId] = related;
                });
                if(allRelated.length > 0) {
                    outbound[object.internalId] = object;
                    queue = queue.concat(allRelated);
                }
            }
        }

        return {
            all:      _mapToArray(all),
            inbound:  _mapToArray(inbound),
            outbound: _mapToArray(outbound)
        }

        function _mapToArray(map) {
            return Object.keys(map).map(_objectForKey);
        }

        function _objectForKey(key) {
            return all[key];
        }
    }

    function getRelatedObjects(object) {
        var related = [];
        var internal = object.internalObject;
        Object.keys(internal.relations).forEach(function(key) {
            var property = object[key];
            if(property == null) {
                return;
            }
            related = related.concat(property);
        });
        return related;
    }

    function getRelationChanges(object, propertyName) {
        var internal = object.internalObject;
        var relation = internal.relations[propertyName];
        var changes = {
            additions: [],
            removals: []
        }

        if(relation) {
            var property = object[propertyName];
            var objects = [];
            if(property) {
                objects = (relation.type == "array") ? property : [property];
            }
            var currentIds = objects.map(function(o) { return o.id || o; })
                                    .filter(function(id) { return typeof id === "string"; });
            changes.additions = currentIds.filter(function(id) {
                return id != null && relation.ids.indexOf(id) == -1;
            });
            changes.removals = relation.ids.filter(function(id) {
                return id != null && currentIds.indexOf(id) == -1;
            });
        }

        return changes;
    }

    function applyRelationChanges(object, savedData) {
        var internal = object.internalObject;
        Object.keys(internal.relations).forEach(function(key) {
            var relation = internal.relations[key];
            var changes = savedData[key].sysRelationChanges;
            relation.ids = relation.ids
                .concat(changes.additions)
                .filter(function(id) {
                    return changes.removals.indexOf(id) == -1;
                });
        });
    }

    function detectUndeclaredRelations(object) {
        var collection = collections.get(object.collectionName);
        var relations = object.internalObject.relations;

        var properties = getProperties(object);
        Object.keys(properties).forEach(function(key) {
            if(relations[key]) {
                return;
            }
            var property = properties[key]
            var relationType = "";
            if(property !== null && typeof property === "object") {
                if(typeof property.length === "undefined") {
                    if(typeof property.collectionName === "string") {
                        relationType = "single"
                    }
                } else {
                    property.some(function(item) {
                        if(typeof item.collectionName === "string") {
                            relationType = "array"
                            return true;
                        }
                        return false;
                    })
                }
            }
            if(relationType !== "") {
                relations[key] = { type:relationType, ids:[] };
            }
        });
    }

    function getPropertyNames(object) {
        var internalProperties = getInternalProperties(object.collectionName);
        var keys = Object.keys(object);
        return keys.filter(function(key) {
            return internalProperties.indexOf(key) == -1;
        });
    }

    function getProperties(object) {
        if(!isObject(object)) { return {}; }
        var data = {};
        getPropertyNames(object).forEach(function(key) {
            if(/^[a-zA-Z]/.test(key)) {
                data[key] = object[key];
            }
        });
        var sysValues = object.internalObject.sysValues;
        var internalProperties = getInternalProperties(object.collectionName);
        Object.keys(sysValues).forEach(function(key) {
            if(internalProperties.indexOf(key) == -1) {
                data[key] = sysValues[key];
            }
        });
        return data;
    }

    function getDataForSaving(object) {
        var properties = getPropertiesForSaving(object);
        var fileProperties = getFileProperties(object);
        var hasFiles = false;
        var formData = apiClient.formData();
        Object.keys(fileProperties).forEach(function(key) {
            var file = fileProperties[key];
            var nativeFile = files.nativeFile(file);
            if(nativeFile && files.status(file) !== "saved") {
                hasFiles = true;
                formData.append(key, nativeFile);
            }
        });
        if(hasFiles) {
            formData.append("sysObjectData", JSON.stringify(properties));
            return formData;
        } else {
            return properties;
        }
    }

    function getPropertiesForSaving(object) {
        var internal = object.internalObject;
        var properties = getProperties(object);
        Object.keys(properties).forEach(function(key) {
            var property = properties[key];
            if(files.isFile(property)) {
                properties[key] = {
                    sysDatatype: "file",
                    filename: property.filename
                }
            } else if(typeof internal.relations[key] === "object") {
                properties[key] = {
                    sysRelationChanges: getRelationChanges(object, key)
                }
            }
        });
        return properties;
    }

    function getFileProperties(object) {
        var properties = getProperties(object);
        var fileProperties = {};
        Object.keys(properties).forEach(function(key) {
            var property = properties[key];
            if(files.isFile(property)) {
                fileProperties[key] = property;
            }
        });
        return fileProperties;
    }

    function createInternalId() {
        var id = "internal-id-" + contextId + "-" + internalIds;
        internalIds++;
        return id;
    }

    function queryParametersFromQueryOptions(options) {
        if(!options) { return; }
        var parameters = {};
        if(typeof options.expand === "number") {
            parameters.expanddepth = options.expand;
        } else if(options.expand === true) {
            parameters.expanddepth = 1;
        }
        return parameters;
    }

    function findAll(collectionName, options) {
        var url = apiClient.url("/objects/:collection",
                                {collection: collectionName},
                                queryParametersFromQueryOptions(options));
        return sendFindRequest(url, collectionName, options);
    }

    function find(collectionName) {
        if(arguments.length < 2) { return; }
        var a1 = arguments[1];
        var a2 = arguments[2];
        if(typeof a1 === "string" && a1.indexOf("=") == -1 && a1.indexOf(" ") == -1) {
            return findById(collectionName, a1, a2);
        } else if(typeof a1 === "string") {
            return findByQueryString(collectionName, a1, a2);
        } else if(typeof a1 === "object" && typeof a1.queryString === "function") {
            return findByQueryObject(collectionName, a1, a2);
        } else if(typeof a1 === "object") {
            return findByPropertyValues(collectionName, a1, a2);
        } else if(typeof a1 === "function") {
            return findByQueryFunction(collectionName, a1, a2);
        }
    }

    function findById(collectionName, id, options) {
        var url = apiClient.url("/objects/:collection/:id",
                                {collection: collectionName, id: id},
                                queryParametersFromQueryOptions(options));

        return sendFindRequest(url, collectionName, options);
    }

    function findByQueryString(collectionName, queryString, options) {
        var url = apiClient.url("/objects/:collection?filter=:queryString",
                                {collection: collectionName, queryString: queryString},
                                queryParametersFromQueryOptions(options));
        return sendFindRequest(url, collectionName, options);
    }

    function findByQueryObject(collectionName, queryObject, options) {
        return findByQueryString(collectionName, queryObject.queryString(), options);
    }

    function findByQueryFunction(collectionName, queryFunction, options) {
        var queryObject = createQuery();
        queryFunction(queryObject);
        return findByQueryString(collectionName, queryObject.queryString(), options);
    }

    function findByPropertyValues(collectionName, propertyValues, options) {
        return findByQueryFunction(collectionName, function(query) {
            Object.keys(propertyValues).forEach(function(property) {
                var value = propertyValues[property];
                if(typeof value === "object" && typeof value.id === "string") {
                    query.relation(property).has(value);
                } else {
                    query.string(property).equals(value);
                }
            });
        }, options);
    }

    function search(collectionName) {
        var propertyValues = arguments[1];
        var options = arguments[2];
        if(arguments.length >= 3 && typeof arguments[1] === "string") {
            propertyValues = {};
            var searchString = arguments[1]
            Array.prototype.forEach.call(arguments[2], function(property) {
                propertyValues[property] = searchString;
            });
            if(arguments.length == 4) {
                options = arguments[3];
            }
        }
        return find(collectionName, function(query) {
            query.operator("or");
            Object.keys(propertyValues).forEach(function(property) {
                var value = propertyValues[property];
                query.string(property).contains(value);
            });
        }, options);
    }

    function sendFindRequest(url, collectionName, options) {
        var factory = createObject;
        if(options && options.factory) {
            factory = options.factory;
        } else if(options && options.plain) {
            factory = function(collectionName, properties, factory) {
                return properties;
            }
        }
        var defer = Q.defer();
        apiClient.request("get", url)
                 .then(function(result) {
                     if(Array.isArray(result.objects)) {
                         var objects = result.objects.map(function(properties) {
                             return factory(collectionName, properties, factory);
                         });
                         defer.resolve(objects);
                     } else {
                         defer.resolve(factory(collectionName, result, factory));
                     }
                 })
                 .fail(function(error) {
                     defer.reject(error);
                 });
        return defer.promise;
    }

    function createQuery(options) {
        return query(options);
    }

    function getObjectStatus(object) {
        var internal = object.internalObject;
        return internal ? internal.status : undefined;
    }

    function isUnsaved(object) {
        return getObjectStatus(object) === "new";
    }

    function isObject(object) {
        return object !== undefined && object !== null;
    }

    function copyValues(from, to) {
        if(from == null || to == null) {
            return;
        }
        var internalProperties = getInternalProperties(from.collectionName);
        Object.keys(from)
              .filter(function(key) {
                  return internalProperties.indexOf(key) == -1;
              })
              .forEach(function(key) {
                  to[key] = from[key];
              });
        Object.keys(from.internalObject.sysValues)
              .forEach(function(key) {
                  to.internalObject.sysValues[key] = from.internalObject.sysValues[key];
              });
    }

    function sortObjects(objects, order) {
        order = order || ""
        var dir = 1;
        var key = order;
        if(order.indexOf("-") == 0) {
            dir = -1;
            key = order.substr(1);
        }
        if(typeof objects.sort == "function") {
            objects.sort(function(o1, o2) {
                var d1 = o1[key];
                var d2 = o2[key];
                if(typeof d1 == "undefined") { d1 = 0; }
                if(typeof d2 == "undefined") { d2 = 0; }
                if(d1.getTime) { d1 = d1.getTime(); }
                if(d2.getTime) { d2 = d2.getTime(); }

                if(d1 > d2) { return dir; }
                if(d1 < d2) { return -dir; }
                return 0;
            });
        }
    }
}
