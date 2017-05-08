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

    // Function to create new colours for the picking.
    var nextCol = 1;
    function genColor(){ 
      
        var ret = [];
        if(nextCol < 16777215){ 
            ret.push(nextCol & 0xff); // R 
            ret.push((nextCol & 0xff00) >> 8); // G 
            ret.push((nextCol & 0xff0000) >> 16); // B
            nextCol += 1; 
        }
        var col = "rgb(" + ret.join(',') + ")";
        return col;
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
        this.margin = {top: 10, left: 30, bottom: 30, right: 10};
        this.width = this.dim.width - this.margin.left - this.margin.right;
        this.height = this.dim.height - this.margin.top - this.margin.bottom;
        var self = this;


        this.renderCanvas = this.el.append('canvas')
            .attr('width', this.width - 1)
            .attr('height', this.height - 1)
            .style('opacity', 0.5)
            .style('position', 'absolute')
            .style('z-index', 2)
            .style("transform", "translate(" + (this.margin.left + 1.5) +
              "px" + "," + (this.margin.top + 1.5) + "px" + ")");

        this.context = this.renderCanvas.node().getContext('2d');

        this.referenceCanvas = this.el.append('canvas')
            .classed('hiddenCanvas', true) 
            .attr('width', this.width - 1)
            .attr('height', this.height - 1)
            .style('position', 'absolute')
            .style('display', 'none')
            .style("transform", "translate(" + (this.margin.left + 1) +
              "px" + "," + (this.margin.top + 1) + "px" + ")");

        this.referenceContext = this.referenceCanvas.node().getContext('2d', {alpha: false});

        this.context.mozImageSmoothingEnabled = false;
        this.context.webkitImageSmoothingEnabled = false;
        this.context.msImageSmoothingEnabled = false;
        this.context.imageSmoothingEnabled = false;

        this.renderCanvas.on('mousemove', function() {
            // Get mouse positions from the main canvas.
            var mouseX = d3.event.offsetX; 
            var mouseY = d3.event.offsetY;
            // Pick the colour from the mouse position. 
            var col = self.referenceContext.getImageData(mouseX, mouseY, 1, 1).data; 
            // Then stringify the values in a way our map-object can read it.
            var colKey = 'rgb(' + col[0] + ',' + col[1] + ',' + col[2] + ')';
            // Get the data from our map! 
            var nodeId = self.colourToNode[colKey];

            self.svg.selectAll('.highlightItem').remove();

            if(nodeId){
                var p = self.data[nodeId];
                var xItem = self.xScale(p.x);
                var yItem = self.yScale(p.y);

                // Check if selection is correct or the colorId is wrong
                // because of antialiasing
                if((Math.abs(mouseX-xItem) <10) && (Math.abs(mouseY-yItem)<10)){
                    self.svg.append('circle')
                        .attr('class', 'highlightItem')
                        .attr("r", 8)
                        .attr("cx", xItem)
                        .attr("cy", yItem)
                        .style("fill", function(d) { return 'rgba(0,0,200,1)';})
                        .style("stroke", function(d) { return 'rgba(0,0,200,1)'; });
                }
            }
        });

        // generate random dataset
        var numberPoints = 86400;
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

    graph.prototype.drawCross = function(ctx, point, s, c) {
        var x = Math.round(this.xScale(point.x));
        var y = Math.round(this.yScale(point.y));

        ctx.beginPath();
        ctx.strokeStyle = c;
        ctx.moveTo(x - s, y - s);
        ctx.lineTo(x + s, y + s);
        ctx.stroke();
        ctx.moveTo(x + s, y - s);
        ctx.lineTo(x - s, y + s);
        ctx.stroke();
    };

    graph.prototype.drawRect = function(ctx, point, s, c) {
        var x = Math.round(this.xScale(point.x));
        var y = Math.round(this.yScale(point.y));

        ctx.beginPath();
        //ctx.strokeStyle = 'rgba('+c[0]+','+c[1]+','+c[2]+',1)';
        ctx.strokeStyle = c;
        ctx.lineWidth = 1;
        ctx.strokeRect(x-s/2, y-s/2, s, s);
    };


    graph.prototype.drawPoint = function(ctx, point, r, c) {
        var x = Math.round(this.xScale(point.x));
        var y = Math.round(this.yScale(point.y));

        // NOTE; each point needs to be drawn as its own path
        // as every point needs its own stroke. you can get an insane
        // speed up if the path is closed after all the points have been drawn
        // and don't mind points not having a stroke
        ctx.beginPath();
        ctx.strokeStyle = c;
        ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.fillStyle = c;
        ctx.fill();
        ctx.stroke();
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
        this.referenceContext.clearRect(0, 0, this.width, this.height);
        this.colourToNode = {}; // Map to track the colour of nodes.
        var idColor;

        var t0 = performance.now();
        for (var i = this.data.length - 1; i >= 0; i--) {
            this.drawPoint(this.context, this.data[i], 5, 'rgba(0,0,200,255)');
            idColor = genColor();
            this.colourToNode[idColor] = i;
            this.drawPoint(this.referenceContext, this.data[i], 5, idColor);
        }
        var t1 = performance.now();
        console.log("First draw " + (t1 - t0) + " ms.");

    };

    return {
        graph: graph
    };

})();

if (typeof module !== "undefined") {
  module.exports = graphly;
}
