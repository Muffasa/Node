var fs = require("fs");

var GeneralFields = require("./../Fields/GeneralFields.js");
var EmergencyCategory = require("./../Category/EmergencyCategory.js");
var EmergencySubCategory = require("./../Category/EmergencySubCategory.js");
var Reporter = require("./../Users/Reporter.js");
var Report = require("./../Report/Report.js");
var ReportMedia = require("./../Report/ReportMedia.js");
var Helper = require("./../General/Helper.js");
var Maps = require("./../General/Maps.js");
var Native = require("./../General/Native.js");
var Strings = require("./../General/Strings.js");
var Errors = require("./../General/Errors.js");
var Nuance = require("./../Audio/Nuance.js");
var GCM = require("./../General/GCM.js");

/**
 * Creates a new WebServiceController instance.
 *
 * @param router
 * @constructor
 * @author Elad Cohen
 */
function WebServiceController(router) {
    router.get("/",function(req, res){
        res.send("yo yo yo this is working!")
    });

    router.post("/",function(req, res){
        //@todo Log error
    });

    /**
     * Creates and sends a phone confirmation number by sms to the reporter.
     *
     * @author Elad Cohen
     */
    router.post("/ws/createPhoneConfirmation", function(req, res){
        var data = req.body;
        var response = {};
        var reporter = {};

        if(Helper.empty(data["CountryID"]) || !Helper.isPositiveInteger(data["CountryID"])){
            response.error = "Invalid CountryID supplied.";
            response.errornumber = Errors.INVALID_DATA;

            res.json(response);
        }
        else if(Helper.empty(data["Phone"]) || !Strings.checkPhone(data["Phone"], data["CountryID"])){
            response.error = "Invalid Phone supplied.";
            response.errornumber = Errors.INVALID_DATA;

            res.json(response);
        }
        else{
            reporter = new Reporter();

            reporter.createPhoneConfirmation(data["Phone"], data["CountryID"], function(result){
                response = result;

                res.json(response);
            });
        }
    });

    /**
     * Logins a reporter - requires Phone and Code (SMS Confirmation Code) and the CountryID.
     *
     * @author Elad Cohen
     */
    router.post("/ws/login", function(req, res){
        var data = req.body;
        var response = {};
        var reporter = {};

        if(Helper.empty(data["CountryID"]) || !Helper.isPositiveInteger(data["CountryID"])){
            response.error = "Invalid CountryID supplied.";
            response.errornumber = Errors.INVALID_DATA;

            res.json(response);
        }
        else if(Helper.empty(data["Phone"]) || !Strings.checkPhone(data["Phone"], data["CountryID"])){
            response.error = "Invalid Phone supplied.";
            response.errornumber = Errors.INVALID_DATA;

            res.json(response);
        }
        else if(Helper.empty(data["Code"])){
            response.error = "Missing confirmation code.";
            response.errornumber = Errors.MISSING_DATA;

            res.json(response);
        }
        else{
            reporter = new Reporter();

            reporter.login(data["Phone"], data["Code"], data["CountryID"], function(result){
                response = result;

                res.json(response);
            });
        }
    });

    /**
     * Returns whether a user is connected with supplied ReporterID and loginToken.
     *
     * @author Elad Cohen
     */
    router.post("/ws/isConnected", function(req, res){
        var data = req.body;
        var response = {};
        var connectorParams = {
            'reporter': {},
            'reporterID': 0
        };

        invalidReporterHandler(response, data);

        if(response.hasOwnProperty("error")){
            res.json(response);
        }
        else{
            reporterConnector(data, connectorParams, function(){
                response.result = !Helper.empty(connectorParams["reporterID"]);

                res.json(response);
            });
        }
    });

    /**
     * Logs out a reporter by a given ReporterID and loginToken.
     *
     * @author Elad Cohen
     */
    router.post("/ws/logout", function(req, res){
        var data = req.body;
        var response = {};
        var connectorParams = {
            'reporter': {},
            'reporterID': 0
        };

        invalidReporterHandler(response, data);

        if(response.hasOwnProperty("error")){
            res.json(response);
        }
        else{
            reporterConnector(data, connectorParams, function(){
                if(!Helper.empty(connectorParams["reporterID"])){
                    connectorParams["reporter"].destroyReporterSession(function(result){
                        response.result = result;

                        res.json(response);
                    });
                }
                else{
                    response.error = "Invalid reporter login details supplied.";
                    response.errornumber = Errors.INVALID_DATA;

                    res.json(response);
                }
            });
        }
    });

    /**
     * Handles getting languages.
     *
     * @author Elad Cohen
     */
    router.post("/ws/getLanguages", function(req, res){
        var response = {};

        GeneralFields.getAllLanguages(function(result){
            response['data'] = result;

            res.json(response);
        });
    });

    /**
     * Handles getting genders.
     *
     * @author Elad Cohen
     */
    router.post("/ws/getGenders", function(req, res){
        var data = req.body;
        var response = {};

        invalidLanguageHandler(response, data);

        if(!response.hasOwnProperty("error")){
            var languageID = data["LanguageID"];

            GeneralFields.getGenders(function(result){
                response['data'] = result;

                res.json(response);
            }, languageID);
        }
        else{
            res.json(response);
        }
    });

    /**
     * Handles getting the countries.
     *
     * @author Elad Cohen
     */
    router.post("/ws/getCountries", function(req, res){
        var data = req.body;
        var response = {};

        invalidLanguageHandler(response, data);

        if(!response.hasOwnProperty("error")){
            var languageID = data["LanguageID"];

            GeneralFields.getCountriesData(function(result){
                response['data'] = result;

                res.json(response);
            }, languageID);
        }
        else{
            res.json(response);
        }
    });

    /**
     * Creates a new reporter.
     *
     * @author Elad Cohen
     */
    router.post("/ws/newReporter", function(req, res){
        var data = req.body;
        var response = {};

        if(Helper.empty(data)){
            response.error = "No data supplied.";
            response.errornumber = Errors.MISSING_DATA;

            res.json(response);
        }
        else if(Helper.empty(data["Code"])){
            response.error = "Missing confirmation code.";
            response.errornumber = Errors.MISSING_DATA;

            res.json(response);
        }
        else{
            var reporter = new Reporter();

            reporter.createNewReporter(data, data["Code"], function(result){
                response = result;

                res.json(response);
            });
        }
    });

    /**
     * Handles updating the reporter's GCMID.
     *
     * @author Elad Cohen
     */
    router.post("/ws/updateReporterGCM", function(req, res){
        var data = req.body;
        var response = {};
        var connectorParams = {
            'reporter': {},
            'reporterID': 0
        };

        if(Helper.empty(data["GCMID"])){
            response.error = "Missing GCMID.";
            response.errornumber = Errors.MISSING_DATA;

            res.json(response);

            return;
        }

        invalidReporterHandler(response, data);

        if(response.hasOwnProperty("error")){
            res.json(response);
        }
        else{
            reporterConnector(data, connectorParams, function(){
                if(!Helper.empty(connectorParams["reporterID"])){
                    connectorParams["reporter"].updateGCMID(data["GCMID"], function(result){
                        response.result = result;

                        res.json(response);
                    });
                }
                else{
                    response.error = "Invalid reporter login details supplied.";
                    response.errornumber = Errors.INVALID_DATA;

                    res.json(response);
                }
            });
        }
    });

    /**
     * Updates the reporter's data.
     *
     * @author Elad Cohen
     */
    router.post("/ws/updateReporter", function(req, res){
        var data = req.body;
        var response = {};
        var connectorParams = {
            'reporter': {},
            'reporterID': 0
        };

        invalidReporterHandler(response, data);

        if(response.hasOwnProperty("error")){
            res.json(response);
        }
        else{
            reporterConnector(data, connectorParams, function(){
                if(!Helper.empty(connectorParams["reporterID"])){
                    connectorParams["reporter"].updateReporter(data, function(result){
                        response = result;

                        res.json(response);
                    });
                }
                else{
                    response.error = "Invalid reporter login details supplied.";
                    response.errornumber = Errors.INVALID_DATA;

                    res.json(response);
                }
            });
        }
    });

    /**
     * Returns the reporter's data.
     *
     * @author Elad Cohen
     */
    router.post("/ws/getReporterData", function(req, res){
        var data = req.body;
        var response = {};
        var connectorParams = {
            'reporter': {},
            'reporterID': 0
        };

        invalidReporterHandler(response, data);

        if(response.hasOwnProperty("error")){
            res.json(response);
        }
        else{
            reporterConnector(data, connectorParams, function(){
                if(!Helper.empty(connectorParams["reporterID"])){
                    connectorParams["reporter"].getReporterData(function(result){
                        response = result;

                        res.json(response);
                    });
                }
                else{
                    response.error = "Invalid reporter login details supplied.";
                    response.errornumber = Errors.INVALID_DATA;

                    res.json(response);
                }
            });
        }
    });

    /**
     * Handles getting categories.
     *
     * @author Elad Cohen
     */
    router.post("/ws/getEmergencyCategories", function(req, res){
        var data = req.body;
        var response = {};

        invalidLanguageHandler(response, data);

        if(!response.hasOwnProperty("error")){
            var languageID = data["LanguageID"];

            GeneralFields.getAllCategories(function(categories){
                res.json(categories);
            }, languageID);
        }
        else{
            res.json(response);
        }
    });

    /**
     * Handles getting SubCategories.
     *
     * @author Elad Cohen
     */
    router.post("/ws/getEmergencySubcategories", function(req, res){
        var data = req.body;
        var response = {};

        invalidLanguageHandler(response, data);

        if(!response.hasOwnProperty("error")){
            var languageID = data["LanguageID"];

            GeneralFields.getAllSubCategories(function(categories){
                res.json(categories);
            }, languageID);
        }
        else{
            res.json(response);
        }
    });

    /**
     * Handles creating reports with an audio file.
     *
     * @author Elad Cohen
     */
    router.post("/ws/newReportWithAudio", function(req, res){
        var data = {};
        var voiceFiles = [];
        var response = {};
        var connectorParams = {
            'reporter': {},
            'reporterID': 0
        };

        //Fetching the sent fields
        req.busboy.on('field', function(key, value){
            data[key] = value;
        });

        //Fetching the voice file
        req.busboy.on('file', function(fieldname, file, filename){
            var fileExtension = Helper.getFileExtension(filename.toLowerCase());

            if(fieldname === 'voice' && fileExtension === 'amr'){
                var tmpFileName = Native.time() + "_" + filename;
                var writeStream = fs.createWriteStream('./temp/' + tmpFileName);

                var fileData = [];

                file.on('data', function(d){
                    fileData.push(d);
                });

                file.on('end', function(){
                    fileData = Buffer.concat(fileData);

                    writeStream.write(fileData);
                    writeStream.end();

                    voiceFiles.push(tmpFileName);
                });
            }
            else if(fileExtension !== 'amr'){
                //@todo LOG ERROR
            }
            else{
                file.on('data', function(d) {

                }).on('limit', function() {

                }).on('end', function() {

                });
            }
        });

        //Finished fetching the data, we can now continue
        req.busboy.on('finish', function(){
            invalidReporterHandler(response, data);

            if(!response.hasOwnProperty("error")){
                if(Helper.empty(voiceFiles)){
                    response.error = "The audio file was not sent.";
                    response.errornumber = Errors.MISSING_DATA;

                    res.json(response);
                }
                else{
                    reporterConnector(data, connectorParams, function(){
                        if(!Helper.empty(connectorParams['reporterID'])){
                            var languageID = connectorParams['reporter'].getLanguageID();
                            var nuance = new Nuance(data['ReporterID'], languageID);

                            //Removing the EmergencyCatID and EmergencySubCatID from the data (if sent)
                            delete data['EmergencyCatID'];
                            delete data['EmergencySubCatID'];

                            nuance.saveAudioFile("temp/" + voiceFiles[0], function(fileSaved){
                                if(fileSaved){
                                    nuance.request(function(error, nuanceResponse){
                                        //Deleting the file from the temp folder since we've already uploaded it
                                        fs.unlink("temp/" + voiceFiles[0]);

                                        if(!error){
                                            if(!Helper.empty(nuanceResponse)){
                                                var emergencyCategory = new EmergencyCategory();
                                                var emergencySubCategory = new EmergencySubCategory();

                                                emergencySubCategory.getSubCategoryFromAudioStrings(nuanceResponse, languageID, function(findSubCategory){
                                                    if(!Helper.empty(findSubCategory['EmergencySubCatID'])){
                                                        data['EmergencySubCatID'] = findSubCategory['EmergencySubCatID'];

                                                        emergencySubCategory.setEmergencySubCatID(data['EmergencySubCatID']);
                                                        emergencySubCategory.getEmergencySubCategoryData(function(){
                                                            data['EmergencyCatID'] = emergencySubCategory.getEmergencyCatID();

                                                            //Finally - creating the report
                                                            var report = new Report();
                                                            report.createNewReport(data, function(resp){
                                                                response = resp;

                                                                if(!response.hasOwnProperty("error")){
                                                                    //Adding the audio to the report if the report succeeded
                                                                    var reportID = response['ReportID'];
                                                                    var filePath = nuance.getFilePath();

                                                                    var reportMedia = new ReportMedia(reportID);
                                                                    reportMedia.addExistingAudio(filePath, nuanceResponse);
                                                                }

                                                                res.json(resp);
                                                            });
                                                        });
                                                    }
                                                    else{
                                                        emergencyCategory.getCategoryFromAudioStrings(nuanceResponse, languageID, function(findCategory){
                                                            if(!Helper.empty(findCategory['EmergencyCatID'])){
                                                                data['EmergencyCatID'] = findCategory['EmergencyCatID'];

                                                                //Finally - creating the report
                                                                var report = new Report();
                                                                report.createNewReport(data, function(resp){
                                                                    response = resp;

                                                                    if(!response.hasOwnProperty("error")){
                                                                        //Adding the audio to the report if the report succeeded
                                                                        var reportID = response['ReportID'];
                                                                        var filePath = nuance.getFilePath();

                                                                        var reportMedia = new ReportMedia(reportID);
                                                                        reportMedia.addExistingAudio(filePath, nuanceResponse);
                                                                    }

                                                                    res.json(resp);
                                                                });
                                                            }
                                                            else{
                                                                response.error = "Could not find a related category.";
                                                                response.errornumber = Errors.INVALID_DATA;

                                                                res.json(response);
                                                            }
                                                        });
                                                    }
                                                });
                                            }
                                            else{
                                                response.error = "Could not find keywords in the audio file.";
                                                response.errornumber = Errors.INTERNAL_ERROR;

                                                res.json(response);
                                            }
                                        }
                                        else{
                                            response.error = "An internal error has occurred.";
                                            response.errornumber = Errors.INTERNAL_ERROR;

                                            res.json(response);
                                        }
                                    });
                                }
                                else{
                                    fs.unlink("temp/" + voiceFiles[0]);

                                    response.error = "Could not save the audio file.";
                                    response.errornumber = Errors.INTERNAL_ERROR;

                                    res.json(response);
                                }
                            });
                        }
                        else{
                            fs.unlink("temp/" + voiceFiles[0]);

                            response.error = "Invalid reporter login details supplied.";
                            response.errornumber = Errors.INVALID_DATA;

                            res.json(response);
                        }
                    });
                }
            }
            else{
                res.json(response);
            }
        });

        req.pipe(req.busboy);
    });

    /**
     * Creating a new report with data only.
     *
     * @author Elad Cohen
     */
    router.post("/ws/newReport", function(req, res){
        var data = req.body;
        var response = {};
        var connectorParams = {
            'reporter': {},
            'reporterID': 0
        };

        invalidReporterHandler(response, data);

        if(!response.hasOwnProperty("error")){
            reporterConnector(data, connectorParams, function(){
                if(!Helper.empty(connectorParams['reporterID'])){
                    var report = new Report();

                    report.createNewReport(data, function(resp){
                        response = resp;

                        res.json(response);
                    });
                }
                else{
                    response.error = "Invalid reporter login details supplied.";
                    response.errornumber = Errors.INVALID_DATA;

                    res.json(response);
                }
            });
        }
        else{
            res.json(response);
        }
    });

    /**
     * Updates a report with a given data.
     *
     * @author Elad Cohen
     */
    router.post("/ws/updateReport", function(req, res){
        var data = req.body;
        var response = {};
        var connectorParams = {
            'reporter': {},
            'reporterID': 0
        };

        invalidReporterHandler(response, data);

        if(!response.hasOwnProperty("error")){
            reporterConnector(data, connectorParams, function(){
                if(!Helper.empty(connectorParams['reporterID'])){
                    invalidReportHandler(response, data, true, function(){
                        if(!response.hasOwnProperty("error")){
                            var report = new Report(data['ReportID']);

                            report.updateReportData(data, function(resp){
                                response = resp;

                                res.json(response);
                            });
                        }
                        else{
                            res.json(response);
                        }
                    });
                }
                else{
                    response.error = "Invalid reporter login details supplied.";
                    response.errornumber = Errors.INVALID_DATA;

                    res.json(response);
                }
            });
        }
        else{
            res.json(response);
        }
    });

    /**
     * Handles uploading report images.
     *
     * @author Elad Cohen
     */
    router.post("/ws/uploadReportImage", function(req, res){
        var data = {};
        var imageFiles = [];
        var response = {};
        var connectorParams = {
            'reporter': {},
            'reporterID': 0
        };

        //Fetching the sent fields
        req.busboy.on('field', function(key, value){
            data[key] = value;
        });

        //Fetching the voice file
        req.busboy.on('file', function(fieldname, file, filename){
            var fileExtension = Helper.getFileExtension(filename.toLowerCase());

            if(fieldname === 'image' && fileExtension === 'jpg'){
                var tmpFileName = Native.time() + "_" + filename;
                var writeStream = fs.createWriteStream('./temp/' + tmpFileName);

                var fileData = [];

                file.on('data', function(d){
                    fileData.push(d);
                });

                file.on('end', function(){
                    fileData = Buffer.concat(fileData);

                    writeStream.write(fileData);
                    writeStream.end();

                    imageFiles.push(tmpFileName);
                });
            }
            else if(fileExtension !== 'jpg'){
                //@todo LOG ERROR
            }
            else{
                file.on('data', function(d) {

                }).on('limit', function() {

                }).on('end', function() {

                });
            }
        });

        //Finished fetching the data, we can now continue
        req.busboy.on('finish', function(){
            if(Helper.empty(imageFiles)){
                response.error = "The image file was not sent.";
                response.errornumber = Errors.MISSING_DATA;

                res.json(response);

                return;
            }

            invalidReporterHandler(response, data);

            if(!response.hasOwnProperty("error")){
                reporterConnector(data, connectorParams, function(){
                    if(!Helper.empty(connectorParams['reporterID'])){
                        invalidReportHandler(response, data, true, function(){
                            if(!response.hasOwnProperty("error")){
                                var reportMedia = new ReportMedia(data['ReportID']);

                                reportMedia.saveImage("temp/" + imageFiles[0], function(result){
                                    fs.unlink("temp/" + imageFiles[0]);

                                    response['result'] = !Helper.empty(result);

                                    res.json(response);
                                });
                            }
                            else{
                                fs.unlink("temp/" + imageFiles[0]);

                                res.json(response);
                            }
                        });
                    }
                    else{
                        fs.unlink("temp/" + imageFiles[0]);

                        response.error = "Invalid reporter login details supplied.";
                        response.errornumber = Errors.INVALID_DATA;

                        res.json(response);
                    }
                });
            }
            else{
                fs.unlink("temp/" + imageFiles[0]);

                res.json(response);
            }
        });

        req.pipe(req.busboy);
    });

    /**
     * Handles uploading report audio files.
     *
     * @author Elad Cohen
     */
    router.post("/ws/uploadReportAudio", function(req, res){
        var data = {};
        var audioFiles = [];
        var response = {};
        var connectorParams = {
            'reporter': {},
            'reporterID': 0
        };

        //Fetching the sent fields
        req.busboy.on('field', function(key, value){
            data[key] = value;
        });

        //Fetching the voice file
        req.busboy.on('file', function(fieldname, file, filename){
            var fileExtension = Helper.getFileExtension(filename.toLowerCase());

            if(fieldname === 'voice' && fileExtension === 'amr'){
                var tmpFileName = Native.time() + "_" + filename;
                var writeStream = fs.createWriteStream('./temp/' + tmpFileName);

                var fileData = [];

                file.on('data', function(d){
                    fileData.push(d);
                });

                file.on('end', function(){
                    fileData = Buffer.concat(fileData);

                    writeStream.write(fileData);
                    writeStream.end();

                    audioFiles.push(tmpFileName);
                });
            }
            else if(fileExtension !== 'amr'){
                //@todo LOG ERROR
            }
            else{
                file.on('data', function(d) {

                }).on('limit', function() {

                }).on('end', function() {

                });
            }
        });

        //Finished fetching the data, we can now continue
        req.busboy.on('finish', function(){
            if(Helper.empty(audioFiles)){
                response.error = "The audio file was not sent.";
                response.errornumber = Errors.MISSING_DATA;

                res.json(response);

                return;
            }

            invalidReporterHandler(response, data);

            if(!response.hasOwnProperty("error")){
                reporterConnector(data, connectorParams, function(){
                    if(!Helper.empty(connectorParams['reporterID'])){
                        invalidReportHandler(response, data, true, function(){
                            if(!response.hasOwnProperty("error")){
                                var nuance = new Nuance(connectorParams['reporterID'], connectorParams['reporter'].getLanguageID(), data['ReportID']);
                                nuance.saveAudioFile("temp/" + audioFiles[0], function(fileSaved){
                                    if(fileSaved){
                                        nuance.request(function(error, nuanceResponse){
                                            fs.unlink("temp/" + audioFiles[0]);

                                            if(error){
                                                nuanceResponse = "";
                                            }

                                            var reportMedia = new ReportMedia(data['ReportID']);

                                            reportMedia.addExistingAudio(nuance.getFilePath(), nuanceResponse, function(succeeded){
                                                if(succeeded){
                                                    response.result = succeeded;

                                                    res.json(response);
                                                }
                                                else{
                                                    response.error = "Could not save the audio file.";
                                                    response.errornumber = Errors.INTERNAL_ERROR;

                                                    res.json(response);
                                                }
                                            });
                                        });
                                    }
                                    else{
                                        fs.unlink("temp/" + audioFiles[0]);

                                        response.error = "Could not save the audio file.";
                                        response.errornumber = Errors.INTERNAL_ERROR;

                                        res.json(response);
                                    }
                                });
                            }
                            else{
                                fs.unlink("temp/" + audioFiles[0]);

                                res.json(response);
                            }
                        });
                    }
                    else{
                        fs.unlink("temp/" + audioFiles[0]);

                        response.error = "Invalid reporter login details supplied.";
                        response.errornumber = Errors.INVALID_DATA;

                        res.json(response);
                    }
                });
            }
            else{
                fs.unlink("temp/" + audioFiles[0]);

                res.json(response);
            }
        });

        req.pipe(req.busboy);
    });

    /**
     * Returns the available report status options.
     *
     * @author Elad Cohen
     */
    router.post("/ws/getReportStatuses", function(req, res){
        var data = req.body;
        var response = {};

        invalidLanguageHandler(response, data);

        if(!response.hasOwnProperty("error")){
            GeneralFields.getReportStatusData(function(data){
                response['data'] = data;

                res.json(response);
            }, data['LanguageID']);
        }
        else{
            res.json(response);
        }
    });

    /**
     * Returns a report's data.
     *
     * @author Elad Cohen
     */
    router.post("/ws/getReportData", function(req, res){
        var data = req.body;
        var response = {};
        var connectorParams = {
            'reporter': {},
            'reporterID': 0
        };

        invalidReporterHandler(response, data);

        if(!response.hasOwnProperty("error")){
            reporterConnector(data, connectorParams, function(){
                if(!Helper.empty(connectorParams['reporterID'])){
                    invalidReportHandler(response, data, true, function(){
                        if(!response.hasOwnProperty("error")){
                            var report = new Report(data['ReportID'], false);

                            report.getReportData(function(reportData){
                                response = reportData;

                                res.json(reportData);
                            });
                        }
                        else{
                            res.json(response);
                        }
                    });
                }
                else{
                    response.error = "Invalid reporter login details supplied.";
                    response.errornumber = Errors.INVALID_DATA;

                    res.json(response);
                }
            });
        }
        else{
            res.json(response);
        }
    });

    /**
     * Handles getting the report history of the reporter.
     *
     * @author Elad Cohen
     */
    router.post("/ws/getReportHistory", function(req, res){
        var data = req.body;
        var response = {};
        var connectorParams = {
            'reporter': {},
            'reporterID': 0
        };

        invalidReporterHandler(response, data);

        if(!response.hasOwnProperty("error")){
            reporterConnector(data, connectorParams, function(){
                if(!Helper.empty(connectorParams['reporterID'])){
                    connectorParams['reporter'].getReportHistory(function(reportHistory){
                        response['data'] = reportHistory;

                        res.json(response);
                    });
                }
                else{
                    response.error = "Invalid reporter login details supplied.";
                    response.errornumber = Errors.INVALID_DATA;

                    res.json(response);
                }
            });
        }
        else{
            res.json(response);
        }
    });

    /**
     * Handles accepting report aid.
     *
     * @author Elad Cohen
     */
    router.post("/ws/acceptReportAid", function(req, res){
        var data = req.body;
        var response = {};
        var connectorParams = {
            'reporter': {},
            'reporterID': 0
        };

        invalidReporterHandler(response, data);

        if(!response.hasOwnProperty("error")){
            reporterConnector(data, connectorParams, function(){
                var reporter = connectorParams['reporter'];

                if(!Helper.empty(connectorParams['reporterID'])){
                    invalidReportHandler(response, data, false, function(){
                        if(!response.hasOwnProperty("error")){
                            var report = new Report(data['ReportID'], true, function(){
                                var reporterID = report.getReporterID();

                                report.isReporterNotified(reporterID, false, function(notified){
                                    if(notified){
                                        reporter.getReporterLocation(function(reporterLocation){
                                            if(!Helper.empty(reporterLocation)){
                                                var reportPoint = [report.getLocationX(), report.getLocationY()];
                                                var reporterPoint = [reporterLocation['LocationX'], reporterLocation['LocationY']];

                                                var reportReporter = new Reporter(report.getReporterID(), true, function(){
                                                    var message = {
                                                        'operation': 'reportAid',
                                                        'AiderName': reporter.getName(),
                                                        'Distance': Maps.getCoordinatesDistance(reportPoint, reporterPoint),
                                                        'LocationX': reporterPoint[0],
                                                        'LocationY': reporterPoint[1],
                                                        'ReporterID': connectorParams['reporterID']
                                                    };

                                                    //Notifying the reporter
                                                    GCM.sendMessage(message, [reportReporter.getGCMID()], function(result){
                                                        response['result'] = result;

                                                        res.json(response);
                                                    });
                                                });
                                            }
                                        });
                                    }
                                    else{
                                        response.error = "The reporter was not notified.";
                                        response.errornumber = Errors.INVALID_DATA;

                                        res.json(response);
                                    }
                                });
                            });
                        }
                        else{
                            res.json(response);
                        }
                    });
                }
                else{
                    response.error = "Invalid reporter login details supplied.";
                    response.errornumber = Errors.INVALID_DATA;

                    res.json(response);
                }
            });
        }
        else{
            res.json(response);
        }
    });

    /**
     * Attempts to connect the reporter using given ReporterID and loginToken.
     *
     * @param data
     * @param connectorParams
     * @param callback
     * @author Elad Cohen
     */
    function reporterConnector(data, connectorParams, callback){
        if(!Helper.empty(data["ReporterID"]) && !Helper.empty(data["loginToken"])){
            connectorParams["reporter"] = new Reporter(data["ReporterID"], data["loginToken"], true);

            connectorParams["reporter"].isConnected(function(connected){
                if(connected){
                    connectorParams["reporterID"] = connectorParams["reporter"].getReporterID();
                }
                else{
                    connectorParams["reporterID"] = null;
                }

                if(Helper.isFunction(callback)){
                    callback();
                }
            });
        }
        else{
            connectorParams["reporter"] = null;
            connectorParams["reporterID"] = null;
        }
    }

    /**
     * Injects errors to a response regarding invalid login data of a reporter.
     *
     * @param response
     * @param data
     * @author Elad Cohen
     */
    function invalidReporterHandler(response, data){
        if(Helper.empty(data["ReporterID"]) || !Helper.isPositiveInteger(data["ReporterID"])){
            response.error = "Invalid ReporterID supplied.";
            response.errornumber = Errors.INVALID_DATA;
        }
        else if(Helper.empty(data['loginToken'])){
            response.error = "Missing loginToken.";
            response.errornumber = Errors.MISSING_DATA;
        }
    }

    /**
     * Handles errors regarding LanguageID.
     *
     * @param response
     * @param data
     * @author Elad Cohen
     */
    function invalidLanguageHandler(response, data){
        if(Helper.empty(data["LanguageID"])){
            response.error = "Missing LanguageID.";
            response.errornumber = Errors.MISSING_DATA;
        }
        else if(!Helper.isPositiveInteger(data["LanguageID"])){
            response.error = "Invalid LanguageID.";
            response.errornumber = Errors.INVALID_DATA;
        }
    }

    /**
     * Checks that the sent data regarding the report is valid and if not - injects an error to the response.
     *
     * @param response
     * @param data
     * @param checkRelation
     * @param callback
     * @author Elad Cohen
     */
    function invalidReportHandler(response, data, checkRelation, callback){
        if(Helper.empty(data['ReportID'])){
            response.error = "Missing ReportID.";
            response.errornumber = Errors.MISSING_DATA;

            if(Helper.isFunction(callback)){
                callback();
            }
        }
        else if(!Helper.isPositiveInteger(data['ReportID'])){
            response.error = "Invalid ReportID.";
            response.errornumber = Errors.INVALID_DATA;
        }
        else{
            var report = new Report(data['ReportID'], false);

            report.getReportData(function(reportData){
                if(Helper.empty(reportData)){
                    response.error = "The report does not exist.";
                    response.errornumber = Errors.INVALID_DATA;
                }
                else if(checkRelation && reportData['ReporterID'] != data['ReporterID']){
                    response.error = "The report does not belong to the connected reporter.";
                    response.errornumber = Errors.INVALID_DATA;
                }

                if(Helper.isFunction(callback)){
                    callback();
                }
            });
        }
    }
}

module.exports = WebServiceController;
