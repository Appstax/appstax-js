
var extend      = require("extend");
var objects     = require("./objects");
var users       = require("./users");
var files       = require("./files");
var collections = require("./collections");
var apiClient   = require("./apiclient");
var request     = require("./request");
var channels    = require("./channels");

var defaults = {
    baseUrl: "https://appstax.com/api/latest/",
    log: log
}

var mainContext = createContext(defaults);
module.exports = mainContext;
module.exports.app = createContext;

function createContext(options) {
    var context = { init: init };
    var config  = {};

    init(options);
    return context;

    function init(options) {
        if(options == null) {
            return;
        }

        if(typeof options === "string") {
            options = {appKey:options};
        }
        config = extend({}, defaults, config, options);
        if(config.log === false) { config.log = function() {} }

        // init modules
        context.apiClient   = apiClient({baseUrl: config.baseUrl, appKey: config.appKey, log: config.log});
        context.files       = files(context.apiClient);
        context.collections = collections();
        context.objects     = objects(context.apiClient, context.files, context.collections);
        context.users       = users(context.apiClient, context.objects);
        context.request     = request(context.apiClient)
        context.channels    = channels(context.apiClient.socket());

        // expose shortcuts
        context.object      = context.objects.createObject;
        context.status      = context.objects.getObjectStatus;
        context.findAll     = context.objects.findAll;
        context.find        = context.objects.find;
        context.search      = context.objects.search;
        context.signup      = context.users.signup;
        context.login       = context.users.login;
        context.logout      = context.users.logout;
        context.currentUser = context.users.currentUser;
        context.collection  = context.collections.collection;
        context.file        = context.files.createFile;
        context.sessionId   = context.apiClient.sessionId;
        context.channel     = context.channels.getChannel;
    }
}

function log(level, message) {
    if(console && console[level]) {
        console[level].apply(console, Array.prototype.slice.call(arguments, 1));
    }
}

