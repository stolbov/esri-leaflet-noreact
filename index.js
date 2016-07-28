var path = require('path');
var express = require('express');
var app = express();
var port = 8080;

var apiRouters = require('./apiRouters.js');

var bodyParser = require("body-parser");

app.use(bodyParser.json());

app.use(express.static(path.join(__dirname + '/src')));
app.use(express.static(path.join(__dirname + '/attaches')));

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

app.use('/api/', apiRouters);

app.listen(port, function () {
  console.log('Example app listening on port ' + port);
});
