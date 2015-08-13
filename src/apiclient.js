
var extend = require("extend");
var reqwest = require("reqwest");
var Q = require("kew");
var encoding = require("./encoding");

module.exports = createApiClient;

function createApiClient(options) {
    var config = {};
    var sessionId = null;
    var urlToken = "";

    init();
    return {
        request: request,
        url: urlFromTemplate,
        errorFromXhr: errorFromXhr,
        formData: formData,
        sessionId: function (id) { sessionId = (arguments.length > 0 ? id : sessionId); return sessionId; },
        urlToken: function(token) { urlToken = (arguments.length > 0 ? token : urlToken); return urlToken },
        appKey: function() { return config.appKey; },
        baseUrl: function() { return config.baseUrl; }
    }

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
        options.processData = true;
        options.data = data;
        if(typeof data == "object" && !(data instanceof FormData)) {
            options.data = JSON.stringify(data);
        } else if(data instanceof FormData) {
            options.contentType = false;
            options.processData = false;
        }
        var promise = ajax(options);
        promise.fail(function(xhr) {
            if(config.log) {
                config.log("error", "Appstax Error: " + errorFromXhr(xhr).message);
            }
            return xhr;
        });
        promise.then(function(response) {
            var token = promise.request.getResponseHeader("x-appstax-urltoken");
            if(typeof token === "string") {
                urlToken = token;
            }
            return response;
        });
        return promise;
    }

    function ajax(options) {
        return reqwest(extend({
            type: "json",
            contentType: "application/json",
            headers: getRequestHeaders(),
            crossOrigin: true
        }, options));
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
                headers["x-appstax-sessionid"] = sessionId;
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

    function errorFromXhr(xhr) {
        var result = JSON.parse(xhr.responseText);
        return new Error(result.errorMessage)
    }

    function hasSession() {
        return sessionId !== null && sessionId !== undefined;
    }

    function formData() {
        return new FormData();
    }
}
