var Helper = require("./Helper.js");
var Native = require("./Native.js");
var GeneralFields = require("./../Fields/GeneralFields.js");

/**
 * Creates a new Maps instance.
 *
 * @constructor
 * @author Elad Cohen
 */
var Maps = function(){
    var self = this;

    /**
     * Returns whether a polygon contains a specific point.
     *
     * @param point
     * @param polygon
     * @returns {boolean}
     */
    self.polygonContains = function(point, polygon){
        if(!Helper.arraysEqual(polygon[0], polygon[polygon.length - 1])){
            polygon[polygon.length] = polygon[0];
        }

        var j = 0;
        var oddNodes = false;
        var x = point[1];
        var y = point[0];
        var n = polygon.length;

        for(var i = 0; i < n; i++){
            j++;

            if(j == n){
                j = 0;
            }

            var polyPointX = polygon[i][1];
            var polyPointY = polygon[i][0];

            var nextPolyPointX = polygon[j][1];
            var nextPolyPointY = polygon[j][0];

            if((polyPointY < y && nextPolyPointY >= y) || (nextPolyPointY < y && polyPointY >= y)){
                if(polyPointX + (y - polyPointY) / (nextPolyPointY - polyPointY) * (nextPolyPointX - polyPointX) < x){
                    oddNodes = !oddNodes;
                }
            }
        }

        return oddNodes;
    };

    /**
     * Returns the distance in KM between 2 points.
     *
     * @param point1
     * @param point2
     * @returns {number}
     * @author Elad Cohen
     */
    self.getCoordinatesDistance = function(point1, point2){
        if(!Helper.isArray(point1) || !Helper.isArray(point2) || !Helper.isTrueFloat(point1[0]) || !Helper.isTrueFloat(point1[1]) || !Helper.isTrueFloat(point2[0]) || !Helper.isTrueFloat(point2[1])){
            return -1;
        }

        var lat1 = point1[0];
        var lat2 = point2[0];
        var lng1 = point1[1];
        var lng2 = point2[1];

        var theta = lng1 - lng2;
        var dist = Math.sin(Native.deg2rad(lat1)) * Math.sin(Native.deg2rad(lat2)) + Math.cos(Native.deg2rad(lat1)) * Math.cos(Native.deg2rad(lat2)) * Math.cos(Native.deg2rad(theta));
        dist = Math.acos(dist);
        dist = Native.rad2deg(dist);

        var miles = dist * 60 * 1.1515;

        return miles * 1.609344;
    };

    /**
     * Computes a polygon's area.
     *
     * @param polygon
     * @returns {number}
     */
    self.computePolygonArea = function(polygon){
        var numPoints = polygon.length;

        if(Helper.arraysEqual(polygon[numPoints - 1], polygon[0])){
            numPoints--;
        }
        else{
            polygon[numPoints] = polygon[0];
        }

        var area = 0;

        for(var i = 0; i < numPoints; i++){
            var i1 = (i + 1) % numPoints;

            area += (polygon[i][1] + polygon[i1][0]) * (polygon[i1][0] - polygon[i][0]);
        }

        area /= 2;

        return Math.abs(area);
    };

    /**
     * Returns the country from specific coordinates in a specific language.
     *
     * @param lat
     * @param lng
     * @param languageID
     * @param callback
     * @returns {string}
     * @author Elad Cohen
     */
    self.getCountryFromCoordinates = function(lat, lng, languageID, callback){
        if(typeof callback !== 'function'){
            return "";
        }

        if(Helper.empty(lat) || Helper.empty(lng) || !Helper.isTrueFloat(lat) || !Helper.isTrueFloat(lng)){
            callback("");
        }

        if(Helper.empty(languageID) || !Helper.isPositiveInteger(languageID)){
            languageID = 1;
        }

        var country = "";

        self.getAddressFromGoogleAPI(lat, lng, languageID, function(results){
            if(Helper.empty(results)){
                callback("");
            }
            else{
                var lastResult = results[results.length - 1];

                if(lastResult.hasOwnProperty("formatted_address")){
                    country = lastResult["formatted_address"];
                }

                callback(country);
            }
        });
    };

    /**
     * Returns the country shortcut from specific coordinates in a specific language.
     *
     * @param lat
     * @param lng
     * @param callback
     * @returns {string}
     * @author Elad Cohen
     */
    self.getCountryShortcutFromCoordinates = function(lat, lng, callback){
        if(typeof callback !== 'function'){
            return "";
        }

        if(Helper.empty(lat) || Helper.empty(lng) || !Helper.isTrueFloat(lat) || !Helper.isTrueFloat(lng)){
            callback("");
        }

        var shortCut = "";

        self.getAddressFromGoogleAPI(lat, lng, 0, function(results){
            if(Helper.empty(results)){
                callback("");
            }
            else{
                var lastResult = results[results.length - 1];

                if(lastResult.hasOwnProperty("address_components")){
                    var addressComponents = lastResult["address_components"][0];

                    if(addressComponents.hasOwnProperty("short_name")){
                        shortCut = addressComponents["short_name"];
                    }
                }

                callback(shortCut);
            }
        });
    };

    /**
     * Returns the address from specific coordinates.
     *
     * @param lat
     * @param lng
     * @param languageID
     * @param callback
     * @returns {string}
     * @author Elad Cohen
     */
    self.getAddressFromCoordinates = function(lat, lng, languageID, callback){
        if(typeof callback !== 'function'){
            return "";
        }

        if(Helper.empty(lat) || Helper.empty(lng) || !Helper.isTrueFloat(lat) || !Helper.isTrueFloat(lng)){
            callback("");
        }

        if(Helper.empty(languageID) || !Helper.isPositiveInteger(languageID)){
            languageID = 1;
        }

        var address = "";

        self.getAddressFromGoogleAPI(lat, lng, languageID, function(results){
            if(Helper.empty(results)){
                callback("");
            }
            else{
                var firstResult = results[0];

                if(firstResult.hasOwnProperty("formatted_address")){
                    address = firstResult["formatted_address"];
                }

                callback(address);
            }
        });
    };

    /**
     * Returns the address by a given coordinates and language from the Google Maps API.
     *
     * @param lat
     * @param lng
     * @param languageID
     * @param callback
     * @returns {boolean}
     * @author Elad Cohen
     */
    self.getAddressFromGoogleAPI = function(lat, lng, languageID, callback){
        if(typeof callback !== 'function'){
            return false;
        }

        if(Helper.empty(lat) || Helper.empty(lng) || !Helper.isTrueFloat(lat) || !Helper.isTrueFloat(lng)){
            callback(false);
        }

        var http = require('http');

        if(Helper.empty(languageID) || !Helper.isPositiveInteger(languageID)){
            languageID = 1;
        }

        var language = "he";

        GeneralFields.getAllLanguages(function(languages){
            for(var langPos in languages){
                if(!languages.hasOwnProperty(langPos)){
                    continue;
                }

                var lang = languages[langPos];

                if(lang["value"] == languageID){
                    language = lang["Shortcut"];
                    break;
                }
            }

            var options = {
                host: 'maps.googleapis.com',
                path: '/maps/api/geocode/json?latlng=' + lat + ',' + lng + '&sensor=false&language=' + language
            };

            http.request(options, function(response){
                var str = '';

                response.on('data', function (chunk) {
                    str += chunk;
                });

                response.on('end', function (){
                    var resp = JSON.parse(str);

                    if(!Helper.empty(resp) && resp.hasOwnProperty("results")){
                        callback(resp["results"]);
                    }
                    else{
                        callback(false);
                    }
                });
            }).end();
        });
    };
};

module.exports = new Maps();