
module.exports = function(options) {

    var operator = "and";
    var predicates = [];

    init();
    return {
        queryString: queryString,
        string: createStringPredicate,
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
