
var extend  = require("extend");
var Q       = require("kew");
var reqwest = null;
if(typeof window == "object") {
    reqwest = require("reqwest");
}

module.exports = {
    request: function(options) {
        var defer = Q.defer();

        var r = reqwest(extend({
                type: "json",
                contentType: "application/json",
                crossOrigin: true
            }, options))
            .then(function(response) {
                defer.resolve({
                    response: response,
                    request: r.request
                });
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
