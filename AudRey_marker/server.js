var express = require('express');  //require express module
var app = express();  //create an express app
var http = require('http').Server(app);  //app starts a http server

//express.js part
app.use(express.static('public'));  //app serves static files inside public folder

http.listen(3000, function() {
  console.log('listening on *:3000');  //server listen on port 8080 for connections
});
