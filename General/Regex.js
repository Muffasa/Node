var allowedFunctions = ["geomfromtext"];

var Regex = {
    'getQuestionMarkInQueryPattern': function(){
        var pattern = "(((=|like)[\\s]*[?]+)|((values|in)[\\s]*\([";

        for(var i = 0; i < allowedFunctions.length; i++){
            pattern += allowedFunctions[i] + "(?),";
        }

        pattern += "?,\\s]*\)))";

        return new RegExp(pattern);
    },
    'getWordsInQueryPattern': function(){
        var pattern = "(((=|like)[[\\s]*";

        for(var i = 0; i < allowedFunctions.length; i++){
            pattern += "(?!" + allowedFunctions[i] + ")";
        }

        pattern += "[\\w]+]*)|((values|in)[\\s]*\\([\\s\\w,']*\\)))";

        return new RegExp(pattern);
    }
};

module.exports = Regex;