var async = require("async");

var Helper = require("./Helper.js");
var DB = require("./../Database/DB.js");
var GeneralFields = require("./../Fields/GeneralFields.js");
var Maps = require("./../General/Maps.js");

/**
 * Creates a new Address instance.
 *
 * @constructor
 * @author Elad Cohen
 */
var Address = function(){
    var self = this;

    self.dbFields = ["AddressID", "AddressCode", "LanguageID", "LocationX", "LocationY", "Address"];
    self.tableName = "addresses";

    /**
     * Adds an address to the database and returns the addressCode.
     *
     * @param lat
     * @param lng
     * @param callback
     * @returns {number}
     * @author Elad Cohen
     */
    self.addAddress = function(lat, lng, callback){
        if(Helper.empty(lat) || Helper.empty(lng) || !Helper.isTrueFloat(lat) || !Helper.isTrueFloat(lng)){
            if(Helper.isFunction(callback)){
                callback(0);
            }

            return 0;
        }

        self.getLastAddressCode(function(lastAddressCode){
            lastAddressCode++;

            GeneralFields.getAllLanguages(function(languages){
                var counter = 0;

                async.waterfall([
                    function(cb){
                        for(var i = 0; i < languages.length; i++){
                            var languageID = languages[i]["value"];

                            (function(languageID){
                                self.getAddressCodeByCoordinates(lat, lng, function(existingAddressCode){
                                    if(!Helper.empty(existingAddressCode)){
                                        lastAddressCode = existingAddressCode;
                                        counter++;
                                        cb();

                                        return false;
                                    }

                                    Maps.getAddressFromCoordinates(lat, lng, languageID, function(address){
                                        if(Helper.empty(address)){
                                            counter++;
                                            cb();

                                            return false;
                                        }

                                        new DB.instance()
                                            .add("AddressCode", lastAddressCode)
                                            .add("LanguageID", languageID)
                                            .add("LocationX", lat)
                                            .add("LocationY", lng)
                                            .add("Address", address).insert(self.tableName, function(){
                                                counter++;
                                                cb();
                                        });
                                    });
                                });
                            })(languageID);
                        }
                    },
                    function(cb){
                        if(counter == languages.length - 1){
                            cb();
                        }
                    }
                ],
                function(error, result){
                    callback(lastAddressCode);
                });
            });
        });
    };

    /**
     * Returns an address code from a given coordinates.
     *
     * @param lat
     * @param lng
     * @param callback
     * @returns {number}
     * @author Elad Cohen
     */
    self.getAddressCodeByCoordinates = function(lat, lng, callback){
        if(typeof callback !== 'function'){
            return 0;
        }

        if(Helper.empty(lat) || Helper.empty(lng) || !Helper.isTrueFloat(lat) || !Helper.isTrueFloat(lng)){
            callback(0);
        }

        new DB.instance().where("LocationX", lat).where("LocationY", lng).setLimit(1).select(["AddressCode"], self.tableName, function(result){
            if(!Helper.empty(result)){
                callback(result[0]["AddressCode"]);
            }
            else{
                callback(0);
            }
        });
    };

    /**
     * Returns the address by a specific coordinates in a specific LanguageID.
     *
     * @param lat
     * @param lng
     * @param languageID
     * @param callback
     * @returns {string}
     * @author Elad Cohen
     */
    self.getAddressByCoordinates = function(lat, lng, languageID, callback){
        if(typeof callback !== 'function'){
            return "";
        }

        if(Helper.empty(lat) || Helper.empty(lng) || !Helper.isTrueFloat(lat) || !Helper.isTrueFloat(lng)){
            callback("");
        }

        if(Helper.empty(languageID) || !Helper.isPositiveInteger(languageID)){
            languageID = 1;
        }

        new DB.instance().where("LocationX", lat).where("LocationY", lng).where("LanguageID", languageID).select(["Address"], self.tableName, function(result){
            if(!Helper.empty(result)){
                callback(result[0]["Address"]);
            }
            else{
                callback(0);
            }
        });
    };

    /**
     * Returns an address by a specific AddressCode and specific LanguageID.
     *
     * @param addressCode
     * @param languageID
     * @param callback
     * @returns {string}
     * @author Elad Cohen
     */
    self.getAddressByCode = function(addressCode, languageID, callback){
        if(typeof callback !== 'function'){
            return "";
        }

        if(Helper.empty(addressCode) || Helper.empty(languageID) || !Helper.isPositiveInteger(addressCode) || !Helper.isPositiveInteger(languageID)){
            callback("");
        }

        if(Helper.empty(languageID) || !Helper.isPositiveInteger(languageID)){
            languageID = 1;
        }

        new DB.instance().where("AddressCode", addressCode).where("LanguageID", languageID).select(["Address"], self.tableName, function(result){
            if(!Helper.empty(result)){
                callback(result[0]["Address"]);
            }
            else{
                callback("");
            }
        });
    };

    /**
     * Returns the last address code.
     *
     * @param callback
     * @returns {number}
     * @author Elad Cohen
     */
    self.getLastAddressCode = function(callback){
        if(typeof callback !== 'function'){
            return -1;
        }

        new DB.instance().select(["MAX(AddressCode) AS c"], self.tableName, function(res){
            if(Helper.isFunction(callback)){
                callback(res[0]["c"]);
            }
        });
    };
};

module.exports = new Address();