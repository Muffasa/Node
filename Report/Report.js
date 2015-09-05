var async = require("async");

var Address = require("./../General/Address.js");
var Helper = require("./../General/Helper.js");
var Firebase = require("./../General/Firebase.js");
var CallCenter = require("./../CallCenter/CallCenter.js");
var Maps = require("./../General/Maps.js");
var Native = require("./../General/Native.js");
var Reporter = require("./../Users/Reporter.js");
var Errors = require("./../General/Errors.js");
var Fields = require("./../Fields/Fields.js");
var GeneralFields = require("./../Fields/GeneralFields.js");
var DB = require("./../Database/DB.js");

/**
 * Creates a new Report instance.
 *
 * @param reportID
 * @param initWithQuery
 * @param callback
 * @constructor
 * @author Elad Cohen
 */
var Report = function(reportID, initWithQuery, callback){
    var self = this;

    var _reporterID;
    var _locationX;
    var _locationY;
    var _addedTime;
    var _updatedTime;
    var _emergencyCatID;
    var _emergencySubCatID;
    var _involvedID;
    var _involvedAmountID;
    var _reportStatusID;

    self.dbFields = ["ReportID", "ReporterID", "AddedTime", "UpdatedTime", "LocationX", "LocationY", "CountryID", "AddressCode", "EmergencyCatID", "EmergencySubCatID", "InvolvedID", "InvolvedAmountID", "ReportStatusID"];
    self.tableName = "reports";
    var fieldGroupID = 2;

    /**
     * Constructor - creates a Report instance.
     *
     * @author Elad Cohen
     */
    var constructor = function(){
        if(Helper.empty(reportID) || !Helper.isPositiveInteger(reportID)){
            reportID = 0;
        }

        if(initWithQuery && !Helper.empty(reportID)){
            self.getReportData(function(reportData){
                if(Helper.isFunction(callback)){
                    callback(reportData);
                }
            });
        }
    };

    /**
     * Returns the report's data.
     *
     * @param callback
     * @author Elad Cohen
     */
    self.getReportData = function(callback){
        if(Helper.empty(reportID) || !Helper.isPositiveInteger(reportID)){
            if(Helper.isFunction(callback)){
                callback([]);
            }

            return;
        }

        new DB.instance().fetchBasicRecordData("ReportID", reportID, self.dbFields, self.tableName, function(reportData){
            if(!Helper.empty(reportData)){
                Helper.updateInstanceDataFromRow(self, reportData);
            }

            if(Helper.isFunction(callback)){
                callback(reportData);
            }
        });
    };

    /**
     * Create a new report using given reportData.
     *
     * @param reportData
     * @param callback
     * @author Elad Cohen
     */
    self.createNewReport = function(reportData, callback){
        var response = {};

        if(!Helper.empty(reportData['ReporterID']) && Helper.isPositiveInteger(reportData['ReporterID'])){
            var reporter = new Reporter(reportData['ReporterID'], false);

            reporter.getReporterData(function(reporterData){
                if(Helper.empty(reporterData)){
                    if(Helper.isFunction(callback)){
                        response.error = "The reporter does not exist.";
                        response.errornumber = Errors.INVALID_DATA;

                        callback(response);
                    }

                    return;
                }

                reportData['CountryID'] = reporterData['CountryID'];

                if(!Helper.empty(reportData['LocationX']) && !Helper.empty(reportData['LocationY']) && Helper.isTrueFloat(reportData['LocationX']) && Helper.isTrueFloat(reportData['LocationY'])){
                    //@todo Check that the request was made from the same country as the request position

                    Address.addAddress(reportData['LocationX'], reportData['LocationY'], function(addressCode){
                        reportData['AddressCode'] = addressCode;

                        self.saveReport(reportData, false, function(resp){
                            response = resp;

                            if(!response.hasOwnProperty("error")){
                                Helper.updateInstanceDataFromRow(self, reportData);

                                var reportID = response['ReportID'];
                                var emergencyCatID = reportData['EmergencyCatID'];
                                var emergencySubCatID = reportData['EmergencySubCatID'];

                                response['EmergencyCatID'] = emergencyCatID;
                                response['EmergencySubCatID'] = emergencySubCatID;

                                var foundCallCenters = {};

                                var generalCallCenter = new CallCenter();
                                generalCallCenter.getAllCallCenters(function(callCenters){
                                    var point = [reportData['LocationX'], reportData['LocationY']];
                                    var completedCallCenters = 0;

                                    async.waterfall([
                                            function(cb){
                                                for(var i = 0; i < callCenters.length; i++){
                                                    cb(null, callCenters[i]);
                                                }
                                            },
                                            function(callCenter, cb){
                                                var callCenterID = callCenter['value'];

                                                callCenter = new CallCenter(callCenterID, true, function(){
                                                    //Checks if the call center supports the emergency category of the report
                                                    callCenter.supportsEmergencyCategory(emergencyCatID, function(supports){
                                                        if(supports){
                                                            //Checking if the report is located inside at least one of the call center's areas
                                                            callCenter.getCallCenterAreas(true, function(callCenterAreas){
                                                                debugger;
                                                                for(var i = 0; i < callCenterAreas.length; i++){
                                                                    var coordinates = callCenterAreas[i]['coordinates'];
                                                                    var polygon = [];

                                                                    for(var j = 0; j < coordinates.length; j++){
                                                                        polygon.push([coordinates[j]['LocationX'], coordinates[j]['LocationY']]);
                                                                    }

                                                                    if(Maps.polygonContains(point, polygon)){
                                                                        foundCallCenters[callCenterID] = callCenter.getName();

                                                                        new DB.instance().add("ReportID", reportID).add("CallCenterID", callCenterID).insert("reports_call_centers");

                                                                        break;
                                                                    }
                                                                }

                                                                completedCallCenters++;

                                                                if(completedCallCenters == callCenters.length){
                                                                    cb();
                                                                }
                                                            });
                                                        }
                                                        else{
                                                            completedCallCenters++;

                                                            if(completedCallCenters == callCenters.length){
                                                                cb();
                                                            }
                                                        }
                                                    });
                                                });
                                            }
                                        ],
                                        function(){
                                            if(!Helper.empty(foundCallCenters)){
                                                self.updateCallCenters();
                                            }
                                            else{
                                                //@todo LOG ERROR
                                            }

                                            response['foundCallCenters'] = !Helper.empty(foundCallCenters);

                                            if(Helper.isFunction(callback)){
                                                callback(response);
                                            }
                                        });
                                }, reportData['CountryID']);
                            }
                            else if(Helper.isFunction(callback)){
                                callback(response);
                            }
                        });
                    });
                }
                else if(Helper.isFunction(callback)){
                    response.error = "Invalid LocationX or LocationY received.";
                    response.errornumber = Errors.INVALID_DATA;

                    callback(response);
                }
            });
        }
        else if(Helper.isFunction(callback)){
            response.error = "Missing ReporterID.";
            response.errornumber = Errors.MISSING_DATA;

            callback(response);
        }
    };

    /**
     * Updates the report's data.
     *
     * @param reportData
     * @param callback
     * @author Elad Cohen
     */
    self.updateReportData = function(reportData, callback){
        var response = {};

        if(Helper.empty(reportID) || !Helper.isPositiveInteger(reportID)){
            response.error = "Invalid ReportID supplied.";
            response.errornumber = Errors.INVALID_DATA;

            if(Helper.isFunction(callback)){
                callback(response);
            }

            return;
        }

        self.getReportData(function(oldReportData){
            if(Helper.empty(oldReportData)){
                if(Helper.isFunction(callback)){
                    response.error = "The report does not exist.";
                    response.errornumber = Errors.INVALID_DATA;

                    callback(response);
                }

                return;
            }

            oldReportData = Helper.mergeAssociativeArrays(oldReportData, reportData);

            self.saveReport(oldReportData, true, function(result){
                response = result;

                self.updateCallCenters();

                //@todo ADD REPORT LOG

                if(Helper.isFunction(callback)){
                    callback(response);
                }
            });
        });
    };

    /**
     * Saves the report's data.
     *
     * @param reportData
     * @param isUpdate
     * @param callback
     * @author Elad Cohen
     */
    self.saveReport = function(reportData, isUpdate, callback){
        var fields = new Fields(fieldGroupID, reportData, false, 0, function(){
            fields.saveData(isUpdate, reportID, function(result){
                self.updateFirebaseReport();

                if(Helper.isFunction(callback)){
                    callback(result);
                }
            });
        });
    };

    /**
     * Updates the report's address.
     *
     * @param lat
     * @param lng
     * @param callback
     * @author Elad Cohen
     */
    self.updateAddress = function(lat, lng, callback){
        if(Helper.empty(reportID) || !Helper.isPositiveInteger(reportID) || !Helper.isTrueFloat(lat) || !Helper.isTrueFloat(lng)){
            if(Helper.isFunction(callback)){
                callback(false);
            }
        }

        Address.addAddress(lat, lng, function(addressCode){
            new DB.instance().where("ReportID", reportID).set("AddressCode", addressCode).update(self.tableName, function(result){
                if(Helper.isFunction(callback)){
                    callback(!Helper.empty(result) && result > 0);
                }
            });
        });
    };

    /**
     * Updates the report's status.
     *
     * @param reportStatusID
     * @param callback
     * @author Elad Cohen
     */
    self.updateReportStatus = function(reportStatusID, callback){
        if(Helper.empty(reportID) || Helper.empty(reportStatusID) || !Helper.isPositiveInteger(reportID) || !Helper.isPositiveInteger(reportStatusID)){
            if(Helper.isFunction(callback)){
                callback(false);
            }

            return;
        }

        GeneralFields.getReportStatusData(function(options){
            var isValid = false;

            for(var i = 0; i < options.length; i++){
                var option = options[i];

                if(option["value"] == reportStatusID){
                    isValid = true;

                    break;
                }
            }

            if(!isValid){
                if(Helper.isFunction(callback)){
                    callback(false);
                }

                return;
            }

            new DB.instance().where("ReportID", reportID).set("ReportStatusID", reportStatusID).update(self.tableName, function(result){
                if(Helper.isFunction(callback)){
                    callback(!Helper.empty(result) && result > 0);
                }
            });
        });
    };

    /**
     * Updates the call centers via Firebase that the report was updated.
     *
     * @param callback
     * @author Elad Cohen
     */
    self.updateCallCenters = function(callback){
        if(Helper.empty(reportID) || !Helper.isPositiveInteger(reportID)){
            if(Helper.isFunction(callback)){
                callback(false);
            }
        }

        new DB.instance().where("ReportID", reportID).select(["CallCenterID"], "reports_call_centers", function(callCentersResult){
            if(!Helper.empty(callCentersResult)){
                var firebase = new Firebase("newCallCenterReports");

                var randSpaceAddition = "";
                var rand = Helper.mt_rand(0, 30);

                for(var i = 0; i < rand; i++){
                    randSpaceAddition += " ";
                }

                for(var j = 0; j < callCentersResult.length; j++){
                    var obj = {};

                    obj['center' + callCentersResult[j]['CallCenterID']] = reportID + randSpaceAddition;

                    firebase.set(obj);
                }

                if(Helper.isFunction(callback)){
                    callback(true);
                }
            }
        });
    };

    /**
     * Updates firebase when was the last time the report was updated.
     *
     * @returns {boolean}
     * @author Elad Cohen
     */
    self.updateFirebaseReport = function(){
        if(Helper.empty(reportID) || !Helper.isPositiveInteger(reportID)){
            return false;
        }

        var firebase = new Firebase("callCenterReport");
        var obj = {};

        obj["report" + reportID] = Native.time();

        firebase.set(obj);
    };

    /**
     * Returns whether a reporter was notified of the report.
     *
     * @param reporterID
     * @param getAidID
     * @param callback
     * @author Elad Cohen
     */
    self.isReporterNotified = function(reporterID, getAidID, callback){
        if(!Helper.isFunction(callback) || Helper.empty(reportID) || Helper.empty(reporterID) || !Helper.isPositiveInteger(reportID) || !Helper.isPositiveInteger(reporterID)){
            if(Helper.isFunction(callback)){
                callback(false);
            }

            return;
        }

        new DB.instance().where("ReportID", reportID).where("ReporterID", reporterID).setLimit(1).select(["ReportAidID"], "report_aids", function(result){
            if(!Helper.empty(result)){
                if(getAidID){
                    callback(result[0]['ReportAidID']);
                }
                else{
                    callback(true);
                }
            }
            else{
                callback(false);
            }
        });
    };

    /**
     * Returns the instance's reportID.
     *
     * @returns {*}
     * @author Elad Cohen
     */
    self.getReportID = function(){
        return reportID;
    };

    /**
     * Sets the instance's reportID.
     *
     * @param value
     * @author Elad Cohen
     */
    self.setReportID = function(value){
        reportID = value;
    };

    /**
     * Returns the instance's reporterID.
     *
     * @returns {*}
     * @author Elad Cohen
     */
    self.getReporterID = function(){
        return _reporterID;
    };

    /**
     * Sets the instance's reporterID.
     *
     * @param reporterID
     * @author Elad Cohen
     */
    self.setReporterID = function(reporterID){
        _reporterID = reporterID;
    };

    /**
     * Returns the instance's locationX.
     *
     * @returns {*}
     * @author Elad Cohen
     */
    self.getLocationX = function(){
        return _locationX;
    };

    /**
     * Sets the instance's locationX.
     *
     * @param locationX
     * @author Elad Cohen
     */
    self.setLocationX = function(locationX){
        _locationX = locationX;
    };

    /**
     * Returns the instance's locationY.
     *
     * @returns {*}
     * @author Elad Cohen
     */
    self.getLocationY = function(){
        return _locationY;
    };

    /**
     * Sets the instance's locationY.
     *
     * @param locationY
     * @author Elad Cohen
     */
    self.setLocationY = function(locationY){
        _locationY = locationY;
    };

    /**
     * Returns the instance's added time.
     *
     * @returns {*}
     * @author Elad Cohen
     */
    self.getAddedTime = function(){
        return _addedTime;
    };

    /**
     * Sets the instance's added time.
     *
     * @param addedTime
     * @author Elad Cohen
     */
    self.setAddedTime = function(addedTime){
        _addedTime = addedTime;
    };

    /**
     * Returns the instance's updatedTime.
     *
     * @returns {*}
     * @author Elad Cohen
     */
    self.getUpdatedTime = function(){
        return _updatedTime;
    };

    /**
     * Sets the instance's updatedTime.
     *
     * @param updatedTime
     * @author Elad Cohen
     */
    self.setUpdatedTime = function(updatedTime){
        _updatedTime = updatedTime;
    };

    /**
     * Returns the instance's emergencyCatID.
     *
     * @returns {*}
     * @author Elad Cohen
     */
    self.getEmergencyCatID = function(){
        return _emergencyCatID;
    };

    /**
     * Sets the instance's emergencyCatID.
     *
     * @param emergencyCatID
     * @author Elad Cohen
     */
    self.setEmergencyCatID = function(emergencyCatID){
        _emergencyCatID = emergencyCatID;
    };

    /**
     * Returns the instance's emergencySubCatID.
     *
     * @returns {*}
     * @author Elad Cohen
     */
    self.getEmergencySubCatID = function(){
        return _emergencySubCatID;
    };

    /**
     * Sets the instance's emergencyCatID.
     *
     * @param emergencySubCatID
     * @author Elad Cohen
     */
    self.setEmergencyCatID = function(emergencySubCatID){
        _emergencySubCatID = emergencySubCatID;
    };

    /**
     * Returns the instance's involvedID.
     *
     * @returns {*}
     * @author Elad Cohen
     */
    self.getInvolvedID = function(){
        return _involvedID;
    };

    /**
     * Sets the instance's involvedID.
     *
     * @param involvedID
     * @author Elad Cohen
     */
    self.setInvolvedID = function(involvedID){
        _involvedID = involvedID;
    };

    /**
     * Returns the instance's involvedAmountID.
     *
     * @returns {*}
     * @author Elad Cohen
     */
    self.getInvolvedAmountID = function(){
        return _involvedAmountID;
    };

    /**
     * Sets the instance's involvedAmountID.
     *
     * @param involvedAmountID
     * @author Elad Cohen
     */
    self.setInvolvedAmountID = function(involvedAmountID){
        _involvedAmountID = involvedAmountID;
    };

    /**
     * Returns the instance's reportStatusID.
     *
     * @returns {*}
     * @author Elad Cohen
     */
    self.getReportStatusID = function(){
        return _reportStatusID;
    };

    /**
     * Sets the instance's reportStatusID.
     *
     * @param reportStatusID
     * @author Elad Cohen
     */
    self.setReportStatusID = function(reportStatusID){
        _reportStatusID = reportStatusID;
    };

    constructor();
};

module.exports = Report;