
var reqwest = require("reqwest");
var extend  = require("extend");
var Q       = require("kew");

module.exports = {
    request: function(options) {
        var defer = Q.defer();

        reqwest(extend({
                type: "json",
                contentType: "application/json",
                crossOrigin: true
            }, options))
            .then(function(response) {
                defer.resolve(response);
            })
            .fail(function(xhr) {
                defer.reject(errorFromXhr(xhr));
            });

        return defer.promise;
    }
}

function errorFromXhr(xhr) {
    var result = JSON.parse(xhr.responseText);
    return new Error(result.errorMessage)
}
