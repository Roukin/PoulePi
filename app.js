//Globales statiques
var publicHOST = 'http://jbfreymann.hd.free.fr';
var raspberryPrivateIP = '192.168.0.11';

//project's secrets
var secrets = require('secrets');

//node JS required Modules
var compression = require('compression');
var MjpegProxy = require('mjpeg-proxy').MjpegProxy;
var express = require('express');
var path = require('path');
var serveStatic = require('serve-static')
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var http = require("http");
//var routes = require('./routes/index');
//var users = require('./routes/users');
//var MjpegProxy = require('mjpeg-proxy').MjpegProxy;
var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var OpenIdConnectStrategy = require('passport-openidconnect').Strategy;
var passportAuthenticateWithAcrClaims = require('passportAuthenticateWithCustomClaims').PassportAuthenticateWithCustomClaims;

var expressSession = require('express-session');
var Datastore = require('nedb');
var os = require('os');
var diskspace = require('diskspace');
var W1TemperatureSensor = require('w1-temperature-sensor');
var Webcam = require('webcam');
var exec = require('child_process').exec;
var app = express();

//compression GZIP
app.use(compression());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// create a write stream (in append mode)
// var accessLogStream = fs.createWriteStream(__dirname + '/access.log', {flags: 'a'})

// setup the logger
app.use(logger('dev'))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());



// Configuring Passport
// API Access link for creating client ID and secret:
// https://code.google.com/apis/console/
var GOOGLE_CLIENT_ID = "215409127548-685bb2rka0l874n9jp9qljb6j7jpcrg1.apps.googleusercontent.com";
var GOOGLE_CLIENT_SECRET = secrets.GOOGLE_CLIENT_SECRET;

var FC_CLIENT_ID = "6c0804cb6f61865ecb677a8fd418299708a533df28181965137b6f330bf191aa";
var FC_CLIENT_SECRET = secrets.FC_CLIENT_SECRET;

var FCConfig = {
    "clientID": FC_CLIENT_ID,
    "clientSecret": FC_CLIENT_SECRET,
    "callbackURL": "http://jbfreymann.hd.free.fr/oidc_callback",
    "authorizationURL": "https://fcp.integ01.dev-franceconnect.fr/api/v1/authorize",
    "tokenURL": "https://fcp.integ01.dev-franceconnect.fr/api/v1/token",
    "userInfoURL": "https://fcp.integ01.dev-franceconnect.fr/api/v1/userinfo",
    "logoutURL":"https://fcp.integ01.dev-franceconnect.fr/api/v1/logout",
    "acr_values":"eidas2",
    "state":"650e126ef91a26b7902575158a384dd5428f6844215a8a51d0",
    "scope": ["profile", "email", "address", "phone", "openid"]
  }

var strat = function() {
    var strategy = new OpenIdConnectStrategy(FCConfig, function (iss, sub, profile, accesstoke, refreshtoken, done) {
        process.nextTick(function () {
            done(null, profile);
        })
    });

     var alternateAuthenticate = new passportAuthenticateWithAcrClaims(FCConfig.userInfoURL, FCConfig.acr_values);
    strategy.authenticate = alternateAuthenticate.authenticate;
    return strategy;
};

app.use(expressSession({secret: secrets.EXPRESS_SESSION_SECRET, resave: false,
    saveUninitialized: false, cookie: { maxAge: 5184000000000 }}));
app.use(passport.initialize());
app.use(passport.session());

// Use the GoogleStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and Google
//   profile), and invoke a callback with a user object.
passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: publicHOST+"/auth/google/oauth2callback"
  },
  function(accessToken, refreshToken, profile, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
      
      // To keep the example simple, the user's Google profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the Google account with a user record in your database,
      // and return that user instead.
      return done(null, profile);
    });
  }
));

//provider FC
passport.use('openidconnect', strat());

function checkStateParams(req, res, next) {
    //if (req.session.state !== req.query.state) {
     //   return res.status(401).send({error: {'name': 'invalid_state', 'message': 'invalid state'}});
    //} else {
        next();
    //}
}

app.get('/auth/FC', passport.authenticate('openidconnect'), function (req, res) {
});

