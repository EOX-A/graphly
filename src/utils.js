

var d3 = require("d3");

// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds. If `immediate` is passed, trigger the function on the
// leading edge, instead of the trailing.

export default function debounce(func, wait, immediate) {
  let timeout;
  return function(func, wait, immediate) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      timeout = null;
      if (!immediate) func.apply(this, args);
    }, wait);
    if (immediate && !timeout) func.apply(this, [func, wait, immediate])
  }
}

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

String.prototype.allReplace = function(obj) {
    var retStr = this;
    for (var x in obj) {
        retStr = retStr.replace(new RegExp(x, 'g'), obj[x]);
    }
    return retStr;
};


export function addSymbol(el, symbol, color, center, stroke, size , className){

    let s = defaultFor(size, 10);
    let c = defaultFor(center, {x: s, y: s/2});
    let sW = defaultFor(stroke, 1.5);

    let triangleData = [ 
        {"x": c.x-s/2, "y": c.y+s/2}, 
        {"x": c.x, "y": c.y-s/2},
        {"x": c.x+s/2, "y": c.y+s/2},
        {"x": c.x-s/2, "y": c.y+s/2}
    ];

    let triangleFunction = d3.svg.line()
         .x(function(d) { return d.x; })
         .y(function(d) { return d.y; })
         .interpolate("linear");

    let element;
    switch(symbol){
        case 'rectangle':
            element = el.append("rect")
                .attr("x", c.x-s/2).attr("y", c.y-s/2)
                .attr("width", s).attr("height", s)
                .attr('fill', color)
                .attr("stroke", 'none');
            break;
        case 'rectangle_empty':
            element = el.append("rect")
                .attr("x", c.x-s/2).attr("y", c.y-s/2)
                .attr("width", s-1).attr("height", s-1)
                .attr('fill', 'none')
                .attr("stroke-width", sW)
                .attr("stroke", color);
            break;
        case 'circle':
            element = el.append("ellipse")
                .attr("cx", c.x).attr("cy", c.y)
                .attr("rx", s/2).attr("ry", s/2)
                .attr('fill', color)
                .attr("stroke", 'none');
            break;
        case 'circle_empty':
            element = el.append("ellipse")
                .attr("cx", c.x).attr("cy", c.y)
                .attr("rx", s/2-1).attr("ry", s/2-1)
                .attr('fill', 'none')
                .attr("stroke-width", sW)
                .attr("stroke", color);
            break;
        case 'plus':
            element = el.append('line')
                .attr('x1', c.x).attr('y1', c.y-s/2)
                .attr('x2', c.x).attr('y2', c.y+s/2)
                .attr("stroke-width", sW)
                .attr("stroke", color);
            if(className){
                element.attr('class', className);
            }
            element = el.append('line')
                .attr('x1', c.x-s/2).attr('y1', c.y)
                .attr('x2', c.x+s/2).attr('y2', c.y)
                .attr("stroke-width", sW)
                .attr("stroke", color);
            if(className){
                element.attr('class', className);
            }
            break;
        case 'x':
            element = el.append('line')
                .attr('x1', c.x-s/2).attr('y1', c.y-s/2)
                .attr('x2', c.x+s/2).attr('y2', c.y+s/2)
                .attr("stroke-width", sW)
                .attr("stroke", color);
            if(className){
                element.attr('class', className);
            }
            element = el.append('line')
                .attr('x1', c.x+s/2).attr('y1', c.y-s/2)
                .attr('x2', c.x-s/2).attr('y2', c.y+s/2)
                .attr("stroke-width", sW)
                .attr("stroke", color);
            if(className){
                element.attr('class', className);
            }
            break;
        case 'triangle':
            element = el.append("path")
                .attr("d", triangleFunction(triangleData))
                .attr("stroke-width", sW)
                .attr("stroke", color)
                .attr("fill", color);
            break;
        case 'triangle_empty':
            element = el.append("path")
                .attr("d", triangleFunction(triangleData))
                .attr("stroke-width", sW)
                .attr("stroke", color)
                .attr("fill", "none");
            break;
    }
    if(element && className){
        element.attr('class', className);
    }
}


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

export function rgbToHex(r, g, b) {
    r = Math.ceil(r*255);
    g = Math.ceil(g*255);
    b = Math.ceil(b*255);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}


export function createSuperscript(string){
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


export function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : null;
}


export function getCustomUTCTimeTickFormat() {
    return d3.time.format.utc.multi([
        [".%L", function(d) { return d.getUTCMilliseconds(); }],
        [":%S", function(d) { return d.getUTCSeconds(); }],
        ["%H:%M", function(d) { return d.getUTCMinutes(); }],
        ["%H:%M", function(d) { return d.getUTCHours(); }],
        ["%a %d", function(d) { return d.getUTCDay() && d.getDate() != 1; }],
        ["%b %d", function(d) { return d.getUTCDate() != 1; }],
        ["%B", function(d) { return d.getUTCMonth(); }],
        ["%Y", function() { return true; }]
    ]);
}

