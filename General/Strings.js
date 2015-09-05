var Helper = require("./Helper.js");

/**
 * Creates a new Strings instance.
 *
 * @constructor
 * @author Elad Cohen
 */
var Strings = function(){
    var self = this;

    self.md5Salt = "9438KJDH(ff4jshd345Jdfjf";

    /**
     * Generates a random string.
     *
     * @param length
     * @param characters
     * @returns {string}
     * @author Elad Cohen
     */
    self.generateRandomString = function(length, characters){
        if(Helper.empty(length) || !Helper.isPositiveInteger(length)){
            length = 10;
        }

        if(Helper.empty(characters) || typeof characters !== 'string'){
            characters = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        }

        var charactersLength = characters.length;
        var randomString = "";

        for(var i = 0; i < length; i++){
            randomString += characters[Helper.mt_rand(0, charactersLength - 1)];
        }

        return randomString;
    };

    /**
     * Checks whether a personal name is valid or not.
     *
     * @param string
     * @returns {boolean}
     * @author Elad Cohen
     */
    self.checkPersonalName = function(string){
        if(Helper.empty(string) || typeof string !== 'string'){
            return false;
        }

        var notAllowedCharacters = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

        for(var i = 0; i < notAllowedCharacters.length; i++){
            if(string.indexOf(notAllowedCharacters[i]) >= 0){
                return false;
            }
        }

        return true;
    };

    /**
     * Returns whether an email address is valid or not.
     *
     * @param email
     * @returns {boolean}
     */
    self.checkEmail = function(email){
        if(Helper.empty(email) || typeof email !== 'string'){
            return false;
        }

        var pattern = new RegExp("^[a-z\'0-9]+([._-][a-z\'0-9]+)*@([a-z0-9]+([._-][a-z0-9]+))+$"); //@todo Check if we need double slash here

        return pattern.test(email); //@todo Add DNS domain validation
    };

    /**
     * Returns whether a phone number is valid or not.
     *
     * @param phone
     * @param countryID
     * @returns {boolean}
     * @author Elad Cohen
     */
    self.checkPhone = function(phone, countryID){
        if(Helper.empty(phone) || typeof phone !== 'string'){
            return false;
        }

        if(Helper.empty(countryID) || !Helper.isPositiveInteger(countryID)){
            countryID = 1;
        }

        var pattern;

        if(countryID == 1){ //Israel @todo Add this to a constant
            pattern = new RegExp("^05\\d([-]{0,1})\\d{7}$");
        }
        else{
            pattern = new RegExp("^05\\d([-]{0,1})\\d{7}$"); //This is the default if no valid country was selected
        }

        return pattern.test(phone);
    };

    /**
     * Checks the password and returns errors if found.
     *
     * @param password
     * @author Elad Cohen
     */
    self.checkPassword = function(password){
        var errors = [];
        var minLength = 8;
        var maxLength = 16;

        if(password.length < minLength){
            errors.push("The password must include at least " + minLength + " characters.");
        }
        else if(password.length > maxLength){
            errors.push("The password may not exceed " + maxLength + " characters.");
        }

        if(!/#[0-9]+#/.test(password)){
            errors.push("The password must include at least 1 number.");
        }

        if(!/#[a-zA-Z]+#/.test(password)){
            errors.push("The password must include at least 1 letter.");
        }

        return errors;
    };

    /**
     * Returns whether a date is valid or not.
     *
     * @param date
     * @returns {boolean}
     * @author Elad Cohen
     */
    self.checkDate = function(date){
        if(Helper.empty(date) || typeof date !== 'string'){
            return false;
        }

        date = date.replace(/\\/g, "-");

        var Native = require("./Native.js");
        var time = Native.strtotime(date);

        return !!time;
    };

    /**
     * Returns a given date in Y-m-d format ($dbFormat = true) or d-m-Y format ($dbFormat = false).
     *
     * @param date
     * @param dbFormat
     * @param includeTime
     * @returns {*}
     * @author Elad Cohen
     */
    self.getFormattedDate = function(date, dbFormat, includeTime){
        if(!self.checkDate(date)){
            return false;
        }

        if(typeof dbFormat === 'undefined'){
            dbFormat = true;
        }

        date = date.replace(/\\/g, "-");

        var Native = require("./Native.js");
        var time = Native.strtotime(date);
        var newDate;

        if(dbFormat){
            if(includeTime){
                newDate = Native.strtotime("Y-m-d H:i:s", time);
            }
            else{
                newDate = Native.strtotime("Y-m-d", time);
            }
        }
        else{
            if(includeTime){
                newDate = Native.strtotime("d-m-Y H:i:s", time);
            }
            else{
                newDate = Native.strtotime("d-m-Y", time);
            }
        }

        return newDate;
    };

    /**
     * Returns the time from a given date.
     *
     * @param date
     * @returns {boolean}
     * @author Elad Cohen
     */
    self.getTimeFromDate = function(date){
        if(!self.checkDate(date)){
            return false;
        }

        var Native = require("./Native.js");
        var time = Native.strtotime(date);

        return Native.date("H:i:s", time);
    };

    /**
     * Returns a string with its lower camel case value.
     *
     * @param string
     * @returns string
     * @author Elad Cohen
     */
    self.getLowerCamelCase = function(string){
        if(Helper.empty(string) || typeof string !== 'string'){
            return "";
        }

        var firstLetter = string[0].toLowerCase();
        var restString = "";

        if(string.length > 1){
            restString = string.substring(1);
        }

        return firstLetter + restString;
    };

    /**
     * Returns the salted md5 value of a password.
     *
     * @param password
     * @returns {*}
     * @author Elad Cohen
     */
    self.md5Password = function(password){
        var md5 = require("MD5");

        return md5(self.md5Salt + password);
    };
};

module.exports = new Strings();