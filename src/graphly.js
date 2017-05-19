/**
 * The main graphly module.
 * @module graphly
 * @name graphly
 * @author: Daniel Santillan
 */

var itemAmount = 180000;
var c_x = 'Latitude';
var c_y = 'T_elec';

Array.prototype.pushArray = function() {
    var toPush = this.concat.apply([], arguments);
    for (var i = 0, len = toPush.length; i < len; ++i) {
        this.push(toPush[i]);
    }
};

function defaultFor(arg, val) { return typeof arg !== 'undefined' ? arg : val; }


var graphly = (function() {

    function hasOwnProperty(obj, prop) {
        var proto = obj.__proto__ || obj.constructor.prototype; // jshint ignore:line
        return (prop in obj) &&
            (!(prop in proto) || proto[prop] !== obj[prop]);
    }

    function defaultFor(arg, val) { return typeof arg !== 'undefined' ? arg : val; }

    // Function to create new colours for the picking.
    this.nextCol = 1;
    function genColor(){ 
      
        var ret = [];
        if(this.nextCol < 16777215){ 
            ret.push(this.nextCol & 0xff); // R 
            ret.push((this.nextCol & 0xff00) >> 8); // G 
            ret.push((this.nextCol & 0xff0000) >> 16); // B
            this.nextCol += 1; 
        }
        //var col = "rgb(" + ret.join(',') + ")";
        //return col;
        //return ret.map(function(c){return c/255;});
        return ret;
    }

 
    /**
    * @lends graphly
    */

    /**
    * The graph class.
    * @memberof module:graphly
    * @constructor
    * @param {Object} options the options to pass to the plot.
    * @param {HTMLDivElement} [options.el] the div to create graph renderings
    * @param {String} [options.csv] URL pointing to CSV data
    * @param {Object} [options.dataSettings] object containing CSV header 
    *                                        identifier as key and object with 
    *                                        settings as value
    * @param {Object} [options.renderSettings] additional render settings
    * @param {Object[]} [options.dataset] passing of dataset instead of CSV url
    *
    */
    var graph = function(options) {
        this.el = d3.select(options.el);
        this.dim = this.el.node().getBoundingClientRect();
        this.margin = {top: 10, left: 90, bottom: 30, right: 10};
        this.width = this.dim.width - this.margin.left - this.margin.right;
        this.height = this.dim.height - this.margin.top - this.margin.bottom;
        this.currentScale = 1;
        this.currentTranlate = [0,0];
        this.colourToNode = {}; // Map to track the colour of nodes.
        var self = this;


        this.renderCanvas = this.el.append('canvas')
            .attr('width', this.width - 1)
            .attr('height', this.height - 1)
            .style('opacity', 1.0)
            //.style('display', 'none')
            .style('position', 'absolute')
            .style('z-index', 2)
            .style("transform", "translate(" + (this.margin.left + 1.0) +
              "px" + "," + (this.margin.top + 1.0) + "px" + ")");


        // Set parameters (these are the default values used when that option is omitted):
        var params = {
            maxLines: itemAmount*10, // used for preallocation
            maxDots: itemAmount,
            forceGL1: false, // use WebGL 1 even if WebGL 2 is available
            clearColor: {r: 0, g: 0, b: 0, a: 0}, // Color to clear screen with
            useNDC: true, // Use normalized device coordinates [0, 1] instead of pixel coordinates,
            coordinateSystem: 'pixels',
            contextParams: {
                preserveDrawingBuffer: true
            }
        };

        // Initialize BatchDrawer:
        this.batchDrawer = new BatchDrawer(this.renderCanvas.node(), params);


        this.referenceCanvas = this.el.append('canvas')
            .classed('hiddenCanvas', true) 
            .attr('width', this.width - 1)
            .attr('height', this.height - 1)
            .style('position', 'absolute')
            .style('display', 'none')
            .style("transform", "translate(" + (this.margin.left + 1) +
              "px" + "," + (this.margin.top + 1) + "px" + ")");


        // Initialize BatchDrawer:
        params.contextParams = {
            antialias: false
        };
        this.batchDrawerReference = new BatchDrawer(this.referenceCanvas.node(), params);
        this.referenceContext = this.batchDrawerReference.getContext();


        this.renderCanvas.on('mousemove', function() {
            // Get mouse positions from the main canvas.
            var mouseX = d3.event.offsetX; 
            var mouseY = d3.event.offsetY;
            // Pick the colour from the mouse position. 
            //var col = self.referenceContext.getImageData(mouseX, mouseY, 1, 1).data;
            var gl = self.referenceContext;
            var pixels = new Uint8Array(4);
            gl.readPixels(mouseX, (this.height-mouseY), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels); 
            var col = [pixels[0], pixels[1], pixels[2]];
            var colKey = col.join('-');
            // Get the data from our map! 
            var nodeId = self.colourToNode[colKey];
            self.svg.selectAll('.highlightItem').remove();

            if(nodeId){
                if(self.data.hasOwnProperty(nodeId)){
                    var p = self.data[nodeId];
                    var xItem = self.xScale(p[c_x]);
                    var yItem = self.yScale(p[c_y]);
                    self.svg.append('circle')
                        .attr('class', 'highlightItem')
                        .attr("r", 5)
                        .attr("cx", xItem)
                        .attr("cy", yItem)
                        .style("fill", function(d) { return 'rgba(0,0,200,1)';})
                        .style("stroke", function(d) { return 'rgba(0,0,200,1)'; });
                }
            }
        });

        // generate random dataset
        /*var numberPoints = itemAmount;
        var randomX = d3.random.normal(0, 30);
        var randomY = d3.random.normal(0, 30);

        this.data = d3.range(numberPoints).map(function(d, i) {
            return {
                x: randomX(),
                y: randomY(),
                i: i, // save the index of the point as a property, this is useful
                selected: false
            };
        });*/

        


        this.svg = this.el.append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom)
            .style('position', 'absolute')
            .style('z-index', 10)
            .style('pointer-events', 'none')
            .append('g')
            .attr("transform", "translate(" + (this.margin.left+1) + "," +
                (this.margin.top+1) + ")");

        this.renderingContainer = this.svg.append("g")
            .attr("id","renderingContainer")
            .style("clip-path","url(#clip)");

        // Add clip path so only points in the area are shown
        var clippath = this.svg.append("defs").append("clipPath")
            .attr("id", "clip")
            .append("rect")
                .attr("width", this.width)
                .attr("height", this.height);


        //this.renderData();

    };

    // Returns a function, that, as long as it continues to be invoked, will not
    // be triggered. The function will be called after it stops being called for
    // N milliseconds. If `immediate` is passed, trigger the function on the
    // leading edge, instead of the trailing.
    var debounce = function(func, wait, immediate) {
        var timeout;
        return function() {
            var context = this, args = arguments;
            var later = function() {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    };


    graph.prototype.loadCSV = function (csv){
        var self = this;
        // Parse local CSV file
        Papa.parse(csv, {
            download: true,
            header: true,
            dynamicTyping: true,
            complete: function(results) {
                self.data = results.data;
                self.initAxis();
                self.renderData();
            }
        });

    };

    graph.prototype.initAxis = function (){

        var xExtent = d3.extent(this.data, function(d) { return d[c_x]; });
        var yExtent = d3.extent(this.data, function(d) { return d[c_y]; });
        var xRange = xExtent[1] - xExtent[0];
        var yRange = yExtent[1] - yExtent[0];

        this.xScale = d3.scale.linear()
            .domain([xExtent[0] - xRange*0.1, xExtent[1] + xRange*0.1])
            .range([0, this.width]);

        this.yScale = d3.scale.linear()
            .domain([yExtent[0] - yRange*0.1, yExtent[1] + yRange*0.1])
            .range([this.height, 0]);

        this.xAxis = d3.svg.axis()
            .scale(this.xScale)
            .innerTickSize(-this.height)
            .outerTickSize(0)
            .tickPadding(10)
            .orient('bottom');

        this.yAxis = d3.svg.axis()
            .scale(this.yScale)
            .innerTickSize(-this.width)
            .outerTickSize(0)
            .orient('left');

        this.xAxisSvg = this.svg.append('g')
            .attr('class', 'axis')
            .attr('transform', 'translate(0,' + this.height + ')')
            .call(this.xAxis);

        this.yAxisSvg = this.svg.append('g')
            .attr('class', 'axis')
            .call(this.yAxis);

        // create zooming/panning behaviour
        var zoomBehaviour = d3.behavior.zoom()
            .x(this.xScale)
            .y(this.yScale)
            .on('zoom', this.previewZoom.bind(this));

        this.renderCanvas.call(zoomBehaviour);

    };

    graph.prototype.onZoom = function() {
        var prevImg = this.el.select('#previewImage');
        if(!prevImg.empty()){
            //this.svg.select("#clip").attr("transform", "translate(0,0)scale(1)");
            this.renderCanvas.style('opacity','1.0');
            prevImg.remove();
        }
        
        this.xAxisSvg.call(this.xAxis);
        this.yAxisSvg.call(this.yAxis);


        this.renderData();
    };

    var debounceZoom = debounce(function() {
        this.onZoom();
    }, 250);

    graph.prototype.previewZoom = function() {

        this.svg.selectAll('.highlightItem').remove();

        debounceZoom.bind(this)();
        var prevImg = this.el.select('#previewImage');
        if(prevImg.empty()){
            this.renderCanvas.style('opacity','0');
            var img = this.renderCanvas.node().toDataURL();
            this.oSc = this.currentScale;
            this.oTr = this.currentTranlate;

            this.oT = [
                d3.event.translate[0]/d3.event.scale,
                d3.event.translate[1]/d3.event.scale,
            ];
            
            this.renderingContainer.append("svg:image")
                .attr('id', 'previewImage')
                .attr("xlink:href", img)
                .attr("x", 0)
                .attr("y", 0)
                .attr("width",  this.width)
                .attr("height", this.height);
        }

        var scale = d3.event.scale / this.oSc;

        var transX, transY;

        if(scale !== 1){
            transX = (d3.event.translate[0]/d3.event.scale - this.oTr[0]/this.oSc) *
                d3.event.scale;
            transY = (d3.event.translate[1]/d3.event.scale - this.oTr[1]/this.oSc) *
                d3.event.scale;
        }else{
            transX = d3.event.translate[0] - this.oT[0]* this.oSc;
            transY = d3.event.translate[1] - this.oT[1]* this.oSc;
        }

        this.svg.select("#previewImage").attr("transform", "translate(" + 
            [transX-1, transY-1] + ")scale(" + scale + ")");

        this.xAxisSvg.call(this.xAxis);
        this.yAxisSvg.call(this.yAxis);

        this.currentScale = d3.event.scale;
        this.currentTranlate = d3.event.translate;

    };


    graph.prototype.drawCircle = function(renderer, cx, cy, r, num_segments) { 
        var theta = 2 * 3.1415926 / num_segments; 
        var c = Math.cos(theta);//precalculate the sine and cosine
        var s = Math.sin(theta);

        x = r;//we start at angle = 0 
        y = 0; 
        
        var prev_point = null;
        for(var i = 0; i <= num_segments; i++) 
        { 
            if(prev_point){
                var next_point = [x + cx, y + cy];
                renderer.addLine(prev_point[0], prev_point[1], next_point[0], next_point[1], 5, 0.258, 0.525, 0.956, 1.0);
                prev_point = next_point;
            }else{
                prev_point = [x + cx, y + cy];
            }
            
            //apply the rotation matrix
            t = x;
            x = c * x - s * y;
            y = s * t + c * y;
        } 
        
    };


    /**
    * Render the colorscale to the specified canvas.
    * @memberof module:plotty
    * @param {String} name the name of the color scale to render
    * @param {HTMLCanvasElement} canvas the canvas to render to
    */
    graph.prototype.renderData = function() {

        this.colourToNode = {}; // Map to track the colour of nodes.

        var vertices = [];
        var colors = [];
        var idColors = [];
        var indices = [];
        var radius = 5;

        // reset color count
        this.nextCol = 1;

        /*for (var i = 0; i <= this.data.length -1; i+=2) {

            var x1 = (this.xScale(this.data[i][c_x]));
            var y1 = (this.yScale(this.data[i][c_y]));

            var x2 = (this.xScale(this.data[i+1][c_x]));
            var y2 = (this.yScale(this.data[i+1][c_y]));

            //vertices.pushArray([x,y,0.0]);

            var c = genColor();
            this.colourToNode[c.join('-')] = i;
            var nCol = c.map(function(c){return c/255;});
            idColors.pushArray(nCol);
            //colors.pushArray([0.258, 0.525, 0.956]);

            this.batchDrawer.addLine(x1, y1, x2, y2, 50.0, 0.258, 0.525, 0.956, 1.0);


        }*/

        for (var i = this.data.length - 1; i >= 0; i--) {

            var x = (this.xScale(this.data[i][c_x]));
            var y = (this.yScale(this.data[i][c_y]));

            var c = genColor();
            this.colourToNode[c.join('-')] = i;
            var nCol = c.map(function(c){return c/255;});
            idColors.pushArray(nCol);

            this.batchDrawer.addDot(x, y, 10, 0.258, 0.525, 0.956, 1);
            this.batchDrawerReference.addDot(x, y, 10, nCol[0], nCol[1], nCol[2], 1);
        }

        this.batchDrawer.draw();
        this.batchDrawerReference.draw();


    };

    return {
        graph: graph
    };

})();

if (typeof module !== "undefined") {
  module.exports = graphly;
}
