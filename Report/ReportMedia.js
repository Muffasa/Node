var Helper = require("./../General/Helper.js");
var Native = require("./../General/Native.js");
var CloudStorage = require("./../General/CloudStorage.js");
var DB = require("./../Database/DB.js");

/**
 * Creates a new ReportMedia instance.
 *
 * @param reportID
 * @constructor
 * @author Elad Cohen
 */
var ReportMedia = function(reportID){
    var self = this;

    self.imagesDbFields = ["ReportImageID", "ReportID", "Path", "AddedTime"];
    self.imagesTableName = "report_images";
    self.imagesPath = "images";
    self.allowedImageExtensions = ["jpg"];

    self.audioDbFields = ["ReportAudioID", "ReportID", "Path", "STT", "AddedTime"];
    self.audioTableName = "report_audio";
    self.audioPath = "audio";
    self.allowedAudioExtensions = ["amr"];

    function construct(){
        if(Helper.empty(reportID) || !Helper.isPositiveInteger(reportID)){
            reportID = 0;
        }
    }

    /**
     * Returns the report's images.
     *
     * @param callback
     * @author Elad Cohen
     */
    self.getImages = function(callback){
        if(typeof callback !== 'function' || Helper.empty(reportID) || !Helper.isPositiveInteger(reportID)){
            return;
        }

        new DB.instance().where("ReportID", reportID).orderBy("ReportImageID", "DESC").select(self.imagesDbFields, self.imagesTableName, callback);
    };

    /**
     * Returns the report's audio files.
     *
     * @param callback
     * @author Elad Cohen
     */
    self.getAudios = function(callback){
        if(typeof callback !== 'function' || Helper.empty(reportID) || !Helper.isPositiveInteger(reportID)){
            return;
        }

        new DB.instance().where("ReportID", reportID).orderBy("ReportAudioID", "DESC").select(self.audioDbFields, self.audioTableName, callback);
    };

    /**
     * Saves an image in the database and in the cloud storage.
     *
     * @param fileName
     * @param callback
     * @author Elad Cohen
     */
    self.saveImage = function(fileName, callback){
        if(Helper.empty(reportID) || Helper.empty(fileName) || !Helper.isPositiveInteger(reportID)){
            if(Helper.isFunction(callback)){
                callback(0);
            }

            return;
        }

        var fileExtension = Helper.getFileExtension(fileName);

        //Validating that the file's extension is acceptable
        if(!Helper.inArray(fileExtension, self.allowedImageExtensions)){
            if(Helper.isFunction(callback)){
                callback(0);
            }

            return;
        }

        var savePath = self.imagesPath + "/reports/" + reportID + "_" + Native.time() + "." + fileExtension;

        //Uploading the file to the CloudStorage
        CloudStorage.uploadFile(fileName, savePath, function(fileSaved){
            if(fileSaved){
                new DB.instance().add("Path", savePath).add("ReportID", reportID).insert(self.imagesTableName, function(insertID){
                    if(Helper.isFunction(callback)){
                        callback(insertID);
                    }

                    //@todo add report log
                });
            }
            else{
                callback(0);
            }
        });
    };

    /**
     * Adds an existing audio file to the report.
     *
     * @param path
     * @param stt
     * @param callback
     * @author Elad Cohen
     */
    self.addExistingAudio = function(path, stt, callback){
        if(Helper.empty(path) || Helper.empty(reportID) || !Helper.isPositiveInteger(reportID)){
            if(Helper.isFunction(callback)){
                callback(false);
            }

            return;
        }

        if(!CloudStorage.fileExists(path)){
            if(Helper.isFunction(callback)){
                callback(false);
            }

            return;
        }

        if(Helper.isArray(stt)){
            stt = stt.join("\n");
        }

        debugger;
        new DB.instance().add("ReportID", reportID).add("Path", path).add("STT", stt).insert(self.audioTableName, function(result){
            if(Helper.isFunction(callback)){
                callback(!Helper.empty(result) && result > 0);
            }
        });
    };

    construct();
};

module.exports = ReportMedia;