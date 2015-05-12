
var collections = {};

function defineCollection(name, options) {
    collection = parseCollection(options);
    collections["$" + name] = collection;
}

function parseCollection(options) {
    var collection = {};
    Object.keys(options).forEach(function(key) {
        var column = {};
        if(typeof options[key] === "string") {
            column.type = options[key];
        }
        collection[key] = column;
    });
    return collection;
}

function getCollection(name) {
    return collections["$" + name];
}

function defaultValues(collectionName) {
    var collection = getCollection(collectionName);
    var values = {};
    if(collection) {
        Object.keys(collection).forEach(function(key) {
            values[key] = defaultValueForType(collection[key].type)
        });
    }
    return values;
}

function defaultValueForType(type) {
    switch(type) {
        case "string": return "";
        case "number": return 0;
        case "array": return [];
        case "file": return {sysDatatype:"file", filename:"", url:""};
    }
    return undefined;
}

module.exports = {
    defaultValues: defaultValues,
    __global: {
        collection: function(c, p) { defineCollection(c, p); return getCollection(c); }
    }
};
