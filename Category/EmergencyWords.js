var Helper = require("./../General/Helper.js");
var DB = require("./../Database/DB.js");

/**
 * Creates a new EmergencyWords instance.
 *
 * @param emergencyID
 * @param isSubCategory
 * @constructor
 * @author Elad Cohen
 */
var EmergencyWords = function(emergencyID, isSubCategory){
    var self = this;

    var _useEmergencyRecordName;
    var _useRecordName;
    var _useDbFields;
    var _useTableName;

    self.categoryDbFields = ["EmergencyCategoryWordID", "EmergencyCatID", "LanguageID", "`Value`", "`Precision`", "Priority"];
    self.categoryTableName = "emergency_categories_words";

    self.subCategoryDbFields = ["EmergencySubCategoryWordID", "EmergencySubCatID", "LanguageID", "`Value`", "`Precision`", "Priority"];
    self.subCategoryTableName = "emergency_subcategories_words";

    function construct(){
        if(Helper.empty(emergencyID) || !Helper.isPositiveInteger(emergencyID)){
            emergencyID = 0;
        }

        if(isSubCategory){
            _useEmergencyRecordName = "EmergencySubCatID";
            _useRecordName = "EmergencySubCategoryWordID";
            _useDbFields = self.subCategoryDbFields;
            _useTableName = self.subCategoryTableName;
        }
        else{
            _useEmergencyRecordName = "EmergencyCatID";
            _useRecordName = "EmergencyCategoryWordID";
            _useDbFields = self.categoryDbFields;
            _useTableName = self.categoryTableName;
        }
    }

    /**
     * Returns the emergency words.
     *
     * @param languageID
     * @param callback
     * @author Elad Cohen
     */
    self.getEmergencyWords = function(languageID, callback){
        if(typeof callback !== 'function' || Helper.empty(emergencyID) || !Helper.isPositiveInteger(emergencyID)){
            return;
        }

        var instance = new DB.instance().where(_useEmergencyRecordName, emergencyID).orderBy("Priority").orderBy("`Precision`", "DESC");

        if(!Helper.empty(languageID) && Helper.isPositiveInteger(languageID)){
            instance.where("LanguageID", languageID);
        }

        instance.select(_useDbFields, _useTableName, callback);
    };

    /**
     * Returns all emergency words.
     *
     * @param languageID
     * @param callback
     * @author Elad Cohen
     */
    self.getAllEmergencyWords = function(languageID, callback){
        if(typeof callback !== 'function'){
            return;
        }

        var instance = new DB.instance();

        if(!Helper.empty(languageID) && Helper.isPositiveInteger(languageID)){
            instance.where("LanguageID", languageID);
        }

        instance.select(_useDbFields, _useTableName, callback);
    };

    /**
     * Adds an emergency word.
     *
     * @param word
     * @param precision
     * @param languageID
     * @param priority
     * @param callback
     * @author Elad Cohen
     */
    self.addEmergencyWord = function(word, precision, languageID, priority, callback){
        if(Helper.empty(emergencyID) || !Helper.isPositiveInteger(emergencyID)){
            if(Helper.isFunction(callback)){
                callback(0);
            }

            return;
        }

        if(Helper.empty(word) || Helper.empty(languageID) || !Helper.isPositiveInteger(languageID)){
            if(Helper.isFunction(callback)){
                callback(0);
            }

            return;
        }

        if(Helper.empty(precision) || !Helper.isPositiveInteger(precision) || precision <= 0 || precision >= 100){
            if(Helper.isFunction(callback)){
                callback(0);
            }

            return;
        }

        if(Helper.empty(priority) || !Helper.isPositiveInteger(priority)){
            priority = 1;
        }

        new DB.instance()
            .add(_useEmergencyRecordName, emergencyID)
            .add("Value", word)
            .add("Precision", precision)
            .add("LanguageID", languageID)
            .add("Priority", priority)
            .insert(_useTableName, function(result){
                callback(result);
            });
    };

    /**
     * Deletes an emergency word.
     *
     * @param wordID
     * @param callback
     * @author Elad Cohen
     */
    self.deleteEmergencyWord = function(wordID, callback){
        if(Helper.empty(emergencyID) || Helper.empty(wordID) || !Helper.isPositiveInteger(emergencyID) || !Helper.isPositiveInteger(wordID)){
            if(Helper.isFunction(callback)){
                callback(false);
            }

            return;
        }

        new DB.instance().where(_useEmergencyRecordName, emergencyID).where(_useRecordName, wordID).delete(_useTableName, function(result){
            if(Helper.isFunction(callback)){
                callback(!Helper.empty(result) && result > 0);
            }
        });
    };

    /**
     * Returns the nuance dictionary file which is consisted of all the phrases we've added.
     *
     * @param languageID
     * @param callback
     * @author Elad Cohen
     */
    self.getNuanceDictionary = function(languageID, callback){
        if(typeof callback !== 'function'){
            return;
        }

        if(Helper.empty(languageID) || !Helper.isPositiveInteger(languageID)){
            languageID = 1;
        }

        var phrases = [];

        new DB.instance().where("LanguageID", languageID).select(self.categoryDbFields, self.categoryTableName, function(categoryWords){
            new DB.instance().where("LanguageID", languageID).select(self.subCategoryDbFields, self.subCategoryTableName, function(subcategoryWords){
                var i = 0;

                if(!Helper.empty(categoryWords)){
                    for(i = 0; i < categoryWords.length; i++){
                        if(!Helper.inArray(categoryWords[i], phrases)){
                            phrases.push(categoryWords[i]);
                        }
                    }
                }

                if(!Helper.empty(subcategoryWords)){
                    for(i = 0; i < subcategoryWords.length; i++){
                        if(!Helper.inArray(subcategoryWords[i], phrases)){
                            phrases.push(subcategoryWords[i]);
                        }
                    }
                }

                var text = "<phrases>\r\n";

                for(i = 0; i < phrases.length; i++){
                    text += "   <phrase>" + phrases[i] + "</phrase>\r\n";
                }

                text += "</phrases>";

                callback(text);
            });
        });
    };

    construct();
};

module.exports = EmergencyWords;