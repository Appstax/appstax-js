
var extend  = require("extend");
var Q       = require("q");
var reqwest = require("reqwest");

module.exports = {
    request: function(options) {
        var defer = Q.defer();

        var r = reqwest(extend({
                contentType: "application/json",
                crossOrigin: (typeof document == "object"),
                before: function(xhr) {
                    if(xhr.upload && xhr.upload.addEventListener) {
                        xhr.upload.addEventListener("progress", progress);
                    } else {
                        xhr.upload.onprogress = progress;
                    }
                    function progress(event) {
                        defer.notify({
                            percent: 100 * event.loaded / event.total,
                            loaded: event.loaded,
                            total: event.total
                        });
                    };
                }
            }, options))
            .then(function(response) {
                if(response && typeof response.responseText == "string") {
                    response = response.responseText;
                }
                try {
                    response = JSON.parse(response);
                } catch(e) {}
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
    return new Error(xhr.responseText);
}
