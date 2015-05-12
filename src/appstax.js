
var extend = require("extend");
var objects = require("./objects");
var users = require("./users");
var files = require("./files");
var collections = require("./collections");

var apiClient = require("./apiclient");
var config = {};
var defaults = {
    baseUrl: "https://appstax.com/api/latest/",
    log: log
}

function init(options) {
    if(typeof options === "string") {
        options = {appKey:options};
    }
    config = extend({}, defaults, config, options);
    if(config.log === false) { config.log = function() {} }
    apiClient.init({baseUrl: config.baseUrl, appKey: config.appKey, log: config.log});
    users.restoreSession();
}

function attachModules(modules, exports) {
    Object.keys(modules).forEach(function(name) {
        var mod = modules[name];
        module.exports[name] = mod;
        if(mod.__global) {
            Object.keys(mod.__global).forEach(function(globalName) {
                module.exports[globalName] = mod.__global[globalName];
            });
        }
    });
}

function log(level, message) {
    if(console && console[level]) {
        console[level].apply(console, Array.prototype.slice.call(arguments, 1));
    }
}

module.exports = {
    init: init
};
attachModules({objects:objects, users:users, files:files, collections:collections}, module.exports);
