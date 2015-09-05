var Helper = require("./../General/Helper.js");
var Firebase = require("./../General/Firebase.js");
var Strings = require("./../General/Strings.js");
var Native = require("./../General/Native.js");
var Errors = require("./../General/Errors.js");
var Fields = require("./../Fields/Fields.js");
var DB = require("./../Database/DB.js");

/**
 * Creates a new Reporter instance.
 *
 * @param reporterID
 * @param loginToken
 * @param initWithQuery
 * @param callback
 * @constructor
 * @author Elad Cohen
 */
var Reporter = function(reporterID, loginToken, initWithQuery, callback){
    var self = this;

    var _name = "";
    var _genderID = 0;
    var _phone = "";
    var _birthDate = "";
    var _languageID = 0;
    var _countryID = 0;
    var _email = "";
    var _udid = "";
    var _GCMID = "";
    var _confirmationNumber = 0;

    self.dbFields = ["ReporterID", "Name", "GenderID", "Phone", "BirthDate", "LanguageID", "CountryID", "Email", "UDID", "GCMID", "CreatedTime", "UpdatedTime"];
    self.tableName = "reporters";

    self.sessionsTableName = "login_sessions";
    self.loginTokenLength = 40;

    self.fieldGroupID = 1;

    /**
     * Constructor - initializes the Reporter.
     *
     * @author Elad Cohen
     */
    var constructor = function(){
        if(Helper.empty(reporterID) || !Helper.isPositiveInteger(reporterID)){
            reporterID = 0;
        }

        if(Helper.empty(loginToken) || !self.isValidLoginToken(loginToken)){
            loginToken = "";
        }

        if(initWithQuery && !Helper.empty(reporterID)){
            self.getReporterData(function(){
                if(Helper.isFunction(callback)){
                    callback();
                }
            });
        }
    };

    /**
     * Returns the reporter's data.
     *
     * @param callback
     * @returns {Array}
     * @author Elad Cohen
     */
    self.getReporterData = function(callback){
        if(typeof callback !== 'function'){
            return [];
        }

        if(Helper.empty(reporterID) || !Helper.isPositiveInteger(reporterID)){
            callback([]);
        }

        new DB.instance().fetchBasicRecordData("ReporterID", reporterID, self.dbFields, self.tableName, function(result){
            callback(result);

            Helper.updateInstanceDataFromRow(self, result);
        });
    };

    /**
     * Create a new reporter using the given data.
     * Returns the ID of the created reporter and the loginToken.
     *
     * @param reporterData
     * @param code
     * @param callback
     * @returns {{}}
     * @author Elad Cohen
     */
    self.createNewReporter = function(reporterData, code, callback){
        var response = {};

        if(typeof callback !== 'function'){
            response.error = "Internal error.";
            response.errornumber = Errors.INTERNAL_ERROR;

            return response;
        }

        var phone = !Helper.empty(reporterData["Phone"]) ? reporterData["Phone"] : "";
        var countryID = !Helper.empty(reporterData["CountryID"]) && Helper.isPositiveInteger(reporterData["CountryID"]) ? reporterData["CountryID"] : 0;

        if(Helper.empty(code)){
            response.error = "Missing confirmation code.";
            response.errornumber = Errors.MISSING_DATA;

            callback(response);

            return response;
        }

        if(Helper.empty(phone) || !Strings.checkPhone(phone, countryID)){
            response.error = "Invalid phone number supplied.";
            response.errornumber = Errors.INVALID_DATA;

            callback(response);

            return response;
        }

        self.isConfirmablePhone(phone, code, function(confirmable){
            if(!confirmable){
                response.error = "Could not confirm the phone number with the supplied confirmation code.";
                response.errornumber = Errors.INVALID_DATA;

                callback(response);

                return;
            }

            new DB.instance().where("Phone", phone).select(["ReporterID"], self.tableName, function(phoneExists){
                if(!Helper.empty(phoneExists)){
                    response.error = "The user already exists.";
                    response.errornumber = Errors.INVALID_DATA;

                    callback(response);

                    return;
                }

                _confirmationNumber = code;

                self.saveReporter(reporterData, false, function(result){
                    response = result;

                    if(response.hasOwnProperty("error")){
                        callback(response);
                    }
                    else{
                        reporterID = response["ReporterID"];

                        self.createReporterSession(function(newLoginToken){
                            loginToken = newLoginToken;
                            response.loginToken = loginToken;

                            self.confirmPhoneNumber(phone, _confirmationNumber, reporterData["CountryID"]);

                            _confirmationNumber = null;

                            callback(response);
                        });
                    }
                });
            });
        });
    };

    /**
     * Updates the reporter using given data.
     *
     * @param reporterData
     * @param callback
     * @author Elad Cohen
     */
    self.updateReporter = function(reporterData, callback){
        var response = {};

        if(Helper.empty(reporterID) || !Helper.isPositiveInteger(reporterID)){ //@todo LOG ERROR
            response.error = "Invalid ReporterID supplied.";
            response.errornumber = Errors.INVALID_DATA;

            if(Helper.isFunction(callback)){
                callback(response);
            }

            return;
        }

        if(Helper.empty(reporterData)){ //@todo LOG ERROR
            response.error = "Missing update data.";
            response.errornumber = Errors.MISSING_DATA;

            if(Helper.isFunction(callback)){
                callback(response);
            }

            return;
        }

        self.getReporterData(function(currentReporterData){
            if(Helper.empty(currentReporterData)){
                if(Helper.isFunction(callback)){
                    response.error = "The reporter does not exist.";
                    response.errornumber = Errors.INVALID_DATA;
                }

                return;
            }

            reporterData = Helper.mergeAssociativeArrays(currentReporterData, reporterData);

            self.saveReporter(reporterData, true, function(result){
                if(Helper.isFunction(callback)){
                    callback(result);
                }
            });
        });
    };

    /**
     * Saves the reporter's data.
     *
     * @param reporterData
     * @param isUpdate
     * @param callback
     * @author Elad Cohen
     */
    self.saveReporter = function(reporterData, isUpdate, callback){
        var fields = new Fields(self.fieldGroupID, reporterData, false, 0, function(){
            if(isUpdate){
                fields.saveData(true, reporterID, function(result){
                    if(Helper.isFunction(callback)){
                        callback(result);
                    }
                });
            }
            else{
                fields.saveData(false, 0, function(result){
                    if(Helper.isFunction(callback)){
                        callback(result);
                    }
                });
            }
        });
    };

    /**
     * Returns the reporter's data and loginToken by connecting using a phone number and SMS confirmation code.
     *
     * @param phone
     * @param confirmationNumber
     * @param countryID
     * @param callback
     * @returns {boolean}
     * @author Elad Cohen
     */
    self.login = function(phone, confirmationNumber, countryID, callback){
        if(!Helper.isFunction(callback)){
            return false;
        }

        var response = {};

        phone = phone.replace("-", "");

        if(Helper.empty(phone) || !Strings.checkPhone(phone, countryID)){
            response.error = "Invalid phone number supplied.";
            response.errornumber = Errors.INVALID_DATA;

            callback(response);

            return false;
        }

        if(Helper.empty(confirmationNumber)){
            response.error = "Missing confirmation number.";
            response.errornumber = Errors.MISSING_DATA;

            callback(response);

            return false;
        }

        self.isConfirmablePhone(phone, confirmationNumber, function(result){
            if(!result){
                response.error = "The confirmation number is invalid.";
                response.errornumber = Errors.INVALID_DATA;

                callback(response);

                return;
            }

            new DB.instance().where("Phone", phone).select(self.dbFields, self.tableName, function(reporterResult){
                if(Helper.empty(reporterResult)){
                    response.exists = false;

                    callback(response);
                }
                else{
                    var row = reporterResult[0];

                    reporterID = row["ReporterID"];
                    self.createReporterSession(function(loginTokenResult){
                        loginToken = loginTokenResult;

                        response = row;
                        response.loginToken = loginToken;
                        response.exists = true;

                        callback(response);

                        self.confirmPhoneNumber(phone, confirmationNumber, countryID);
                    });
                }
            });
        });
    };

    /**
     * Returns all reports the reporter made.
     *
     * @param callback
     * @returns {Array}
     * @author Elad Cohen
     */
    self.getReportHistory = function(callback){
        if(typeof callback !== 'function'){
            return [];
        }

        if(Helper.empty(reporterID) || !Helper.isPositiveInteger(reporterID)){
            callback([]);

            return [];
        }

        var reports = [];

        new DB.instance().where("ReporterID", reporterID).select([], "reports", function(results){
            if(Helper.empty(results)){
                callback([]);
            }
            else{
                for(var i = 0; i < results.length; i++){
                    reports.push(results[i]);
                }

                callback(reports);
            }
        });
    };

    /**
     * Returns whether the reporter is connected.
     *
     * @param callback
     * @returns {boolean}
     * @author Elad Cohen
     */
    self.isConnected = function(callback){
        if(typeof callback !== 'function'){
            return false;
        }

        if(Helper.empty(reporterID) || Helper.empty(loginToken) || !Helper.isPositiveInteger(reporterID) || !self.isValidLoginToken(loginToken)){
            callback(false);

            return false;
        }

        self.matchReporterToken(function(result){
            callback(result);
        });
    };

    /**
     * Creates a phone confirmation.
     *
     * @param phone
     * @param countryID
     * @param callback
     * @returns {boolean}
     * @author Elad Cohen
     */
    self.createPhoneConfirmation = function(phone, countryID, callback){
        var response = {};
        phone = phone.replace("-", "");

        if(Helper.empty(phone) || !Strings.checkPhone(phone, countryID)){ //@todo Log Error
            response.error = "Invalid phone number supplied.";
            response.errornumber = Errors.INVALID_DATA;

            if(Helper.isFunction(callback)){
                callback(response);
            }

            return false;
        }

        /*var confirmationCharacters = "0123456789";
        var confirmationLength = 4;
        var confirmationNumber = Strings.generateRandomString(confirmationLength, confirmationCharacters);*/

        //@todo Remove this line of code when done debugging and when we are connected to the SMS service
        var confirmationNumber = 1111;

        new DB.instance().add("Phone", phone).add("Code", confirmationNumber).insert("phone_confirmations", function(result){
            response.sent = !Helper.empty(result);

            if(Helper.isFunction(callback)){
                callback(response);
            }
        });
    };

    /**
     * Confirms the phone number.
     *
     * @param phone
     * @param confirmationNumber
     * @param countryID
     * @param callback
     * @returns {boolean}
     * @author Elad Cohen
     */
    self.confirmPhoneNumber = function(phone, confirmationNumber, countryID, callback){
        if(Helper.empty(phone) || Helper.empty(confirmationNumber) || !Strings.checkPhone(phone, countryID)){
            if(Helper.isFunction(callback)){
                callback(false);
            }

            return false;
        }

        phone = phone.replace("-", "");

        new DB.instance().set("Confirmed", 1).where("Phone", phone).where("Code", confirmationNumber).update("phone_confirmations", function(result){
            if(!Helper.empty(result) && result > -1){
                if(Helper.isFunction(callback)) {
                    callback(true);
                }
            }
            else{
                if(Helper.isFunction(callback)) {
                    callback(false);
                }
            }
        });
    };

    /**
     * Returns whether a phone is confirmable with a specific confirmation number.
     *
     * @param phone
     * @param confirmationNumber
     * @param callback
     * @author Elad Cohen
     */
    self.isConfirmablePhone = function(phone, confirmationNumber, callback){
        if(typeof callback !== 'function'){
            return false;
        }

        phone = phone.replace("-", "");

        new DB.instance().where("Phone", phone).orderBy("PhoneConfirmationID", "DESC").setLimit(1).select(["Confirmed", "Code"], "phone_confirmations", function(result){
            if(!Helper.empty(result)){
                var row = result[0];

                if(Helper.empty(row["Confirmed"]) && row["Code"] == confirmationNumber){
                    callback(true);
                }
                else{
                    callback(false);
                }
            }
            else{
                callback(false);
            }
        });
    };

    /**
     * Creates the reporter's session and returns the token that should be used in order to log in.
     *
     * @param callback
     * @returns {boolean}
     * @author Elad Cohen
     */
    self.createReporterSession = function(callback){
        if(Helper.empty(reporterID) || !Helper.isPositiveInteger(reporterID)){
            if(Helper.isFunction(callback)){
                callback(false);
            }

            return false;
        }

        var loginToken = Strings.generateRandomString(self.loginTokenLength);
        var expirationEndDate = Native.date('Y-m-d', Native.time() + 31536000);

        new DB.instance().where("ReporterID", reporterID).select(["Token"], self.sessionsTableName, function(result){
            if(!Helper.empty(result)){
                new DB.instance().set("Token", loginToken).set("EndDate", expirationEndDate).where("ReporterID", reporterID).update(self.sessionsTableName, function(){
                    if(Helper.isFunction(callback)){
                        callback(loginToken);
                    }
                });
            }
            else{
                new DB.instance().add("Token", loginToken).add("EndDate", expirationEndDate).add("ReporterID", reporterID).insert(self.sessionsTableName, function(){
                    if(Helper.isFunction(callback)){
                        callback(loginToken);
                    }
                });
            }
        });
    };

    /**
     * Destroys the reporter's session.
     *
     * @param callback
     * @returns {boolean}
     * @author Elad Cohen
     */
    self.destroyReporterSession = function(callback){
        if(Helper.empty(reporterID) || !Helper.isPositiveInteger(reporterID) || !self.isValidLoginToken(loginToken)){
            if(Helper.isFunction(callback)){
                callback(false);
            }

            return false;
        }

        new DB.instance().where("ReporterID", reporterID).where("Token", loginToken).delete(self.sessionsTableName, function(result){
            if(Helper.isFunction(callback)){
                result = !Helper.empty(result) && result > 0;

                callback(result);
            }
        });
    };

    /**
     * Returns whether the loginToken is related to the reporterID.
     *
     * @param callback
     * @returns {boolean}
     * @author Elad Cohen
     */
    self.matchReporterToken = function(callback){
        if(typeof callback !== 'function'){
            return false;
        }

        if(Helper.empty(reporterID) || Helper.empty(loginToken) || !Helper.isPositiveInteger(reporterID) || !self.isValidLoginToken(loginToken)){
            callback(false);

            return false;
        }

        new DB.instance().where("ReporterID", reporterID).where("Token", loginToken).where("EndDate", Native.date('Y-m-d'), ">=").select(["COUNT(1) AS c"], self.sessionsTableName, function(result){
            result = !Helper.empty(result) && result[0]["c"] > 0;

            callback(result);
        });
    };

    /**
     * Updates the GCMID.
     *
     * @param value
     * @param callback
     * @returns {boolean}
     * @author Elad Cohen
     */
    self.updateGCMID = function(value, callback){
        if(Helper.empty(value) || Helper.empty(reporterID) || !Helper.isPositiveInteger(reporterID)){
            if(Helper.isFunction(callback)){
                callback(false);
            }

            return false;
        }

        new DB.instance().where("ReporterID", reporterID).set("GCMID", value).update(self.tableName, function(result){
            result = !Helper.empty(result) && result > 0;

            if(Helper.isFunction(callback)){
                callback(result);
            }

            if(result){
                _GCMID = value;
            }
        });
    };

    /**
     * Returns the current reporter's location from Firebase.
     *
     * @param callback
     * @author Elad Cohen
     */
    self.getReporterLocation = function(callback){
        if(Helper.empty(reporterID) || !Helper.isPositiveInteger(reporterID)){
            if(Helper.isFunction(callback)){
                callback({});
            }

            return;
        }

        var firebase = new Firebase("usersGeoMap/userMap" + reporterID);

        firebase.get(function(data){
            if(!Helper.empty(data['lat']) && !Helper.empty(data['lng']) && Helper.isPositiveInteger(data['lat']) && Helper.isPositiveInteger(data['lng'])){
                callback({
                    'LocationX': data['lat'],
                    'LocationY': data['lng']
                });
            }
            else{
                callback({});
            }
        });
    };

    /**
     * Returns whether a login token is valid or not.
     *
     * @param token
     * @returns {boolean}
     * @author Elad Cohen
     */
    self.isValidLoginToken = function(token){
        return !Helper.empty(token) && token.length == self.loginTokenLength;
    };

    /**
     * Returns the instance's reporterID.
     *
     * @returns {*}
     * @author Elad Cohen
     */
    self.getReporterID = function(){
        return reporterID;
    };

    /**
     * Sets the instance's reporterID.
     *
     * @param value
     * @author Elad Cohen
     */
    self.setReporterID = function(value){
        if(!Helper.empty(value) && Helper.isPositiveInteger(value)){
            reporterID = value;
        }
    };

    /**
     * Returns the instance's loginToken.
     *
     * @returns {number}
     * @author Elad Cohen
     */
    self.getLoginToken = function(){
        return loginToken;
    };

    /**
     * Sets the instance's loginToken.
     *
     * @param value
     * @author Elad Cohen
     */
    self.setLoginToken = function(value){
        loginToken = value;
    };

    /**
     * Returns the instance's name.
     *
     * @returns string
     * @author Elad Cohen
     */
    self.getName = function(){
        return _name;
    };

    /**
     * Sets the instance's name.
     *
     * @param value
     * @author Elad Cohen
     */
    self.setName = function(value){
        _name = value;
    };

    /**
     * Returns the instance's genderID.
     *
     * @returns {number}
     * @author Elad Cohen
     */
    self.getGenderID = function(){
        return _genderID;
    };

    /**
     * Sets the instance's genderID.
     *
     * @param value
     * @author Elad Cohen
     */
    self.setGenderID = function(value){
        if(!Helper.empty(value) && Helper.isPositiveInteger(value)){
            _genderID = value;
        }
    };

    /**
     * Returns the instance's phone.
     *
     * @returns {string}
     * @author Elad Cohen
     */
    self.getPhone = function(){
        return _phone;
    };

    /**
     * Sets the instance's phone.
     *
     * @param value
     * @author Elad Cohen
     */
    self.setPhone = function(value){
        _phone = value;
    };

    /**
     * Returns the instance's birthDate.
     *
     * @returns {string}
     * @author Elad Cohen
     */
    self.getBirthDate = function(){
        return _birthDate;
    };

    /**
     * Sets the instance's birthDate.
     *
     * @param value
     * @author Elad Cohen
     */
    self.setBirthDate = function(value){
        _birthDate = value;
    };

    /**
     * Returns the instance's languageID.
     *
     * @returns {number}
     * @author Elad Cohen
     */
    self.getLanguageID = function(){
        return _languageID;
    };

    /**
     * Sets the instance's languageID.
     *
     * @param value
     * @author Elad Cohen
     */
    self.setLanguageID = function(value){
        if(!Helper.empty(value) && Helper.isPositiveInteger(value)){
            _languageID = value;
        }
    };

    /**
     * Returns the instance's countryID.
     *
     * @returns {number}
     * @author Elad Cohen
     */
    self.getCountryID = function(){
        return _countryID;
    };

    /**
     * Sets the instance's countryID.
     *
     * @param value
     * @author Elad Cohen
     */
    self.setCountryID = function(value){
        if(!Helper.empty(value) && Helper.isPositiveInteger(value)){
            _countryID = value;
        }
    };

    /**
     * Returns the instance's email.
     *
     * @returns {string}
     * @author Elad Cohen
     */
    self.getEmail = function(){
        return _email;
    };

    /**
     * Sets the instance's email.
     *
     * @param value
     * @author Elad Cohen
     */
    self.setEmail = function(value){
        _email = value;
    };

    /**
     * Returns the instance's UDID.
     *
     * @returns {string}
     * @author Elad Cohen
     */
    self.getUDID = function(){
        return _udid;
    };

    /**
     * Sets the instance's UDID.
     *
     * @param value
     * @author Elad Cohen
     */
    self.setUDID = function(value){
        _udid = value;
    };

    /**
     * Returns the instance's GCMID.
     *
     * @returns {string}
     * @author Elad Cohen
     */
    self.getGCMID = function(){
        return _GCMID;
    };

    /**
     * Sets the instance's GCMID.
     *
     * @param value
     * @author Elad Cohen
     */
    self.setGCMID = function(value){
        _GCMID = value;
    };

    /**
     * Returns the instance's confirmationNumber.
     *
     * @returns {number}
     * @author Elad Cohen
     */
    self.getConfirmationNumber = function(){
        return _confirmationNumber;
    };

    /**
     * Sets the instance's confirmationNumber.
     *
     * @param value
     * @author Elad Cohen
     */
    self.setConfirmationNumber = function(value){
        _confirmationNumber = value;
    };

    constructor();
};

module.exports = Reporter;