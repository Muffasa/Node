/**
 * Creates a new Helper instance.
 *
 * @constructor
 * @author Elad Cohen
 */
var Helper = function(){
    var self = this;

    /**
     * Returns whether a value is empty (PHP style ;-) ).
     *
     * @param val
     * @returns {boolean}
     * @author Elad Cohen
     */
    self.empty = function(val){
        if(typeof val === 'object'){
            for(var i in val){
                if(val.hasOwnProperty(i)){
                    return false;
                }
            }

            return true;
        }

        return typeof val === "undefined" || val == undefined || val == "" || val == 0 || val == false || val == null || val.length == 0;
    };

    /**
     * Returns whether a number is numeric.
     *
     * @param val
     * @returns {boolean}
     * @author Elad Cohen
     */
    self.isNumeric = function(val){
        return !isNaN(parseFloat(val)) && isFinite(val);
    };

    /**
     * Returns whether a number is a true integer.
     *
     * @param val
     * @returns {boolean}
     * @author Elad Cohen
     */
    self.isTrueInteger = function(val){
        return self.isNumeric(val) && parseInt(val) == val && parseInt(val) % 1 === 0;
    };

    /**
     * Returns whether a number is a true float.
     *
     * @param val
     * @returns {boolean}
     * @author Elad Cohen
     */
    self.isTrueFloat = function(val){
        return self.isTrueInteger(val) || (self.isNumeric(val) && parseFloat(val) == val && parseFloat(val) % 1 !== 0);
    };

    /**
     * Returns whether a number is a positive integer.
     *
     * @param val
     * @returns {boolean}
     * @author Elad Cohen
     */
    self.isPositiveInteger = function(val){
        return self.isTrueInteger(val) && val > 0;
    };

    /**
     * Updates an instance data from row.
     *
     * @param obj
     * @param row
     * @returns {boolean}
     * @author Elad Cohen
     */
    self.updateInstanceDataFromRow = function(obj, row){
        if(self.empty(obj) || self.empty(row) || typeof row !== "object"){
            return false;
        }

        for(var key in row){
            if(row.hasOwnProperty(key)){
                var value = row[key];
                var functionName = "set" + key;

                if(self.isFunction(obj[functionName])){
                    obj[functionName](value);
                }
            }
        }

        return true;
    };

    /**
     * Returns the extension of a file from the file's name / path.
     *
     * @param fileName
     * @returns {*}
     * @author Elad Cohen
     */
    self.getFileExtension = function(fileName){
        if(typeof fileName !== 'string' || self.empty(fileName)){
            return "";
        }

        var lastDotPosition = fileName.lastIndexOf(".");

        return fileName.substring(lastDotPosition + 1);
    };

    /**
     * Returns whether a variable is a function or not.
     *
     * @param func
     * @returns {boolean}
     * @author Elad Cohen
     */
    self.isFunction = function(func){
        return typeof func === 'function';
    };

    /**
     * Returns the length of an associative array.
     *
     * @param array
     * @returns {Number}
     * @author Elad Cohen
     */
    self.getAssociativeArrayLength = function(array){
        if(self.empty(array) || typeof array !== 'object'){
            return 0;
        }

        return Object.keys(array).length;
    };

    /**
     * Merges 2 associative arrays into one.
     *
     * @param array1
     * @param array2
     * @returns {*}
     * @author Elad Cohen
     */
    self.mergeAssociativeArrays = function(array1, array2){
        for(var property in array2) {
            if(array2.hasOwnProperty(property)){
                array1[property] = array2[property];
            }
        }

        return array1;
    };

    /**
     * Returns whether 2 arrays are equals or not.
     *
     * @param a
     * @param b
     * @returns {boolean}
     * @author Elad Cohen
     */
    self.arraysEqual = function(a, b){
        if(a.length != b.length){
            return false;
        }

        for(var i = 0; i < a.length; i++){
            if(a[i] !== a[b]){
                return false;
            }
        }

        return true;
    };

    /**
     * Returns whether a variable is an array.
     *
     * @param arr
     * @returns {boolean}
     * @author Elad Cohen
     */
    self.isArray = function(arr){
        return arr instanceof Array;
    };

    /**
     * Returns whether an item is located in an array.
     *
     * @param needle
     * @param haystack
     * @returns {boolean}
     * @author Elad Cohen
     */
    self.inArray = function(needle, haystack){
        if(!(haystack instanceof Array) || self.empty(haystack)){
            return false;
        }

        for(var i = 0; i < haystack.length; i++){
            if(haystack[i] == needle){
                return true;
            }
        }

        return false;
    };

    /**
     * Mersenne Twister random integer generator.
     *
     * @param min
     * @param max
     * @returns {*}
     */
    self.mt_rand = function(min, max){
        var argc = arguments.length;

        if (argc === 0){
            min = 0;
            max = 2147483647;
        }
        else if (argc === 1){
            throw new Error('Warning: mt_rand() expects exactly 2 parameters, 1 given');
        }
        else{
            min = parseInt(min, 10);
            max = parseInt(max, 10);
        }

        return Math.floor(Math.random() * (max - min + 1)) + min;
    };
};

module.exports = new Helper();