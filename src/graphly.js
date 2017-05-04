/**
 * The main graphly module.
 * @module graphly
 * @name graphly
 * @author: Daniel Santillan
 */

var graphly = (function() {

    function hasOwnProperty(obj, prop) {
        var proto = obj.__proto__ || obj.constructor.prototype; // jshint ignore:line
        return (prop in obj) &&
            (!(prop in proto) || proto[prop] !== obj[prop]);
    }

    function defaultFor(arg, val) { return typeof arg !== 'undefined' ? arg : val; }

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
        this.margin = {top: 10, left: 30, bottom: 30, right: 10};
        this.width = this.dim.width - this.margin.left - this.margin.right;
        this.height = this.dim.height - this.margin.top - this.margin.bottom; 

        this.renderCanvas = this.el.append('canvas')
            .attr('width', this.width - 1)
            .attr('height', this.height - 1)
            .style('position', 'absolute')
            .style('z-index', 2)
            .style("transform", "translate(" + (this.margin.left + 1) +
              "px" + "," + (this.margin.top + 1) + "px" + ")");

        this.context = this.renderCanvas.node().getContext('2d');
        this.context.fillStyle="#FF0000";
        this.context.fillRect(0,0,this.width,this.height);

        // generate random dataset
        var numberPoints = 100000;
        var randomX = d3.random.normal(0, 30);
        var randomY = d3.random.normal(0, 30);

        this.data = d3.range(numberPoints).map(function(d, i) {
            return {
                x: randomX(),
                y: randomY(),
                i: i, // save the index of the point as a property, this is useful
                selected: false
            };
        });

        var xExtent = d3.extent(this.data, function(d) { return d.x });
        var yExtent = d3.extent(this.data, function(d) { return d.y });
        var xRange = xExtent[1] - xExtent[0];
        var yRange = yExtent[1] - yExtent[0];

        this.xScale = d3.scale.linear()
            .domain([xExtent[0] - xRange*0.1, xExtent[1] + xRange*0.1])
            .range([0, this.width]);

        this.yScale = d3.scale.linear()
            .domain([yExtent[0] - yRange*0.1, yExtent[1] + yRange*0.1])
            .range([this.height, 0]);

        this.svg = this.el.append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom)
            .style('position', 'absolute')
            .style('z-index', 1)
            .append('g')
            .attr("transform", "translate(" + this.margin.left + "," +
                this.margin.top + ")");

        this.renderingContainer = this.svg.append("g")
            .attr("id","renderingContainer")
            .style("clip-path","url(#clip)");

        // Add clip path so only points in the area are shown
        var clippath = this.svg.append("defs").append("clipPath")
            .attr("id", "clip")
            .append("rect")
                .attr("width", this.width)
                .attr("height", this.height);

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

        this.renderData();

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

    graph.prototype.onZoom = function() {
        var prevImg = this.el.select('#previewImage');
        if(!prevImg.empty()){
            //this.svg.select("#clip").attr("transform", "translate(0,0)scale(1)");
            this.renderCanvas.style('opacity','1');
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

        debounceZoom.bind(this)();
        var prevImg = this.el.select('#previewImage');
        if(prevImg.empty()){
            this.renderCanvas.style('opacity','0');
            var img = this.renderCanvas.node().toDataURL();
            this.oSc = d3.event.scale;
            this.oTr = d3.event.translate;

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

        var scale = 1 + (d3.event.scale - this.oSc);
        var transX, transY;

        if(scale !== 1){
            transX = (d3.event.translate[0]/d3.event.scale - this.oTr[0]/this.oSc) *
                this.oSc * d3.event.scale;
            transY = (d3.event.translate[1]/d3.event.scale - this.oTr[1]/this.oSc) * 
                this.oSc * d3.event.scale;
        }else{
            transX = d3.event.translate[0] - this.oT[0]* this.oSc;
            transY = d3.event.translate[1] - this.oT[1]* this.oSc;
        }

        this.svg.select("#previewImage").attr("transform", "translate(" + 
            [transX, transY] + ")scale(" + scale + ")");

        this.xAxisSvg.call(this.xAxis);
        this.yAxisSvg.call(this.yAxis);

        
    };

    graph.prototype.drawCross = function(point, s) {
        var x = Math.round(this.xScale(point.x));
        var y = Math.round(this.yScale(point.y));

        this.context.beginPath();
        this.context.strokeStyle = "rgba(10, 10, 255, 1)";
        this.context.moveTo(x - s, y - s);
        this.context.lineTo(x + s, y + s);
        this.context.stroke();
        this.context.moveTo(x + s, y - s);
        this.context.lineTo(x - s, y + s);
        this.context.stroke();
    };

    graph.prototype.drawRect = function(point, s) {
        var x = Math.round(this.xScale(point.x));
        var y = Math.round(this.yScale(point.y));

        this.context.beginPath();
        this.context.strokeStyle = "rgba(10, 10, 255, 1)";
        this.context.moveTo(x - s-1, y - s);
        this.context.lineTo(x + s+1, y - s);
        this.context.stroke();
        this.context.moveTo(x + s, y - s);
        this.context.lineTo(x + s, y + s);
        this.context.stroke();
        this.context.moveTo(x + s+1, y + s);
        this.context.lineTo(x - s-1, y + s);
        this.context.stroke();
        this.context.moveTo(x - s, y + s);
        this.context.lineTo(x - s, y - s);
        this.context.stroke();
    };


    graph.prototype.drawPoint = function(point, r) {
        var x = Math.round(this.xScale(point.x));
        var y = Math.round(this.yScale(point.y));

        // NOTE; each point needs to be drawn as its own path
        // as every point needs its own stroke. you can get an insane
        // speed up if the path is closed after all the points have been drawn
        // and don't mind points not having a stroke
        this.context.beginPath();
        this.context.fillStyle = "rgba(10, 10, 255, 1)";
        this.context.arc(x, y, r, 0, 2 * Math.PI);
        this.context.closePath();
        this.context.fill();
        this.context.stroke();
    };



    /**
    * Render the colorscale to the specified canvas.
    * @memberof module:plotty
    * @param {String} name the name of the color scale to render
    * @param {HTMLCanvasElement} canvas the canvas to render to
    */
    graph.prototype.renderData = function() {
        console.log('Render data');
        this.context.clearRect(0, 0, this.width, this.height);

        for (var i = this.data.length - 1; i >= 0; i--) {
            this.drawRect(this.data[i], 4);
        }

    };

    return {
        graph: graph
    };

})();

if (typeof module !== "undefined") {
  module.exports = graphly;
}
