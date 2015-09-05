var https = require("https");

var Helper = require("./Helper.js");

/**
 * Creates a new GCM instance.
 *
 * @constructor
 * @author Elad Cohen
 */
var GCM = function(){
    var self = this;

    var apiKey = "AIzaSyBfc9x2PEjlqATNnGNVxcXO5L8c5DXvVk8";

    /**
     * Sends a GCM message to specific clients.
     *
     * @param data
     * @param ids
     * @param callback
     * @author Elad Cohen
     */
    self.sendMessage = function(data, ids, callback){
        if(Helper.empty(data) || Helper.empty(ids) || !Helper.isArray(ids) || typeof data !== 'object'){
            if(Helper.isFunction(callback)){
                callback(false);
            }

            return;
        }

        var fields = {
            'registration_ids': ids,
            'data': data
        };

        fields = JSON.stringify(fields);

        var headers = {
            'Authorization': 'key = ' + apiKey,
            'Content-Type': 'application/json'
        };

        var options = {
            'host': 'android.googleapis.com',
            'path': '/gcm/send',
            'headers': headers,
            'method': 'POST'
        };

        https.request(options, function(response){
            var str = '';

            response.on('data', function (chunk) {
                str += chunk;
            });

            response.on('end', function (){
                var resp = JSON.parse(str);

                if(Helper.isFunction(callback)){
                    callback(resp);
                }
            });
        }).end(fields);
    };
};

module.exports = new GCM();