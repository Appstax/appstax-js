
var extend    = require("extend");
var apiClient = require("./apiclient");
var query     = require("./query");
var files     = require("./files");
var Q         = require("kew");

var internalIds = [];
var internalObjects = {};
var internalProperties = ["collectionName", "id", "internalId", "save", "remove", "grant", "revoke"];
var prototype = {
    save: function() {
        return saveObject(this)
                .then(savePermissionChanges)
                .then(saveFileProperties);
    },
    remove: function() {
        return removeObject(this);
    },
    refresh: function() {
        return refreshObject(this);
    },
    grant: function(usernames, permissions) {
        if(typeof usernames === "string") {
            usernames = [usernames];
        }
        var internal = getInternalObject(this);
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
        var internal = getInternalObject(this);
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
    }
};

function createObject(collectionName, properties) {
    var internal = createInternalObject(collectionName);
    var object = Object.create(prototype);
    Object.defineProperty(object, "id", { get: function() { return internal.id; }, enumerable:true });
    Object.defineProperty(object, "internalId", { writable: false, value: internal.internalId, enumerable:true });
    Object.defineProperty(object, "collectionName", { get: function() { return internal.collectionName; }, enumerable:true });

    var filteredProperties = {};
    if(typeof properties === "object") {
        var sysValues = getInternalObject(object).sysValues;
        internal.setId(properties.sysObjectId);
        Object.keys(properties).forEach(function(key) {
            var value = properties[key];
            if(key.indexOf("sys") === 0) {
                if(key !== "sysPermissions") {
                    sysValues[key] = value;
                }
            } else if(typeof value.sysDatatype == "string") {
                filteredProperties[key] = createPropertyWithDataType(key, value, object);
            } else {
                filteredProperties[key] = value;
            }
        });
    }
    extend(object, filteredProperties);
    if(object.id !== null) {
        internal.status = "saved";
    }
    return object;
}

function createPropertyWithDataType(key, value, object) {
    switch(value.sysDatatype) {
        case "file": return files.create({
            filename: value.filename,
            url: files.urlForFile(object.collectionName, object.id, key, value.filename)
        });
    }
    return null;
}

function createInternalObject(collectionName) {
    var object = {
        id: null,
        internalId: createInternalId(),
        collectionName: collectionName,
        sysValues: {},
        status: "new",
        grants: [],
        revokes: [],
        setId: function(id) { if(id) { this.id = id; }},
        resetPermissions: function() { this.grants = []; this.revokes = []; }
    }
    internalObjects[object.internalId] = object;
    return object;
}

function getInternalObject(object) {
    return internalObjects[object.internalId];
}

function refreshObject(object) {
    var defer = Q.defer();
    var internal = getInternalObject(object);
    if(internal.status === "new") {
        defer.resolve(object);
    } else {
        findById(object.collectionName, object.id).then(function(updated) {
            extend(object, getProperties(updated));
            defer.resolve(object);
        });
    }
    return defer.promise;
}

