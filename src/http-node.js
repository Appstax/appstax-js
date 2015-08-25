
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
                defer.resolve({response:parseResponseBody(response)});
            } else {
                defer.reject(errorFromResponse(response));
            }
        })

        return defer.promise;
    }
}

function parseResponseBody(response) {
    var body = response.body;
    if(typeof body == "string") {
        try {
            body = JSON.parse(response.body);
        } catch(e) {}
    }
    return body;
}

function errorFromResponse(response) {
    var message;
    if(typeof response.body == "object") {
        message = response.body.errorMessage;
    } else if(typeof response.body == "string") {
        var body = JSON.parse(response.body);
        message = body.errorMessage;
    }
    return new Error(message);
}
