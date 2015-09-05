var Helper = require("./../General/Helper.js");
var DB = require("./../Database/DB.js");

/**
 * Creates a new Logs instance.
 *
 * @constructor
 * @author Elad Cohen
 */
var Logs = function(){
    var self = this;

    self.addErrorLog = function(title, data){
        var backtrace = new Error().stack;

        if(Helper.empty(data) || !(data instanceof Array)){
            data = [];
        }

        new DB.instance().add("Title", title).add("Data", data.toString()).add("Backtrace", backtrace.toString()).insert("error_logs");

        //@todo ADD IP LOGGING
    };
};

module.exports = new Logs();