function saveObject(object, defer) {
    var internal = getInternalObject(object)
    var defer = defer || Q.defer();
    if(internal.status === "saving") {
        setTimeout(function() {
            saveObject(object, defer);
        }, 100);
        return defer.promise;
    }

    var url, method, data;
    if(object.id == null) {
        url = apiClient.url("/objects/:collection", {collection: object.collectionName});
        method = "post";
        data = getDataForSaving(object)
    } else {
        url = apiClient.url("/objects/:collection/:id", {collection: object.collectionName, id: object.id});
        method = "put";
        data = getPropertiesForSaving(object);
    }
    internal.status = "saving";
    apiClient.request(method, url, data)
             .then(function(response) {
                 internal.setId(response.sysObjectId);
                 internal.status = "saved";
                 if(data instanceof FormData) {
                     getFiles(object).forEach(function(file) {
                         files.status(file, "saved");
                     });
                 }
                 defer.resolve(object);
             })
             .fail(function(xhr) {
                 internal.status = "error";
                 defer.reject(apiClient.errorFromXhr(xhr));
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
             .fail(function(xhr) {
                 defer.reject(apiClient.errorFromXhr(xhr));
             });
    return defer.promise;
}

function saveFileProperties(object) {
    var fileProperties = getFileProperties(object);
    var keys = Object.keys(fileProperties);
    var promises = [];
    keys.forEach(function(key) {
        var file = fileProperties[key];
        if(files.status(file) !== "saved") {
            var promise = files.saveFile(object.collectionName, object.id, key, file)
            promises.push(promise);
        }
    });
    return Q.all(promises).then(function() {
        return Q.resolve(object)
    });
}

function savePermissionChanges(object) {
    var defer = Q.defer();
    var url = apiClient.url("/permissions");
    var internal = getInternalObject(object);
    var grants = internal.grants.map(convertChange);
    var revokes = internal.revokes.map(convertChange);
    internal.resetPermissions();

    if(grants.length + revokes.length === 0) {
        defer.resolve(object);
    } else {
        var data = {grants:grants, revokes:revokes};
        apiClient.request("POST", url, data)
                 .then(function(response) {
                     defer.resolve(object);
                 })
                 .fail(function(xhr) {
                     defer.reject(apiClient.errorFromXhr(xhr));
                 });
    }
    return defer.promise;

    function convertChange(change) {
        return {
            sysObjectId: object.id,
            username: change.username,
            permissions: change.permissions
        }
    }
}

function getPropertyNames(object) {
    var keys = Object.keys(object);
    internalProperties.forEach(function(internal) {
        var index = keys.indexOf(internal);
        if(index >= 0) {
            keys.splice(index, 1);
        }
    });
    return keys;
}

function getProperties(object) {
    if(!isObject(object)) { return {}; }
    var data = {};
    getPropertyNames(object).forEach(function(key) {
        if(/^[a-zA-Z]/.test(key)) {
            data[key] = object[key];
        }
    });
    extend(data, getInternalObject(object).sysValues);
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
    var properties = getProperties(object);
    Object.keys(properties).forEach(function(key) {
        var property = properties[key];
        if(files.isFile(property)) {
            properties[key] = {
                sysDatatype: "file",
                filename: property.filename
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

function getFiles(object) {
    var fileProperties = getFileProperties(object);
    return Object.keys(fileProperties).map(function(key) {
        return fileProperties[key];
    });
}

function createInternalId() {
    var id = "internal-id-" + internalIds.length;
    internalIds.push(id);
    return id;
}

function findAll(collectionName) {
    var defer = Q.defer();
    var url = apiClient.url("/objects/:collection", {collection: collectionName});
    apiClient.request("get", url)
             .then(function(result) {
                 defer.resolve(createObjectsFromFindResult(collectionName, result));
             })
             .fail(function(xhr) {
                 defer.reject(apiClient.errorFromXhr(xhr));
             });
    return defer.promise;
}

function find(collectionName) {
    if(arguments.length < 2) { return; }
    var a1 = arguments[1];
    if(typeof a1 === "string" && a1.indexOf("=") == -1) {
        return findById(collectionName, a1);
    } else if(typeof a1 === "string") {
        return findByQueryString(collectionName, a1);
    } else if(typeof a1 === "object" && typeof a1.queryString === "function") {
        return findByQueryObject(collectionName, a1);
    } else if(typeof a1 === "object") {
        return findByPropertyValues(collectionName, a1);
    } else if(typeof a1 === "function") {
        return findByQueryFunction(collectionName, a1);
    }
}

function findById(collectionName, id) {
    var defer = Q.defer();
    var url = apiClient.url("/objects/:collection/:id", {collection: collectionName, id: id});
    apiClient.request("get", url)
             .then(function(result) {
                 defer.resolve(createObject(collectionName, result));
             })
             .fail(function(xhr) {
                 defer.reject(apiClient.errorFromXhr(xhr));
             });
    return defer.promise;
}

function findByQueryString(collectionName, queryString) {
    var defer = Q.defer();
    var url = apiClient.url("/objects/:collection?filter=:queryString",
                            {collection: collectionName, queryString: queryString});
    apiClient.request("get", url)
             .then(function(result) {
                 defer.resolve(createObjectsFromFindResult(collectionName, result));
             })
             .fail(function(xhr) {
                 defer.reject(apiClient.errorFromXhr(xhr));
             });;
    return defer.promise;
}

function findByQueryObject(collectionName, queryObject) {
    return findByQueryString(collectionName, queryObject.queryString());
}

function findByQueryFunction(collectionName, queryFunction) {
    var queryObject = createQuery();
    queryFunction(queryObject);
    return findByQueryString(collectionName, queryObject.queryString());
}

function findByPropertyValues(collectionName, propertyValues) {
    return findByQueryFunction(collectionName, function(query) {
        Object.keys(propertyValues).forEach(function(property) {
            var value = propertyValues[property];
            query.string(property).equals(value);
        });
    });
}

function search(collectionName) {
    var propertyValues = arguments[1];
    if(arguments.length === 3) {
        propertyValues = {};
        var searchString = arguments[1]
        Array.prototype.forEach.call(arguments[2], function(property) {
            propertyValues[property] = searchString;
        });
    }
    return find(collectionName, function(query) {
        query.operator("or");
        Object.keys(propertyValues).forEach(function(property) {
            var value = propertyValues[property];
            query.string(property).contains(value);
        });
    });
}

function createObjectsFromFindResult(collectionName, result) {
    return result.objects.map(function(properties) {
        return createObject(collectionName, properties);
    });
}

function createQuery(options) {
    return query(options);
}

function getObjectStatus(object) {
    var internal = getInternalObject(object);
    return internal ? internal.status : undefined;
}

function isObject(object) {
    return object !== undefined && object !== null;
}

module.exports = {
    create: createObject,
    createQuery: createQuery,
    getProperties: getProperties,
    __global: {
        object: createObject,
        status: getObjectStatus,
        findAll: findAll,
        find: find,
        search: search
    }
};
