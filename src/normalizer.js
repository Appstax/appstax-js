


module.exports = create;

function create(objects) {

    var allObjects = {};

    return {
        normalize: normalize
    }

    function normalize(object, depth) {
        if(object === undefined || object === null || typeof object.id == "undefined") {
            return object;
        }

        depth = depth || 0;
        if(!allObjects[object.id]) {
            allObjects[object.id] = object;
        } else {
            updateValues(allObjects[object.id], object, depth);
        }
        updateRelations(allObjects[object.id], object, depth);
        return allObjects[object.id];
    }

    function updateValues(existing, object) {
        var existingTime = existing.updated.getTime();
        var objectTime = object.updated.getTime();
        if(isNaN(objectTime) || objectTime >= existingTime) {
            objects.copy(object, existing);
        }
    }

    function updateRelations(existing, object, depth) {
        if(depth >= 0) {
            Object.keys(object).forEach(function(key) {
                var property = object[key];
                if(typeof property != "undefined" && typeof property.collectionName != "undefined") {
                    existing[key] = normalize(property, depth - 1);
                } else if(typeof property == "string" && typeof allObjects[property] == "object") {
                    try {
                        existing[key] = allObjects[property];
                    } catch(error) {}
                } else if(Array.isArray(property)) {
                    property.forEach(function(x, i) {
                        if(typeof x.collectionName != "undefined") {
                            existing[key][i] = normalize(x, depth - 1);
                        } else if(typeof x == "string" && typeof allObjects[x] == "object") {
                            existing[key][i] = allObjects[x];
                        }
                    });
                }
            });
        }
    }



}

