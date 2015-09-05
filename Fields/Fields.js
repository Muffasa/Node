var async = require("async");

var Helper = require("./../General/Helper.js");
var Strings = require("./../General/Strings.js");
var Errors = require("./../General/Errors.js");
var DB = require("./../Database/DB.js");
var Translation = require("./../General/Translation.js");
var FieldGroup = require("./FieldGroup.js");

/**
 * Constructor - creates a Fields instance.
 *
 * @param fieldGroupID
 * @param fieldsData
 * @param buildHTML
 * @param languageID
 * @param callback
 * @constructor
 * @author Elad Cohen
 */
var Fields = function(fieldGroupID, fieldsData, buildHTML, languageID, callback){
    var self = this;

    self.fieldGroupID = 0;
    self.fieldsData = {};
    self.languageID = 1;

    self.dbFields = ["FieldID", "Id", "TranslationCode", "DbFieldName", "DataType", "DbFunction", "DataClassPath", "DataClass", "DataMethod", "Dependence", "Required", "Displayed", "Displayable", "field_properties.FieldPropertyName", "field_properties.FieldPropertyValue"];
    self.tableName = "fields";

    self.fields = {};

    /**
     * This function is the actual constructor.
     *
     * @returns {boolean}
     * @author Elad Cohen
     */
    self.constructor = function(){
        if(Helper.empty(languageID) || !Helper.isPositiveInteger(languageID)){
            self.languageID = 1;
        }
        else{
            self.languageID = languageID;
        }

        if(!Helper.empty(fieldsData) && typeof fieldsData === 'object'){
            self.fieldsData = fieldsData;
        }

        if(Helper.empty(fieldGroupID) || !Helper.isPositiveInteger(fieldGroupID)){
            callback(false);

            return false;
        }
        else{
            self.fieldGroupID = fieldGroupID;
        }

        var whereData = [self.fieldGroupID, 1];
        var sql = "SELECT " + self.dbFields.join(", ") + " " +
                  "FROM " + self.tableName + " " +
                  "LEFT JOIN field_properties USING (FieldID) " +
                  "WHERE " + self.tableName + ".FieldGroupID = ? " +
                         " AND " + self.tableName + ".Active = ? " +
                  "ORDER BY Priority ASC, FieldID;";

        new DB.instance().query(sql, whereData, function(result){
            for(var i = 0; i < result.length; i++){
                self.buildField(result[i]);
            }

            self.initFieldsValues(self.fieldsData);

            if(buildHTML){
                self.buildFieldsHTML(function(){
                    if(Helper.isFunction(callback)){
                        callback(self.fields);
                    }
                });
            }
            else if(Helper.isFunction(callback)){
                callback();
            }
        });
    };

    /**
     * Builds a specific field and inserts it into the instance's fields array.
     *
     * @param field
     * @author Elad Cohen
     */
    self.buildField = function(field){
        if(field.hasOwnProperty("FieldID")){
            if(!self.fields.hasOwnProperty(field["FieldID"])){
                if(!Helper.empty(field["FieldPropertyName"])){
                    field[field["FieldPropertyName"]] = field["FieldPropertyValue"];
                }

                delete field["FieldPropertyName"];
                delete field["FieldPropertyValue"];

                self.fields[field["FieldID"]] = field;
            }
            else{
                var existedField = self.fields[field["FieldID"]];

                if(!Helper.empty(field["FieldPropertyName"])){
                    existedField[field["FieldPropertyName"]] = field["FieldPropertyValue"];
                }
            }
        }
    };

    /**
     * Creates the HTML of the fields.
     *
     * @author Elad Cohen
     */
    self.buildFieldsHTML = function(callback){
        var processed = 0;
        var fieldsLength = Helper.getAssociativeArrayLength(self.fields);
        var chooseText;

        Translation.getTranslationValue(60, self.languageID, function(result){ //@todo Add the 60 to a constant
            chooseText = result;

            for(var fieldID in self.fields){
                if(!self.fields.hasOwnProperty(fieldID)){ //Should never happen!
                    continue;
                }

                var field = self.fields[fieldID];

                if(Helper.empty(field["Displayable"])){
                    processed++;

                    if(processed == fieldsLength && Helper.isFunction(callback)){
                        callback();
                    }

                    continue;
                }

                (function(field){
                    field.html = "";

                    async.waterfall([
                            function(cb){
                                Translation.getTranslationValue(field["TranslationCode"], self.languageID, function(result){
                                    field.name = result;
                                    cb();
                                });
                            },
                            function(cb){
                                if(!Helper.empty(field["DataClassPath"]) && !Helper.empty(field["DataMethod"])) {
                                    field.html += "<select name='" + field["Id"] + "' id='" + field["Id"] + "'" + self.getFieldPropertiesHtmlString(field) + ">";
                                    field.html += "<option value='-1'>" + chooseText + " " + field.name + "</option>";

                                    cb(null, true);
                                }
                                else{
                                    cb(null, false);
                                }
                            },
                            function(isSelect, cb){
                                if(isSelect){
                                    var dataClass = require(field["DataClassPath"]);

                                    if(typeof dataClass !== 'undefined' && Helper.isFunction(dataClass[field["DataMethod"]])){
                                        var dataFunction = dataClass[field["DataMethod"]];

                                        cb(null, true, dataFunction);
                                    }
                                    else{
                                        cb(null, true, null);
                                    }
                                }
                                else{
                                    cb(null, false, null);
                                }
                            },
                            function(isSelect, dataFunction, cb){
                                if(isSelect){
                                    if(Helper.isFunction(dataFunction)){
                                        dataFunction(function(result){
                                            for(var j = 0; j < result.length; j++){
                                                field.html += "<option value='" + result[j].value + "'>" + result[j].text + "</option>";
                                            }

                                            field.html += "</select>";

                                            cb();
                                        }, self.languageID);
                                    }
                                    else{
                                        field.html += "</select>";
                                        cb();
                                    }
                                }
                                else{
                                    var inputType = "text";

                                    if(field.hasOwnProperty("isNumeric") || field.hasOwnProperty("isFloat") || field.hasOwnProperty("isInteger") || field.hasOwnProperty("isPositiveInteger")){
                                        inputType = "number";
                                    }
                                    else if(field.hasOwnProperty("isPassword")){
                                        inputType = "password";
                                    }
                                    else if(field.hasOwnProperty("isDate")){
                                        inputType = "date";
                                    }

                                    field.html += "<input type='" + inputType + "' name='" + field["Id"] + "' id='" + field["Id"] + "'" + self.getFieldPropertiesHtmlString(field) + "/>";

                                    cb();
                                }
                            }
                        ],
                        function(){
                            processed++;

                            if(processed == fieldsLength && Helper.isFunction(callback)){
                                callback();
                            }
                        });
                })(field);
            }
        });
    };

    /**
     * Returns the field's properties in HTML format.
     *
     * @param field
     * @returns {string}
     * @author Elad Cohen
     */
    self.getFieldPropertiesHtmlString = function(field){
        var ignoreFieldProperties = ["Id", "TranslationCode", "DbFieldName", "DataType", "DbFunction", "DataClassPath", "DataClass", "DataMethod", "Displayed", "Displayable"];
        var nativeProperties = ["maxlength"];
        var html = "";

        for(var fieldPropertyName in field){
            if(!field.hasOwnProperty(fieldPropertyName) || ignoreFieldProperties.indexOf(fieldPropertyName) != -1){
                continue;
            }

            var fieldPropertyValue = field[fieldPropertyName];

            if(nativeProperties.indexOf(fieldPropertyName) >= 0){
                html += " ";
            }
            else{
                html += " data-";
            }

            html += fieldPropertyName + "='" + fieldPropertyValue + "'";
        }

        return html;
    };

    /**
     * Initializes the fields' values.
     *
     * @param fieldsData
     * @author Elad Cohen
     */
    self.initFieldsValues = function(fieldsData){
        if(typeof fieldsData !== 'object'){
            return;
        }

        for(var i in self.fields){
            if(!self.fields.hasOwnProperty(i)){
                continue;
            }

            var field = self.fields[i];

            if(!Helper.empty(fieldsData) && fieldsData.hasOwnProperty(field["DbFieldName"])){
                field.value = fieldsData[field["DbFieldName"]];
            }
            else{
                field.value = -1;
            }
        }
    };

    /**
     * Returns a field according to its ID.
     *
     * @param fieldID
     * @returns {*}
     * @author Elad Cohen
     */
    self.getFieldByID = function(fieldID){
        if(Helper.empty(fieldID)){
            return null;
        }

        for(var i in self.fields){
            if(!self.fields.hasOwnProperty(i)){
                continue;
            }

            var field = self.fields[i];

            if(field["Id"] == fieldID){
                return field;
            }
        }

        return null;
    };

    /**
     * Saves the data to the database according to previously set fields data.
     *
     * @param isUpdate
     * @param recordID
     * @param callback
     * @author Elad Cohen
     */
    self.saveData = function(isUpdate, recordID, callback){
        var response = {};

        if(Helper.empty(self.fieldsData)){
            response.error = "Missing fields data.";
            response.errornumber = Errors.MISSING_DATA;

            if(Helper.isFunction(callback)){
                callback(response);
            }

            return;
        }

        if(isUpdate && (Helper.empty(recordID) || !Helper.isPositiveInteger(recordID))){
            response.error = "Invalid RecordID supplied.";
            response.errornumber = Errors.INVALID_DATA;

            if(Helper.isFunction(callback)){
                callback(response);
            }

            return;
        }

        var conn = new DB.instance();
        var addedValuesToConnection = false;
        var validatedFields = 0;
        var callbackCalled = false;
        var fieldsAmount = Helper.getAssociativeArrayLength(self.fields);

        async.waterfall([
            function(cb){
                for(var i in self.fields){
                    if(!self.fields.hasOwnProperty(i)){
                        validatedFields++;

                        continue;
                    }

                    var field = self.fields[i];

                    cb(null, field);
                }
            },
            function(field, cb){
                if(!callbackCalled){
                    self.isValidField(field, function(isValid){
                        if(!isValid){
                            response.error = "Invalid " + field["Id"] + " supplied.";
                            response.errornumber = Errors.INVALID_DATA;

                            callbackCalled = true;

                            if(Helper.isFunction(callback)){
                                debugger;
                                callback(response);
                                callback = null;
                            }

                            return;
                        }

                        if(field.hasOwnProperty("value")){
                            addedValuesToConnection = true;

                            if(isUpdate){
                                conn.set(field["DbFieldName"], field["value"]);
                            }
                            else{
                                conn.add(field["DbFieldName"], field["value"]);
                            }
                        }

                        validatedFields++;

                        if(validatedFields == fieldsAmount){
                            cb();
                        }
                    });
                }
            }
        ],
        function(){
            if(!callbackCalled && addedValuesToConnection){
                var fieldGroup = new FieldGroup(self.fieldGroupID, true);

                fieldGroup.getFieldGroupData(function(){
                    var tableName = fieldGroup.getTableName();
                    var recordName = fieldGroup.getRecordName();

                    if(isUpdate){
                        conn.where(recordName, recordID).update(tableName, function(result){
                            if(result >= 0){
                                response.result = true;
                            }
                            else{
                                response.error = "Failed to update the data.";
                                response.errornumber = Errors.INTERNAL_ERROR;
                            }

                            if(Helper.isFunction(callback)){
                                callback(response);
                            }
                        });
                    }
                    else{
                        conn.insert(tableName, function(result){
                            if(!Helper.empty(result) && result > 0){
                                response[recordName] = result;
                            }
                            else{
                                response.error = "Failed to insert the data.";
                                response.errornumber = Errors.INTERNAL_ERROR;
                            }

                            if(Helper.isFunction(callback)){
                                callback(response);
                            }
                        });
                    }
                });
            }
        });
    };

    /**
     * Returns whether a field is valid or not.
     *
     * @param field
     * @returns {boolean}
     * @author Elad Cohen
     * @param cb
     */
    self.isValidField = function(field, cb){
        if(!Helper.isFunction(cb) || typeof field !== 'object'){
            if(Helper.isFunction(cb)){
                cb(false);
            }

            return false;
        }

        var isRequired = !Helper.empty(field["Required"]);
        var fieldValue;

        if(field.hasOwnProperty("value")){
            fieldValue = field["value"];
        }
        else{
            fieldValue = -1;
        }

        //If the data is a given from an already declared specific value options (e.g a select field), we need to validate that it's actually listed there
        if(!Helper.empty(field["DataClassPath"]) && !Helper.empty(field["DataMethod"])){
            var dataClass = require(field["DataClassPath"]);

            if(typeof dataClass !== 'undefined' && Helper.isFunction(dataClass[field["DataMethod"]])){
                var dataFunction = dataClass[field["DataMethod"]];

                dataFunction(function(methodData){
                    if(!Helper.empty(methodData)){
                        var dependentField;
                        var dependentFieldID = "";
                        var dependentFieldValue = "";

                        if(!Helper.empty(field["Dependence"])){
                            dependentFieldID = field["Dependence"];
                            dependentField = self.getFieldByID(dependentFieldID);

                            if(dependentField.hasOwnProperty("value")){
                                dependentFieldValue = dependentField["value"];
                            }
                        }

                        for(var i = 0; i < methodData.length; i++){
                            var option = methodData[i];

                            if(option.hasOwnProperty("value") && option["value"] == fieldValue){ //We found the option
                                if(!Helper.empty(dependentField)){ //If there's a dependence, we need to make sure the option belongs to the dependence
                                    if(option.hasOwnProperty(dependentFieldID) && dependentFieldValue == option[dependentFieldID]){
                                        cb(true); //We found the option

                                        return;
                                    }
                                }
                                else{ //We found the option and there is no dependence on another field
                                    cb(true);

                                    return;
                                }
                            }
                        }

                        //If empty value received and we didn't find the option
                        if(fieldValue === -1 || fieldValue === 0){
                            cb(!isRequired);

                            return;
                        }

                        //We didn't find the option @todo LOG ERROR
                        cb(false);
                    }
                    else if(fieldValue != -1){
                        //The user sent data although there is no data we can match to @todo LOG ERROR
                        cb(false);
                    }
                    else{
                        //The field is valid because there is no data to match to and the field's value is empty
                        cb(true);
                    }
                });
            }
            else if(fieldValue != -1){
                //The user sent data although there is no data we can match to @todo LOG ERROR
                cb(false);

                return true;
            }
            else{
                //The field is valid because there is no data to match to and the field's value is empty
                cb(true);

                return true;
            }
        }
        else{
            if(isRequired && fieldValue == -1){
                cb(false);

                return false;
            }

            if(fieldValue != -1){
                if(field.hasOwnProperty("isNumeric") && !Helper.isNumeric(fieldValue)){
                    cb(false);

                    return false;
                }

                if(field.hasOwnProperty("isInteger") && !Helper.isTrueInteger(fieldValue)){
                    cb(false);

                    return false;
                }

                if(field.hasOwnProperty("isPositiveInteger") && !Helper.isPositiveInteger(fieldValue)){
                    cb(false);

                    return false;
                }

                if(field.hasOwnProperty("isFloat") && !Helper.isTrueFloat(fieldValue)){
                    cb(false);

                    return false;
                }

                if(field.hasOwnProperty("isName") && !Strings.checkPersonalName(fieldValue)){
                    cb(false);

                    return false;
                }

                if(field.hasOwnProperty("isEmail") && !Strings.checkEmail(fieldValue)){
                    cb(false);

                    return false;
                }

                if(field.hasOwnProperty("isPhone")){
                    var countryID;

                    if(!Helper.empty(self.fieldsData["CountryID"])){
                        countryID = self.fieldsData["CountryID"];
                    }
                    else{
                        countryID = 0;
                    }

                    if(!Strings.checkPhone(fieldValue, countryID)){
                        cb(false);

                        return false;
                    }
                }

                if(field.hasOwnProperty("isDate") && !Strings.checkDate(fieldValue)){
                    cb(false);

                    return false;
                }

                if(field.hasOwnProperty("isPassword")){
                    if(Strings.checkPassword(fieldValue).length){
                        cb(false);

                        return false;
                    }

                    field.value = Strings.md5Password(fieldValue);
                }

                if(field.hasOwnProperty("maxlength") && parseInt(field["maxlength"]) < fieldValue.length){
                    cb(false);

                    return false;
                }
            }

            cb(true);

            return true;
        }
    };

    /**
     * Returns the fields.
     *
     * @returns {{}|*}
     * @author Elad Cohen
     */
    self.getFields = function(){
        return self.fields;
    };

    self.constructor();
};

module.exports = Fields;