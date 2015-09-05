var Memcache = require('memcache');
var Helper = require("./Helper.js");

/**
 * Creates a new MemcacheHandler instance.
 *
 * @constructor
 * @author Elad Cohen
 */
var MemcacheHandler = function(){
    var self = this;

    var isConnected = false;
    var port = 11211;
    var server = "localhost";
    var connection = new Memcache.Client(port, server);

    connection.on("connect", function(){
        isConnected = true;
    });

    connection.on("error", function(){
        isConnected = false;
    });

    connection.connect();

    /**
     * Returns a key's value.
     *
     * @param key
     * @param callback
     */
    self.get = function(key, callback){
        if(isConnected){
            connection.get(key, function(error, result){
                if(result == 'NOT_STORED' || !Helper.empty(error)){
                    if(Helper.isFunction(callback)){
                        callback(false);
                    }
                }
                else{
                    if(Helper.isFunction(callback)){
                        callback(result);
                    }
                }
            });
        }
        else if(Helper.isFunction(callback)){
            callback(false);
        }
    };

    /**
     * Sets a key's value.
     *
     * @param key
     * @param value
     * @param time
     * @param callback
     */
    self.set = function(key, value, time, callback){
        if(isConnected){
            connection.set(key, value, function(error, result){
                if(!Helper.empty(error) || Helper.empty(result)){
                    callback(false);
                }
                else{
                    callback(true);
                }
            }, time);
        }
        else if(Helper.isFunction(callback)){
            callback(false);
        }
    };

    /**
     * Deletes a key.
     *
     * @param key
     * @param callback
     * @returns {boolean}
     * @author Elad Cohen
     */
    self.delete = function(key, callback){
        if(isConnected){
            connection.delete(key, function(error, result){
                if(!Helper.empty(error) || Helper.empty(result)){
                    callback(false);
                }
                else{
                    callback(true);
                }
            });
        }
        else if(Helper.isFunction(callback)){
            callback(false);
        }
    };

    /**
     * Closes the connection.
     *
     * @author Elad Cohen
     */
    self.close = function(){
        if(isConnected){
            connection.close();
        }
    };
};

module.exports = MemcacheHandler;