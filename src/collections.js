
module.exports = createCollectionsContext;

function createCollectionsContext() {
    var collections = {};

    return {
        defaultValues: defaultValues,
        get: getCollection,
        collection: function(c, p) { defineCollection(c, p); return getCollection(c); }
    }

    function defineCollection(name, options) {
        collection = parseCollection(options);
        collections["$" + name] = collection;
    }

    function parseCollection(options) {
        var collection = {};
        Object.keys(options).forEach(function(key) {
            var option = options[key];
            var column = {};
            if(typeof option === "string") {
                column.type = option;
            } else if(typeof option === "object" && typeof option.type === "string") {
                column.type = option.type;
            }
            if(column.type === "relation") {
                column.relation = option.relation;
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
                values[key] = defaultValueForColumn(collection[key])
            });
        }
        return values;
    }

    function defaultValueForColumn(column) {
        switch(column.type) {
            case "string": return "";
            case "number": return 0;
            case "array": return [];
            case "file": return {sysDatatype:"file", filename:"", url:""};
            case "relation": return {sysDatatype:"relation", sysRelationType:column.relation, sysObjectIds:[]};
        }
        return undefined;
    }
}
