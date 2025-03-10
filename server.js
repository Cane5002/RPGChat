const https = require('https');
const http = require('http');
const app = require('./app');
const fs = require('fs');
const config = require('config');
const  httpport = process.env.PORT || config.get('host').httpport || 3080,
       httpsport = process.env.SECURE_PORT || config.get('host').httpsport || 3443;

var httpsOptions = {
    key: fs.readFileSync('./app/cert/server.key')
    , cert: fs.readFileSync('./app/cert/server.crt')
};

app.all('*', function(req, res, next) {
    if (req.secure) {
        return next();
    }
    res.redirect('https://cut-lava-sternum.glitch.me'+httpsport+req.url);
});

https.createServer(httpsOptions, app).listen(httpsport, function (err) {
    if (err) {
        throw err
    }
    console.log('Secure server is listening on '+httpsport+'...');
});

http.createServer(app).listen(httpport, function(err) {
    if (err) {
        throw err
    }
    console.log('Insecure server is listening on port ' + httpport + '...');
});
