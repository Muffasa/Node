var gcloud = require("gcloud");

var Helper = require("./Helper.js");

/**
 * Creates a new CloudStorage instance.
 *
 * @constructor
 * @author Elad Cohen
 */
var CloudStorage = function(){
    var self = this;

    var projectId = "sayvu-node-server";
    var bucketName = "sayvu";

    var gcs = gcloud.storage({
        projectId: projectId
        keyFileName: '/files/gcloud_api/SayvU Node Server-26896b29fa5c.json'
    });

    var bucket = gcs.bucket(bucketName);

    /**
     * Returns whether a file exists in the Cloud Storage.
     *
     * @param path
     * @returns {boolean}
     * @author Elad Cohen
     */
    self.fileExists = function(path){
        var file = bucket.file(path);

        return !!file;
    };

    /**
     * Deletes a file from the Cloud Storage.
     *
     * @param path
     * @param callback
     * @returns {boolean}
     * @author Elad Cohen
     */
    self.deleteFile = function(path, callback){
        var file = bucket.file(path);

        if(!file){
            if(Helper.isFunction(callback)){
                callback(false);

                return false;
            }
        }

        file.delete(function(err, result){
            if(Helper.isFunction(callback)){
                callback(!err);
            }
        });
    };

    /**
     * Uploads a file to the Cloud Storage.
     *
     * @param path
     * @param destination
     * @param callback
     * @author Elad cohen
     */
    self.uploadFile = function(path, destination, callback){
        var options = {
            destination: destination,
            gzip: true,
            metadata: {
                event: 'Uploaded with SoSietyJS'
            }
        };

        bucket.upload(path, options, function(err, file){
            if(Helper.isFunction(callback)){
                callback(!err);
            }
        });
    };
};

module.exports = new CloudStorage();