var FirebaseClient = require("firebase");
var FirebaseTokenGenerator = require("firebase-token-generator");

var Helper = require("./Helper.js");

/**
 * Creates a new Firebase instance.
 *
 * @param location
 * @constructor
 * @author Elad Cohen
 */
var Firebase = function(location){
    var self = this;

    var defaultURL = "https://radiant-heat-8925.firebaseio.com/";
    var defaultToken = "9OiA7yoCdnyp8w3x6MvUZ8lH9u9C6TMoOn0bDd9p";

    var firebaseClient = new FirebaseClient(defaultURL);
    var ref;

    /**
     * Initializes the firebase client.
     *
     * @author Elad Cohen
     */
    function construct(){
        if(Helper.empty(location)){
            location = "";
        }

        firebaseClient.authWithCustomToken(defaultToken, function(error){
            if(error){
                console.log("Could not connect to firebase.");
                //@todo LOG ERROR
            }
            else{
                ref = firebaseClient.child(location);
            }
        });
    }

    /**
     * Sets the object in the specified location.
     *
     * @param obj
     * @author Elad Cohen
     */
    self.set = function(obj){
        if(ref){
            ref.set(obj);
        }
    };

    /**
     * Returns the object in a specified location.
     *
     * @param callback
     * @author Elad Cohen
     */
    self.get = function(callback){
        if(Helper.isFunction(callback) && ref){
            ref.on('value', function(data){
                callback(data);

                ref.off('value');
            });
        }
    };

    /**
     * Generates a firebase token for a specific uid.
     *
     * @param uid
     * @author Elad Cohen
     */
    self.generateToken = function(uid){
        var tokenGenerator = new FirebaseTokenGenerator(defaultToken);

        return tokenGenerator.createToken({"uid": uid});
    };

    construct();
};

module.exports = Firebase;