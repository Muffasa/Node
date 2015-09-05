var Helper = require("./../General/Helper.js");
var DB = require("./../Database/DB.js");

/**
 * Creates a new FieldGroup instance.
 *
 * @param fieldGroupID
 * @param initWithQuery
 * @constructor
 * @author Elad Cohen
 */
var FieldGroup = function(fieldGroupID, initWithQuery){
    var self = this;

    var name = "";
    var tableName = "";
    var recordName = "";

    self.dbFields = ["FieldGroupID", "Name", "TableName", "RecordName"];
    self.groupsTableName = "field_groups";

    /**
     * Constructor - Initializes the instance.
     *
     * @author Elad Cohen
     */
    var constructor = function(){
        if(Helper.empty(fieldGroupID) || !Helper.isPositiveInteger(fieldGroupID)){
            fieldGroupID = 0;
        }

        if(typeof initWithQuery === 'undefined'){
            initWithQuery = true;
        }

        if(initWithQuery && !Helper.empty(fieldGroupID)){
            self.getFieldGroupData();
        }
    };

    /**
     * Returns the field group's data to a specific callback.
     *
     * @param callback
     * @author Elad Cohen
     */
    self.getFieldGroupData = function(callback){
        new DB.instance().fetchBasicRecordData("FieldGroupID", fieldGroupID, self.dbFields, self.groupsTableName, function(result){
            Helper.updateInstanceDataFromRow(self, result);

            if(Helper.isFunction(callback)){
                callback();
            }
        });
    };

    /**
     * Sets the instance's fieldGroupID.
     *
     * @param value
     * @author Elad Cohen
     */
    self.setFieldGroupID = function(value){
        if(!Helper.empty(fieldGroupID) && Helper.isPositiveInteger(fieldGroupID)){
            fieldGroupID = value;
        }
    };

    /**
     * Returns the instance's fieldGroupID.
     *
     * @returns {number}
     * @author Elad Cohen
     */
    self.getFieldGroupID = function(){
        return fieldGroupID;
    };

    /**
     * Sets the instance's name.
     *
     * @param value
     * @author Elad Cohen
     */
    self.setName = function(value){
        name = value;
    };

    /**
     * Returns the instance's name.
     *
     * @returns {string}
     * @author Elad Cohen
     */
    self.getName = function(){
        return name;
    };

    /**
     * Sets the instance's tableName.
     *
     * @param value
     * @author Elad Cohen
     */
    self.setTableName = function(value){
        tableName = value;
    };

    /**
     * Returns the instance's table name.
     *
     * @returns {string}
     * @author Elad Cohen
     */
    self.getTableName = function(){
        return tableName;
    };

    /**
     * Sets the instance's reocrdName.
     *
     * @param value
     * @author Elad Cohen
     */
    self.setRecordName = function(value){
        recordName = value;
    };

    /**
     * Returns the instance's recordName.
     *
     * @returns {string}
     * @author Elad Cohen
     */
    self.getRecordName = function(){
        return recordName;
    };

    constructor();
};

module.exports = FieldGroup;