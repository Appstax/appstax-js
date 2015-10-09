var express = require('express');
var appstax = require("appstax-express");


appstax.init("<<appstax-app-key>>");

var app = express();
    app.use(appstax.cors());
    app.use(appstax.sessions());


app.get("/api", function (req, res) {
	res.send("Ok, it is great!");
});





var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;


  console.log('Example app listening at http://%s:%s', host, port);
});
