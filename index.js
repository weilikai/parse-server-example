// Example express application adding the parse-server module to expose Parse
// compatible API routes.

var express = require('express');
var ParseServer = require('parse-server').ParseServer;
var ParseDashboard = require('parse-dashboard');
var Parse = require('parse/node');
var path = require('path');

var databaseUri = process.env.DATABASE_URI || process.env.MONGODB_URI;

if (!databaseUri) {
  console.log('DATABASE_URI not specified, falling back to localhost.');
}



// Client-keys like the javascript key or the .NET key are not necessary with parse-server
// If you wish you require them, you can set them as options in the initialization above:
// javascriptKey, restAPIKey, dotNetKey, clientKey

var app = express();

// Serve static assets from the /public folder
app.use('/public', express.static(path.join(__dirname, '/public')));

var allowInsecureHTTP = false;



var port = process.env.PORT || 1337;
var httpServer = require('http').createServer(app);
httpServer.listen(1337, function() {
    console.log('parse-server-example running on port ' + port + '.');
});


const runningParses = {};

function reload(app, appId, masterKey) {
  if (!appId || !masterKey) {
    return;
  }
  if (runningParses[appId]) {
    console.warn(appId + '已经在运行');
    return;
  }
  runningParses[appId] = appId;

  var api = new ParseServer({
    databaseURI: databaseUri || 'mongodb://localhost:27017/' + appId,
    cloud: process.env.CLOUD_CODE_MAIN || __dirname + '/cloud/main.js',
    appId: appId,
    masterKey: masterKey, //Add your master key here. Keep it secret!
    serverURL: 'http://localhost:1337/' + appId,  // Don't forget to change to https if needed
    liveQuery: {
      classNames: ["Posts", "Comments"] // List of classes to support for query subscriptions
    }
  });

  var dashboard = new ParseDashboard({
    "apps": [
      {
        "serverURL": 'http://localhost:1337/' + appId,
        "appId": appId,
        "masterKey": masterKey,
        "appName": appId
      }
    ]
  }, allowInsecureHTTP);

  app.use('/' + appId, api);
  app.use('/dashboard-' + appId + '', dashboard);
}


Parse.initialize('admin', 'admin');
Parse.serverURL = 'http://localhost:1337/admin';

reload(app, 'admin', 'admin');


setInterval(()=>{
  new Parse.Query(new Parse.Object('ParseInfo')).find().then(items => {
    items.map((item, index) => {
      var appId = item.get('appId');
      var masterKey = item.get('masterKey');
      console.log(appId, masterKey, index);

      reload(app, appId, masterKey);
    });


  }, e=> {
    console.log(e);
  });
}, 1000);

// This will enable the Live Query real-time server
ParseServer.createLiveQueryServer(httpServer);
