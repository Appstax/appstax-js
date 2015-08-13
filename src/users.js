
var extend    = require("extend");
var Q         = require("kew");

module.exports = createUsersContext;

var internalProperties = ["id", "username", "save"];

function createUsersContext(apiClient, objects) {

    var currentUser = null;

    init();
    return {
        restoreSession: restoreSession,
        signup: signup,
        login: login,
        logout: logout,
        currentUser: function() { return currentUser; }
    };

    function init() {
        restoreSession();
    }

    function createUser(username, properties) {
        var allProperties = extend({}, properties, {sysUsername:username});
        var user = objects.create("users", allProperties);
        return user;
    }

    function signup(username, password, properties) {
        var defer = Q.defer();
        var url = apiClient.url("/users");
        var data = extend({sysUsername:username, sysPassword:password}, properties);
        apiClient.request("post", url, data)
                 .then(function(result) {
                     handleSignupOrLoginSuccess(username, result);
                     defer.resolve(currentUser);
                 })
                 .fail(function(xhr) {
                     defer.reject(apiClient.errorFromXhr(xhr));
                 });
        return defer.promise;
    }

    function login(username, password) {
        var defer = Q.defer();
        var url = apiClient.url("/sessions");
        apiClient.request("post", url, {sysUsername:username, sysPassword:password})
                 .then(function(result) {
                     handleSignupOrLoginSuccess(username, result);
                     defer.resolve(currentUser);
                 })
                 .fail(function(xhr) {
                     defer.reject(apiClient.errorFromXhr(xhr));
                 });
        return defer.promise;
    }

    function handleSignupOrLoginSuccess(username, result) {
        var id = result.user ? result.user.sysObjectId : null;
        storeSession(result.sysSessionId, username, id);
        currentUser = createUser(username, result.user);
    }

    function logout() {
        currentUser = null;
        apiClient.sessionId(null);
        localStorage.removeItem("appstax_session_" + apiClient.appKey());
    }

    function storeSession(sessionId, username, id) {
        apiClient.sessionId(sessionId);
        localStorage.setItem("appstax_session_" + apiClient.appKey(), JSON.stringify({
            username: username,
            sessionId: sessionId,
            userId: id
        }));
    }

    function restoreSession() {
        var sessionData = localStorage.getItem("appstax_session_" + apiClient.appKey());
        if(sessionData) {
            var session = JSON.parse(sessionData);
            apiClient.sessionId(session.sessionId);
            currentUser = createUser(session.username,
                                     {sysObjectId:session.userId});
        }
    }

    function getPropertyNames(user) {
        var keys = Object.keys(user);
        internalProperties.forEach(function(internal) {
            var index = keys.indexOf(internal);
            if(index >= 0) {
                keys.splice(index, 1);
            }
        });
        return keys;
    }

    function getProperties(user) {
        var data = {};
        getPropertyNames(user).forEach(function(key) {
            data[key] = user[key];
        });
        return data;
    }
}

