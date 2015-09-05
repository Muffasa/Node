var mysql = require("mysql");
var Helper = require("./../General/Helper.js");
var Regex = require("./../General/Regex.js");

var DB = {
    'connection': mysql.createPool({
        connectionLimit : 1000,
        acquireTimeout: 240000,
        connectTimeout: 240000,
        host: "173.194.253.97",
        user: "sayvujs",
        password: "fgDHhjkdg934SHsdjg94u",
        database: "Sosiety"
    }),
    'showErrors': true
};

/**
 * Creates a new DB instance.
 *
 * @returns {DB}
 * @constructor
 * @author Elad Cohen
 */
DB.instance = function(){
    var self = this;

    self.poolConnection = null;

    var showErrors = DB.showErrors;

    var wheres = [];
    var orderBys = [];
    var sets = [];
    var adds = [];
    var limit = null;

    /**
     * Initializes the connection.
     *
     * @param callback
     * @author Elad Cohen
     */
    self.initConnection = function(callback){
        DB.connection.getConnection(function(err, connection){
            if(Helper.isFunction(callback)){
                callback(connection);
            }
        });
    };

    /**
     * Returns whether the connection has been established.
     *
     * @returns {boolean}
     * @author Elad Cohen
     */
    self.connectionExists = function(connection){
        return !Helper.empty(connection);
    };

    /**
     * Closes the connection.
     *
     * @author Elad Cohen
     */
    self.closeConnection = function(connection){
        if(self.connectionExists(connection)){
            connection.release();
        }
    };

    /**
     * Queries a query with its params (if its a prepared statement).
     *
     * @param sql
     * @param params
     * @returns {*}
     * @author Elad Cohen
     * @param callback
     * @param doNotValidate
     */
    self.query = function(sql, params, callback, doNotValidate){
        if(Helper.empty(sql)){
            if(Helper.isFunction(callback)){
                callback(null);
            }
        }

        self.initConnection(function(connection){
            self.executePreparedStatement(sql, params, connection, callback, doNotValidate);
        });
    };

    /**
     * Returns whether a query contains WHERE inside it.
     *
     * @param sql
     * @returns {boolean}
     * @author Elad Cohen
     */
    self.containsWhere = function(sql){
        sql = sql.toLowerCase();

        return sql.indexOf("where") >= 0;
    };

    /**
     * Returns whether a query is a SELECT query.
     *
     * @param sql
     * @returns {boolean}
     * @author Elad Cohen
     */
    self.isSelectQuery = function(sql){
        sql = sql.toLowerCase();

        return sql.indexOf("select", 0) >= 0;
    };

    /**
     * Returns whether a query is a simple select query (a query that does not contain where).
     *
     * @param sql
     * @returns {boolean}
     * @author Elad Cohen
     */
    self.isSimpleSelectQuery = function(sql){
        return self.isSelectQuery(sql) && !self.containsWhere(sql);
    };

    /**
     * Returns whether a query is an insert query.
     *
     * @param sql
     * @returns {boolean}
     * @author Elad Cohen
     */
    self.isInsertQuery = function(sql){
        sql = sql.toLowerCase();

        return sql.indexOf("insert", 0) >= 0;
    };

    /**
     * Returns whether a query is an update query.
     *
     * @param sql
     * @returns {boolean}
     * @author Elad Cohen
     */
    self.isUpdateQuery = function(sql){
        sql = sql.toLowerCase();

        return sql.indexOf("update", 0) >= 0;
    };

    /**
     * Returns whether a query is a delete query.
     *
     * @param sql
     * @returns {boolean}
     * @author Elad Cohen
     */
    self.isDeleteQuery = function(sql){
        sql = sql.toLowerCase();

        return sql.indexOf("delete", 0) >= 0;
    };

    /**
     * Returns whether a query is a prepared statement query.
     *
     * @param sql
     * @returns {boolean}
     * @author Elad Cohen
     */
    self.isPreparedStatement = function(sql){
        sql = sql.toLowerCase();

        if(sql.indexOf("?") == -1){
            return false;
        }

        if(Regex.getQuestionMarkInQueryPattern().test(sql)){
            return !Regex.getWordsInQueryPattern().test(sql);
        }

        return false;
    };

    /**
     * Returns whether a query is valid or not.
     *
     * @param sql
     * @returns {boolean}
     * @author Elad Cohen
     */
    self.isValidQuery = function(sql){
        return self.isPreparedStatement(sql) || self.isSimpleSelectQuery(sql);
    };

    /**
     * Executes a prepared statement query.
     *
     * @param sql
     * @param params
     * @param connection
     * @param callback
     * @returns {*}
     * @author Elad Cohen
     * @param doNotValidate
     */
    self.executePreparedStatement = function(sql, params, connection, callback, doNotValidate){
        var isSimpleSelect = self.isSimpleSelectQuery(sql);

        if(doNotValidate || self.isValidQuery(sql)){
            if(!isSimpleSelect && Helper.empty(params)){
                self.closeConnection(connection);

                if(Helper.isFunction(callback)){
                    callback(null); //This is a prepared statement query but we did not receive the params
                }

                return null;
            }

            if(!isSimpleSelect){
                sql = mysql.format(sql, params);
            }

            connection.query({
                    'sql': sql,
                    'timeout': 30000
                },
                function(error, results){
                    self.closeConnection(connection);
                    var result = null;

                    if(!Helper.empty(error) && showErrors){
                        if(Helper.isFunction(callback)){
                            callback(error); //@todo LOG ERROR
                        }

                        return;
                    }
                    else{
                        if(self.isSelectQuery(sql)){
                            result = results;
                        }
                        else if(self.isInsertQuery(sql)){
                            result = results.insertId;
                        }
                        else if(self.isDeleteQuery(sql)){
                            result = results.affectedRows;
                        }
                        else if(self.isUpdateQuery(sql)){
                            result = results.changedRows;
                        }
                    }

                    if(Helper.isFunction(callback)){
                        callback(result);
                    }
                });
        }
        else{
            self.closeConnection(connection);
            if(showErrors){
                //@todo Display the error
            }

            if(Helper.isFunction(callback)){
                callback("Invalid query supplied."); //@todo LOG ERROR
            }
        }
    };

    /**
     * Resets the instance's properties.
     *
     * @author Elad Cohen
     */
    self.resetInstance = function(){
        wheres = [];
        orderBys = [];
        sets = [];
        adds = [];
        limit = null;
    };

    /**
     * Executes a where query according to previously set parameters.
     *
     * @param fields
     * @param tableName
     * @returns {null}
     * @author Elad Cohen
     * @param callback
     */
    self.select = function(fields, tableName, callback){
        if(Helper.empty(tableName)){
            if(Helper.isFunction(callback)) {
                callback(null);
            }

            return null;
        }

        if(Helper.empty(fields)){
            fields = ["*"];
        }
        else if(!(fields instanceof Array)){
            fields = [fields];
        }

        var buildWhere = self.buildWhereQuery();
        var data = buildWhere.data;
        var orderBy = "";
        var limitStr = limit != null ? ' LIMIT ' + limit : '';

        if(!Helper.empty(orderBys)){
            for(var i = 0; i < orderBys.length; i++){
                orderBy += (i > 0 ? ", " : " ORDER BY ") + orderBys[i].key + " " + orderBys[i].orderType;
            }
        }

        var sql = "SELECT " + fields.join(",") + " FROM " + tableName + " " + buildWhere.sql + orderBy + limitStr;

        self.resetInstance();

        return self.query(sql, data, callback);
    };

    /**
     * Executes an insert query according to previously set adds.
     *
     * @param tableName
     * @returns {number}
     * @author Elad Cohen
     * @param callback
     */
    self.insert = function(tableName, callback){
        if(Helper.empty(tableName)){
            if(Helper.isFunction(callback)) {
                callback(-1);
            }

            return -1;
        }

        var buildInsert = self.buildInsertQuery();
        var data = buildInsert.data;

        if(Helper.empty(data)){
            if(Helper.isFunction(callback)) {
                callback(-1);
            }

            return -1;
        }

        var sql = "INSERT INTO " + tableName + " " + buildInsert.sql + ";";

        self.resetInstance();

        return self.query(sql, data, callback);
    };

    /**
     * Executes an update query according to previously set parameters.
     *
     * @param tableName
     * @returns {number}
     * @author Elad Cohen
     * @param callback
     */
    self.update = function(tableName, callback){
        if(Helper.empty(tableName)){
            if(Helper.isFunction(callback)) {
                callback(0);
            }

            return 0;
        }

        var buildUpdate = self.buildUpdateQuery();
        var buildWhere = self.buildWhereQuery();
        var data = buildUpdate.data.concat(buildWhere.data);

        if(Helper.empty(buildUpdate.data) || Helper.empty(buildWhere.data)){
            if(Helper.isFunction(callback)) {
                callback(0);
            }

            return 0;
        }

        var sql = "UPDATE " + tableName + " " + buildUpdate.sql + " " + buildWhere.sql + ";";

        self.resetInstance();

        return self.query(sql, data, callback);
    };

    /**
     * Executes a delete query according to previously set parameters.
     *
     * @param tableName
     * @returns {*}
     * @author Elad Cohen
     * @param callback
     */
    self.delete = function(tableName, callback){
        if(Helper.empty(tableName) || Helper.empty(self.where)){
            if(Helper.isFunction(callback)) {
                callback(0);
            }

            return 0;
        }

        var buildWhere = self.buildWhereQuery();
        var data = buildWhere.data;
        var limitStr = limit != null ? " LIMIT " + limit : "";
        var sql = "DELETE FROM " + tableName + " " + buildWhere.sql + limitStr + ";";

        return self.query(sql, data, callback);
    };

    /**
     * Adds a where to the instance.
     *
     * @param key
     * @param value
     * @param operator
     * @returns {DB}
     * @author Elad Cohen
     */
    self.where = function(key, value, operator){
        if(Helper.empty(operator)){
            operator = "=";
        }

        var where = {
            "key": key,
            "value": value,
            "operator": operator
        };

        wheres.push(where);

        return self;
    };

    /**
     * Adds an 'add' to an insert query.
     *
     * @param key
     * @param value
     * @returns {DB}
     * @author Elad Cohen
     */
    self.add = function(key, value){
        var add = {
            'key': key,
            'value': value
        };

        adds.push(add);

        return self;
    };

    /**
     * Adds a 'set' to an update query.
     *
     * @param key
     * @param value
     * @returns {DB}
     * @author Elad Cohen
     */
    self.set = function(key, value){
        var setObj = {
            'key': key,
            'value': value
        };

        sets.push(setObj);

        return self;
    };

    /**
     * Creates the WHERE part of the query according to previously set 'wheres'.
     *
     * @returns {*}
     * @author Elad Cohen
     */
    self.buildWhereQuery = function(){
        if(Helper.empty(wheres)){
            return {
                'sql': "",
                'data': []
            }
        }

        var sql = "WHERE";
        var data = [];

        for(var i = 0; i < wheres.length; i++){
            var where = wheres[i];
            data.push(where.key);
            data.push(where.value);

            sql += (i > 0 ? " AND" : "") + " ?? " + where.operator + " ?";
        }

        return {
            'sql': sql,
            'data': data
        }
    };

    /**
     * Creates an insert query using previously set adds.
     *
     * @returns {*}
     * @author Elad Cohen
     */
    self.buildInsertQuery = function(){
        if(Helper.empty(adds)){
            return {
                'sql': "",
                'data': []
            }
        }

        var sql = "(";
        var data = [];
        var i;
        var add;

        for(i = 0; i < adds.length; i++){
            add = adds[i];
            data.push(add.key);

            sql += (i > 0 ? ", " : "") + "??";
        }

        sql += ") VALUES (";

        for(i = 0; i < adds.length; i++){
            add = adds[i];
            data.push(add.value);

            sql += (i > 0 ? ", " : "") + "?";
        }

        sql += ")";

        return {
            'sql': sql,
            'data': data
        }
    };

    /**
     * Builds the update part of the query according to previously 'sets'.
     *
     * @returns {{sql: string, data: Array}}
     * @author Elad Cohen
     */
    self.buildUpdateQuery = function(){
        if(Helper.empty(sets)){
            return {
                'sql': "",
                'data': []
            };
        }

        var sql = "SET";
        var data = [];

        for(var i = 0; i < sets.length; i++){
            var setObj = sets[i];
            data.push(setObj.key);
            data.push(setObj.value);

            sql += (i > 0 ? ", " : " ") + " ?? = ?";
        }

        return {
            'sql': sql,
            'data': data
        }
    };

    /**
     * Sets the limit
     *
     * @param newLimit
     */
    self.setLimit = function(newLimit){
        limit = newLimit;

        return self;
    };

    /**
     * Adds an order by to the query.
     *
     * @param key
     * @param orderType
     * @returns {DB}
     * @author Elad Cohen
     */
    self.orderBy = function(key, orderType){
        if(Helper.empty(key)){
            return self;
        }

        if(Helper.empty(orderType)){
            orderType = "ASC";
        }

        var order = {
            'key': key,
            'orderType': orderType
        };

        orderBys.push(order);

        return self;
    };

    /**
     * Fetches the basic record data of a particular record.
     *
     * @param recordName
     * @param recordID
     * @param fields
     * @param tableName
     * @param callback
     * @returns {boolean}
     * @author Elad Cohen
     */
    self.fetchBasicRecordData = function(recordName, recordID, fields, tableName, callback){
        if(Helper.empty(recordName) || Helper.empty(recordID) || Helper.empty(tableName)){
            if(Helper.isFunction(callback)){
                callback({});
            }

            return false;
        }

        self.where(recordName, recordID).select(fields, tableName, function(result){
            if(Helper.isFunction(callback)){
                if(!Helper.empty(result)){
                    callback(result[0]);
                }
                else{
                    callback({});
                }
            }
            else{
                callback({});
            }
        });

        return true;
    };

    return self;
};

module.exports = DB;