export function customExponentTickFormat(d) {
    var gFormat = d3.format('g');
    var sFormat = d3.format('e');
    if(typeof d !== 'string'){
        d = d.toFixed(14);
    }
    if( (d>0.001 && d<9999) || (d<-0.001 && d>-9999) || d == 0.0){
        return gFormat(d);
    } else {
        return sFormat(d).allReplace({
            'e[+]12': '×10¹²',
            'e[+]11': '×10¹¹',
            'e[+]10': '×10¹⁰',
            'e[+]9': '×10⁹',
            'e[+]8': '×10⁸',
            'e[+]7': '×10⁷',
            'e[+]6': '×10⁶',
            'e[+]5': '×10⁵',
            'e[+]4': '×10⁴',
            'e[+]3': '×10³',
            'e[+]2': '×10²;',
            'e[-]2': '×10⁻²;',
            'e[-]3': '×10⁻³',
            'e[-]4': '×10⁻⁴',
            'e[-]5': '×10⁻⁵',
            'e[-]6': '×10⁻⁶',
            'e[-]7': '×10⁻⁷',
            'e[-]8': '×10⁻⁸',
            'e[-]9': '×10⁻⁹',
            'e[-]10': '×10⁻¹⁰',
            'e[-]11': '×10⁻¹¹',
            'e[-]12': '×10⁻¹²'
        });
    }
}

export function customScientificTickFormat(d) {
    var gFormat = d3.format('g');
    var sFormat = d3.format('s');
    d = d.toFixed(11);
    if( (d>0.001 && d<9999) || (d<-0.001 && d>-9999) ){
        return gFormat(d);
    } else {
        return sFormat(d).allReplace({
            'Y': 'ₓ10²⁴',
            'Z': 'ₓ10²¹',
            'E': 'ₓ10¹⁸',
            'P': 'ₓ10¹⁵',
            'T': 'ₓ10¹²',
            'G': 'ₓ10⁹',
            'M': 'ₓ10⁶',
            'k': 'ₓ10³',
            'h': 'ₓ10²;',
            'da':'ₓ10¹;',
            'd': 'ₓ10⁻¹',
            'c': 'ₓ10⁻²',
            'm': 'ₓ10⁻³',
            'µ': 'ₓ10⁻⁶',
            'n': 'ₓ10⁻⁹',
            'p': 'ₓ10⁻¹²',
            'f': 'ₓ10⁻¹⁵',
            'a': 'ₓ10⁻¹⁸',
            'z': 'ₓ10⁻²¹',
            'y': 'ₓ10⁻²⁴'
        });
    }
}


var nextDisCol = 0;
var discCols = [
    '#ff0000','#ffd940','#79f2da','#8c40ff','#f20000','#8c7723','#0d3330',
    '#b380ff','#b20000','#d9c36c','#00e2f2','#4c4359','#730000','#665c33',
    '#00a7b3','#583973','#4c0000','#332e1a','#396f73','#e1bfff','#d93636',
    '#999173','#99c9cc','#5e008c','#cc6666','#e6e2ac','#394b4d','#cc00ff',
    '#993626','#eeff00','#008fb3','#8f00b3','#33120d','#474d00','#003d4d',
    '#8a4d99','#ff9180','#aab32d','#005580','#3c0040','#ffc8bf','#f6ff80',
    '#002233','#f780ff','#b38c86','#5d8c00','#3db6f2','#e600d6','#66504d',
    '#b6f23d','#406a80','#661a61','#ff7340','#26330d','#bfeaff','#80607d',
    '#bf5630','#3a4030','#0058a6','#bf30a3','#f29979','#9ccc66','#40a6ff',
    '#cc99c2','#7f5140','#628040','#263b4d','#ff00aa','#cc5200','#61f200',
    '#002966','#401030','#4c1f00','#47b300','#001433','#d96cb5','#b2622d',
    '#98b386','#1d3f73','#733960','#733f1d','#6c8060','#597db3','#8c004b',
    '#ffb380','#144d00','#8698b3','#b20047','#4c3626','#a1ff80','#3662d9',
    '#330014','#ccad99','#d0ffbf','#80a2ff','#f23d85','#8c7769','#00730f',
    '#565e73','#591631','#ff8800','#2d5933','#bfc8ff','#a67c8d','#4c2900',
    '#33cc5c','#3636d9','#d96c89','#331b00','#4d9961','#13134d','#994d61',
    '#8c5b23','#00ff66','#5353a6','#f2b6c6','#d9a66c','#003314','#303040',
    '#73565e','#ffe1bf','#7ca692','#2200ff','#8c2331','#594f43','#4d665a',
    '#110080','#66333a','#b27700','#3df2b6','#8c86b3','#403032','#593c00',
    '#008c70','#341d73','#e5ac39','#004d3d','#282040'
];
var discColsLen = discCols.length;

export function getdiscreteColor() {
    var selCol = discCols[nextDisCol];
    nextDisCol = (nextDisCol+1)%discColsLen;
    return hexToRgb(selCol);
}
