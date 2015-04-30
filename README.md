
Appstax JavaScript SDK
======================

This is the official SDK for [Appstax](http://appstax.com). Please read the [JavaScript Guide](https://appstax.com/docs/JavaScript-SDK-Guide) to get up and running.

Installing
----------

[Download the latest release](https://github.com/appstax/appstax-js/releases/latest) and include appstax.js in your app.

Or, if you are using bower.io or npm to manage your javascript packages:

```bash
> bower install appstax --save
```

```bash
> npm install appstax --save
```

Example usage
-------------

```javascript
appstax.init("your-app-key");
   
var contact = appstax.object("contacts");
contact.name = "John Appleseed";
contact.email = "john@appleseed.com";
contact.save();
```

See the [JavaScript Guide](https://appstax.com/docs/JavaScript-SDK-Guide) for more info on how to set up your app and data model.

Building from source
--------------------

### Building the appstax.js bundle

Prerequisites:

- Install node/npm via [nodejs.org](http://nodejs.org/download/) or a package manager like [Homebrew](http://brew.sh/)
- Install gulp with `npm install -g gulp`

How to build:

	> npm install
	> gulp bundle

The bundle will be availble in ./build/appstax.js

### Running the examples

In addition to `gulp` you also need `bower`:

	> npm install -g bower

First you build the appstax.js bundle as described above, then you go to the examples folder and build/run:

	> cd examples/notes
	> npm install
	> bower update
	> gulp serve

... and point your browser to http://localhost:9000/

### Running the tests

    > npm test
