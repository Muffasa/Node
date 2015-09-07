var express = require("express");
var cookieParser = require("cookie-parser");
var session = require("express-session");
var bodyParser = require("body-parser");
var md5 = require('MD5');
var WebServiceController = require("./Controller/WebServiceController.js");
var app = express();
var busboy = require("connect-busboy");

/**
 * Server initialization starts here.
 *
 * @constructor
 * @author Elad Cohen
 */
function SayvU(){
    var self = this;

    self.configureExpress = function(){
        app.use(busboy({
            'limits': {
                'filesize': 10 * 1024 * 1024 //10MB file upload limit
            }
        }));
        app.use(bodyParser.urlencoded({extended: true}));
        app.use(bodyParser.json());
        app.use(cookieParser());
        app.use(session({
            'secret': 'dfjkgh3thHFKJDHGehurih398r2ohgkdjfghaoihg',
            'resave': false,
            'saveUninitialized': true,
            'cookie': {'secure': true}
        }));

        new WebServiceController(app, md5);

        self.startServer();
    };

    self.startServer = function() {
        var PORT = process.env.PORT || '8080'
        app.listen(PORT, '0.0.0.0',function(){
            console.log("Server is running at port " + PORT);
        });
    };

    self.configureExpress();
}

new SayvU();