app.get('/oidc_callback', checkStateParams, function (req, res, next) {
    passport.authenticate('openidconnect', function (err, user) {
        if (err) {
            return next(err);
        }
        if (!user) {
            var errorName = res.req.query.error;
            var errorDescription = res.req.query.error_description;
            return res.send({error: {'name': errorName, 'message': errorDescription}});
        }

        // Let's put the userInfo in session for the debug page
        req.session.userInfo = user._json;
        // Let's also add the callback url that was actually called
        req.session.calledCallbackUrl = req.url;

        req.logIn(user, function (err) {
            if (err) {
                return next(err);
            }
            return res.redirect(302, '/');
        });
    })(req, res, next);
});



app.get('/get-user-displayable-data', function (req, res) {
    res.json({user: req.user});
});


// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete Google profile is serialized
//   and deserialized.
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});
// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { 
    db['logs'].insert({date:new Date,user:req.user.displayName,url:req.url,log:req.user.displayName+" accède à "+req.originalUrl}, function (err, newDoc) {   // Callback is optional
      if (err) { res.send(err)}
        
    });
    next(); 
  }else{
    res.redirect('/loginOrAccount');
  }
}

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticatedForStream(req, res, next) {
  if (req.isAuthenticated()) { next(); }
  else
  {res.redirect('/img/reserve.png');}
}
function ensureAuthenticatedForAdmin(req, res, next) {
  if (req.url != "/admin.html"){
    next();
  } else{
    if (req.isAuthenticated() ) { 
      next();
    }else{
      res.status(403).send("accès Interdit !!! Veuillez vous authentifier. <a href='http://jbfreymann.hd.free.fr'>retour</a>");
    }
  }
}


// Redirect the user to Google for authentication.  When complete, Google
// will redirect the user back to the application at
//     /auth/google/return
app.get('/auth/google', passport.authenticate('google',{scope: 'https://www.googleapis.com/auth/plus.me'}), //, state: new Buffer(querystring.stringify("sourceURL: "+req.query.sourceURL)).toString('base64')}),
  function(req, res) {
    // If this function gets called, authentication was successful.
    // `req.user` contains the authenticated user.
    // res.redirect(req.urlencoded);
  });

// Google will redirect the user to this URL after authentication.  Finish
// the process by verifying the assertion.  If valid, the user will be
// logged in.  Otherwise, authentication has failed.
app.get('/auth/google/oauth2callback', 
  passport.authenticate('google', { successRedirect: publicHOST+'/',
                                    failureRedirect: publicHOST+'/login',
                                  failureFlash: true,
                                  successFlash: true}));

// app.get('/auth/google/oauth2callback', function(req, res, next) {
//   passport.authenticate('google', function(err, user, info) {
//     if (err) { return res.redirect('/login'); }
//     if (!user) { return res.redirect('/login'); }
//     req.logIn(user, function(err) {
//       if (err) { return next(err); }
//       return res.redirect(querystring.parse(new Buffer(req.query.state, 'base64').toString('UTF-8')).sourceURL);
//     });
//   })(req, res, next);
// });


app.get('/logout', function(req, res){
  req.logout();
  req.session.destroy();
  res.redirect(FCConfig.logoutURL+"?post_logout_redirect_uri="+publicHOST);
});

app.get('/account',ensureAuthenticated,function(req, res){
  if (!req.user.emails){
    req.user.emails = ["mail inconnu"];
  }
  res.render('account', { user: req.user });
});

//handle request or account
app.get('/loginOrAccount',function(req, res){
  if (req.isAuthenticated()) { 
    return res.redirect('/account'); 
  } else {
    res.redirect('/login.html');
  }
});






//init Database
var db = [];
db['temperature'] = new Datastore({ filename: 'data/temperatures.store' , autoload: true });
db['webcamcaptureinterieur'] = new Datastore({ filename: 'data/webcamcaptureinterieur.store' , autoload: true });
db['webcamcaptureexterieur'] = new Datastore({ filename: 'data/webcamcaptureexterieur.store' , autoload: true });
db['logs'] = new Datastore({ filename: 'data/logs.store' , autoload: true });

