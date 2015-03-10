
### Pre-release note

Please note that this repository contains pre-release software, and cannot be used until the Appstax services are officially released. If you are a registered early access developer, please download the JavaScript SDK from [appstax.com](http://appstax.com/#/download). You will be notified when you should change to the updated version in this repository.

Want beta access? [Send us an email](ea@appstax.com) to request an early access code.

Appstax JavaScript SDK
======================

This is the official SDK for [Appstax](http://appstax.com). Please read the [JavaScript Guide](http://appstax.com/docs/Guides/JavaScript-SDK-Guide.html) to get up and running.

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

See the [JavaScript Guide](http://appstax.com/docs/Guides/JavaScript-SDK-Guide.html) for more info on how to set up your app and data model.

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
