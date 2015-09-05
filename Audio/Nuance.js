var NuanceClient = require("nuance");

var Helper = require("./../General/Helper.js");
var Strings = require("./../General/Strings.js");
var DB = require("./../Database/DB.js");
var GeneralFields = require("./../Fields/GeneralFields.js");
var CloudStorage = require("./../General/CloudStorage.js");
var Native = require("./../General/Native.js");

/**
 * Creates a new Nuance instance.
 *
 * @param reporterID
 * @param languageID
 * @param reportID
 * @constructor
 * @author Elad Cohen
 */
var Nuance = function(reporterID, languageID, reportID){
    var self = this;
    var nuanceClient = new NuanceClient();

    var filePath;
    var audioFilePath = "audio";
    var allowedFileExtension = 'amr';

    self.dbFields = ["NuanceID", "Identifier", "ReporterID"];
    self.tableName = "nuance";

    function construct(){
        if(Helper.empty(languageID) || !Helper.isPositiveInteger(languageID)){
            languageID = 1;
        }

        if(Helper.empty(reporterID) || !Helper.isPositiveInteger(reporterID)){
            reporterID = 0;
        }

        if(Helper.empty(reportID) || !Helper.isPositiveInteger(reportID)){
            reportID = 0;
        }
    }

    /**
     * Sends the request to nuance.
     *
     * @param callback
     * @author Elad Cohen
     */
    self.request = function(callback){
        if(typeof callback !== 'function'){
            return;
        }

        self.getLanguageFromID(languageID, function(lang){
            self.getIdentifierFromDB(function(identifier){
                nuanceClient.sendRequest(lang, identifier, {}, callback);
            });
        });
    };

    /**
     * Saves an audio file to the cloud.
     *
     * @param fileName
     * @param callback
     * @author Elad Cohen
     */
    self.saveAudioFile = function(fileName, callback){
        if(Helper.empty(fileName) || Helper.empty(reporterID) || !Helper.isPositiveInteger(reporterID)){
            if(Helper.isFunction(callback)){
                callback(false);
            }

            return;
        }

        var fileExtension = Helper.getFileExtension(fileName).toLowerCase();

        if(fileExtension != allowedFileExtension){
            if(Helper.isFunction(callback)){
                callback(false);
            }

            return;
        }

        nuanceClient.loadFile(fileName, function(fileLoaded){
            if(fileLoaded){
                var newFileName = reporterID + "_" + Native.time() + "." + Helper.getFileExtension(fileName);
                var savePath;

                if(Helper.empty(reportID)){
                    savePath = audioFilePath + "/newReports/" + newFileName;
                }
                else{
                    savePath = audioFilePath + "/reports/" + newFileName;
                }

                CloudStorage.uploadFile(fileName, savePath, function(fileSaved){
                    if(fileSaved){
                        filePath = savePath;
                    }

                    callback(fileSaved);
                });
            }
            else if(Helper.isFunction(callback)){
                callback(false);
            }
        });
    };

    /**
     * Returns the nuance's language according to specific LanguageID.
     *
     * @param languageID
     * @param callback
     * @author Elad Cohen
     */
    self.getLanguageFromID = function(languageID, callback){
        if(typeof callback !== 'function'){
            return;
        }

        if(Helper.empty(languageID) || !Helper.isPositiveInteger(languageID)){
            languageID = 1;
        }

        GeneralFields.getAllLanguages(function(languages){
            for(var i = 0; i < languages.length; i++){
                if(languages[i]['value'] == languageID){
                    callback(languages[i]['Nuance']);

                    return;
                }
            }

            callback("heb_ISR");
        });
    };

    /**
     * Returns the reporter's identifier from the database or creates a new one if the identifier does not exist.
     *
     * @param callback
     * @author Elad Cohen
     */
    self.getIdentifierFromDB = function(callback){
        if(typeof callback !== 'function'){
            return;
        }

        var selectParams = ["Identifier"];

        new DB.instance().fetchBasicRecordData("ReporterID", reporterID, selectParams, self.tableName, function(result){
            if(!Helper.empty(result['Identifier'])){
                callback(result['Identifier']);
            }
            else{
                self.getIdentifier(callback);
            }
        });
    };

    /**
     * Creates and return a special identifier for the user.
     *
     * @param callback
     * @author Elad Cohen
     */
    self.getIdentifier = function(callback){
        if(typeof callback !== 'function'){
            return;
        }

        var identifier = Strings.generateRandomString(40);

        new DB.instance().add("Identifier", identifier).add("ReporterID", reporterID).insert(self.tableName, function(){
            callback(identifier);
        });
    };

    /**
     * Returns the most probable related option from a given strings.
     *
     * @param strings
     * @param words
     * @param optionName
     * @returns {{}}
     * @author Elad Cohen
     */
    self.getOptionFromAudioStrings = function(strings, words, optionName){
        var ret = {};

        if(Helper.empty(strings) || Helper.empty(words) || Helper.empty(optionName) || !(words instanceof Array)){
            ret[optionName] = 0;
            ret['Precision'] = 0;

            return ret;
        }

        if(!(strings instanceof Array)){
            strings = [strings];
        }

        var options = {};
        var alreadyFoundWords = {};

        for(var i = 0; i < strings.length; i++){
            var string = strings[i].toLowerCase();

            for(var j = 0; j < words.length; j++){
                var word = words[j];

                var wordString = word['Value'].toLowerCase();
                var optionID = word[optionName];
                var precision = word["Precision"];

                var wordStringSpace1 = wordString + " ";
                var wordStringSpace2 = " " + wordString;

                if(string.indexOf(wordStringSpace1) != -1 || string.indexOf(wordStringSpace2) != -1 || string == wordString){
                    if(typeof alreadyFoundWords[optionID] === 'undefined' || !Helper.inArray(wordString, alreadyFoundWords[optionID])){ //Making sure we haven't treated this word yet
                        if(typeof options[optionID] !== 'undefined'){ //We already found some words that are related to the subcategory
                            if(precision > options[optionID]){ //The new precision is better than the one we have already found
                                options[optionID] = precision;
                            }
                            else{
                                options[optionID] += precision / 10; //We can add the precision, but not at its full value
                            }
                        }
                        else{
                            options[optionID] = precision;
                        }

                        if(typeof alreadyFoundWords[optionID] === 'undefined'){
                            alreadyFoundWords[optionID] = [];
                        }

                        alreadyFoundWords[optionID].push(wordString);
                    }
                }
            }
        }

        var highestPrecision = 0;
        var highestOption = 0;

        for(var catID in options){
            if(options.hasOwnProperty(catID)){
                var p = options[catID];

                if(p > highestPrecision){
                    highestPrecision = p;
                    highestOption = catID;
                }
            }
        }

        ret[optionName] = highestOption;
        ret['Precision'] = highestPrecision;

        return ret;
    };

    /**
     * Returns the save file's path.
     *
     * @returns {*}
     * @author Elad Cohen
     */
    self.getFilePath = function(){
        return filePath;
    };

    construct();
};

module.exports = Nuance;