// Using a sparse unique index
db['temperature'].ensureIndex({ fieldName: 'date', unique: true, sparse: true }, null);
db['webcamcaptureinterieur'].ensureIndex({ fieldName: 'date', unique: true, sparse: true }, null);
db['webcamcaptureexterieur'].ensureIndex({ fieldName: 'date', unique: true, sparse: true }, null);

//init sensors
var temperatureSensors = new W1TemperatureSensor([{id:'28-0000069f9f59',name:'interieur'},{id:'28-000006c7a24c',name:'exterieur'}]);
//sensors['temperatureexterieure'] = new W1TemperatureSensor('');

var webcams = [];
webcams['interieur'] = new Webcam('/dev/video3', '/home/pi/cocotte/static/webcam/timelapse/interieur');
webcams['exterieur'] = new Webcam('/dev/video2', '/home/pi/cocotte/static/webcam/timelapse/exterieur');

//simple function to launch température storing.
//called by webCRON thnaks to GET publication
function launchTemperatureStoring(req, res){
  temperatureSensors.getCurrent(function(TemperatureObjectToStore){
    
   // sensors['temperatureexterieure'].getCurrent();
    db['temperature'].insert(TemperatureObjectToStore, function (err, tempObj) {   // Callback is optional
      if (err) { res.send(err)}
        else
          res.send("temperatures sauvegardées"+JSON.stringify(tempObj));
    });
  });
  
}

//simple function to launch température storing.
//called by webCRON thnaks to GET publication
function launchWebcamCaptureStoring(req, res){
  webcams['interieur'].capture(function(pathToCapture){
    db['webcamcaptureinterieur'].insert({date:new Date(),path:"/webcam/timelapse/interieur/" + pathToCapture});
  });
  webcams['exterieur'].capture(function(pathToCapture){
    db['webcamcaptureexterieur'].insert({date:new Date(),path:"/webcam/timelapse/exterieur/" + pathToCapture});
  });
  
  res.send("capture en cours");
}


//point d'activation de l'enregistrement d'une capture periodique appele par CRON
app.get('/data/storeWebcamCapture', launchWebcamCaptureStoring);


//point d'activation de l'enregistrement d'un etempérature appele par CRON
app.get('/data/storeCurrentTemp', launchTemperatureStoring);

//point d'acces infos systemes
app.get('/data/system', ensureAuthenticatedForAdmin, function(req,res){
  var delta = os.uptime();
  var days = Math.floor(delta / 86400);
  delta -= days * 86400;
  var hours = Math.floor(delta / 3600) % 24;
  delta -= hours * 3600;
  var minutes = Math.floor(delta / 60) % 60;
  delta -= minutes * 60;
  var uptime = days + "j, " + hours + " h, " + minutes + " m";


  var RAM = {free:os.freemem(),total: os.totalmem()};
  
  var CPUload = os.loadavg();

  var NodeService = "";
  var UV4L = "ps -A | grep uv4l";
  var w1sensors = "ps -A | grep w1_bus_master1";

  var disk = {};
  diskspace.check('/', function (err, total, free, status)
  {
    console.log(status + err);
    if (status == 'READY'){
      disk.total = total;
      disk.free = free;
    }
    res.send(JSON.stringify({
      uptime:uptime,
      ram:RAM,
      disk:disk,
      cpu:CPUload
    }));
  });
  
});


// app.get('/data/timelapse', function(req,res){
//   fs.readdir('/home/pi/cocotte/static/webcam/timelapse/interieur', new function(err, files){
//       if (err){
//         console.log('impossible de lire le repertoire timelpase/interieur:' + err);
//       }else{
//         console.log('repertoire listé:'+files+err);
//         res.end(JSON.stringify(files));
//       }
//   });
// });

//entry point for node logs
app.get('/data/nodelogfile', ensureAuthenticatedForAdmin, function(req, res){
  exec('tail -n 100 /home/pi/cocote/.forever/forever.log', function (error, stdout, stderr) {
    if (error !== null) {
      console.log('exec error: ' + error);
      console.log('stderr: ' + stderr);
    }else{
      res.send(stdout);
    } 
  });
});

