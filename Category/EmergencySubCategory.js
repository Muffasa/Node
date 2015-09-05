var async = require("async");
var Helper = require("./../General/Helper.js");
var DB = require("./../Database/DB.js");
var Translation = require("./../General/Translation.js");
var Nuance = require("./../Audio/Nuance.js");
var EmergencyWords = require("./EmergencyWords.js");

/**
 * Creates a new EmergencySubCategory instance.
 *
 * @param emergencySubCatID
 * @param initWithQuery
 * @param languageID
 * @param callback
 * @constructor
 * @author Elad Cohen
 */
var EmergencySubCategory = function(emergencySubCatID, initWithQuery, languageID, callback){
    var self = this;

    var emergencyCatID;
    var emergencySubCatName = "";

    self.languageID = 1;
    self.dbFields = ["EmergencySubCatID", "EmergencyCatID", "TranslationCode"];
    self.tableName = "emergency_subcategories";

    /**
     * Constructor - creates an EmergencySubCategory instance.
     *
     * @author Elad Cohen
     */
    var constructor = function(){
        if(Helper.empty(emergencySubCatID) || !Helper.isPositiveInteger(emergencySubCatID)){
            emergencySubCatID = 0;
        }

        if(!Helper.empty(languageID) && Helper.isPositiveInteger(languageID)){
            self.languageID = languageID;
        }

        if(initWithQuery && !Helper.empty(emergencySubCatID)){
            self.getEmergencySubCategoryData(function(){
                if(Helper.isFunction(callback)){
                    callback(self);
                }
            });
        }
        else if(Helper.isFunction(callback)){
            callback(self);
        }
    };

    /**
     * Get the emergency subcategory's data.
     *
     * @param callback
     * @author Elad Cohen
     */
    self.getEmergencySubCategoryData = function(callback){
        if(Helper.empty(emergencySubCatID) || !Helper.isPositiveInteger(emergencySubCatID)){
            callback({});
        }

        async.waterfall([
            function(cb){ //Fetches the record
                new DB.instance().fetchBasicRecordData("EmergencySubCatID", emergencySubCatID, self.dbFields, self.tableName, function(result){
                    cb(null, result);
                });
            },
            function(result, cb){ //Updates the name
                Translation.getTranslationValue(result["TranslationCode"], self.languageID, function(res){
                    self.setEmergencySubCatName(res);

                    cb(null, result);
                });
            }
        ],
        function(err, result){
            Helper.updateInstanceDataFromRow(self, result);
            callback(result); //We are done and we can now call our callback
        });
    };

    /**
     * Returns the most probable related subcategory from a given strings.
     *
     * @param strings
     * @param languageID
     * @param callback
     * @author Elad Cohen
     */
    self.getSubCategoryFromAudioStrings = function(strings, languageID, callback){
        if(Helper.empty(languageID) || !Helper.isPositiveInteger(languageID)){
            languageID = 1;
        }

        var nuance = new Nuance();
        var emergencyWords = new EmergencyWords(0, true);

        emergencyWords.getAllEmergencyWords(languageID, function(words){
            var result = nuance.getOptionFromAudioStrings(strings, words, "EmergencySubCatID");

            callback(result);
        });
    };

    /**
     * Sets the emergency subcategory's ID.
     *
     * @param val
     * @author Elad Cohen
     */
    self.setEmergencySubCatID = function(val){
        emergencySubCatID = val;
    };

    /**
     * Returns the emergency subcategory's ID.
     *
     * @returns {*}
     * @author Elad Cohen
     */
    self.getEmergencySubCatID = function(){
        return emergencySubCatID;
    };

    /**
     * Sets the emergency category ID.
     *
     * @param val
     * @author Elad Cohen
     */
    self.setEmergencyCatID = function(val){
        if(!Helper.empty(val) && Helper.isPositiveInteger(val)){
            emergencyCatID = val;
        }
    };

    /**
     * Returns the emergency category ID.
     *
     * @returns {*}
     * @author Elad Cohen
     */
    self.getEmergencyCatID = function(){
        return emergencyCatID;
    };

    /**
     * Sets the emergency subcategory's name.
     *
     * @param val
     * @author Elad Cohen
     */
    self.setEmergencySubCatName = function(val){
        emergencySubCatName = val;
    };

    /**
     * Returns the emergency subcategory's name.
     *
     * @returns {string}
     * @author Elad Cohen
     */
    self.getEmergencySubCatName = function(){
        return emergencySubCatName;
    };

    constructor();
};

module.exports = EmergencySubCategory;