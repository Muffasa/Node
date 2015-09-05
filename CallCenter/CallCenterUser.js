var Helper = require("./../General/Helper.js");
var Strings = require("./../General/Strings.js");
var Translation = require("./../General/Translation.js");
var Errors = require("./../General/Errors.js");
var DB = require("./../Database/DB.js");
var Fields = require("./../Fields/Fields.js");

/**
 * Creates a new CallCenterUser instance.
 *
 * @param callCenterUserID
 * @param initData
 * @param callback
 * @constructor
 * @author Elad Cohen
 */
var CallCenterUser = function(callCenterUserID, initData, callback){
    var self = this;

    self.NORMAL_USER = 1;
    self.NORMAL_USER_WITH_ADMIN_RIGHTS = 2;
    self.CALL_CENTER_MANAGER = 3;
    self.SYSTEM_ADMIN = 4;

    var _callCenterID;
    var _username;
    var _password;
    var _name;
    var _email;
    var _languageID;
    var _callCenterUserLevelID;

    self.dbFields = ["CallCenterUserID", "CallCenterID", "Username", "Password", "Name", "Email", "LanguageID", "CallCenterUserLevelID"];
    self.tableName = "call_center_users";
    self.fieldGroupID = 3;

    function construct(){
        if(Helper.empty(callCenterUserID) || !Helper.isPositiveInteger(callCenterUserID)){
            callCenterUserID = 0;
        }

        if(initData && !Helper.empty(callCenterUserID)){
            self.getCallCenterUserData(function(){
                callback();
            });
        }
    }

    /**
     * Returns the call center user's data.
     *
     * @param callback
     * @author Elad Cohen
     */
    self.getCallCenterUserData = function(callback){
        if(Helper.empty(callCenterUserID) || !Helper.isPositiveInteger(callCenterUserID)){
            if(Helper.isFunction(callback)){
                callback({});
            }

            return;
        }

        new DB.instance().fetchBasicRecordData("CallCenterUserID", callCenterUserID, self.dbFields, self.tableName, function(result){
            if(!Helper.empty(result)){
                Helper.updateInstanceDataFromRow(self, result);
            }

            if(Helper.isFunction(callback)){
                callback(result);
            }
        });
    };

    /**
     * Returns all call center user levels options.
     *
     * @param callback
     * @param languageID
     * @author Elad Cohen
     */
    self.getAllCallCenterUserLevels = function(callback, languageID){
        if(!Helper.isFunction(callback)){
            return;
        }

        if(Helper.empty(languageID) || !Helper.isPositiveInteger(languageID)){
            languageID = 1;
        }

        new DB.instance().orderBy("Priority").select(["CallCenterUserLevelID", "TranslationCode"], "call_center_user_levels", function(result){
            if(!Helper.empty(result)){
                var levels = [];

                for(var i = 0; i < result.length; i++){
                    var option = {};

                    option['value'] = result[i]['CallCenterUserLevelID'];

                    (function(option){
                        Translation.getTranslationValue(result[i]['TranslationCode'], languageID, function(text){
                            option['text'] = text;
                            levels.push(option);

                            if(levels.length == result.length){
                                callback(levels);
                            }
                        });
                    })(option);
                }
            }
            else{
                callback([]);
            }
        });
    };

    /**
     * Creates a new CallCenterUser.
     *
     * @param data
     * @param callback
     * @author Elad Cohen
     */
    self.createCallCenterUser = function(data, callback){
        var response = {};

        if(Helper.empty(data)){
            if(Helper.isFunction(callback)){
                response.error = "Empty data received.";
                response.errornumber = Errors.MISSING_DATA;

                callback(response);
            }

            return;
        }

        if(!Helper.empty(data['UserName'])){
            new DB.instance().where("UserName", data["UserName"]).select(["CallCenterUserID"], self.tableName, function(result){
                if(!Helper.empty(result)){
                    if(Helper.isFunction(callback)){
                        response.error = "The Username already exists.";
                        response.errornumber = Errors.INVALID_DATA;

                        callback(response);
                    }

                    return;
                }

                self.saveCallCenterUserData(data, false, callback);
            });
        }
        else if(Helper.isFunction(callback)){
            response.error = "The UserName was not sent.";
            response.errornumber = Errors.MISSING_DATA;

            callback(response);
        }
    };

    self.updateCallCenterUser = function(data, callback){
        //@todo COMPLETE THIS FUNCTION
    };

    /**
     * Saves the call center user's data.
     *
     * @param data
     * @param isUpdate
     * @param callback
     * @author Elad Cohen
     */
    self.saveCallCenterUserData = function(data, isUpdate, callback){
        var fields = new Fields(self.fieldGroupID, data, false, 0, function(){
            if(isUpdate){
                fields.saveData(true, callCenterUserID, callback);
            }
            else{
                fields.saveData(false, null, callback);
            }
        });
    };

    /**
     * Returns whether the CallCenterUser is connected.
     *
     * @param req
     * @returns {boolean}
     * @author Elad Cohen
     */
    self.isConnected = function(req){
        if(!Helper.empty(req) && typeof req === 'object'){
            return !Helper.empty(req.session["CallCenterUserID"]);
        }
    };

    /**
     * Creates a user's session.
     *
     * @param username
     * @param password
     * @param req
     * @param callback
     * @author Elad Cohen
     */
    self.login = function(username, password, req, callback){
        self.logout(req);

        var response = {};

        if(Helper.empty(req) || typeof req !== 'object'){
            if(Helper.isFunction(callback)){
                response.error = "An internal error has occurred.";
                response.errornumber = Errors.INTERNAL_ERROR;

                callback(response);
            }

            return;
        }

        if(Helper.empty(username) || Helper.empty(password)){
            if(Helper.isFunction(callback)){
                response.error = "Missing Username or Password.";
                response.errornumber = Errors.MISSING_DATA;

                callback(response);
            }

            return;
        }

        new DB.instance().where("Username").select(self.dbFields, self.tableName, function(result){
            if(Helper.empty(result)){
                if(Helper.isFunction(callback)){
                    response.error = "The Username does not exist.";
                    response.errornumber = Errors.INVALID_DATA;
                }

                return;
            }

            var row = result[0];

            if(Strings.md5Password(password) == row['Password']){
                req.session.CallCenterUserID = row['CallCenterUserID'];

                if(Helper.isFunction(callback)){
                    response.result = true;

                    callback(response);
                }
            }
            else if(Helper.isFunction(callback)){
                response.error = "The Password does not match the Username.";
                response.errornumber = Errors.INVALID_DATA;

                callback(response);
            }
        });
    };

    /**
     * Logs out the call center user.
     *
     * @param req
     * @author Elad Cohen
     */
    self.logout = function(req){
        if(!Helper.empty(req) && typeof req === 'object'){
            delete req.session["CallCenterUserID"];
        }
    };

    /**
     * Returns a new instance of the connected CallCenterUser.
     *
     * @param req
     * @param callback
     * @author Elad Cohen
     */
    self.getInstance = function(req, callback){
        if(!Helper.empty(req) && typeof req === 'object'){
            var userID = !Helper.empty(req.session['CallCenterUserID']) ? parseInt(req.session['CallCenterUserID']) : 0;

            var newInstance = new CallCenterUser(userID, true, function(){
                callback(newInstance);
            });
        }
    };

    /**
     * Returns the instance's callCenterUserID.
     *
     * @returns {*}
     * @author Elad Cohen
     */
    self.getCallCenterUserID = function(){
        return callCenterUserID;
    };

    /**
     * Sets the instance's callCenterUserID.
     *
     * @param value
     * @author Elad Cohen
     */
    self.setCallCenterUserID = function(value){
        if(!Helper.empty(value) && Helper.isPositiveInteger(value)){
            callCenterUserID = value;
        }
    };

    /**
     * Returns the instance's callCenterID.
     *
     * @returns {*}
     * @author Elad Cohen
     */
    self.getCallCenterID = function(){
        return _callCenterID;
    };

    /**
     * Sets the instance's callCenterID.
     *
     * @param value
     * @author Elad Cohen
     */
    self.setCallCenterID = function(value){
        if(!Helper.empty(value) && Helper.isPositiveInteger(value)){
            _callCenterID = value;
        }
    };

    /**
     * Returns the instance's userName.
     *
     * @returns {*}
     * @author Elad Cohen
     */
    self.getUserName = function(){
        return _username;
    };

    /**
     * Sets the instance's userName.
     *
     * @param value
     * @author Elad Cohen
     */
    self.setUserName = function(value){
        _username = value;
    };

    /**
     * Returns the instance's password.
     *
     * @returns {*}
     * @author Elad Cohen
     */
    self.getPassword = function(){
        return _password;
    };

    /**
     * Sets the instance's password.
     *
     * @param value
     * @author Elad Cohen
     */
    self.setPassword = function(value){
        _password = value;
    };

    /**
     * Returns the instance's name.
     *
     * @returns {*}
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
     * Returns the instance's email.
     *
     * @returns {*}
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
     * Returns the instance's languageID.
     *
     * @returns {*}
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
     * Returns the instance's callCenterUserLevelID.
     *
     * @returns {*}
     * @author Elad Cohen
     */
    self.getCallCenterUserLevelID = function(){
        return _callCenterUserLevelID;
    };

    /**
     * Sets the instance's callCenterUserLevelID.
     *
     * @param value
     * @author Elad Cohen
     */
    self.setCallCenterUserLevelID = function(value){
        if(!Helper.empty(value) && Helper.isPositiveInteger(value)){
            _callCenterUserLevelID = value;
        }
    };

    construct();
};

module.exports = CallCenterUser;