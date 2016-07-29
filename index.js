var path = require('path');
var express = require('express');
var httpProxy = require('http-proxy');
var proxy = httpProxy.createProxyServer({});

var app = express();
var port = 8080;

var apiRouters = require('./apiRouters.js');

var bodyParser = require("body-parser");

app.use(bodyParser.urlencoded({
  extended: true
}));

// app.use('/auth', proxy('http://localhost:3000'));
app.use(express.static(path.join(__dirname + '/src')));
app.use(express.static(path.join(__dirname + '/attaches')));

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

app.use('/attach_api/', apiRouters);

app.all('/api/*', function (req, res) {
  proxy.web(req, res, { target: 'http://localhost:3000' });
});

app.listen(port, function () {
  console.log('Example app listening on port ' + port);
});
