

var d3 = require("d3");

Array.prototype.zip = function (arr) {
    return this.map(function (e, i) {
        return [e, arr[i]];
    });
};


Array.prototype.pushArray = function() {
    var toPush = this.concat.apply([], arguments);
    for (var i = 0, len = toPush.length; i < len; ++i) {
        this.push(toPush[i]);
    }
};


// Function to create new colours for the picking.
var nextCol = 1;
export function genColor(){ 
    var ret = [];
    if(nextCol < 16777215){ 
        ret.push(nextCol & 0xff); // R 
        ret.push((nextCol & 0xff00) >> 8); // G 
        ret.push((nextCol & 0xff0000) >> 16); // B
        nextCol += 1; 
    }
    return ret;
}

export function resetColor(){ 
    nextCol = 1;
}

function rgbToHex(r, g, b) {
    r = Math.ceil(r*255);
    g = Math.ceil(g*255);
    b = Math.ceil(b*255);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}


function createSuperscript(string){
    // Adding subscript elements to string which contain underscores
    var superscriptString = "";
    var parts = string.split(" ");
    if (parts.length>1){
        superscriptString = parts[0];
        for (var i=1; i<parts.length; i++){
            if(parts[i].indexOf('^')!==-1){
                var index = parts[i].indexOf('^');
                superscriptString += 
                    parts[i].substring(0, index) + 
                    '<sup>'+ parts[i].substring(index+1)+'</sup>'+' ';
            }else{
                superscriptString += parts[i]+' ';
            }
            
        }
    }else{
        superscriptString = string;
    }

    return superscriptString;
}



function hasOwnProperty(obj, prop) {
    var proto = obj.__proto__ || obj.constructor.prototype; // jshint ignore:line
    return (prop in obj) &&
        (!(prop in proto) || proto[prop] !== obj[prop]);
}


function defaultFor(arg, val) { return typeof arg !== 'undefined' ? arg : val; }


function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : null;
}


var timeFormat = d3.time.format.utc.multi([
    [".%L", function(d) { return d.getUTCMilliseconds(); }],
    ["%Ss", function(d) {
        var text = this[0](d);
        d3.selectAll("text")
            .filter(function(){ 
                return d3.select(this).text() == text;
            })
            .attr("class", "second");

        return d.getUTCSeconds(); 
    }],
    ["%Mm", function(d) { 
        var text = this[0](d);
        d3.selectAll("text")
            .filter(function(){ 
                return d3.select(this).text() == text;
            })
            .attr("class", "minute");

        return d.getUTCMinutes(); 
     }],
     ["%H:00", function(d) { 
        var text = this[0](d);
        d3.selectAll("text")
            .filter(function(){ 
                return d3.select(this).text() == text;
            })
            .attr("class", "hour");

        return d.getUTCHours(); 
    }],
    ["%dD", function(d) {  
        var text = this[0](d);
        d3.selectAll("text")
            .filter(function(){ 
                return d3.select(this).text() == text;
            })
            .attr("class", "day");
         return d.getUTCDay() && d.getDate() != 1;  
    }],
    ["%dD", function(d) {
        var text = this[0](d);
        d3.selectAll("text")
            .filter(function(){ 
                return d3.select(this).text() == text;
            })
            .attr("class", "day");
         return d.getDate() != 1;  
    }],
    ["%b", function(d) { 
        var text = this[0](d);
        d3.selectAll("text")
            .filter(function(){ 
                return d3.select(this).text() == text;
            })
            .attr("class", "month");
        return d.getUTCMonth(); }],
    ["%Y", function(d) { 
        var text = this[0](d);
        d3.selectAll("text")
            .filter(function(){ 
                return d3.select(this).text() == text;
            })
            .attr("class", "year");
        return true; }]
]);