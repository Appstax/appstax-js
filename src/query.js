
module.exports = function(options) {

    var operator = "and";
    var predicates = [];

    init();
    return {
        queryString: queryString,
        string: createStringPredicate,
        relation: createRelationPredicate,
        operator: function(o) { operator = o; }
    };

    function init() {
        if(typeof options === "string") {
            addPredicate(options);
        }
    }

    function addPredicate(predicate) {
        predicates.push(predicate);
    }

    function createStringPredicate(property) {
        return {
            equals: function(value) {
                addPredicate(format("$='$'", property, value));
            },
            contains: function(value) {
                addPredicate(format("$ like '%$%'", property, value));
            }
        }
    }

    function createRelationPredicate(property) {
        return {
            has: function(objectsOrIds) {
                var ids = _getQuotedIds(objectsOrIds);
                addPredicate(format("$ has ($)", property, ids.join(",")));
            }
        }
        function _getQuotedIds(objectsOrIds) {
            return [].concat(objectsOrIds).map(function(item) {
                return "'" + (item.id || item) + "'";
            });
        }
    }

    function queryString() {
        return predicates.join(format(" $ ", operator));
    }

    function format(template) {
        var parameters = Array.prototype.slice.call(arguments, 1);
        var result = template;
        parameters.forEach(function(parameter) {
            result = result.replace("$", parameter);
        });
        return result;
    }

};
