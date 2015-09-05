var Helper = require("./../General/Helper.js");
var DB = require("./../Database/DB.js");
var CallCenterUser = require("./../CallCenter/CallCenterUser.js");

/**
 * Creates a new ReportComment instance.
 *
 * @param reportID
 * @param callCenterUserID
 * @constructor
 * @author Elad Cohen
 */
var ReportComment = function(reportID, callCenterUserID){
    var self = this;

    self.dbFields = ["ReportCommentID", "ReportID", "Value", "CallCenterUserID", "AddedTime"];
    self.tableName = "report_comments";

    function construct(){
        if(Helper.empty(reportID) || !Helper.isPositiveInteger(reportID)){
            reportID = 0;
        }

        if(Helper.empty(callCenterUserID) || !Helper.isPositiveInteger(callCenterUserID)){
            callCenterUserID = 0;
        }
    }

    /**
     * Adds a new comment to the report.
     *
     * @param value
     * @param callback
     * @author Elad Cohen
     */
    self.addComment = function(value, callback){
        if(Helper.empty(value) || Helper.empty(reportID) || Helper.empty(callCenterUserID) || !Helper.isPositiveInteger(reportID) || !Helper.isPositiveInteger(callCenterUserID)){
            if(Helper.isFunction(callback)){
                callback(0);
            }

            return;
        }

        new DB.instance().add("Value", value).add("ReportID", reportID).add("CallCenterUserID", callCenterUserID).insert(self.tableName, function(result){
            if(Helper.isFunction(callback)){
                callback(result);
            }
        });
    };

    /**
     * Returns the report's comments.
     *
     * @param getFullData
     * @param callback
     * @author Elad Cohen
     */
    self.getReportComments = function(getFullData, callback){
        if(typeof callback !== 'function' || Helper.empty(reportID) || !Helper.isPositiveInteger(reportID)){
            if(Helper.isFunction(callback)){
                callback([]);
            }

            return;
        }

        new DB.instance().where("ReportID", reportID).orderBy("ReportCommentID").select(self.dbFields, self.tableName, function(result){
            var comments = result;

            if(Helper.empty(result)){
                callback([]);

                return;
            }

            if(getFullData){
                var completedRowsCounter = 0;

                for(var i = 0; i < result.length; i++){
                    var row = result[i];

                    (function(row){
                        var callCenterUser = new CallCenterUser(result[0]['CallCenterUserID'], true, function(){
                            row['CallCenterUserName'] = callCenterUser.getName();

                            completedRowsCounter++;

                            if(completedRowsCounter == result.length){
                                callback(comments);
                            }
                        });
                    })(row);
                }
            }
            else{
                callback(comments);
            }
        });
    };

    construct();
};

module.exports = ReportComment;