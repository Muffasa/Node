var async = require("async");

var Helper = require("./../General/Helper.js");
var Firebase = require("./../General/Firebase.js");
var DB = require("./../Database/DB.js");
var CallCenterArea = require("./CallCenterArea.js");
var EmergencyCategory = require("./../Category/EmergencyCategory.js");
var GeneralFields = require("./../Fields/GeneralFields.js");
var Report = require("./../Report/Report.js");
var ReportMedia = require("./../Report/ReportMedia.js");

/**
 * Creates a new CallCenter instance.
 *
 * @param callCenterID
 * @param initData
 * @param callback
 * @constructor
 * @author Elad Cohen
 */
var CallCenter = function(callCenterID, initData, callback){
    var self = this;

    var _name;
    var _defaultLocationX;
    var _defaultLocationY;
    var _countryID;
    var _firebaseToken;

    self.dbFields = ["CallCenterID", "Name", "DefaultLocationX", "DefaultLocationY", "CountryID", "FirebaseToken"];
    self.tableName = "call_centers";

    self.areasDbFields = [];
    self.areasTableName = "call_center_areas";

    function construct(){
        if(Helper.empty(callCenterID) || !Helper.isPositiveInteger(callCenterID)){
            callCenterID = 0;
        }

        if(initData){
            self.getCallCenterData(function(){
                if(Helper.isFunction(callback)){
                    callback();
                }
            });
        }
    }

    /**
     * Returns the call center's data.
     *
     * @param callback
     * @author Elad Cohen
     */
    self.getCallCenterData = function(callback){
        if(Helper.empty(callCenterID) || !Helper.isPositiveInteger(callCenterID)){
            if(Helper.isFunction(callback)){
                callback({});

                return;
            }
        }

        new DB.instance().fetchBasicRecordData("CallCenterID", callCenterID, self.dbFields, self.tableName, function(result){
            if(!Helper.empty(result)){
                Helper.updateInstanceDataFromRow(self, result);

                if(Helper.isFunction(callback)){
                    callback(result);
                }
            }
        });
    };

    /**
     * Returns the available call centers.
     *
     * @param countryID
     * @param callback
     * @author Elad Cohen
     */
    self.getAllCallCenters = function(callback, countryID){
        if(typeof callback !== 'function'){
            return;
        }

        if(Helper.empty(countryID) || !Helper.isPositiveInteger(countryID)){
            countryID = 0;
        }

        var instance = new DB.instance();

        if(countryID != 0){
            instance.where("CountryID", countryID);
        }

        instance.select(self.dbFields, self.tableName, function(result){
            var callCenters = [];

            if(Helper.empty(result)){
                callback([]);

                return;
            }

            for(var i = 0; i < result.length; i++){
                var option = {
                    'value': result[i]['CallCenterID'],
                    'text': result[i]['Name']
                };

                callCenters.push(option);
            }

            callback(callCenters);
        });
    };

    /**
     * Returns the call center's areas.
     *
     * @param getCoordinates
     * @param callback
     * @author Elad Cohen
     */
    self.getCallCenterAreas = function(getCoordinates, callback){
        if(!Helper.isFunction(callback) || Helper.empty(callCenterID) || !Helper.isPositiveInteger(callCenterID)){
            return;
        }

        new DB.instance().where("CallCenterID", callCenterID).orderBy("Priority").select(self.areasDbFields, self.areasTableName, function(result){
            if(Helper.empty(result)){
                callback([]);

                return;
            }

            var areas = [];
            var finishedAreasCounter = 0;

            for(var i = 0; i < result.length; i++){
                (function(i){
                    var callCenterArea = new CallCenterArea(result[i]['CallCenterAreaID'], false);

                    callCenterArea.getCallCenterAreaData(getCoordinates, function(areaData){
                        areas.push(areaData);

                        finishedAreasCounter++;

                        if(finishedAreasCounter == result.length){
                            callback(areas);
                        }
                    });
                })(i);
            }
        });
    };

    /**
     * Returns the call center's reports.
     *
     * @param languageID
     * @param fromReportID
     * @param offset
     * @param reportStatusIDs
     * @param search
     * @param orderBy
     * @param callback
     * @author Elad Cohen
     */
    self.getCallCenterReports = function(languageID, fromReportID, offset, reportStatusIDs, search, orderBy, callback){
        if(!Helper.isFunction(callback)){
            return;
        }

        if(Helper.empty(callCenterID) || !Helper.isPositiveInteger(callCenterID)){
            callback([]);
        }

        if(Helper.empty(languageID) || !Helper.isPositiveInteger(languageID)){
            languageID = 1;
        }

        if(Helper.empty(fromReportID) || !Helper.isPositiveInteger(fromReportID)){
            fromReportID = 0;
        }

        if(Helper.empty(offset) || !Helper.isPositiveInteger(offset)){
            offset = 0;
        }

        if(Helper.empty(reportStatusIDs) || !Helper.isArray(reportStatusIDs)){
            reportStatusIDs = [];
        }

        if(Helper.empty(search) || typeof search !== 'string'){
            search = "";
        }

        if(Helper.empty(orderBy)){
            orderBy = "DESC";
        }

        var whereData = [languageID, languageID, languageID, languageID, callCenterID, fromReportID, "%" + search + "%", "%" + search + "%", "%" + search + "%", "%" + search + "%"];

        async.waterfall([
            function(cb){
                if(Helper.empty(reportStatusIDs)){
                    GeneralFields.getReportStatusData(function(reportStatusOptions){
                        for(var i = 0; i < reportStatusOptions.length; i++){
                            reportStatusIDs.push(reportStatusOptions[i]['value']);
                        }

                        cb();
                    });
                }
                else{
                    cb();
                }
            },
            function(cb){
                var statusQuestionMarks = "";

                for(var i = 0; i < reportStatusIDs.length; i++){
                    statusQuestionMarks += (!Helper.empty(statusQuestionMarks) ? "," : "") + "?";

                    whereData.push(reportStatusIDs[i]);
                }

                var tempReport = new Report();
                var reportFields = tempReport.dbFields;

                for(var j = 0; j < reportFields.length; j++){
                    reportFields[j] = "reports." + reportFields[j];
                }

                var extraFields = ["emergency_categories.Icon AS EmergencyCategoryIcon", "t1.`Value` AS EmergencyCategoryName", "t2.`Value` AS EmergencySubCategoryName", "t3.`Value` AS Involved", "addresses.Address AS GeoLocation"];
                var selectDbFields = reportFields.concat(extraFields);

                var sql = "SELECT " + selectDbFields.join(", ") + " FROM reports_call_centers" +
                    "      INNER JOIN reports ON reports.ReportID = reports_call_centers.ReportID" +
                    "      LEFT JOIN addresses ON reports.AddressCode = addresses.AddressCode AND addresses.LanguageID = ?" +
                    "      LEFT JOIN emergency_categories ON reports.EmergencyCatID = emergency_categories.EmergencyCatID" +
                    "      LEFT JOIN emergency_subcategories ON reports.EmergencySubCatID = emergency_subcategories.EmergencySubCatID" +
                    "      LEFT JOIN report_involved_options ON reports.InvolvedID = report_involved_options.InvolvedID" +
                    "      LEFT JOIN translations AS t1 ON emergency_categories.TranslationCode = t1.TranslationCode AND t1.LanguageID = ?" +
                    "      LEFT JOIN translations AS t2 ON emergency_subcategories.TranslationCode = t2.TranslationCode AND t2.LanguageID = ?" +
                    "      LEFT JOIN translations AS t3 ON report_involved_options.TranslationCode = t3.TranslationCode AND t3.LanguageID = ?" +
                    "      WHERE reports_call_centers.CallCenterID = ?" +
                    "            AND reports.ReportID >= ?" +
                    "            AND (t1.`Value` LIKE ? OR t2.`Value` LIKE ? OR t3.`Value` LIKE ? OR addresses.Address LIKE ?)" +
                    "            AND reports.ReportStatusID IN (" + statusQuestionMarks + ")" +
                    "      ORDER BY ReportID " + orderBy + "" +
                    "      LIMIT " + offset + ", 25;";

                new DB.instance().query(sql, whereData, function(reports){
                    if(!Helper.empty(reports)){
                        var completedReportsInitialization = 0;

                        async.waterfall([
                            function(cb1){
                                for(var i = 0; i < reports.length; i++){
                                    var reportData = reports[i];

                                    cb1(null, reportData);
                                }
                            },
                            function(reportData, cb1){
                                var reportMedia = new ReportMedia(reportData['ReportID']);

                                reportMedia.getImages(function(images){
                                    reportData['hasImages'] = !Helper.empty(images);

                                    //@todo Fix the GeoLocation if it was not initialized

                                    var addedTime = reportData['AddedTime'];
                                    reportData['AddedDate'] = Strings.getFormattedDate(addedTime, false, false);
                                    reportData['AddedTime'] = Strings.getTimeFromDate(addedTime);

                                    if(Helper.empty(reportData['UpdatedTime'])){
                                        reportData['UpdatedTime'] = "";
                                    }
                                    else{
                                        reportData['UpdatedTime'] = Strings.getTimeFromDate(reportData['UpdatedTime']);
                                    }

                                    completedReportsInitialization++;

                                    if(completedReportsInitialization == reports.length){
                                        cb1();
                                    }
                                });
                            }
                        ],
                        function(){
                            cb(reports);
                        });
                    }
                    else{
                        cb(reports);
                    }
                }, true);
            }
        ],
        function(error, reports){
            callback(reports);
        });
    };

    /**
     * Returns whether a report is related to the call center.
     *
     * @param reportID
     * @param callback
     * @author Elad Cohen
     */
    self.isReportRelated = function(reportID, callback){
        if(!Helper.isFunction(callback)){
            return;
        }

        if(Helper.empty(callCenterID) || Helper.empty(reportID) || !Helper.isPositiveInteger(callCenterID) || !Helper.isPositiveInteger(reportID)){
            callback(false);
        }

        new DB.instance().where("CallCenterID", callCenterID).where("ReportID", reportID).select(["ReportID"], "reports_call_centers", function(result){
            callback(!Helper.empty(result));
        });
    };

    /**
     * Returns the call center's emergency categories.
     *
     * @param languageID
     * @param callback
     */
    self.getCallCenterEmergencyCategories = function(languageID, callback){
        if(typeof callback !== 'function' || Helper.empty(callCenterID) || !Helper.isPositiveInteger(callCenterID)){
            return;
        }

        if(Helper.empty(languageID) || !Helper.isPositiveInteger(languageID)){
            languageID = 1;
        }

        new DB.instance().where("CallCenterID", callCenterID).orderBy("Priority").select(["EmergencyCatID"], "call_center_emergency_categories", function(result){
            var categories = [];

            if(Helper.empty(result)){
                callback(categories);

                return;
            }

            var emergencyCategoriesAmount = result.length;
            var completedCounter = 0;

            async.waterfall([
                function(cb){
                    for(var i = 0; i < result.length; i++){
                        new EmergencyCategory(result[i]["EmergencyCatID"], true, languageID, function(ec){
                            var option = {
                                'value': ec.getEmergencyCatID(),
                                'text': ec.getEmergencyCatName()
                            };

                            categories.push(option);

                            cb();
                        });
                    }
                },
                function(cb){
                    completedCounter++;

                    if(completedCounter == emergencyCategoriesAmount){
                        cb();
                    }
                }
            ],
            function(){
                callback(categories);
            });
        });
    };

    /**
     * Sets the call center's emergency categories.
     *
     * @param categories
     * @param callback
     * @author Elad Cohen
     */
    self.setCallCenterEmergencyCategories = function(categories, callback){
        if(!(categories instanceof Array) || Helper.empty(callCenterID) || !Helper.isPositiveInteger(callCenterID)){
            if(Helper.isFunction(callback)){
                callback(false);
            }

            return;
        }

        new DB.instance().where("CallCenterID", callCenterID).delete("call_center_emergency_categories", function(){
            var counter = 0;

            async.waterfall([
                function(cb){
                    for(var i = 1; i <= categories.length; i++){
                        self.addCallCenterEmergencyCategory(categories[i - 1], i, function(result){
                            if(!result){
                                callback(false);
                            }
                            else{
                                cb();
                            }
                        });
                    }
                },
                function(cb){
                    counter++;

                    if(counter == categories.length){
                        cb();
                    }
                }
            ],
            function(){
                callback(true);
            });
        });
    };

    /**
     * Adds an emergency category to the call center.
     *
     * @param emergencyCatID
     * @param priority
     * @param callback
     * @author Elad Cohen
     */
    self.addCallCenterEmergencyCategory = function(emergencyCatID, priority, callback){
        if(Helper.empty(callCenterID) || Helper.empty(emergencyCatID) || !Helper.isPositiveInteger(callCenterID) || !Helper.isPositiveInteger(emergencyCatID)){
            if(Helper.isFunction(callback)){
                callback(false);
            }

            return;
        }

        if(!Helper.isTrueInteger(priority)){
            priority = 1;
        }

        var emergencyCategory = new EmergencyCategory(emergencyCatID, false);

        emergencyCategory.getEmergencyCategoryData(function(data){
            if(Helper.empty(data)){
                if(Helper.isFunction(callback)){
                    callback(false);
                }

                return;
            }

            new DB.instance().add("CallCenterID", callCenterID).add("EmergencyCatID", emergencyCatID).add("Priority", priority).insert("call_center_emergency_categories", function(result){
                if(Helper.isFunction(callback)){
                    callback(!Helper.empty(result) && result > 0);
                }
            });
        });
    };

    /**
     * Deletes a specific emergency category from the call center's categories.
     *
     * @param emergencyCatID
     * @param callback
     * @author Elad Cohen
     */
    self.deleteCallCenterEmergencyCategory = function(emergencyCatID, callback){
        if(Helper.empty(callCenterID) || Helper.empty(emergencyCatID) || !Helper.isPositiveInteger(callCenterID) || !Helper.isPositiveInteger(emergencyCatID)){
            if(Helper.isFunction(callback)){
                callback(false);
            }

            return;
        }

        new DB.instance().where("CallCenterID", callCenterID).where("EmergencyCatID", emergencyCatID).delete("call_center_emergency_categories", function(result){
            if(Helper.isFunction(callback)){
                callback(!Helper.empty(result) && result > 0);
            }
        });
    };

    /**
     * Returns whether the call center supports a specific emergency category.
     *
     * @param emergencyCatID
     * @param callback
     * @author Elad Cohen
     */
    self.supportsEmergencyCategory = function(emergencyCatID, callback){
        if(typeof callback !== 'function' || Helper.empty(callCenterID) || Helper.empty(emergencyCatID) || !Helper.isPositiveInteger(callCenterID) || !Helper.isPositiveInteger(emergencyCatID)){
            return;
        }

        self.getCallCenterEmergencyCategories(1, function(result){
            for(var i = 0; i < result.length; i++){
                if(result[i]['value'] == emergencyCatID){
                    callback(true);

                    return;
                }
            }

            callback(false);
        });
    };

    /**
     * Updates the call center's firebase token.
     *
     * @param callback
     * @author Elad Cohen
     */
    self.updateFirebaseToken = function(callback){
        if(Helper.empty(callCenterID) || !Helper.isPositiveInteger(callCenterID)){
            if(Helper.isFunction(callback)){
                callback(false);
            }

            return;
        }

        var firebase = new Firebase();
        var token = firebase.generateToken("callCenter" + callCenterID);

        self.setFirebaseToken(token);

        new DB.instance().set("FirebaseToken", token).where("CallCenterID", callCenterID).update(self.tableName, function(result){
            if(Helper.isFunction(callback)){
                callback(!Helper.empty(result) && result > 0);
            }
        });
    };

    /**
     * Returns the instance's callCenterID.
     *
     * @returns {*}
     * @author Elad Cohen
     */
    self.getCallCenterID = function(){
        return callCenterID;
    };

    /**
     * Sets the instance's callCenterID.
     *
     * @param value
     * @author Elad Cohen
     */
    self.setCallCenterID = function(value){
        if(!Helper.empty(value) && Helper.isPositiveInteger(value)){
            callCenterID = value;
        }
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
     * Returns the instance's defaultLocationX.
     *
     * @returns {*}
     * @author Elad Cohen
     */
    self.getDefaultLocationX = function(){
        return _defaultLocationX;
    };

    /**
     * Sets the instance's defaultLocationX.
     *
     * @param value
     * @author Elad Cohen
     */
    self.setDefaultLocationX = function(value){
        if(Helper.isTrueFloat(value)){
            _defaultLocationX = value;
        }
    };

    /**
     * Returns the instance's defaultLocationY.
     *
     * @returns {*}
     * @author Elad Cohen
     */
    self.getDefaultLocationY = function(){
        return _defaultLocationY;
    };

    /**
     * Sets the instance's defaultLocationY.
     *
     * @param value
     * @author Elad Cohen
     */
    self.setDefaultLocationY = function(value){
        if(Helper.isTrueFloat(value)){
            _defaultLocationY = value;
        }
    };

    /**
     * Returns the instance's countryID.
     *
     * @returns {*}
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
     * Returns the instance's firebaseToken.
     *
     * @returns {*}
     * @author Elad Cohen
     */
    self.getFirebaseToken = function(){
        return _firebaseToken;
    };

    /**
     * Sets the instance's firebaseToken.
     *
     * @param value
     * @author Elad Cohen
     */
    self.setFirebaseToken = function(value){
        _firebaseToken = value;
    };

    construct();
};

module.exports = CallCenter;