//entry point for node logs
app.get('/system/restart/:service', ensureAuthenticatedForAdmin, function(req, res){
  exec('sudo service '+service+' restart', function (error, stdout, stderr) {
    if (error !== null) {
      console.log('exec error: ' + error);
      console.log('stderr: ' + stderr);
    }else{      
          res.send('service relancé avec succès:'+stdout);        
    } 
  });
});

//entry point for data retrieve
app.get('/data/:datastore/', function(req, res){
  // req.query.filter;
  // var limit = (req.query.limit?;
  var sort = (req.query.sort == 'desc'? -1:1);
  var maxAge = new Date();
  var limite = (req.query.limit?req.query.limit:null)
  maxAge.setDate(maxAge.getDate() - (req.query.maxAge?req.query.maxAge:1));

  if (req.query.action == 'purge'){
    // Remove multiple documents
    db[req.params.datastore].remove({ "date": { $lt: maxAge } }, { multi: true }, function (err, numRemoved) {
      if (err) {res.status(500).send({ error: 'something went wrong', details: err });}
      else{
        res.send(numRemoved+" enregistrements supprimes");
      }
    });
  }else if(req.query.action == 'count'){
    // Count all documents in the datastore
    db[req.params.datastore].count({}, function (err, count) {
    if (err) {res.status(500).send({ error: 'something went wrong', details: err });}
      else{
        res.send({name:req.params.datastore,count:count});
      }
  });
}else{

    db[req.params.datastore].find({ "date": { $gt: maxAge } }).sort({ date: sort}).limit(limite).exec(function (err, docs) {
      if (err) {res.status(500).send({ error: 'something went wrong', details: err });}
      else{
        res.send(docs);
      }
    });
  }
});



//app.use('/', routes);
//app.use('/users', users);
app.get('/streamExt', ensureAuthenticatedForStream, new MjpegProxy('http://192.168.0.11:8080/stream/video.mjpeg').proxyRequest);
app.get('/streamInt', ensureAuthenticatedForStream, new MjpegProxy('http://192.168.0.11:8085/stream/video.mjpeg').proxyRequest);
/*
app.get('/streamInt', function(req, res) {

    //var boundary = "BoundaryString";
    var boundary = "--boundary";
    var clientResEnded = false;
  var options = {
    // host to forward to
    host:   '192.168.0.11',
    // port to forward to
    port:   8085,
    // path to forward to
    path:   '/stream/video.mjpeg',
    // request method
    method: 'GET',
    // headers to send
    headers: req.headerss
  };
  

  var creq = http.request(options, function(cres) {

        res.setHeader('Content-Type', 'multipart/x-mixed-replace;boundary="' + boundary + '"');
        //res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Connection', 'close');
        //res.setHeader('Connection', 'Keep-Alive');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Cache-Control', 'no-cache, private');
        res.setHeader('Expires', 0);
        res.setHeader('Max-Age', 0);
        //res.setHeader('Transfer-Encoding','chunked');
    
    
    
    // wait for data
    cres.on('data', function(chunk){
      console.log("data sur cres, onrecopie sur res");
      res.write(chunk);
    });

     cres.on('close', function(){
      // closed, let's end client request as well 
      console.log("creq.onclose");

      if (!clientResEnded){
        console.log("client response tjrs en court donc on la termine avec staut="+cres.statusCode);

        res.writeHead(cres.statusCode);
        res.end();
      }
    });

  }).on('error', function(e) {
    // we got an error, return 500 error to client and log error
    console.log("creq.onerror"+e.message);
    if (!clientResEnded){
      res.writeHead(500);
      res.end();
    }
    creq.end();
  });
  //tuer connexion au aval si plus de client en amont
    res.on('close', function(){
      // closed, let's end client request as well 
      clientResEnded = true;
      console.log("res.onclose. le client a quitte le streaming");
      console.log("creq.abort va etre appelé");
      creq.abort();
      //res.end();
    });
  
  creq.end();
  console.log("creq.end() proxiing en cours");


});*/

app.use(ensureAuthenticatedForAdmin, serveStatic('static/', {'index': ['index.html', 'index.htm']}));


// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
