
var extend  = require("extend");
var Q       = require("q");
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
                crossOrigin: true,
                before: function(xhr) {
                    xhr.upload.addEventListener("progress", function(event) {
                        defer.notify({
                            percent: 100 * event.loaded / event.total,
                            loaded: event.loaded,
                            total: event.total
                        });
                    });
                }
            }, options))
            .then(function(response) {
                defer.notify({percent: 100});
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
    try {
        var result = JSON.parse(xhr.responseText);
        if(typeof result.errorMessage == "string") {
            return new Error(result.errorMessage);
        } else {
            return result;
        }
    } catch(e) {}
    return xhr.responseText;
}
