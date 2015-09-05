var async = require("async");
var Helper = require("./../General/Helper.js");
var DB = require("./../Database/DB.js");
var Translation = require("./../General/Translation.js");
var Nuance = require("./../Audio/Nuance.js");
var EmergencyWords = require("./EmergencyWords.js");

/**
 * Creates a new EmergencyCategory instance.
 *
 * @param emergencyCatID
 * @param initWithQuery
 * @param languageID
 * @param callback
 * @constructor
 * @author Elad Cohen
 */
var EmergencyCategory = function(emergencyCatID, initWithQuery, languageID, callback){
    var self = this;

    var emergencyCatName = "";
    var icon = "";

    self.languageID = 1;
    self.dbFields = ["EmergencyCatID", "TranslationCode", "Icon"];
    self.tableName = "emergency_categories";

    /**
     * Constructor - creates an EmergencyCategory instance.
     *
     * @author Elad Cohen
     */
    var constructor = function(){
        if(Helper.empty(emergencyCatID) || !Helper.isPositiveInteger(emergencyCatID)){
            emergencyCatID = 0;
        }

        if(!Helper.empty(languageID) && Helper.isPositiveInteger(languageID)){
            self.languageID = languageID;
        }

        if(initWithQuery && !Helper.empty(emergencyCatID)){
            self.getEmergencyCategoryData(function(){
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
     * Get the emergency category's data.
     *
     * @param callback
     * @author Elad Cohen
     */
    self.getEmergencyCategoryData = function(callback){
        if(typeof callback !== 'function'){
            return {};
        }

        if(Helper.empty(emergencyCatID) || !Helper.isPositiveInteger(emergencyCatID)){
            callback({});
        }

        async.waterfall([
            function(cb){ //Fetches the record
                new DB.instance().fetchBasicRecordData("EmergencyCatID", emergencyCatID, self.dbFields, self.tableName, function(result){
                    cb(null, result);
                });
            },
            function(result, cb){ //Updates the name
                Translation.getTranslationValue(result["TranslationCode"], self.languageID, function(res){
                    self.setEmergencyCatName(res);

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
     * Returns the most probable related category from a given strings.
     *
     * @param strings
     * @param languageID
     * @param callback
     * @author Elad Cohen
     */
    self.getCategoryFromAudioStrings = function(strings, languageID, callback){
        if(Helper.empty(languageID) || !Helper.isPositiveInteger(languageID)){
            languageID = 1;
        }

        var nuance = new Nuance();
        var emergencyWords = new EmergencyWords(0, false);

        emergencyWords.getAllEmergencyWords(languageID, function(words){
            var result = nuance.getOptionFromAudioStrings(strings, words, "EmergencyCatID");

            callback(result);
        });
    };

    /**
     * Sets the emergency cat ID.
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
     * Returns the emergency cat ID.
     *
     * @returns {*}
     * @author Elad Cohen
     */
    self.getEmergencyCatID = function(){
        return emergencyCatID;
    };

    /**
     * Sets the emergency category's name.
     *
     * @param val
     * @author Elad Cohen
     */
    self.setEmergencyCatName = function(val){
        emergencyCatName = val;
    };

    /**
     * Returns the emergency category's name.
     *
     * @returns {string}
     * @author Elad Cohen
     */
    self.getEmergencyCatName = function(){
        return emergencyCatName;
    };

    /**
     * Sets the emergency category's icon.
     *
     * @param val
     * @author Elad Cohen
     */
    self.setIcon = function(val){
        icon = val;
    };

    /**
     * Returns the emergency category's icon.
     *
     * @returns {string}
     * @author Elad Cohen
     */
    self.getIcon = function(){
        return icon;
    };

    constructor();
};

module.exports = EmergencyCategory;