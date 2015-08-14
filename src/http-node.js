
var unirest = require("unirest");
var extend  = require("extend");
var Q       = require("kew");

module.exports = {
    request: function(options) {
        var defer = Q.defer();

        var request = unirest(options.method, options.url);
        request.type(options.contentType);
        request.headers(options.headers);
        request.send(options.data);
        request.end(function(response) {
            if(response.statusType == 2) {
                defer.resolve({response:response.body});
            } else {
                defer.reject(errorFromResponse(response));
            }
        })

        return defer.promise;
    }
}

function errorFromResponse(response) {
    if(typeof response.body == "object") {
        return new Error(response.body.errorMessage);
    }
    return new Error();
}
