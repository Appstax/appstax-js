!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.appstax=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
var hasOwn = Object.prototype.hasOwnProperty;
var toString = Object.prototype.toString;
var undefined;

var isPlainObject = function isPlainObject(obj) {
  "use strict";
  if (!obj || toString.call(obj) !== '[object Object]' || obj.nodeType || obj.setInterval) {
    return false;
  }

  var has_own_constructor = hasOwn.call(obj, 'constructor');
  var has_is_property_of_method = obj.constructor && obj.constructor.prototype && hasOwn.call(obj.constructor.prototype, 'isPrototypeOf');
  // Not own constructor property must be Object
  if (obj.constructor && !has_own_constructor && !has_is_property_of_method) {
    return false;
  }

  // Own properties are enumerated firstly, so to speed up,
  // if last one is own, then all properties are own.
  var key;
  for (key in obj) {}

  return key === undefined || hasOwn.call(obj, key);
};

module.exports = function extend() {
  "use strict";
  var options, name, src, copy, copyIsArray, clone,
    target = arguments[0],
    i = 1,
    length = arguments.length,
    deep = false;

  // Handle a deep copy situation
  if (typeof target === "boolean") {
    deep = target;
    target = arguments[1] || {};
    // skip the boolean and the target
    i = 2;
  } else if (typeof target !== "object" && typeof target !== "function" || target == undefined) {
      target = {};
  }

  for (; i < length; ++i) {
    // Only deal with non-null/undefined values
    if ((options = arguments[i]) != null) {
      // Extend the base object
      for (name in options) {
        src = target[name];
        copy = options[name];

        // Prevent never-ending loop
        if (target === copy) {
          continue;
        }

        // Recurse if we're merging plain objects or arrays
        if (deep && copy && (isPlainObject(copy) || (copyIsArray = Array.isArray(copy)))) {
          if (copyIsArray) {
            copyIsArray = false;
            clone = src && Array.isArray(src) ? src : [];
          } else {
            clone = src && isPlainObject(src) ? src : {};
          }

          // Never move original objects, clone them
          target[name] = extend(deep, clone, copy);

        // Don't bring in undefined values
        } else if (copy !== undefined) {
          target[name] = copy;
        }
      }
    }
  }

  // Return the modified object
  return target;
};


},{}],2:[function(_dereq_,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],3:[function(_dereq_,module,exports){
(function (process){

/**
 * An object representing a "promise" for a future value
 *
 * @param {?function(T, ?)=} onSuccess a function to handle successful
 *     resolution of this promise
 * @param {?function(!Error, ?)=} onFail a function to handle failed
 *     resolution of this promise
 * @constructor
 * @template T
 */
function Promise(onSuccess, onFail) {
  this.promise = this
  this._isPromise = true
  this._successFn = onSuccess
  this._failFn = onFail
  this._scope = this
  this._boundArgs = null
  this._hasContext = false
  this._nextContext = undefined
  this._currentContext = undefined
}

/**
 * Specify that the current promise should have a specified context
 * @param  {*} context context
 * @private
 */
Promise.prototype._useContext = function (context) {
  this._nextContext = this._currentContext = context
  this._hasContext = true
  return this
}

Promise.prototype.clearContext = function () {
  this._hasContext = false
  this._nextContext = undefined
  return this
}

/**
 * Set the context for all promise handlers to follow
 *
 * NOTE(dpup): This should be considered deprecated.  It does not do what most
 * people would expect.  The context will be passed as a second argument to all
 * subsequent callbacks.
 *
 * @param {*} context An arbitrary context
 */
Promise.prototype.setContext = function (context) {
  this._nextContext = context
  this._hasContext = true
  return this
}

/**
 * Get the context for a promise
 * @return {*} the context set by setContext
 */
Promise.prototype.getContext = function () {
  return this._nextContext
}

/**
 * Resolve this promise with a specified value
 *
 * @param {*=} data
 */
Promise.prototype.resolve = function (data) {
  if (this._error || this._hasData) throw new Error("Unable to resolve or reject the same promise twice")

  var i
  if (data && isPromise(data)) {
    this._child = data
    if (this._promises) {
      for (i = 0; i < this._promises.length; i += 1) {
        data._chainPromise(this._promises[i])
      }
      delete this._promises
    }

    if (this._onComplete) {
      for (i = 0; i < this._onComplete.length; i+= 1) {
        data.fin(this._onComplete[i])
      }
      delete this._onComplete
    }
  } else if (data && isPromiseLike(data)) {
    data.then(
      function(data) { this.resolve(data) }.bind(this),
      function(err) { this.reject(err) }.bind(this)
    )
  } else {
    this._hasData = true
    this._data = data

    if (this._onComplete) {
      for (i = 0; i < this._onComplete.length; i++) {
        this._onComplete[i]()
      }
    }

    if (this._promises) {
      for (i = 0; i < this._promises.length; i += 1) {
        this._promises[i]._withInput(data)
      }
      delete this._promises
    }
  }
}

/**
 * Reject this promise with an error
 *
 * @param {!Error} e
 */
Promise.prototype.reject = function (e) {
  if (this._error || this._hasData) throw new Error("Unable to resolve or reject the same promise twice")

  var i
  this._error = e

  if (this._ended) {
    process.nextTick(function onPromiseThrow() {
      throw e
    })
  }

  if (this._onComplete) {
    for (i = 0; i < this._onComplete.length; i++) {
      this._onComplete[i]()
    }
  }

  if (this._promises) {
    for (i = 0; i < this._promises.length; i += 1) {
      this._promises[i]._withError(e)
    }
    delete this._promises
  }
}

/**
 * Provide a callback to be called whenever this promise successfully
 * resolves. Allows for an optional second callback to handle the failure
 * case.
 *
 * @param {?function(this:void, T, ?): RESULT|undefined} onSuccess
 * @param {?function(this:void, !Error, ?): RESULT=} onFail
 * @return {!Promise.<RESULT>} returns a new promise with the output of the onSuccess or
 *     onFail handler
 * @template RESULT
 */
Promise.prototype.then = function (onSuccess, onFail) {
  var promise = new Promise(onSuccess, onFail)
  if (this._nextContext) promise._useContext(this._nextContext)

  if (this._child) this._child._chainPromise(promise)
  else this._chainPromise(promise)

  return promise
}

/**
 * Provide a callback to be called whenever this promise successfully
 * resolves. The callback will be executed in the context of the provided scope.
 *
 * @param {function(this:SCOPE, T, ?): RESULT} onSuccess
 * @param {SCOPE} scope Object whose context callback will be executed in.
 * @param {...*} var_args Additional arguments to be passed to the promise callback.
 * @return {!Promise.<RESULT>} returns a new promise with the output of the onSuccess
 * @template SCOPE, RESULT
 */
Promise.prototype.thenBound = function (onSuccess, scope, var_args) {
  var promise = new Promise(onSuccess)
  if (this._nextContext) promise._useContext(this._nextContext)

  promise._scope = scope
  if (arguments.length > 2) {
    promise._boundArgs = Array.prototype.slice.call(arguments, 2)
  }

  // Chaining must happen after setting args and scope since it may fire callback.
  if (this._child) this._child._chainPromise(promise)
  else this._chainPromise(promise)

  return promise
}

/**
 * Provide a callback to be called whenever this promise is rejected
 *
 * @param {function(this:void, !Error, ?)} onFail
 * @return {!Promise.<T>} returns a new promise with the output of the onFail handler
 */
Promise.prototype.fail = function (onFail) {
  return this.then(null, onFail)
}

/**
 * Provide a callback to be called whenever this promise is rejected.
 * The callback will be executed in the context of the provided scope.
 *
 * @param {function(this:SCOPE, Error, ?)} onFail
 * @param {SCOPE} scope Object whose context callback will be executed in.
 * @param {...?} var_args
 * @return {!Promise.<T>} returns a new promise with the output of the onSuccess
 * @template SCOPE
 */
Promise.prototype.failBound = function (onFail, scope, var_args) {
  var promise = new Promise(null, onFail)
  if (this._nextContext) promise._useContext(this._nextContext)

  promise._scope = scope
  if (arguments.length > 2) {
    promise._boundArgs = Array.prototype.slice.call(arguments, 2)
  }

  // Chaining must happen after setting args and scope since it may fire callback.
  if (this._child) this._child._chainPromise(promise)
  else this._chainPromise(promise)

  return promise
}

/**
 * Provide a callback to be called whenever this promise is either resolved
 * or rejected.
 *
 * @param {function()} onComplete
 * @return {!Promise.<T>} returns the current promise
 */
Promise.prototype.fin = function (onComplete) {
  if (this._hasData || this._error) {
    onComplete()
    return this
  }

  if (this._child) {
    this._child.fin(onComplete)
  } else {
    if (!this._onComplete) this._onComplete = [onComplete]
    else this._onComplete.push(onComplete)
  }

  return this
}

/**
 * Mark this promise as "ended". If the promise is rejected, this will throw an
 * error in whatever scope it happens to be in
 *
 * @return {!Promise.<T>} returns the current promise
 * @deprecated Prefer done(), because it's consistent with Q.
 */
Promise.prototype.end = function () {
  this._end()
  return this
}


/**
 * Mark this promise as "ended".
 * @private
 */
Promise.prototype._end = function () {
  if (this._error) {
    throw this._error
  }
  this._ended = true
  return this
}

/**
 * Close the promise. Any errors after this completes will be thrown to the global handler.
 *
 * @param {?function(this:void, T, ?)=} onSuccess a function to handle successful
 *     resolution of this promise
 * @param {?function(this:void, !Error, ?)=} onFailure a function to handle failed
 *     resolution of this promise
 * @return {void}
 */
Promise.prototype.done = function (onSuccess, onFailure) {
  var self = this
  if (onSuccess || onFailure) {
    self = self.then(onSuccess, onFailure)
  }
  self._end()
}

/**
 * Return a new promise that behaves the same as the current promise except
 * that it will be rejected if the current promise does not get fulfilled
 * after a certain amount of time.
 *
 * @param {number} timeoutMs The timeout threshold in msec
 * @param {string=} timeoutMsg error message
 * @return {!Promise.<T>} a new promise with timeout
 */
 Promise.prototype.timeout = function (timeoutMs, timeoutMsg) {
  var deferred = new Promise()
  var isTimeout = false

  var timeout = setTimeout(function() {
    deferred.reject(new Error(timeoutMsg || 'Promise timeout after ' + timeoutMs + ' ms.'))
    isTimeout = true
  }, timeoutMs)

  this.then(function (data) {
    if (!isTimeout) {
      clearTimeout(timeout)
      deferred.resolve(data)
    }
  },
  function (err) {
    if (!isTimeout) {
      clearTimeout(timeout)
      deferred.reject(err)
    }
  })

  return deferred.promise
}

/**
 * Attempt to resolve this promise with the specified input
 *
 * @param {*} data the input
 */
Promise.prototype._withInput = function (data) {
  if (this._successFn) {
    try {
      this.resolve(this._call(this._successFn, [data, this._currentContext]))
    } catch (e) {
      this.reject(e)
    }
  } else this.resolve(data)

  // context is no longer needed
  delete this._currentContext
}

/**
 * Attempt to reject this promise with the specified error
 *
 * @param {!Error} e
 * @private
 */
Promise.prototype._withError = function (e) {
  if (this._failFn) {
    try {
      this.resolve(this._call(this._failFn, [e, this._currentContext]))
    } catch (thrown) {
      this.reject(thrown)
    }
  } else this.reject(e)

  // context is no longer needed
  delete this._currentContext
}

/**
 * Calls a function in the correct scope, and includes bound arguments.
 * @param {Function} fn
 * @param {Array} args
 * @return {*}
 * @private
 */
Promise.prototype._call = function (fn, args) {
  if (this._boundArgs) {
    args = this._boundArgs.concat(args)
  }
  return fn.apply(this._scope, args)
}

/**
 * Chain a promise to the current promise
 *
 * @param {!Promise} promise the promise to chain
 * @private
 */
Promise.prototype._chainPromise = function (promise) {
  var i
  if (this._hasContext) promise._useContext(this._nextContext)

  if (this._child) {
    this._child._chainPromise(promise)
  } else if (this._hasData) {
    promise._withInput(this._data)
  } else if (this._error) {
    promise._withError(this._error)
  } else if (!this._promises) {
    this._promises = [promise]
  } else {
    this._promises.push(promise)
  }
}

/**
 * Utility function used for creating a node-style resolver
 * for deferreds
 *
 * @param {!Promise} deferred a promise that looks like a deferred
 * @param {Error=} err an optional error
 * @param {*=} data optional data
 */
function resolver(deferred, err, data) {
  if (err) deferred.reject(err)
  else deferred.resolve(data)
}

/**
 * Creates a node-style resolver for a deferred by wrapping
 * resolver()
 *
 * @return {function(?Error, *)} node-style callback
 */
Promise.prototype.makeNodeResolver = function () {
  return resolver.bind(null, this)
}

/**
 * Return true iff the given object is a promise of this library.
 *
 * Because kew's API is slightly different than other promise libraries,
 * it's important that we have a test for its promise type. If you want
 * to test for a more general A+ promise, you should do a cap test for
 * the features you want.
 *
 * @param {*} obj The object to test
 * @return {boolean} Whether the object is a promise
 */
function isPromise(obj) {
  return !!obj._isPromise
}

/**
 * Return true iff the given object is a promise-like object, e.g. appears to
 * implement Promises/A+ specification
 *
 * @param {*} obj The object to test
 * @return {boolean} Whether the object is a promise-like object
 */
function isPromiseLike(obj) {
  return typeof obj === 'object' && typeof obj.then === 'function'
}

/**
 * Static function which creates and resolves a promise immediately
 *
 * @param {T} data data to resolve the promise with
 * @return {!Promise.<T>}
 * @template T
 */
function resolve(data) {
  var promise = new Promise()
  promise.resolve(data)
  return promise
}

/**
 * Static function which creates and rejects a promise immediately
 *
 * @param {!Error} e error to reject the promise with
 * @return {!Promise}
 */
function reject(e) {
  var promise = new Promise()
  promise.reject(e)
  return promise
}

/**
 * Replace an element in an array with a new value. Used by .all() to
 * call from .then()
 *
 * @param {!Array} arr
 * @param {number} idx
 * @param {*} val
 * @return {*} the val that's being injected into the array
 */
function replaceEl(arr, idx, val) {
  arr[idx] = val
  return val
}

/**
 * Replace an element in an array as it is resolved with its value.
 * Used by .allSettled().
 *
 * @param {!Array} arr
 * @param {number} idx
 * @param {*} value The value from a resolved promise.
 * @return {*} the data that's being passed in
 */
function replaceElFulfilled(arr, idx, value) {
  arr[idx] = {
    state: 'fulfilled',
    value: value
  }
  return value
}

/**
 * Replace an element in an array as it is rejected with the reason.
 * Used by .allSettled().
 *
 * @param {!Array} arr
 * @param {number} idx
 * @param {*} reason The reason why the original promise is rejected
 * @return {*} the data that's being passed in
 */
function replaceElRejected(arr, idx, reason) {
  arr[idx] = {
    state: 'rejected',
    reason: reason
  }
  return reason
}

/**
 * Takes in an array of promises or literals and returns a promise which returns
 * an array of values when all have resolved. If any fail, the promise fails.
 *
 * @param {!Array.<!Promise>} promises
 * @return {!Promise.<!Array>}
 */
function all(promises) {
  if (arguments.length != 1 || !Array.isArray(promises)) {
    promises = Array.prototype.slice.call(arguments, 0)
  }
  if (!promises.length) return resolve([])

  var outputs = []
  var finished = false
  var promise = new Promise()
  var counter = promises.length

  for (var i = 0; i < promises.length; i += 1) {
    if (!promises[i] || !isPromiseLike(promises[i])) {
      outputs[i] = promises[i]
      counter -= 1
    } else {
      promises[i].then(replaceEl.bind(null, outputs, i))
      .then(function decrementAllCounter() {
        counter--
        if (!finished && counter === 0) {
          finished = true
          promise.resolve(outputs)
        }
      }, function onAllError(e) {
        if (!finished) {
          finished = true
          promise.reject(e)
        }
      })
    }
  }

  if (counter === 0 && !finished) {
    finished = true
    promise.resolve(outputs)
  }

  return promise
}

/**
 * Takes in an array of promises or values and returns a promise that is
 * fulfilled with an array of state objects when all have resolved or
 * rejected. If a promise is resolved, its corresponding state object is
 * {state: 'fulfilled', value: Object}; whereas if a promise is rejected, its
 * corresponding state object is {state: 'rejected', reason: Object}.
 *
 * @param {!Array} promises or values
 * @return {!Promise.<!Array>} Promise fulfilled with state objects for each input
 */
function allSettled(promises) {
  if (!Array.isArray(promises)) {
    throw Error('The input to "allSettled()" should be an array of Promise or values')
  }
  if (!promises.length) return resolve([])

  var outputs = []
  var promise = new Promise()
  var counter = promises.length

  for (var i = 0; i < promises.length; i += 1) {
    if (!promises[i] || !isPromiseLike(promises[i])) {
      replaceElFulfilled(outputs, i, promises[i])
      if ((--counter) === 0) promise.resolve(outputs)
    } else {
      promises[i]
        .then(replaceElFulfilled.bind(null, outputs, i), replaceElRejected.bind(null, outputs, i))
        .then(function () {
          if ((--counter) === 0) promise.resolve(outputs)
        })
    }
  }

  return promise
}

/**
 * Create a new Promise which looks like a deferred
 *
 * @return {!Promise}
 */
function defer() {
  return new Promise()
}

/**
 * Return a promise which will wait a specified number of ms to resolve
 *
 * @param {*} delayMsOrVal A delay (in ms) if this takes one argument, or ther
 *     return value if it takes two.
 * @param {number=} opt_delayMs
 * @return {!Promise}
 */
function delay(delayMsOrVal, opt_delayMs) {
  var returnVal = undefined
  var delayMs = delayMsOrVal
  if (typeof opt_delayMs != 'undefined') {
    delayMs = opt_delayMs
    returnVal = delayMsOrVal
  }

  if (typeof delayMs != 'number') {
    throw new Error('Bad delay value ' + delayMs)
  }

  var defer = new Promise()
  setTimeout(function onDelay() {
    defer.resolve(returnVal)
  }, delayMs)
  return defer
}

/**
 * Returns a promise that has the same result as `this`, but fulfilled
 * after at least ms milliseconds
 * @param {number} ms
 */
Promise.prototype.delay = function (ms) {
  return this.then(function (val) {
    return delay(val, ms)
  })
}

/**
 * Return a promise which will evaluate the function fn in a future turn with
 * the provided args
 *
 * @param {function(...)} fn
 * @param {...*} var_args a variable number of arguments
 * @return {!Promise}
 */
function fcall(fn, var_args) {
  var rootArgs = Array.prototype.slice.call(arguments, 1)
  var defer = new Promise()
  process.nextTick(function onNextTick() {
    try {
      defer.resolve(fn.apply(undefined, rootArgs))
    } catch (e) {
      defer.reject(e)
    }
  })
  return defer
}


/**
 * Returns a promise that will be invoked with the result of a node style
 * callback. All args to fn should be given except for the final callback arg
 *
 * @param {function(...)} fn
 * @param {...*} var_args a variable number of arguments
 * @return {!Promise}
 */
function nfcall(fn, var_args) {
  // Insert an undefined argument for scope and let bindPromise() do the work.
  var args = Array.prototype.slice.call(arguments, 0)
  args.splice(1, 0, undefined)
  return bindPromise.apply(undefined, args)()
}


/**
 * Binds a function to a scope with an optional number of curried arguments. Attaches
 * a node style callback as the last argument and returns a promise
 *
 * @param {function(...)} fn
 * @param {Object} scope
 * @param {...*} var_args a variable number of arguments
 * @return {function(...)}: !Promise}
 */
function bindPromise(fn, scope, var_args) {
  var rootArgs = Array.prototype.slice.call(arguments, 2)
  return function onBoundPromise(var_args) {
    var defer = new Promise()
    try {
      fn.apply(scope, rootArgs.concat(Array.prototype.slice.call(arguments, 0), defer.makeNodeResolver()))
    } catch (e) {
      defer.reject(e)
    }
    return defer
  }
}

module.exports = {
    all: all
  , bindPromise: bindPromise
  , defer: defer
  , delay: delay
  , fcall: fcall
  , isPromise: isPromise
  , isPromiseLike: isPromiseLike
  , nfcall: nfcall
  , resolve: resolve
  , reject: reject
  , allSettled: allSettled
  , Promise: Promise
}

}).call(this,_dereq_("1YiZ5S"))
},{"1YiZ5S":2}],4:[function(_dereq_,module,exports){
/*!
  * Reqwest! A general purpose XHR connection manager
  * license MIT (c) Dustin Diaz 2014
  * https://github.com/ded/reqwest
  */

!function (name, context, definition) {
  if (typeof module != 'undefined' && module.exports) module.exports = definition()
  else if (typeof define == 'function' && define.amd) define(definition)
  else context[name] = definition()
}('reqwest', this, function () {

  var win = window
    , doc = document
    , httpsRe = /^http/
    , protocolRe = /(^\w+):\/\//
    , twoHundo = /^(20\d|1223)$/ //http://stackoverflow.com/questions/10046972/msie-returns-status-code-of-1223-for-ajax-request
    , byTag = 'getElementsByTagName'
    , readyState = 'readyState'
    , contentType = 'Content-Type'
    , requestedWith = 'X-Requested-With'
    , head = doc[byTag]('head')[0]
    , uniqid = 0
    , callbackPrefix = 'reqwest_' + (+new Date())
    , lastValue // data stored by the most recent JSONP callback
    , xmlHttpRequest = 'XMLHttpRequest'
    , xDomainRequest = 'XDomainRequest'
    , noop = function () {}

    , isArray = typeof Array.isArray == 'function'
        ? Array.isArray
        : function (a) {
            return a instanceof Array
          }

    , defaultHeaders = {
          'contentType': 'application/x-www-form-urlencoded'
        , 'requestedWith': xmlHttpRequest
        , 'accept': {
              '*':  'text/javascript, text/html, application/xml, text/xml, */*'
            , 'xml':  'application/xml, text/xml'
            , 'html': 'text/html'
            , 'text': 'text/plain'
            , 'json': 'application/json, text/javascript'
            , 'js':   'application/javascript, text/javascript'
          }
      }

    , xhr = function(o) {
        // is it x-domain
        if (o['crossOrigin'] === true) {
          var xhr = win[xmlHttpRequest] ? new XMLHttpRequest() : null
          if (xhr && 'withCredentials' in xhr) {
            return xhr
          } else if (win[xDomainRequest]) {
            return new XDomainRequest()
          } else {
            throw new Error('Browser does not support cross-origin requests')
          }
        } else if (win[xmlHttpRequest]) {
          return new XMLHttpRequest()
        } else {
          return new ActiveXObject('Microsoft.XMLHTTP')
        }
      }
    , globalSetupOptions = {
        dataFilter: function (data) {
          return data
        }
      }

  function succeed(r) {
    var protocol = protocolRe.exec(r.url);
    protocol = (protocol && protocol[1]) || window.location.protocol;
    return httpsRe.test(protocol) ? twoHundo.test(r.request.status) : !!r.request.response;
  }

  function handleReadyState(r, success, error) {
    return function () {
      // use _aborted to mitigate against IE err c00c023f
      // (can't read props on aborted request objects)
      if (r._aborted) return error(r.request)
      if (r.request && r.request[readyState] == 4) {
        r.request.onreadystatechange = noop
        if (succeed(r)) success(r.request)
        else
          error(r.request)
      }
    }
  }

  function setHeaders(http, o) {
    var headers = o['headers'] || {}
      , h

    headers['Accept'] = headers['Accept']
      || defaultHeaders['accept'][o['type']]
      || defaultHeaders['accept']['*']

    var isAFormData = o['data'] instanceof FormData;
    // breaks cross-origin requests with legacy browsers
    if (!o['crossOrigin'] && !headers[requestedWith]) headers[requestedWith] = defaultHeaders['requestedWith']
    if (!headers[contentType] && !isAFormData) headers[contentType] = o['contentType'] || defaultHeaders['contentType']
    for (h in headers)
      headers.hasOwnProperty(h) && 'setRequestHeader' in http && http.setRequestHeader(h, headers[h])
  }

  function setCredentials(http, o) {
    if (typeof o['withCredentials'] !== 'undefined' && typeof http.withCredentials !== 'undefined') {
      http.withCredentials = !!o['withCredentials']
    }
  }

  function generalCallback(data) {
    lastValue = data
  }

  function urlappend (url, s) {
    return url + (/\?/.test(url) ? '&' : '?') + s
  }

  function handleJsonp(o, fn, err, url) {
    var reqId = uniqid++
      , cbkey = o['jsonpCallback'] || 'callback' // the 'callback' key
      , cbval = o['jsonpCallbackName'] || reqwest.getcallbackPrefix(reqId)
      , cbreg = new RegExp('((^|\\?|&)' + cbkey + ')=([^&]+)')
      , match = url.match(cbreg)
      , script = doc.createElement('script')
      , loaded = 0
      , isIE10 = navigator.userAgent.indexOf('MSIE 10.0') !== -1

    if (match) {
      if (match[3] === '?') {
        url = url.replace(cbreg, '$1=' + cbval) // wildcard callback func name
      } else {
        cbval = match[3] // provided callback func name
      }
    } else {
      url = urlappend(url, cbkey + '=' + cbval) // no callback details, add 'em
    }

    win[cbval] = generalCallback

    script.type = 'text/javascript'
    script.src = url
    script.async = true
    if (typeof script.onreadystatechange !== 'undefined' && !isIE10) {
      // need this for IE due to out-of-order onreadystatechange(), binding script
      // execution to an event listener gives us control over when the script
      // is executed. See http://jaubourg.net/2010/07/loading-script-as-onclick-handler-of.html
      script.htmlFor = script.id = '_reqwest_' + reqId
    }

    script.onload = script.onreadystatechange = function () {
      if ((script[readyState] && script[readyState] !== 'complete' && script[readyState] !== 'loaded') || loaded) {
        return false
      }
      script.onload = script.onreadystatechange = null
      script.onclick && script.onclick()
      // Call the user callback with the last value stored and clean up values and scripts.
      fn(lastValue)
      lastValue = undefined
      head.removeChild(script)
      loaded = 1
    }

    // Add the script to the DOM head
    head.appendChild(script)

    // Enable JSONP timeout
    return {
      abort: function () {
        script.onload = script.onreadystatechange = null
        err({}, 'Request is aborted: timeout', {})
        lastValue = undefined
        head.removeChild(script)
        loaded = 1
      }
    }
  }

  function getRequest(fn, err) {
    var o = this.o
      , method = (o['method'] || 'GET').toUpperCase()
      , url = typeof o === 'string' ? o : o['url']
      // convert non-string objects to query-string form unless o['processData'] is false
      , data = (o['processData'] !== false && o['data'] && typeof o['data'] !== 'string')
        ? reqwest.toQueryString(o['data'])
        : (o['data'] || null)
      , http
      , sendWait = false

    // if we're working on a GET request and we have data then we should append
    // query string to end of URL and not post data
    if ((o['type'] == 'jsonp' || method == 'GET') && data) {
      url = urlappend(url, data)
      data = null
    }

    if (o['type'] == 'jsonp') return handleJsonp(o, fn, err, url)

    // get the xhr from the factory if passed
    // if the factory returns null, fall-back to ours
    http = (o.xhr && o.xhr(o)) || xhr(o)

    http.open(method, url, o['async'] === false ? false : true)
    setHeaders(http, o)
    setCredentials(http, o)
    if (win[xDomainRequest] && http instanceof win[xDomainRequest]) {
        http.onload = fn
        http.onerror = err
        // NOTE: see
        // http://social.msdn.microsoft.com/Forums/en-US/iewebdevelopment/thread/30ef3add-767c-4436-b8a9-f1ca19b4812e
        http.onprogress = function() {}
        sendWait = true
    } else {
      http.onreadystatechange = handleReadyState(this, fn, err)
    }
    o['before'] && o['before'](http)
    if (sendWait) {
      setTimeout(function () {
        http.send(data)
      }, 200)
    } else {
      http.send(data)
    }
    return http
  }

  function Reqwest(o, fn) {
    this.o = o
    this.fn = fn

    init.apply(this, arguments)
  }

  function setType(header) {
    // json, javascript, text/plain, text/html, xml
    if (header.match('json')) return 'json'
    if (header.match('javascript')) return 'js'
    if (header.match('text')) return 'html'
    if (header.match('xml')) return 'xml'
  }

  function init(o, fn) {

    this.url = typeof o == 'string' ? o : o['url']
    this.timeout = null

    // whether request has been fulfilled for purpose
    // of tracking the Promises
    this._fulfilled = false
    // success handlers
    this._successHandler = function(){}
    this._fulfillmentHandlers = []
    // error handlers
    this._errorHandlers = []
    // complete (both success and fail) handlers
    this._completeHandlers = []
    this._erred = false
    this._responseArgs = {}

    var self = this

    fn = fn || function () {}

    if (o['timeout']) {
      this.timeout = setTimeout(function () {
        self.abort()
      }, o['timeout'])
    }

    if (o['success']) {
      this._successHandler = function () {
        o['success'].apply(o, arguments)
      }
    }

    if (o['error']) {
      this._errorHandlers.push(function () {
        o['error'].apply(o, arguments)
      })
    }

    if (o['complete']) {
      this._completeHandlers.push(function () {
        o['complete'].apply(o, arguments)
      })
    }

    function complete (resp) {
      o['timeout'] && clearTimeout(self.timeout)
      self.timeout = null
      while (self._completeHandlers.length > 0) {
        self._completeHandlers.shift()(resp)
      }
    }

    function success (resp) {
      var type = o['type'] || resp && setType(resp.getResponseHeader('Content-Type')) // resp can be undefined in IE
      resp = (type !== 'jsonp') ? self.request : resp
      // use global data filter on response text
      var filteredResponse = globalSetupOptions.dataFilter(resp.responseText, type)
        , r = filteredResponse
      try {
        resp.responseText = r
      } catch (e) {
        // can't assign this in IE<=8, just ignore
      }
      if (r) {
        switch (type) {
        case 'json':
          try {
            resp = win.JSON ? win.JSON.parse(r) : eval('(' + r + ')')
          } catch (err) {
            return error(resp, 'Could not parse JSON in response', err)
          }
          break
        case 'js':
          resp = eval(r)
          break
        case 'html':
          resp = r
          break
        case 'xml':
          resp = resp.responseXML
              && resp.responseXML.parseError // IE trololo
              && resp.responseXML.parseError.errorCode
              && resp.responseXML.parseError.reason
            ? null
            : resp.responseXML
          break
        }
      }

      self._responseArgs.resp = resp
      self._fulfilled = true
      fn(resp)
      self._successHandler(resp)
      while (self._fulfillmentHandlers.length > 0) {
        resp = self._fulfillmentHandlers.shift()(resp)
      }

      complete(resp)
    }

    function error(resp, msg, t) {
      resp = self.request
      self._responseArgs.resp = resp
      self._responseArgs.msg = msg
      self._responseArgs.t = t
      self._erred = true
      while (self._errorHandlers.length > 0) {
        self._errorHandlers.shift()(resp, msg, t)
      }
      complete(resp)
    }

    this.request = getRequest.call(this, success, error)
  }

  Reqwest.prototype = {
    abort: function () {
      this._aborted = true
      this.request.abort()
    }

  , retry: function () {
      init.call(this, this.o, this.fn)
    }

    /**
     * Small deviation from the Promises A CommonJs specification
     * http://wiki.commonjs.org/wiki/Promises/A
     */

    /**
     * `then` will execute upon successful requests
     */
  , then: function (success, fail) {
      success = success || function () {}
      fail = fail || function () {}
      if (this._fulfilled) {
        this._responseArgs.resp = success(this._responseArgs.resp)
      } else if (this._erred) {
        fail(this._responseArgs.resp, this._responseArgs.msg, this._responseArgs.t)
      } else {
        this._fulfillmentHandlers.push(success)
        this._errorHandlers.push(fail)
      }
      return this
    }

    /**
     * `always` will execute whether the request succeeds or fails
     */
  , always: function (fn) {
      if (this._fulfilled || this._erred) {
        fn(this._responseArgs.resp)
      } else {
        this._completeHandlers.push(fn)
      }
      return this
    }

    /**
     * `fail` will execute when the request fails
     */
  , fail: function (fn) {
      if (this._erred) {
        fn(this._responseArgs.resp, this._responseArgs.msg, this._responseArgs.t)
      } else {
        this._errorHandlers.push(fn)
      }
      return this
    }
  , 'catch': function (fn) {
      return this.fail(fn)
    }
  }

  function reqwest(o, fn) {
    return new Reqwest(o, fn)
  }

  // normalize newline variants according to spec -> CRLF
  function normalize(s) {
    return s ? s.replace(/\r?\n/g, '\r\n') : ''
  }

  function serial(el, cb) {
    var n = el.name
      , t = el.tagName.toLowerCase()
      , optCb = function (o) {
          // IE gives value="" even where there is no value attribute
          // 'specified' ref: http://www.w3.org/TR/DOM-Level-3-Core/core.html#ID-862529273
          if (o && !o['disabled'])
            cb(n, normalize(o['attributes']['value'] && o['attributes']['value']['specified'] ? o['value'] : o['text']))
        }
      , ch, ra, val, i

    // don't serialize elements that are disabled or without a name
    if (el.disabled || !n) return

    switch (t) {
    case 'input':
      if (!/reset|button|image|file/i.test(el.type)) {
        ch = /checkbox/i.test(el.type)
        ra = /radio/i.test(el.type)
        val = el.value
        // WebKit gives us "" instead of "on" if a checkbox has no value, so correct it here
        ;(!(ch || ra) || el.checked) && cb(n, normalize(ch && val === '' ? 'on' : val))
      }
      break
    case 'textarea':
      cb(n, normalize(el.value))
      break
    case 'select':
      if (el.type.toLowerCase() === 'select-one') {
        optCb(el.selectedIndex >= 0 ? el.options[el.selectedIndex] : null)
      } else {
        for (i = 0; el.length && i < el.length; i++) {
          el.options[i].selected && optCb(el.options[i])
        }
      }
      break
    }
  }

  // collect up all form elements found from the passed argument elements all
  // the way down to child elements; pass a '<form>' or form fields.
  // called with 'this'=callback to use for serial() on each element
  function eachFormElement() {
    var cb = this
      , e, i
      , serializeSubtags = function (e, tags) {
          var i, j, fa
          for (i = 0; i < tags.length; i++) {
            fa = e[byTag](tags[i])
            for (j = 0; j < fa.length; j++) serial(fa[j], cb)
          }
        }

    for (i = 0; i < arguments.length; i++) {
      e = arguments[i]
      if (/input|select|textarea/i.test(e.tagName)) serial(e, cb)
      serializeSubtags(e, [ 'input', 'select', 'textarea' ])
    }
  }

  // standard query string style serialization
  function serializeQueryString() {
    return reqwest.toQueryString(reqwest.serializeArray.apply(null, arguments))
  }

  // { 'name': 'value', ... } style serialization
  function serializeHash() {
    var hash = {}
    eachFormElement.apply(function (name, value) {
      if (name in hash) {
        hash[name] && !isArray(hash[name]) && (hash[name] = [hash[name]])
        hash[name].push(value)
      } else hash[name] = value
    }, arguments)
    return hash
  }

  // [ { name: 'name', value: 'value' }, ... ] style serialization
  reqwest.serializeArray = function () {
    var arr = []
    eachFormElement.apply(function (name, value) {
      arr.push({name: name, value: value})
    }, arguments)
    return arr
  }

  reqwest.serialize = function () {
    if (arguments.length === 0) return ''
    var opt, fn
      , args = Array.prototype.slice.call(arguments, 0)

    opt = args.pop()
    opt && opt.nodeType && args.push(opt) && (opt = null)
    opt && (opt = opt.type)

    if (opt == 'map') fn = serializeHash
    else if (opt == 'array') fn = reqwest.serializeArray
    else fn = serializeQueryString

    return fn.apply(null, args)
  }

  reqwest.toQueryString = function (o, trad) {
    var prefix, i
      , traditional = trad || false
      , s = []
      , enc = encodeURIComponent
      , add = function (key, value) {
          // If value is a function, invoke it and return its value
          value = ('function' === typeof value) ? value() : (value == null ? '' : value)
          s[s.length] = enc(key) + '=' + enc(value)
        }
    // If an array was passed in, assume that it is an array of form elements.
    if (isArray(o)) {
      for (i = 0; o && i < o.length; i++) add(o[i]['name'], o[i]['value'])
    } else {
      // If traditional, encode the "old" way (the way 1.3.2 or older
      // did it), otherwise encode params recursively.
      for (prefix in o) {
        if (o.hasOwnProperty(prefix)) buildParams(prefix, o[prefix], traditional, add)
      }
    }

    // spaces should be + according to spec
    return s.join('&').replace(/%20/g, '+')
  }

  function buildParams(prefix, obj, traditional, add) {
    var name, i, v
      , rbracket = /\[\]$/

    if (isArray(obj)) {
      // Serialize array item.
      for (i = 0; obj && i < obj.length; i++) {
        v = obj[i]
        if (traditional || rbracket.test(prefix)) {
          // Treat each array item as a scalar.
          add(prefix, v)
        } else {
          buildParams(prefix + '[' + (typeof v === 'object' ? i : '') + ']', v, traditional, add)
        }
      }
    } else if (obj && obj.toString() === '[object Object]') {
      // Serialize object item.
      for (name in obj) {
        buildParams(prefix + '[' + name + ']', obj[name], traditional, add)
      }

    } else {
      // Serialize scalar item.
      add(prefix, obj)
    }
  }

  reqwest.getcallbackPrefix = function () {
    return callbackPrefix
  }

  // jQuery and Zepto compatibility, differences can be remapped here so you can call
  // .ajax.compat(options, callback)
  reqwest.compat = function (o, fn) {
    if (o) {
      o['type'] && (o['method'] = o['type']) && delete o['type']
      o['dataType'] && (o['type'] = o['dataType'])
      o['jsonpCallback'] && (o['jsonpCallbackName'] = o['jsonpCallback']) && delete o['jsonpCallback']
      o['jsonp'] && (o['jsonpCallback'] = o['jsonp'])
    }
    return new Reqwest(o, fn)
  }

  reqwest.ajaxSetup = function (options) {
    options = options || {}
    for (var k in options) {
      globalSetupOptions[k] = options[k]
    }
  }

  return reqwest
});

},{}],5:[function(_dereq_,module,exports){

/**
 * Module dependencies.
 */

var global = (function() { return this; })();

/**
 * WebSocket constructor.
 */

var WebSocket = global.WebSocket || global.MozWebSocket;

/**
 * Module exports.
 */

module.exports = WebSocket ? ws : null;

/**
 * WebSocket constructor.
 *
 * The third `opts` options object gets ignored in web browsers, since it's
 * non-standard, and throws a TypeError if passed to the constructor.
 * See: https://github.com/einaros/ws/issues/227
 *
 * @param {String} uri
 * @param {Array} protocols (optional)
 * @param {Object) opts (optional)
 * @api public
 */

function ws(uri, protocols, opts) {
  var instance;
  if (protocols) {
    instance = new WebSocket(uri, protocols);
  } else {
    instance = new WebSocket(uri);
  }
  return instance;
}

if (WebSocket) ws.prototype = WebSocket.prototype;

},{}],6:[function(_dereq_,module,exports){

var extend   = _dereq_("extend");
var Q        = _dereq_("kew");
var encoding = _dereq_("./encoding");
var socket = _dereq_("./socket");

var http = _dereq_("./http-browser");
if(typeof window != "object") {
    http = _dereq_("./http-node");
}

module.exports = createApiClient;

function createApiClient(options) {
    var config = {};
    var sessionId = null;
    var sessionIdProvider = function() { return sessionId; }
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

},{"./encoding":9,"./http-browser":13,"./socket":18,"extend":1,"kew":3}],7:[function(_dereq_,module,exports){

module.exports = createChannelsContext;

function createChannelsContext(socket) {
    var channels;
    var handlers;
    var idCounter = 0;

    init();
    return {
        getChannel: getChannel
    };

    function init() {
        socket.on("open", handleSocketOpen);
        socket.on("error", handleSocketError);
        socket.on("message", handleSocketMessage);
        channels = {};
        handlers = [];
    }

    function createChannel(channelName, usernames) {
        var nameParts = channelName.split("/");
        var channel = {
            type: nameParts[0],
            wildcard: channelName.indexOf("*") != -1,
            on: function(eventName, handler) {
                addHandler(channelName, eventName, handler)
            },
            send: function(message) {
                sendPacket({
                    channel:channelName,
                    command:"publish",
                    message: message
                });
            },
            grant: function(username, permissions) {
                sendPermission(channelName, "grant", [username], permissions);
            },
            revoke: function(username, permissions) {
                sendPermission(channelName, "revoke", [username], permissions);
            }
        };
        if(channel.type == "private" && !channel.wildcard) {
            sendPacket({channel:channelName, command:"channel.create"});
            if(usernames && usernames.length > 0) {
                sendPermission(channelName, "grant", usernames, ["read", "write"]);
            }
        } else {
            sendPacket({channel:channelName, command:"subscribe"});
        }
        return channel;
    }

    function sendPermission(channelName, change, usernames, permissions) {
        permissions.forEach(function(permission) {
            sendPacket({
                channel: channelName,
                command: change + "." + permission,
                data: usernames
            })
        });
    }

    function getChannel(name, permissions) {
        var channel = channels[name];
        if(!channel) {
            channels[name] = channel = createChannel(name, permissions);
        }
        return channel;
    }

    function sendPacket(packet) {
        packet.id = String(idCounter++);
        socket.send(packet);
    }

    function notifyHandlers(channelName, eventName, event) {
        getHandlers(channelName, eventName).forEach(function(handler) {
            handler(event);
        });
    }

    function getHandlers(channelName, eventName) {
        var filtered = [];
        if(channelName == "*") {
            filtered = handlers.filter(function(handler) {
                return handler.eventName == eventName;
            });
        } else {
            filtered = handlers.filter(function(handler) {
                return handler.eventName == eventName &&
                       handler.regexp.test(channelName)
            });
        }
        return filtered.map(function(handler) {
            return handler.fn;
        });
    }

    function addHandler(channelPattern, eventName, handler) {
        var regexp;
        if(channelPattern.lastIndexOf("*") == channelPattern.length - 1) {
            regexp = new RegExp("^" + channelPattern.replace("*", ""));
        } else {
            regexp = new RegExp("^" + channelPattern + "$");
        }
        handlers.push({
            regexp: regexp,
            eventName: eventName,
            fn: handler
        });
    }

    function handleSocketOpen(event) {
        notifyHandlers("*", "open");
    }

    function handleSocketError(event) {
        notifyHandlers("*", "error", {
            type:"error",
            error: new Error("Error connecting to realtime service")
        });
    }

    function handleSocketMessage(event) {
        var data = {};
        try {
            data = JSON.parse(event.data);
        } catch(e) {}

        if(typeof data.channel === "string" &&
           typeof data.event   === "string") {
            notifyHandlers(data.channel, data.event, data);
        }
    }
}


},{}],8:[function(_dereq_,module,exports){

module.exports = createCollectionsContext;

function createCollectionsContext() {
    var collections = {};

    return {
        defaultValues: defaultValues,
        get: getCollection,
        collection: function(c, p) { defineCollection(c, p); return getCollection(c); }
    }

    function defineCollection(name, options) {
        collection = parseCollection(options);
        collections["$" + name] = collection;
    }

    function parseCollection(options) {
        var collection = {};
        Object.keys(options).forEach(function(key) {
            var option = options[key];
            var column = {};
            if(typeof option === "string") {
                column.type = option;
            } else if(typeof option === "object" && typeof option.type === "string") {
                column.type = option.type;
            }
            if(column.type === "relation") {
                column.relation = option.relation;
            }
            collection[key] = column;
        });
        return collection;
    }

    function getCollection(name) {
        return collections["$" + name];
    }

    function defaultValues(collectionName) {
        var collection = getCollection(collectionName);
        var values = {};
        if(collection) {
            Object.keys(collection).forEach(function(key) {
                values[key] = defaultValueForColumn(collection[key])
            });
        }
        return values;
    }

    function defaultValueForColumn(column) {
        switch(column.type) {
            case "string": return "";
            case "number": return 0;
            case "array": return [];
            case "file": return {sysDatatype:"file", filename:"", url:""};
            case "relation": return {sysDatatype:"relation", sysRelationType:column.relation, sysObjectIds:[]};
        }
        return undefined;
    }
}

},{}],9:[function(_dereq_,module,exports){

var nibbler = _dereq_("./nibbler");

var base64 = nibbler.create({
    dataBits: 8,
    codeBits: 6,
    keyString: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
    pad: "-"
})

var base32 = nibbler.create({
    dataBits: 8,
    codeBits: 5,
    keyString: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
    pad: "-"
});

module.exports = {
    base64: base64,
    base32: base32,
    base64ToBase32: function(source) {
        return base32.encode(base64.decode(source));
    }
}

},{"./nibbler":14}],10:[function(_dereq_,module,exports){

module.exports = {
    log: function(error) {
        if(console && console.error) {
            if(error && error.message) {
                console.error("Appstax Error: " + error.message, error);
            } else {
                console.error("Appstax Error");
            }
            if(error && error.stack) {
                console.error(error.stack);
            }
        }
        throw error;
    }
}

},{}],11:[function(_dereq_,module,exports){

var extend      = _dereq_("extend");
var objects     = _dereq_("./objects");
var users       = _dereq_("./users");
var files       = _dereq_("./files");
var collections = _dereq_("./collections");
var apiClient   = _dereq_("./apiclient");
var request     = _dereq_("./request");
var channels    = _dereq_("./channels");

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


},{"./apiclient":6,"./channels":7,"./collections":8,"./files":12,"./objects":15,"./request":17,"./users":19,"extend":1}],12:[function(_dereq_,module,exports){

var Q         = _dereq_("kew");
var extend    = _dereq_("extend");

module.exports = createFilesContext;

function createFilesContext(apiClient) {
    var internalFiles = [];

    return {
        create: createFile,
        isFile: isFile,
        saveFile: saveFile,
        status: fileStatus,
        setUrl: setUrl,
        urlForFile: urlForFile,
        nativeFile: getNativeFile,
        createFile: createFile
    }

    function createFile(options) {
        var file = Object.create({});
        var internal;

        if(options instanceof Blob) {
            var nativeFile = options;
            internal = createInternalFile(file, {
                filename: nativeFile.name,
                nativeFile: nativeFile
            });
        } else {
            internal = createInternalFile(file, options);
            internal.status = "saved";
        }

        if(file && internal) {
            Object.defineProperty(file, "filename", { get: function() { return internal.filename; }, enumerable:true });
            Object.defineProperty(file, "url", { get: function() { return internal.url; }, enumerable:true });
            Object.defineProperty(file, "preview", { value: function() { return previewFile(internal); }});
            Object.defineProperty(file, "imageUrl", { value: function(operation, options) { return imageUrl(internal, operation, options); }});
        } else {
            throw new Error("Invalid file options");
        }
        return file;
    }

    function createInternalFile(file, options) {
        var internal = {
            file: file,
            filename: options.filename,
            nativeFile: options.nativeFile,
            url: options.url || "",
            status: "new"
        }
        internalFiles.push(internal);
        return internal;
    }

    function previewFile(internalFile) {
        if(!internalFile.previewPromise) {
            var defer = Q.defer();
            var reader = new FileReader();
            reader.onload = function(event) {
                internalFile.url = event.target.result;
                defer.resolve(internalFile.file);
            }
            reader.readAsDataURL(internalFile.nativeFile);
            internalFile.previewPromise = defer.promise;
        }
        return internalFile.previewPromise;
    }

    function imageUrl(internalFile, operation, options) {
        var o = extend({
            width: "-",
            height: "-"
        }, options);

        return internalFile.url.replace("/files/", "/images/" + operation + "/" + o.width + "/" + o.height + "/");
    }

    function getInternalFile(file) {
        for(var i = 0; i < internalFiles.length; i++) {
            if(internalFiles[i].file == file) {
                return internalFiles[i];
            }
        }
        return null;
    }

    function saveFile(collectionName, objectId, propertyName, file) {
        var defer = Q.defer();
        var internal = getInternalFile(file);
        internal.status = "saving";
        var url = urlForFile(collectionName, objectId, propertyName, file.filename);
        var data = new FormData();
        data.append("file", internal.nativeFile);
        apiClient.request("put", url, data).then(function(response) {
            internal.status = "saved";
            internal.url = url;
            defer.resolve(file);
        });
        return defer.promise;
    }

    function urlForFile(collectionName, objectId, propertyName, filename) {
        if(!filename) {
            return "";
        }
        var tokenKey = "token";
        var tokenValue = apiClient.urlToken();
        if(tokenValue.length < 2) {
            tokenKey = "appkey";
            tokenValue = apiClient.appKey();
        }
        return apiClient.url("/files/:collectionName/:objectId/:propertyName/:filename?:tokenKey=:tokenValue", {
            collectionName: collectionName,
            objectId: objectId,
            propertyName: propertyName,
            filename: filename,
            tokenKey: tokenKey,
            tokenValue: tokenValue
        })
    }

    function getNativeFile(file) {
        var nativeFile = null;
        var internal = getInternalFile(file);
        if(internal != null) {
            nativeFile = internal.nativeFile;
        }
        return nativeFile;
    }

    function isFile(file) {
        return getInternalFile(file) != null;
    }

    function fileStatus(file, status) {
        if(typeof status === "string") {
            getInternalFile(file).status = status;
        }
        return getInternalFile(file).status;
    }

    function setUrl(file, url) {
        var internal = getInternalFile(file);
        if(internal) {
            internal.url = url;
        }
    }
}

},{"extend":1,"kew":3}],13:[function(_dereq_,module,exports){

var extend  = _dereq_("extend");
var Q       = _dereq_("kew");
var reqwest = null;
if(typeof window == "object") {
    reqwest = _dereq_("reqwest");
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

},{"extend":1,"kew":3,"reqwest":4}],14:[function(_dereq_,module,exports){
/*
Copyright (c) 2010-2013 Thomas Peri
http://www.tumuski.com/

Permission is hereby granted, free of charge, to any person obtaining a
copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/*jslint white: true, browser: true, onevar: true, undef: true, nomen: true,
  eqeqeq: true, plusplus: true, regexp: true, newcap: true, immed: true */
// (good parts minus bitwise and strict, plus white.)

/**
 * Nibbler - Multi-Base Encoder
 *
 * version 2013-04-24
 *
 * Options:
 *   dataBits: The number of bits in each character of unencoded data.
 *   codeBits: The number of bits in each character of encoded data.
 *   keyString: The characters that correspond to each value when encoded.
 *   pad (optional): The character to pad the end of encoded output.
 *   arrayData (optional): If truthy, unencoded data is an array instead of a string.
 *
 * Example:
 *
 * var base64_8bit = new Nibbler({
 *     dataBits: 8,
 *     codeBits: 6,
 *     keyString: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
 *     pad: '='
 * });
 * base64_8bit.encode("Hello, World!");  // returns "SGVsbG8sIFdvcmxkIQ=="
 * base64_8bit.decode("SGVsbG8sIFdvcmxkIQ==");  // returns "Hello, World!"
 *
 * var base64_7bit = new Nibbler({
 *     dataBits: 7,
 *     codeBits: 6,
 *     keyString: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
 *     pad: '='
 * });
 * base64_7bit.encode("Hello, World!");  // returns "kZdmzesQV9/LZkQg=="
 * base64_7bit.decode("kZdmzesQV9/LZkQg==");  // returns "Hello, World!"
 *
 */

module.exports = {
  create: function(options) {
    return new Nibbler(options);
  }
}


var Nibbler = function (options) {
  "use strict";

  // Code quality tools like jshint warn about bitwise operators,
  // because they're easily confused with other more common operators,
  // and because they're often misused for doing arithmetic.  Nibbler uses
  // them properly, though, for moving individual bits, so turn off the warning.
  /*jshint bitwise:false */

  var construct,

    // options
    pad, dataBits, codeBits, keyString, arrayData,

    // private instance variables
    mask, group, max,

    // private methods
    gcd, translate,

    // public methods
    encode, decode;

  // pseudo-constructor
  construct = function () {
    var i, mag, prev;

    // options
    pad = options.pad || '';
    dataBits = options.dataBits;
    codeBits = options.codeBits;
    keyString = options.keyString;
    arrayData = options.arrayData;

    // bitmasks
    mag = Math.max(dataBits, codeBits);
    prev = 0;
    mask = [];
    for (i = 0; i < mag; i += 1) {
      mask.push(prev);
      prev += prev + 1;
    }
    max = prev;

    // ouput code characters in multiples of this number
    group = dataBits / gcd(dataBits, codeBits);
  };

  // greatest common divisor
  gcd = function (a, b) {
    var t;
    while (b !== 0) {
      t = b;
      b = a % b;
      a = t;
    }
    return a;
  };

  // the re-coder
  translate = function (input, bitsIn, bitsOut, decoding) {
    var i, len, chr, byteIn,
      buffer, size, output,
      write;

    // append a byte to the output
    write = function (n) {
      if (!decoding) {
        output.push(keyString.charAt(n));
      } else if (arrayData) {
        output.push(n);
      } else {
        output.push(String.fromCharCode(n));
      }
    };

    buffer = 0;
    size = 0;
    output = [];

    len = input.length;
    for (i = 0; i < len; i += 1) {
      // the new size the buffer will be after adding these bits
      size += bitsIn;

      // read a character
      if (decoding) {
        // decode it
        chr = input.charAt(i);
        byteIn = keyString.indexOf(chr);
        if (chr === pad) {
          break;
        } else if (byteIn < 0) {
          throw 'the character "' + chr + '" is not a member of ' + keyString;
        }
      } else {
        if (arrayData) {
          byteIn = input[i];
        } else {
          byteIn = input.charCodeAt(i);
        }
        if ((byteIn | max) !== max) {
          throw byteIn + " is outside the range 0-" + max;
        }
      }

      // shift the buffer to the left and add the new bits
      buffer = (buffer << bitsIn) | byteIn;

      // as long as there's enough in the buffer for another output...
      while (size >= bitsOut) {
        // the new size the buffer will be after an output
        size -= bitsOut;

        // output the part that lies to the left of that number of bits
        // by shifting the them to the right
        write(buffer >> size);

        // remove the bits we wrote from the buffer
        // by applying a mask with the new size
        buffer &= mask[size];
      }
    }

    // If we're encoding and there's input left over, pad the output.
    // Otherwise, leave the extra bits off, 'cause they themselves are padding
    if (!decoding && size > 0) {

      // flush the buffer
      write(buffer << (bitsOut - size));

      // add padding string for the remainder of the group
      while (output.length % group > 0) {
        output.push(pad);
      }
    }

    // string!
    return (arrayData && decoding) ? output : output.join('');
  };

  /**
   * Encode.  Input and output are strings.
   */
  encode = function (input) {
    return translate(input, dataBits, codeBits, false);
  };

  /**
   * Decode.  Input and output are strings.
   */
  decode = function (input) {
    return translate(input, codeBits, dataBits, true);
  };

  this.encode = encode;
  this.decode = decode;
  construct();
};

},{}],15:[function(_dereq_,module,exports){

var extend      = _dereq_("extend");
var query       = _dereq_("./query");
var failLogger  = _dereq_("./faillogger");
var Q           = _dereq_("kew");

module.exports = createObjectsContext;

var internalProperties = ["collectionName", "id", "internalId", "username", "created", "updated", "permissions", "save", "saveAll", "remove", "grant", "revoke", "sysCreated", "sysUpdated", "sysPermissions"];
var nextContextId = 0;

function createObjectsContext(apiClient, files, collections) {
    var contextId = nextContextId++;
    var internalIds = [];
    var internalObjects = {};

    var prototype = {
        save: function() {
            return failOnUnsavedRelations(this)
                    .then(saveObject)
                    .then(savePermissionChanges)
                    .then(saveFileProperties)
                    .fail(failLogger.log);
        },
        saveAll: function() {
            return saveObjectsInGraph(this).fail(failLogger.log);
        },
        remove: function() {
            return removeObject(this).fail(failLogger.log);
        },
        refresh: function() {
            return refreshObject(this).fail(failLogger.log);
        },
        expand: function(options) {
            return expandObject(this, options).fail(failLogger.log);
        },
        grant: function(usernames, permissions) {
            if(typeof usernames === "string") {
                usernames = [usernames];
            }
            var internal = getInternalObject(this);
            usernames.forEach(function(username) {
                internal.grants.push({
                    username: username,
                    permissions: permissions
                });
            });
        },
        revoke: function(usernames, permissions) {
            if(typeof usernames === "string") {
                usernames = [usernames];
            }
            var internal = getInternalObject(this);
            usernames.forEach(function(username) {
                internal.revokes.push({
                    username: username,
                    permissions: permissions
                });
            });
        },
        grantPublic: function(permissions) {
            this.grant("*", permissions);
        },
        revokePublic: function(permissions) {
            this.revoke("*", permissions);
        },
        hasPermission: function(permission) {
            return this.permissions.indexOf(permission) != -1;
        }
    };

    return {
        create: createObject,
        createQuery: createQuery,
        getProperties: getProperties,
        createObject: createObject,
        getObjectStatus: getObjectStatus,
        findAll: findAll,
        find: find,
        search: search
    };

    function createObject(collectionName, properties) {
        var internal = createInternalObject(collectionName);
        var object = Object.create(prototype);
        Object.defineProperty(object, "id", { get: function() { return internal.id; }, enumerable:true });
        Object.defineProperty(object, "internalId", { writable: false, value: internal.internalId, enumerable:true });
        Object.defineProperty(object, "collectionName", { get: function() { return internal.collectionName; }, enumerable:true });
        Object.defineProperty(object, "created", { get: function() { return internal.created; }, enumerable:true });
        Object.defineProperty(object, "updated", { get: function() { return internal.updated; }, enumerable:true });
        Object.defineProperty(object, "permissions", { get: function() { return internal.sysValues.sysPermissions; }, enumerable: true });
        if(collectionName == "users") {
            Object.defineProperty(object, "username", { get:function() { return internal.sysValues.sysUsername; }, enumerable:true });
        }

        properties = extend({}, collections.defaultValues(collectionName), properties);
        fillObjectWithValues(object, properties);

        if(object.id !== null) {
            internal.status = "saved";
        }
        return object;
    }

    function fillObjectWithValues(object, properties) {
        var internal = getInternalObject(object);
        var filteredProperties = {};
        if(typeof properties === "object") {
            var sysValues = internal.sysValues;
            internal.setId(properties.sysObjectId);
            if(properties.sysCreated) {
                internal.created = new Date(properties.sysCreated)
            }
            if(properties.sysUpdated) {
                internal.updated = new Date(properties.sysUpdated)
            }
            Object.keys(properties).forEach(function(key) {
                var value = properties[key];
                if(key.indexOf("sys") === 0) {
                    sysValues[key] = value;
                } else if(typeof value.sysDatatype == "string") {
                    filteredProperties[key] = createPropertyWithDatatype(key, value, object);
                    if(value.sysDatatype == "relation") {
                        internal.relations[key] = {
                            type: value.sysRelationType,
                            ids: (value.sysObjects || []).map(function(object) {
                                return object.sysObjectId || object;
                            })
                        }
                    }
                } else {
                    filteredProperties[key] = value;
                }
            });
        }
        extend(object, filteredProperties);
    }

    function createPropertyWithDatatype(key, value, object) {
        switch(value.sysDatatype) {
            case "relation": return _createRelationProperty(value);
            case "file": return files.create({
                filename: value.filename,
                url: files.urlForFile(object.collectionName, object.id, key, value.filename)
            });
        }
        return null;

        function _createRelationProperty(value) {
            var results = [];
            if(typeof value.sysObjects !== "undefined") {
                results = value.sysObjects.map(function(object) {
                    if(typeof object === "string") {
                        return object
                    } else {
                        return createObject(value.sysCollection, object);
                    }
                });
            }
            if("single" === value.sysRelationType) {
                return results[0];
            } else {
                return results;
            }
        }
    }

    function createInternalObject(collectionName) {
        var object = {
            id: null,
            internalId: createInternalId(),
            collectionName: collectionName,
            sysValues: {},
            initialValues: {},
            created: new Date(),
            updated: new Date(),
            status: "new",
            grants: [],
            revokes: [],
            relations: {},
            setId: function(id) { if(id) { this.id = id; }},
            resetPermissions: function() { this.grants = []; this.revokes = []; }
        }
        internalObjects[object.internalId] = object;
        return object;
    }

    function getInternalObject(object) {
        return internalObjects[object.internalId];
    }

    function refreshObject(object) {
        var defer = Q.defer();
        var internal = getInternalObject(object);
        if(internal.status === "new") {
            defer.resolve(object);
        } else {
            findById(object.collectionName, object.id).then(function(updated) {
                Object.keys(updated)
                    .filter(function(key) {
                        return internalProperties.indexOf(key) == -1
                    })
                    .forEach(function(key) {
                        object[key] = updated[key];
                    });
                defer.resolve(object);
            });
        }
        return defer.promise;
    }

    function saveObject(object, defer) {
        var internal = getInternalObject(object)
        var defer = typeof defer == "object" ? defer : Q.defer();
        if(internal.status === "saving") {
            setTimeout(function() {
                saveObject(object, defer);
            }, 100);
            return defer.promise;
        }

        var url, method, data;
        if(object.id == null) {
            url = apiClient.url("/objects/:collection", {collection: object.collectionName});
            method = "post";
            data = getDataForSaving(object)
        } else {
            url = apiClient.url("/objects/:collection/:id", {collection: object.collectionName, id: object.id});
            method = "put";
            data = getPropertiesForSaving(object);
        }
        internal.status = "saving";
        apiClient.request(method, url, data)
                 .then(function(response) {
                     internal.setId(response.sysObjectId);
                     internal.status = "saved";
                     applyRelationChanges(object, data);
                     if(typeof FormData != "undefined" && data instanceof FormData) {
                         markFilesSaved(object);
                     }
                     defer.resolve(object);
                 })
                 .fail(function(error) {
                     internal.status = "error";
                     defer.reject(error);
                 });
        return defer.promise;
    }

    function removeObject(object) {
        var defer = Q.defer();
        var url = apiClient.url("/objects/:collection/:id", {collection: object.collectionName, id: object.id});
        apiClient.request("DELETE", url)
                 .then(function(response) {
                     defer.resolve();
                 })
                 .fail(function(error) {
                     defer.reject(error);
                 });
        return defer.promise;
    }

    function expandObject(object, options) {
        if(isUnsaved(object)) {
            throw new Error("Error calling expand() on unsaved object.")
        }
        var defer = Q.defer();
        var depth = 1;
        if(typeof options === "number") {
            depth = options;
        }
        findById(object.collectionName, object.id, {expand:depth}).then(function(expanded) {
            var internal = getInternalObject(object);
            var relations = Object.keys(internal.relations);
            relations.forEach(function(relation) {
                object[relation] = expanded[relation];
            });
            defer.resolve(object);
        });
        return defer.promise;
    }

    function markFilesSaved(object) {
        var fileProperties = getFileProperties(object);
        return Object.keys(fileProperties).map(function(key) {
            var file = fileProperties[key];
            var url  = files.urlForFile(object.collectionName, object.id, key, file.filename);
            files.status(file, "saved");
            files.setUrl(file, url);
        });
    }

    function saveFileProperties(object) {
        var fileProperties = getFileProperties(object);
        var keys = Object.keys(fileProperties);
        var promises = [];
        keys.forEach(function(key) {
            var file = fileProperties[key];
            if(files.status(file) !== "saved") {
                var promise = files.saveFile(object.collectionName, object.id, key, file)
                promises.push(promise);
            }
        });
        return Q.all(promises).then(function() {
            return Q.resolve(object)
        });
    }

    function savePermissionChanges(object) {
        var defer = Q.defer();
        var url = apiClient.url("/permissions");
        var internal = getInternalObject(object);
        var grants = internal.grants.map(_convertChange);
        var revokes = internal.revokes.map(_convertChange);
        internal.resetPermissions();

        if(grants.length + revokes.length === 0) {
            defer.resolve(object);
        } else {
            var data = {grants:grants, revokes:revokes};
            apiClient.request("POST", url, data)
                     .then(function(response) {
                         defer.resolve(object);
                     })
                     .fail(function(error) {
                         defer.reject(error);
                     });
        }
        return defer.promise;

        function _convertChange(change) {
            return {
                sysObjectId: object.id,
                username: change.username,
                permissions: change.permissions
            }
        }
    }

    function failOnUnsavedRelations(object) {
        detectUndeclaredRelations(object);
        var related = getRelatedObjects(object);
        if(related.some(isUnsaved)) {
            throw new Error("Error saving object. Found unsaved related objects. Save related objects first or consider using saveAll().")
        } else {
            return Q.resolve(object);
        }
    }

    function saveObjectsInGraph(rootObject) {
        var objects = getObjectsInGraph(rootObject);
        var unsavedInbound = objects.inbound.filter(isUnsaved);
        var outbound = objects.outbound;
        var remaining = objects.inbound.filter(function(o) { return !isUnsaved(o) });

        if(0 == outbound.length + unsavedInbound.length + remaining.length) {
            return rootObject.save();
        } else {
            return _saveUnsavedInbound().then(_saveOutbound).then(_saveRemaining);
        }

        function _saveUnsavedInbound() {
            return Q.all(unsavedInbound.map(saveObject));
        }
        function _saveOutbound() {
            return Q.all(outbound.map(saveObject));
        }
        function _saveRemaining() {
            return Q.all(remaining.map(saveObject));
        }
    }

    function getObjectsInGraph(rootObject) {
        var queue = [rootObject];
        var all      = {};
        var inbound  = {};
        var outbound = {};

        while(queue.length > 0) {
            var object = queue.shift();
            detectUndeclaredRelations(object);
            if(all[object.internalId] == null) {
                all[object.internalId] = object;
                var allRelated = getRelatedObjects(object).filter(function(a) { return typeof a == "object" });
                allRelated.forEach(function(related) {
                    inbound[related.internalId] = related;
                });
                if(allRelated.length > 0) {
                    outbound[object.internalId] = object;
                    queue = queue.concat(allRelated);
                }
            }
        }

        return {
            all:      _mapToArray(all),
            inbound:  _mapToArray(inbound),
            outbound: _mapToArray(outbound)
        }

        function _mapToArray(map) {
            return Object.keys(map).map(_objectForKey);
        }

        function _objectForKey(key) {
            return all[key];
        }
    }

    function getRelatedObjects(object) {
        var related = [];
        var internal = getInternalObject(object);
        Object.keys(internal.relations).forEach(function(key) {
            var property = object[key];
            if(property == null) {
                return;
            }
            related = related.concat(property);
        });
        return related;
    }

    function getRelationChanges(object, propertyName) {
        var internal = getInternalObject(object);
        var relation = internal.relations[propertyName];
        var changes = {
            additions: [],
            removals: []
        }

        if(relation) {
            var property = object[propertyName];
            var objects = [];
            if(property) {
                objects = (relation.type == "array") ? property : [property];
            }
            var currentIds = objects.map(function(o) { return o.id || o; })
                                    .filter(function(id) { return typeof id === "string"; });
            changes.additions = currentIds.filter(function(id) {
                return id != null && relation.ids.indexOf(id) == -1;
            });
            changes.removals = relation.ids.filter(function(id) {
                return id != null && currentIds.indexOf(id) == -1;
            });
        }

        return changes;
    }

    function applyRelationChanges(object, savedData) {
        var internal = getInternalObject(object);
        Object.keys(internal.relations).forEach(function(key) {
            var relation = internal.relations[key];
            var changes = savedData[key].sysRelationChanges;
            relation.ids = relation.ids
                .concat(changes.additions)
                .filter(function(id) {
                    return changes.removals.indexOf(id) == -1;
                });
        });
    }

    function detectUndeclaredRelations(object) {
        var collection = collections.get(object.collectionName);
        var relations = getInternalObject(object).relations;

        var properties = getProperties(object);
        Object.keys(properties).forEach(function(key) {
            if(relations[key]) {
                return;
            }
            var property = properties[key]
            var relationType = "";
            if(property !== null && typeof property === "object") {
                if(typeof property.length === "undefined") {
                    if(typeof property.collectionName === "string") {
                        relationType = "single"
                    }
                } else {
                    property.some(function(item) {
                        if(typeof item.collectionName === "string") {
                            relationType = "array"
                            return true;
                        }
                        return false;
                    })
                }
            }
            if(relationType !== "") {
                relations[key] = { type:relationType, ids:[] };
            }
        });
    }

    function getPropertyNames(object) {
        var keys = Object.keys(object);
        return keys.filter(function(key) {
            return internalProperties.indexOf(key) == -1;
        });
    }

    function getProperties(object) {
        if(!isObject(object)) { return {}; }
        var data = {};
        getPropertyNames(object).forEach(function(key) {
            if(/^[a-zA-Z]/.test(key)) {
                data[key] = object[key];
            }
        });
        var sysValues = getInternalObject(object).sysValues;
        Object.keys(sysValues).forEach(function(key) {
            if(internalProperties.indexOf(key) == -1) {
                data[key] = sysValues[key];
            }
        });
        return data;
    }

    function getDataForSaving(object) {
        var properties = getPropertiesForSaving(object);
        var fileProperties = getFileProperties(object);
        var hasFiles = false;
        var formData = apiClient.formData();
        Object.keys(fileProperties).forEach(function(key) {
            var file = fileProperties[key];
            var nativeFile = files.nativeFile(file);
            if(nativeFile && files.status(file) !== "saved") {
                hasFiles = true;
                formData.append(key, nativeFile);
            }
        });
        if(hasFiles) {
            formData.append("sysObjectData", JSON.stringify(properties));
            return formData;
        } else {
            return properties;
        }
    }

    function getPropertiesForSaving(object) {
        var internal = getInternalObject(object);
        var properties = getProperties(object);
        Object.keys(properties).forEach(function(key) {
            var property = properties[key];
            if(files.isFile(property)) {
                properties[key] = {
                    sysDatatype: "file",
                    filename: property.filename
                }
            } else if(typeof internal.relations[key] === "object") {
                properties[key] = {
                    sysRelationChanges: getRelationChanges(object, key)
                }
            }
        });
        return properties;
    }

    function getFileProperties(object) {
        var properties = getProperties(object);
        var fileProperties = {};
        Object.keys(properties).forEach(function(key) {
            var property = properties[key];
            if(files.isFile(property)) {
                fileProperties[key] = property;
            }
        });
        return fileProperties;
    }

    function createInternalId() {
        var id = "internal-id-" + contextId + "-" + internalIds.length;
        internalIds.push(id);
        return id;
    }

    function queryParametersFromQueryOptions(options) {
        if(!options) { return; }
        var parameters = {};
        if(typeof options.expand === "number") {
            parameters.expanddepth = options.expand;
        } else if(options.expand === true) {
            parameters.expanddepth = 1;
        }
        return parameters;
    }

    function findAll(collectionName, options) {
        var defer = Q.defer();
        var url = apiClient.url("/objects/:collection",
                                {collection: collectionName},
                                queryParametersFromQueryOptions(options));
        apiClient.request("get", url)
                 .then(function(result) {
                     defer.resolve(createObjectsFromFindResult(collectionName, result));
                 })
                 .fail(function(error) {
                     defer.reject(error);
                 });
        return defer.promise;
    }

    function find(collectionName) {
        if(arguments.length < 2) { return; }
        var a1 = arguments[1];
        var a2 = arguments[2];
        if(typeof a1 === "string" && a1.indexOf("=") == -1) {
            return findById(collectionName, a1, a2);
        } else if(typeof a1 === "string") {
            return findByQueryString(collectionName, a1, a2);
        } else if(typeof a1 === "object" && typeof a1.queryString === "function") {
            return findByQueryObject(collectionName, a1, a2);
        } else if(typeof a1 === "object") {
            return findByPropertyValues(collectionName, a1, a2);
        } else if(typeof a1 === "function") {
            return findByQueryFunction(collectionName, a1, a2);
        }
    }

    function findById(collectionName, id, options) {
        var defer = Q.defer();
        var url = apiClient.url("/objects/:collection/:id",
                                {collection: collectionName, id: id},
                                queryParametersFromQueryOptions(options));
        apiClient.request("get", url)
                 .then(function(result) {
                     defer.resolve(createObject(collectionName, result));
                 })
                 .fail(function(error) {
                     defer.reject(error);
                 });
        return defer.promise;
    }

    function findByQueryString(collectionName, queryString, options) {
        var defer = Q.defer();
        var url = apiClient.url("/objects/:collection?filter=:queryString",
                                {collection: collectionName, queryString: queryString},
                                queryParametersFromQueryOptions(options));
        apiClient.request("get", url)
                 .then(function(result) {
                     defer.resolve(createObjectsFromFindResult(collectionName, result));
                 })
                 .fail(function(error) {
                     defer.reject(error);
                 });
        return defer.promise;
    }

    function findByQueryObject(collectionName, queryObject, options) {
        return findByQueryString(collectionName, queryObject.queryString(), options);
    }

    function findByQueryFunction(collectionName, queryFunction, options) {
        var queryObject = createQuery();
        queryFunction(queryObject);
        return findByQueryString(collectionName, queryObject.queryString(), options);
    }

    function findByPropertyValues(collectionName, propertyValues, options) {
        return findByQueryFunction(collectionName, function(query) {
            Object.keys(propertyValues).forEach(function(property) {
                var value = propertyValues[property];
                if(typeof value === "object" && typeof value.id === "string") {
                    query.relation(property).has(value);
                } else {
                    query.string(property).equals(value);
                }
            });
        }, options);
    }

    function search(collectionName) {
        var propertyValues = arguments[1];
        var options = arguments[2];
        if(arguments.length >= 3 && typeof arguments[1] === "string") {
            propertyValues = {};
            var searchString = arguments[1]
            Array.prototype.forEach.call(arguments[2], function(property) {
                propertyValues[property] = searchString;
            });
            if(arguments.length == 4) {
                options = arguments[3];
            }
        }
        return find(collectionName, function(query) {
            query.operator("or");
            Object.keys(propertyValues).forEach(function(property) {
                var value = propertyValues[property];
                query.string(property).contains(value);
            });
        }, options);
    }

    function createObjectsFromFindResult(collectionName, result) {
        return result.objects.map(function(properties) {
            return createObject(collectionName, properties);
        });
    }

    function createQuery(options) {
        return query(options);
    }

    function getObjectStatus(object) {
        var internal = getInternalObject(object);
        return internal ? internal.status : undefined;
    }

    function isUnsaved(object) {
        return getObjectStatus(object) === "new";
    }

    function isObject(object) {
        return object !== undefined && object !== null;
    }
}

},{"./faillogger":10,"./query":16,"extend":1,"kew":3}],16:[function(_dereq_,module,exports){

module.exports = function(options) {

    var operator = "and";
    var predicates = [];

    init();
    return {
        queryString: queryString,
        string: createStringPredicate,
        relation: createRelationPredicate,
        operator: function(o) { operator = o; }
    };

    function init() {
        if(typeof options === "string") {
            addPredicate(options);
        }
    }

    function addPredicate(predicate) {
        predicates.push(predicate);
    }

    function createStringPredicate(property) {
        return {
            equals: function(value) {
                addPredicate(format("$='$'", property, value));
            },
            contains: function(value) {
                addPredicate(format("$ like '%$%'", property, value));
            }
        }
    }

    function createRelationPredicate(property) {
        return {
            has: function(objectsOrIds) {
                var ids = _getQuotedIds(objectsOrIds);
                addPredicate(format("$ has ($)", property, ids.join(",")));
            }
        }
        function _getQuotedIds(objectsOrIds) {
            return [].concat(objectsOrIds).map(function(item) {
                return "'" + (item.id || item) + "'";
            });
        }
    }

    function queryString() {
        return predicates.join(format(" $ ", operator));
    }

    function format(template) {
        var parameters = Array.prototype.slice.call(arguments, 1);
        var result = template;
        parameters.forEach(function(parameter) {
            result = result.replace("$", parameter);
        });
        return result;
    }

};

},{}],17:[function(_dereq_,module,exports){


module.exports = createRequestContext;

function createRequestContext(apiClient) {
    return request;

    function request(method, url, data) {
        url = apiClient.url("/server" + url);
        return apiClient.request(method, url, data);
    }
}

},{}],18:[function(_dereq_,module,exports){

var Q  = _dereq_("kew");
var WS = _dereq_("ws");

module.exports = createSocket;

function createSocket(apiClient) {
    var queue = [];
    var realtimeSessionPromise = null;
    var realtimeSessionId = "";
    var webSocket = null;
    var connectionIntervalId = null;
    var handlers = {
        open: [],
        message: [],
        error: [],
        close: []
    };

    return {
        connect: connect,
        send: send,
        on: on
    }

    function send(packet) {
        if(typeof packet == "object") {
            packet = JSON.stringify(packet);
        }
        if(webSocket && webSocket.readyState == 1) {
            sendQueue();
            webSocket.send(packet);
        } else {
            queue.push(packet);
            connect();
        }
    }

    function sendQueue() {
        while(queue.length > 0) {
            if(webSocket && webSocket.readyState == 1) {
                var packet = queue.shift();
                webSocket.send(packet);
            } else {
                connect();
                break;
            }
        }
    }

    function on(event, handler) {
        handlers[event].push(handler);
    }

    function connect() {
        if(!realtimeSessionPromise) {
            connectSession();
        }
        if(!connectionIntervalId) {
            connectionIntervalId = setInterval(function() {
                if(!webSocket || webSocket.readyState > 1) {
                    realtimeSessionPromise.then(connectSocket);
                }
            }, 100);
        }
    }

    function connectSession() {
        var defer = Q.defer();
        realtimeSessionPromise = defer.promise;
        var url = apiClient.url("/messaging/realtime/sessions");
        apiClient.request("post", url)
                 .then(function(response) {
                     realtimeSessionId = response.realtimeSessionId;
                     defer.resolve();
                 })
                 .fail(function(error) {
                     notifyHandlers("error", {error:error});
                 });
        return realtimeSessionPromise;
    }

    function connectSocket() {
        var url = apiClient.url("/messaging/realtime", {}, {rsession: realtimeSessionId});
        url = url.replace("http", "ws");
        webSocket = createWebSocket(url);
        webSocket.onopen = handleSocketOpen;
        webSocket.onerror = handleSocketError;
        webSocket.onmessage = handleSocketMessage;
        webSocket.onclose = handleSocketClose;
    }

    function createWebSocket(url) {
        if(typeof WebSocket != "undefined") {
            return new WebSocket(url);
        } else if(typeof WS != "undefined") {
            return new WS(url);
        }
    }

    function handleSocketOpen(event) {
        sendQueue();
        notifyHandlers("open", event);
    }

    function handleSocketError(event) {
        notifyHandlers("error", event);
    }

    function handleSocketMessage(event) {
        notifyHandlers("message", event);
    }

    function handleSocketClose(event) {
        notifyHandlers("close", event);
    }

    function notifyHandlers(eventName, event) {
        handlers[eventName].forEach(function(handler) {
            handler(event);
        });
    }

}

},{"kew":3,"ws":5}],19:[function(_dereq_,module,exports){

var extend    = _dereq_("extend");
var Q         = _dereq_("kew");

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
                 .fail(function(error) {
                     defer.reject(error);
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
                 .fail(function(error) {
                     defer.reject(error);
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
        if(typeof localStorage == "undefined") {
            return;
        }
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


},{"extend":1,"kew":3}]},{},[11])
(11)
});