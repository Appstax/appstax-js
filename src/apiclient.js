
var extend   = require("extend");
var Q        = require("q");
var encoding = require("./encoding");
var socket = require("./socket");

var http = require("./http-browser");
if(typeof window != "object") {
    http = require("./http-node");
}

module.exports = createApiClient;

function createApiClient(options) {
    var config = {};
    var sessionId = null;
    var sessionIdProvider = function() { return sessionId; }
    var urlToken = "";
    var socketInstance;

    init();
    var self = {
        request: request,
        url: urlFromTemplate,
        formData: formData,
        sessionId: function (id) { setSessionId(id); return getSessionId(); },
        urlToken: function(token) { urlToken = (arguments.length > 0 ? token : urlToken); return urlToken },
        appKey: function() { return config.appKey; },
        baseUrl: function() { return config.baseUrl; },
        socket: getSocket
    }
    return self;

    function init() {
        config = extend({}, config, options);
        fixBaseUrl();
        try { config.appKeyBase32 = encoding.base32.encode(config.appKey); } catch(e) {}
    }

    function fixBaseUrl() {
        var u = config.baseUrl;
        if(typeof u == "string" && u.lastIndexOf("/") != u.length - 1) {
            config.baseUrl = u + "/";
        }
    }

    function urlFromTemplate(template, parameters, query) {
        var url = template;
        var queryString = "";
        if(url.indexOf("/") == 0) {
            url = url.substr(1);
        }
        if(typeof parameters == "object") {
            Object.keys(parameters).forEach(function(key) {
                url = url.replace(":" + key, uriEncode(parameters[key]));
            });
        }
        if(typeof query == "object") {
            queryString = Object.keys(query).map(function(key) {
                return key + "=" + uriEncode(query[key]);
            }).join("&");
        }
        if(queryString != "") {
            url += ((url.indexOf("?") == -1) ? "?" : "&") + queryString;
        }
        return config.baseUrl + url;
    }

    function uriEncode(string) {
        return encodeURIComponent(string).replace(/'/g, "%27");
    }

    function request(method, url, data) {
        var options = {};
        options.url = url;
        options.method = method
        options.contentType = "application/json";
        options.headers = getRequestHeaders();
        options.processData = true;
        options.data = data;
        if(typeof FormData != "undefined" && data instanceof FormData) {
            options.contentType = false;
            options.processData = false;
        } else if(typeof data == "object") {
            options.data = JSON.stringify(data);
        }

        var defer = Q.defer();
        http.request(options)
            .progress(function(progress) {
                defer.notify(progress);
            })
            .fail(function(error) {
                if(config.log) {
                    config.log("error", "Appstax Error: " + error.message);
                }
                defer.reject(error);
            })
            .then(function(result) {
                if(typeof result.request != "undefined") {
                    var token = result.request.getResponseHeader("x-appstax-urltoken");
                    if(typeof token === "string") {
                        urlToken = token;
                    }
                }
                defer.resolve(result.response);
            });
        return defer.promise;
    }

    function getRequestHeaders() {
        var h = {};
        addAppKeyHeader(h);
        addSessionIdHeader(h);
        addPreflightHeader(h);
        addUrlTokenHeader(h);
        return h;

        function addAppKeyHeader(headers) {
            headers["x-appstax-appkey"] = config.appKey;
        }
        function addSessionIdHeader(headers) {
            if(hasSession()) {
                headers["x-appstax-sessionid"] = getSessionId();
            }
        }
        function addPreflightHeader(headers) {
            var header = [
                "x-appstax-x",
                hasSession() ? "u" : "n",
                config.appKeyBase32
            ].join("");
            headers[header] = header;
        }
        function addUrlTokenHeader(headers) {
            headers["x-appstax-urltoken"] = "_";
        }
    }

    function hasSession() {
        var s = getSessionId();
        return s !== null && s !== undefined;
    }

    function setSessionId(s) {
        switch(typeof s) {
            case "string":
            case "object":
                sessionId = s;
                break;
            case "function":
                sessionIdProvider = s;
                break;
        }
    }

    function getSessionId() {
        return sessionIdProvider();
    }

    function getSocket() {
        if(!socketInstance) {
            socketInstance = socket(self);
        }
        return socketInstance;
    }

    function formData() {
        if(typeof FormData != "undefined") {
            return new FormData();
        } else {
            return null;
        }
    }
}
