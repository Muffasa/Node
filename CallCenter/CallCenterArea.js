var Helper = require("./../General/Helper.js");
var DB = require("./../Database/DB.js");

/**
 * Creates a new CallCenterArea instance.
 *
 * @param callCenterAreaID
 * @param initData
 * @constructor
 * @author Elad Cohen
 */
var CallCenterArea = function(callCenterAreaID, initData){
    var self = this;

    var _callCenterID;
    var _description;
    var _centerLocationX;
    var _centerLocationY;
    var _areaSize;
    var _priority;

    self.dbFields = ["CallCenterAreaID", "CallCenterID", "Description", "CenterLocationX", "CenterLocationY", "AreaSize", "Priority"];
    self.tableName = "call_center_areas";

    self.coordinatesDbFields = ["CallCenterAreaCoordinateID", "CallCenterAreaID", "LocationX", "LocationY", "Priority"];
    self.coordinatesTableName = "call_center_area_coordinates";

    function construct(){
        if(Helper.empty(callCenterAreaID) || !Helper.isPositiveInteger(callCenterAreaID)){
            callCenterAreaID = 0;
        }

        if(initData){
            self.getCallCenterAreaData();
        }
    }

    /**
     * Returns the call center area's data.
     *
     * @param getCoordinates
     * @param callback
     * @author Elad Cohen
     */
    self.getCallCenterAreaData = function(getCoordinates, callback){
        if((Helper.empty(callCenterAreaID) || !Helper.isPositiveInteger(callCenterAreaID))){
            if(Helper.isFunction(callback)){
                callback({});
            }

            return;
        }

        new DB.instance().fetchBasicRecordData("CallCenterAreaID", callCenterAreaID, self.dbFields, self.tableName, function(result){
            if(getCoordinates){
                self.getCallCenterAreaCoordinates(function(coordinates){
                    result['coordinates'] = coordinates;

                    if(Helper.isFunction(callback)){
                        callback(result);
                    }
                });
            }
            else{
                Helper.updateInstanceDataFromRow(self, result);

                if(Helper.isFunction(callback)){
                    callback(result);
                }
            }
        });
    };

    /**
     * Returns the area's coordinates.
     *
     * @param callback
     * @author Elad Cohen
     */
    self.getCallCenterAreaCoordinates = function(callback){
        if(!Helper.isFunction(callback) || Helper.empty(callCenterAreaID) || !Helper.isPositiveInteger(callCenterAreaID)){
            if(Helper.isFunction(callback)){
                callback(false);
            }

            return;
        }

        new DB.instance().where("CallCenterAreaID", callCenterAreaID).orderBy("Priority").select(self.coordinatesDbFields, self.coordinatesTableName, function(result){
            var coordinates = [];

            if(!Helper.empty(result)){
                for(var i = 0; i < result.length; i++){
                    var option = {
                        'LocationX': result[i]['LocationX'],
                        'LocationY': result[i]['LocationY']
                    };

                    coordinates.push(option);
                }

                callback(coordinates);
            }
        });
    };

    /**
     * Shifts the priorities with a specific shiftAmount. For example, when shifting with -1, all priorities will be degraded by -1.
     * This function can also work recursively (for example, when deleting an area).
     * If the recursive parameter was not received, returns the last affected CallCenterAreaID.
     *
     * @param callCenterID
     * @param priority
     * @param recursive
     * @param shiftAmount
     * @param ignoreAreaID
     * @param callback
     * @author Elad Cohen
     */
    self.shiftPriorities = function(callCenterID, priority, recursive, shiftAmount, ignoreAreaID, callback){
        if(Helper.empty(callCenterID) || !Helper.isPositiveInteger(callCenterID) || !Helper.isTrueInteger(priority)){
            if(Helper.isFunction(callback)){
                callback(false);
            }

            return;
        }

        var instance = new DB.instance().where("CallCenterID", callCenterID).where("Priority", priority);

        if(!Helper.empty(ignoreAreaID) && Helper.isPositiveInteger(ignoreAreaID)){
            instance.where("CallCenterAreaID", ignoreAreaID, "!=");
        }

        instance.select(["CallCenterAreaID"], self.tableName, function(result){
            if(!Helper.empty(result)){
                result = result[0];

                new DB.instance().set("Priority", priority + shiftAmount).where("CallCenterAreaID", result['CallCenterAreaID']).update(self.tableName, function(){
                    if(recursive){
                        self.shiftPriorities(callCenterID, priority + (shiftAmount * -1), recursive, shiftAmount, ignoreAreaID, callback); //moves forward to the next one
                    }
                    else if(Helper.isFunction(callback)){
                        callback(result['CallCenterAreaID']);
                    }
                });
            }
            else if(Helper.isFunction(callback)){
                callback(null);
            }
        });
    };

    /**
     * Upgrades the CallCenterArea's priority.
     *
     * @param callback
     * @author Elad Cohen
     */
    self.upgradePriority = function(callback){
        if(Helper.empty(callCenterAreaID) || !Helper.isPositiveInteger(callCenterAreaID)){
            if(Helper.isFunction(callback)){
                callback(false);
            }

            return;
        }

        self.getCallCenterAreaData(false, function(data){
            if(Helper.empty(data) || data['Priority'] == 1){
                if(Helper.isFunction(callback)){
                    callback(false);
                }

                return;
            }

            self.shiftPriorities(data['CallCenterID'], data['Priority'] - 1, false, 1, false, function(switchedWithAreaID){
                self.shiftPriorities(data['CallCenterID'], data['Priority'], false, -1, switchedWithAreaID, function(){
                    if(Helper.isFunction(callback)){
                        callback(true);
                    }
                });
            });
        });
    };

    /**
     * Downgrades the CallCenterArea's priority.
     *
     * @param callback
     * @author Elad Cohen
     */
    self.downgradePriority = function(callback){
        if(Helper.empty(callCenterAreaID) || !Helper.isPositiveInteger(callCenterAreaID)){
            if(Helper.isFunction(callback)){
                callback(false);
            }

            return;
        }

        self.getCallCenterAreaData(false, function(data){
            if(Helper.empty(data) || data['Priority'] == 1){
                if(Helper.isFunction(callback)){
                    callback(false);
                }

                return;
            }

            self.shiftPriorities(data['CallCenterID'], data['Priority'] + 1, false, -1, false, function(switchedWithAreaID){
                self.shiftPriorities(data['CallCenterID'], data['Priority'], false, 1, switchedWithAreaID, function(){
                    if(Helper.isFunction(callback)){
                        callback(true);
                    }
                });
            });
        });
    };

    /**
     * Deletes the CallCenterArea.
     *
     * @param callback
     * @author Elad Cohen
     */
    self.deleteArea = function(callback){
        if(Helper.empty(callCenterAreaID) || !Helper.isPositiveInteger(callCenterAreaID)){
            if(Helper.isFunction(callback)){
                callback(false);
            }

            return;
        }

        self.getCallCenterAreaData(false, function(areaData){
            if(Helper.empty(areaData)){
                if(Helper.isFunction(callback)){
                    callback(false);
                }

                return;
            }

            new DB.instance().where("CallCenterAreaID", callCenterAreaID).delete(self.coordinatesTableName, function(){
                new DB.instance().where("CallCenterAreaID", callCenterAreaID).delete(self.tableName, function(result){
                    if(!Helper.empty(result) && result > 0){
                        self.shiftPriorities(areaData['CallCenterID'], areaData['Priority'] + 1, true, -1);

                        callback(true);
                    }
                    else{
                        callback(false);
                    }
                });
            });
        });
    };

    /**
     * Updates the CallCenterArea's description.
     *
     * @param description
     * @param callback
     * @author Elad Cohen
     */
    self.updateDescription = function(description, callback){
        if(Helper.empty(callCenterAreaID) || !Helper.isPositiveInteger(callCenterAreaID)){
            if(Helper.isFunction(callback)){
                callback(false);
            }

            return;
        }

        new DB.instance().set("Description", description).where("CallCenterAreaID", callCenterAreaID).update(self.tableName, function(result){
            if(Helper.isFunction(callback)){
                callback(!Helper.empty(result) && Helper.isPositiveInteger(result));
            }
        });
    };

    /**
     * Returns the instance's callCenterAreaID.
     *
     * @returns {*}
     * @author Elad Cohen
     */
    self.getCallCenterAreaID = function(){
        return callCenterAreaID;
    };

    /**
     * Sets the instance's callCenterAreaID.
     *
     * @param value
     * @author Elad Cohen
     */
    self.setCallCenterAreaID = function(value){
        if(!Helper.empty(value) && Helper.isPositiveInteger(value)){
            callCenterAreaID = value;
        }
    };

    /**
     * Returns the instance's callCenterID.
     *
     * @returns {*}
     * @author Elad Cohen
     */
    self.getCallCenterID = function(){
        return _callCenterID;
    };

    /**
     * Sets the instance's callCenterID.
     *
     * @param value
     * @author Elad Cohen
     */
    self.setCallCenterID = function(value){
        if(!Helper.empty(value) && Helper.isPositiveInteger(value)){
            _callCenterID = value;
        }
    };

    /**
     * Returns the instance's description.
     *
     * @returns {*}
     * @author Elad Cohen
     */
    self.getDescription = function(){
        return _description;
    };

    /**
     * Sets the instance's description.
     *
     * @param value
     * @author Elad Cohen
     */
    self.setDescription = function(value){
        _description = value;
    };

    /**
     * Returns the instance's centerLocationX.
     *
     * @returns {*}
     * @author Elad Cohen
     */
    self.getCenterLocationX = function(){
        return _centerLocationX;
    };

    /**
     * Sets the instance's centerLocationX.
     *
     * @param value
     * @author Elad Cohen
     */
    self.setCenterLocationX = function(value){
        if(Helper.isTrueFloat(value)){
            _centerLocationX = value;
        }
    };

    /**
     * Returns the instance's centerLocationY.
     *
     * @returns {*}
     * @author Elad Cohen
     */
    self.getCenterLocationY = function(){
        return _centerLocationY;
    };

    /**
     * Sets the instance's centerLocationY.
     *
     * @param value
     * @author Elad Cohen
     */
    self.setCenterLocationY = function(value){
        if(Helper.isTrueFloat(value)){
            _centerLocationY = value;
        }
    };

    /**
     * Returns the instance's areaSize.
     *
     * @returns {*}
     * @author Elad Cohen
     */
    self.getAreaSize = function(){
        return _areaSize;
    };

    /**
     * Sets the instance's areaSize.
     *
     * @param value
     * @author Elad Cohen
     */
    self.setAreaSize = function(value){
        if(Helper.isTrueFloat(value)){
            _areaSize = value;
        }
    };

    /**
     * Returns the instance's priority.
     *
     * @returns {*}
     * @author Elad Cohen
     */
    self.getPriority = function(){
        return _priority;
    };

    /**
     * Sets the instance's priority.
     *
     * @param value
     * @author Elad Cohen
     */
    self.setPriority = function(value){
        if(Helper.isTrueInteger(value)){
            _priority = value;
        }
    };

    construct();
};

module.exports = CallCenterArea;