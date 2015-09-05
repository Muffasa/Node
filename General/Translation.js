var Helper = require("./Helper.js");
var DB = require("./../Database/DB.js");

var Translation = {
    /**
     * Returns the translation value of the translation code and languageID.
     *
     * @param translationCode
     * @param languageID
     * @param callback
     * @param callbackExtraParams
     * @author Elad Cohen
     */
    'getTranslationValue': function(translationCode, languageID, callback, callbackExtraParams){
        if(typeof callback !== 'function'){
            return;
        }

        if(Helper.empty(translationCode) || Helper.empty(languageID) || !Helper.isPositiveInteger(translationCode) || !Helper.isPositiveInteger(languageID)){
            callback("", callbackExtraParams);
        }

        new DB.instance().where("TranslationCode", translationCode).where("LanguageID", languageID).select("Value", "translations", function(result){
            if(!Helper.empty(result)){
                callback(result[0]["Value"], callbackExtraParams);
            }
            else{
                callback("", callbackExtraParams);
            }
        });
    }
};

module.exports = Translation;