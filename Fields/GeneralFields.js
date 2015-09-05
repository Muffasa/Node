var async = require("async");

var Helper = require("./../General/Helper.js");
var DB = require("./../Database/DB.js");
var Translation = require("./../General/Translation.js");

/**
 * Initializes the translation in an option and when done initializing in all options, calls the callback.
 *
 * @param obj
 * @param objects
 * @param languageID
 * @param recordName
 * @param callback
 * @author Elad Cohen
 */
function initTranslation(obj, objects, languageID, recordName, callback){
    Translation.getTranslationValue(obj["TranslationCode"], languageID, function(translationResult, genderID){
        for(var i = 0; i < objects.length; i++){
            if(objects[i].value == genderID){
                objects[i].text = translationResult;
                objects[i].done = 1;

                if(i == objects.length - 1){
                    callback(objects); //We got to the last item, so we can now call our callback
                }

                break;
            }
        }
    }, obj[recordName]);
}

var GeneralFields = {
    /**
     * Returns all available genders according to specific languageID.
     *
     * @param languageID
     * @param callback
     * @author Elad Cohen
     */
    'getGenders': function(callback, languageID){
        if(typeof callback !== 'function'){
            return;
        }

        if(Helper.empty(languageID) || !Helper.isPositiveInteger(languageID)){
            languageID = 1;
        }

        var tableName = "genders";
        var genders = [];

        new DB.instance().select(["GenderID", "TranslationCode"], tableName, function(result){
            for(var i = 0; i < result.length; i++){
                var gender = result[i];

                var option = {
                    "value": gender["GenderID"],
                    "text": ""
                };

                genders.push(option);

                initTranslation(gender, genders, languageID, "GenderID", callback);
            }
        });
    },

    /**
     * Returns all available countries according to specific languageID.
     *
     * @param callback
     * @param languageID
     * @author Elad Cohen
     */
    'getCountriesData': function(callback, languageID){
        if(typeof callback !== 'function'){
            return;
        }

        if(Helper.empty(languageID) || !Helper.isPositiveInteger(languageID)){
            languageID = 1;
        }

        var tableName = "countries";
        var countries = [];

        new DB.instance().select(["CountryID", "TranslationCode"], tableName, function(result){
            for(var i = 0; i < result.length; i++){
                var country = result[i];

                var option = {
                    "value": country["CountryID"],
                    "text": ""
                };

                countries.push(option);

                initTranslation(country, countries, languageID, "CountryID", callback);
            }
        });
    },

    /**
     * Returns the available involved options.
     *
     * @param callback
     * @param languageID
     * @author Elad Cohen
     */
    'getInvolvedData': function(callback, languageID){
        if(typeof callback !== 'function'){
            return;
        }

        if(Helper.empty(languageID) || !Helper.isPositiveInteger(languageID)){
            languageID = 1;
        }

        var tableName = "report_involved_options";
        var involvedOptions = [];

        new DB.instance().select(["InvolvedID", "TranslationCode"], tableName, function(result){
            for(var i = 0; i < result.length; i++){
                var involved = result[i];

                var option = {
                    "value": involved["InvolvedID"],
                    "text": ""
                };

                involvedOptions.push(option);

                initTranslation(involved, involvedOptions, languageID, "InvolvedID", callback);
            }
        });
    },

    /**
     * Returns the available involved amount options.
     *
     * @param callback
     * @author Elad Cohen
     */
    'getInvolvedAmountData': function(callback){
        if(typeof callback !== 'function'){
            return;
        }

        var tableName = "report_involved_amount_options";
        var involvedAmountOptions = [];

        new DB.instance().select(["InvolvedAmountID", "Description"], tableName, function(result){
            for(var i = 0; i < result.length; i++){
                var involvedAmount = result[i];

                var option = {
                    "value": involvedAmount["InvolvedAmountID"],
                    "text": involvedAmount["Description"]
                };

                involvedAmountOptions.push(option);
            }

            callback(involvedAmountOptions);
        });
    },

    /**
     * Returns the available languages.
     *
     * @param callback
     * @author Elad Cohen
     */
    'getAllLanguages': function(callback){
        if(typeof callback !== 'function'){
            return;
        }

        var tableName = "languages";
        var languages = [];

        new DB.instance().select(["LanguageID", "Name", "Shortcut", "Nuance"], tableName, function(result){
            for(var i = 0; i < result.length; i++){
                var language = result[i];

                var option = {
                    "value": language["LanguageID"],
                    "text": language["Name"],
                    "Shortcut": language["Shortcut"],
                    "Nuance": language["Nuance"]
                };

                languages.push(option);
            }

            callback(languages);
        });
    },

    /**
     * Returns the available report status options.
     *
     * @param callback
     * @param languageID
     * @author Elad Cohen
     */
    "getReportStatusData": function(callback, languageID){
        if(typeof callback !== 'function'){
            return;
        }

        if(Helper.empty(languageID) || !Helper.isPositiveInteger(languageID)){
            languageID = 1;
        }

        var tableName = "report_status_options";
        var reportStatusOptions = [];

        new DB.instance().select(["ReportStatusID", "TranslationCode"], tableName, function(result){
            for(var i = 0; i < result.length; i++){
                var reportStatus = result[i];

                var option = {
                    "value": reportStatus["ReportStatusID"],
                    "text": ""
                };

                reportStatusOptions.push(option);

                initTranslation(reportStatus, reportStatusOptions, languageID, "ReportStatusID", callback);
            }
        });
    },

    /**
     * Returns an array with all categories.
     *
     * @param languageID
     * @param callback
     * @returns {Array}
     * @author Elad Cohen
     */
    "getAllCategories": function(callback, languageID){
        if(typeof callback !== 'function'){
            return [];
        }

        if(Helper.empty(languageID) || !Helper.isPositiveInteger(languageID)){
            languageID = 1;
        }

        var categories = [];
        var categoriesAmount = 0;
        var finishCategoriesAmount = 0;

        async.waterfall([
                function(cb){
                    new DB.instance().select(["EmergencyCatID", "Icon", "TranslationCode"], "emergency_categories", function(result){
                        categoriesAmount = result.length;

                        for(var i = 0; i < categoriesAmount; i++){
                            var category = result[i];

                            var option = {
                                value: category["EmergencyCatID"],
                                icon: category["Icon"],
                                TranslationCode: category["TranslationCode"]
                            };

                            categories.push(option);

                            cb(null, option);
                        }
                    });
                },
                function(option, cb){
                    Translation.getTranslationValue(option["TranslationCode"], languageID, function(result){
                        option.text = result;
                        delete option.TranslationCode;
                        finishCategoriesAmount++;

                        cb();
                    });
                },
                function(cb){
                    if(finishCategoriesAmount == categoriesAmount - 1){
                        cb();
                    }
                }
            ],
            function(){
                callback(categories);
            }
        );
    },

    /**
     * Returns an array with all subcategories.
     *
     * @param callback
     * @param languageID
     * @returns {Array}
     * @author Elad Cohen
     */
    "getAllSubCategories": function(callback, languageID){
        if(typeof callback !== 'function'){
            return [];
        }

        if(Helper.empty(languageID) || !Helper.isPositiveInteger(languageID)){
            languageID = 1;
        }

        var subCategories = [];
        var subCategoriesAmount = 0;
        var finishSubCategoriesAmount = 0;

        async.waterfall([
                function(cb){
                    new DB.instance().select(["EmergencySubCatID", "EmergencyCatID", "TranslationCode"], "emergency_subcategories", function(result){
                        subCategoriesAmount = result.length;

                        for(var i = 0; i < subCategoriesAmount; i++){
                            var category = result[i];

                            var option = {
                                value: category["EmergencySubCatID"],
                                EmergencyCatID: category["EmergencyCatID"],
                                TranslationCode: category["TranslationCode"]
                            };

                            subCategories.push(option);

                            cb(null, option);
                        }
                    });
                },
                function(option, cb){
                    Translation.getTranslationValue(option["TranslationCode"], languageID, function(result){
                        option.text = result;
                        delete option.TranslationCode;
                        finishSubCategoriesAmount++;

                        cb();
                    });
                },
                function(cb){
                    if(finishSubCategoriesAmount == subCategoriesAmount - 1){
                        cb();
                    }
                }
            ],
            function(){
                callback(subCategories);
            }
        );
    }
};

module.exports = GeneralFields;