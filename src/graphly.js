/**
 * The main graphly module.
 * @module graphly
 * @name graphly
 * @author: Daniel Santillan
 */



var itemAmount = 20000;

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

        // Passed options
        this.el = d3.select(options.el);
        this.margin = defaultFor(
            options.margin,
            {top: 10, left: 90, bottom: 30, right: 10}
        );

        // TOOO: How could some defaults be guessed for rendering?
        this.dataSettings = defaultFor(options.dataSettings, {});
        this.renderSettings = defaultFor(options.renderSettings, {});

        this.debounceActive = true;
        this.dim = this.el.node().getBoundingClientRect();
        this.width = this.dim.width - this.margin.left - this.margin.right;
        this.height = this.dim.height - this.margin.top - this.margin.bottom;
        this.currentScale = 1;
        this.currentTranlate = [0,0];
        this.colourToNode = {}; // Map to track the colour of nodes.
        this.previewActive = false;
        var self = this;

        //plotty.addColorScale('divergent1', ['#2f3895', '#ffffff', '#a70125'], [0, 0.41, 1]);

        this.plotter = new plotty.plot({
            canvas: document.createElement('canvas'),
            domain: [0,1]/*,
            colorScale: 'divergent1'*/
        });

        


        // move tooltip
        var tooltip = this.el.append('pre')
            .attr('id', 'tooltip')
            .style('position', 'absolute')
            .style('background-color', 'white')
            .style('display', 'none')
            .style('z-index', 10);

        window.onmousemove = function (e) {
            var x = e.clientX,
                y = e.clientY;
            tooltip.style('top', (y + 20) + 'px');
            tooltip.style('left', (x + 20) + 'px');
        };


        this.renderCanvas = this.el.append('canvas')
            .attr('width', this.width - 1)
            .attr('height', this.height - 1)
            .style('opacity', 1.0)
            //.style('background-color', 'yellow')
            //.style('display', 'none')
            .style('position', 'absolute')
            .style('z-index', 2)
            .style('transform', 'translate(' + (this.margin.left + 1.0) +
              'px' + ',' + (this.margin.top + 1.0) + 'px' + ')');


        // Set parameters (these are the default values used when that option is omitted):
        var params = {
            maxLines: itemAmount, // used for preallocation
            maxDots: itemAmount,
            maxRects: itemAmount,
            forceGL1: false, // use WebGL 1 even if WebGL 2 is available
            clearColor: {r: 0, g: 0, b: 0, a: 0}, // Color to clear screen with
            //useNDC: false, // Use normalized device coordinates [0, 1] instead of pixel coordinates,
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
            .style('transform', 'translate(' + (this.margin.left + 1) +
              'px' + ',' + (this.margin.top + 1) + 'px' + ')');


        // Initialize BatchDrawer:
        params.contextParams = {
            antialias: false
        };
        this.batchDrawerReference = new BatchDrawer(this.referenceCanvas.node(), params);
        this.referenceContext = this.batchDrawerReference.getContext();

        this.svg = this.el.append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom)
            .style('position', 'absolute')
            .style('z-index', 10)
            .style('pointer-events', 'none')
            .append('g')
            .attr('transform', 'translate(' + (this.margin.left+1) + ',' +
                (this.margin.top+1) + ')');

        this.createHelperObjects();


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
            tooltip.style('display', 'none');

            if(nodeId){

                var obj = {};

                for (var key in nodeId) {
                    obj[nodeId[key].id] = nodeId[key].val;
                }

                // Check if parameter has multi values for x and y
                if (nodeId.hasOwnProperty('x1')){
                    if(nodeId.hasOwnProperty('y1')){
                        // Draw rectangle for selection
                        // make sure all coords are available
                        if(nodeId.hasOwnProperty('x2') && 
                           nodeId.hasOwnProperty('y2')) {
                            //Draw the Rectangle
                             self.svg.append("rect")
                                .attr('class', 'highlightItem')
                                .attr("x", nodeId.x1.coord)
                                .attr("y", nodeId.y2.coord)
                                .attr("width", (nodeId.x2.coord - nodeId.x1.coord))
                                .attr("height", Math.abs(nodeId.y1.coord - nodeId.y2.coord))
                                .style('fill', 'rgba(0,0,0,0.2)')
                                .style('stroke', 'rgba(0,0,200,1');
                        }
                    }
                }

                // Check if parameter has one value for x and y (points)
                if (nodeId.hasOwnProperty('x')){
                    if(nodeId.hasOwnProperty('y')){
                        // Draw point for selection
                        self.svg.append('circle')
                            .attr('class', 'highlightItem')
                            .attr('r', 5)
                            .attr('cx', nodeId.x.coord)
                            .attr('cy', nodeId.y.coord)
                            .style('fill', 'rgba(0,0,0,0.2)')
                            .style('stroke', 'rgba(0,0,200,1');
                    }
                }

                tooltip.style('display', 'inline-block');
                tooltip.html(document.createElement('pre').innerHTML = JSON.stringify(obj, null, 2));
                
 
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


    };


    graph.prototype.createHelperObjects = function (){

        this.renderingContainer = this.svg.append('g')
            .attr('id','renderingContainer')
            .style('clip-path','url(#clip)');

        // Add clip path so only points in the area are shown
        var clippath = this.svg.append('defs').append('clipPath')
            .attr('id', 'clip')
            .append('rect')
                .attr('width', this.width)
                .attr('height', this.height);


        this.svg.append('rect')
            .attr('id', 'zoomXBox')
            .attr('width', this.width)
            .attr('height', this.margin.bottom)
            .attr('fill', 'blue')
            .attr('transform', 'translate(' + 0 + ',' + (this.height) + ')')
            .style('visibility', 'hidden')
            .attr('pointer-events', 'all');

        this.svg.append('rect')
            .attr('id', 'zoomYBox')
            .attr('width', this.margin.left)
            .attr('height', this.height )
            .attr('transform', 'translate(' + -this.margin.left + ',' + 0 + ')')
            .attr('fill', 'red')
            .style('visibility', 'hidden')
            .attr('pointer-events', 'all');
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

    graph.prototype.loadData = function (data){
        this.data = data;
        this.initAxis();
        this.renderData();
    };

    graph.prototype.initAxis = function (){

        this.svg.selectAll("*").remove();
        this.createHelperObjects();


        var xExtent, yExtent;

        var xSelection = [].concat.apply([], this.renderSettings.xAxis);
        var ySelection = [].concat.apply([], this.renderSettings.yAxis);

        for (var i = xSelection.length - 1; i >= 0; i--) {
            var xExt = d3.extent(this.data[xSelection[i]]);
            if(xExtent){
                if(xExt[0]<xExtent){
                    xExtent[0] = xExt[0];
                }
                if(xExt[1]>xExtent[1]){
                    xExtent[1] = xExt[1];
                }
            }else{
                xExtent = xExt;
            } 

        }

        for (var j = ySelection.length - 1; j >= 0; j--) {
            var yExt = d3.extent(this.data[ySelection[j]]);
            if(yExtent){
                if(yExt[0]<yExtent[0]){
                    yExtent[0] = yExt[0];
                }
                if(yExt[1]>yExtent[1]){
                    yExtent[1] = yExt[1];
                }
            }else{
                yExtent = yExt;
            } 
        }

        var xRange = xExtent[1] - xExtent[0];
        var yRange = yExtent[1] - yExtent[0];

        var domain;
        if(this.renderSettings.hasOwnProperty('colorAxis')){
            var cAxis = this.renderSettings.colorAxis;
            for (var ca = cAxis.length - 1; ca >= 0; ca--) {
                if(cAxis[ca]){
                    domain = d3.extent(
                        this.data[cAxis[ca]]
                    );
                }
            }
        }

        // TODO: Allow multiple domains!
        this.plotter.setDomain(domain);

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


        // Define zoom behaviour based on parameter dependend x and y scales
        this.xyzoom = d3.behavior.zoom()
          .x(this.xScale)
          .y(this.yScale)
          .on('zoom', this.previewZoom.bind(this));

        this.xzoom = d3.behavior.zoom()
          .x(this.xScale)
          .on('zoom', this.previewZoom.bind(this));

        this.yzoom = d3.behavior.zoom()
          .y(this.yScale)
          .on('zoom', this.previewZoom.bind(this));

        // Limit zoom step to 10% of scale size to make sure zoom kumps are not
        // to big. Solves issue on big zoom jumps in Firefox (FF)
        /*this.xyzoom.scaleExtent([
            this.xyzoom.scale()*0.9,
            this.xyzoom.scale()*1.1
        ]);*/

        this.renderCanvas.call(this.xyzoom);
        d3.select('#zoomXBox').call(this.xzoom);
        d3.select('#zoomYBox').call(this.yzoom);

    };

    graph.prototype.zoom_update = function() {
        this.xyzoom = d3.behavior.zoom()
            .x(this.xScale)
            .y(this.yScale)
            .on('zoom', this.previewZoom.bind(this));
        this.xzoom = d3.behavior.zoom()
            .x(this.xScale)
            .on('zoom', this.previewZoom.bind(this));
        this.yzoom = d3.behavior.zoom()
            .y(this.yScale)
            .on('zoom', this.previewZoom.bind(this));

        this.renderCanvas.call(this.xyzoom);
        d3.select('#zoomXBox').call(this.xzoom);
        d3.select('#zoomYBox').call(this.yzoom);
    };

    graph.prototype.onZoom = function() {
        this.renderData();
        this.zoom_update();
    };

    var debounceZoom = debounce(function() {
        this.onZoom();
    }, 250);

    graph.prototype.previewZoom = function() {

        this.xAxisSvg.call(this.xAxis);
        this.yAxisSvg.call(this.yAxis);

        // Limit zoom step to 10% of scale size to make sure zoom kumps are not
        // to big. Solves issue on big zoom jumps in Firefox (FF)
        /*this.xyzoom.scaleExtent([
            this.xyzoom.scale()*0.9,
            this.xyzoom.scale()*1.1
        ]);*/

        var xScale = this.xzoom.scale();
        var yScale = this.yzoom.scale();
        var xyScale = this.xyzoom.scale();

        var transXY = this.xyzoom.translate();
        var transX = this.xzoom.translate();
        var transY = this.yzoom.translate();

        this.svg.selectAll('.highlightItem').remove();

        if(this.debounceActive){

            debounceZoom.bind(this)();

            if(!this.previewActive){
                this.renderCanvas.style('opacity','0');
                this.oSc = this.currentScale;
                this.oTr = this.currentTranlate;
                this.oT = [
                    d3.event.translate[0]/d3.event.scale,
                    d3.event.translate[1]/d3.event.scale,
                ];
                this.previewActive = true;
                this.svg.select('#previewImage').style('display', 'block');
            }


            if(xyScale!==1.0){
                this.svg.select('#previewImage').attr('transform', 'translate(' + 
                transXY + ')scale(' + xyScale + ')');
            }else if(xScale !== 1.0){
                this.svg.select('#previewImage').attr('transform', 'translate(' + 
                [transX[0], 0.0] + ')scale(' + [xScale, 1.0] + ')');
            }else if(yScale !== 1.0){
                this.svg.select('#previewImage').attr('transform', 'translate(' + 
                [0.0, transY[1.0]] + ')scale(' + [1.0, yScale] + ')');
            }else if(transXY[0]!==0.0 || transXY[1] !==0.0){
                this.svg.select('#previewImage').attr('transform', 'translate(' + 
                transXY + ')scale(1)');
            }else if(transX[0]!==0.0 || transX[1] !==0.0){
                this.svg.select('#previewImage').attr('transform', 'translate(' + 
                [transX[0], 0.0] + ')scale(1)');
            }else if(transY[0]!==0.0 || transY[1] !==0.0){
                this.svg.select('#previewImage').attr('transform', 'translate(' + 
                [0.0, transY[1.0]] + ')scale(1)');
            }

        }else{
            this.onZoom();
        }


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
        var p_x, p_y;

        //var l =  this.data.mie_wind_velocity.length - 1;
        /*for (var i=0; i<=l; i++) {

            var x = (this.xScale(this.data[i][c_x]));
            var y = (this.yScale(this.data[i][c_y]));

            var c = genColor();
            this.colourToNode[c.join('-')] = i;
            var nCol = c.map(function(c){return c/255;});
            idColors.pushArray(nCol);

            if(i>0){
                this.batchDrawer.addLine(p_x, p_y, x, y, 1, 0.258, 0.525, 0.956, 1.0);
            }

            this.batchDrawer.addDot(x, y, 10, 0.258, 0.525, 0.956,0.2);
            this.batchDrawerReference.addDot(x, y, 10, nCol[0], nCol[1], nCol[2], -1.0);

            p_x = x;
            p_y = y;
        }*/
        var xAxRen = this.renderSettings.xAxis;
        var yAxRen = this.renderSettings.yAxis;

        var c, nCol, par_properties;

        for (var xScaleItem=0; xScaleItem<xAxRen.length; xScaleItem++){
            for (var yScaleItem=0; yScaleItem<yAxRen.length; yScaleItem++){

                // If an array is provided as element we need to render either
                // a line or a rectangle as we have two parameters per item
                if(xAxRen[xScaleItem].constructor === Array){
                    // If also the yAxis item is an array we render a rectangle
                    if(yAxRen[yScaleItem].constructor === Array){

                        // TODO: How to decide which item to take for counting
                        // should we compare changes and look for errors in config?
                        var l = this.data[xAxRen[xScaleItem][0]].length;
                        for (var i=0; i<=l; i++) {

                            var x1 = (this.xScale(
                                this.data[xAxRen[xScaleItem][0]][i])
                            );
                            var x2 = (this.xScale(
                                this.data[xAxRen[xScaleItem][1]][i])
                            );
                            var y1 = (this.yScale(
                                this.data[yAxRen[yScaleItem][0]][i])
                            );
                            var y2 = (this.yScale(
                                this.data[yAxRen[yScaleItem][1]][i])
                            );

                            var idC = genColor();

                            //this.colourToNode[idC.join('-')] = i;
                            par_properties = {
                                x1: {
                                    val: this.data[xAxRen[xScaleItem][0]][i], 
                                    coord: x1, id: xAxRen[xScaleItem][0]
                                },
                                x2: {val: this.data[xAxRen[xScaleItem][1]][i], 
                                    coord: x2, id: xAxRen[xScaleItem][1]
                                },
                                y1: {val: this.data[yAxRen[yScaleItem][0]][i], 
                                    coord: y1, id: yAxRen[yScaleItem][0]
                                },
                                y2: {val: this.data[yAxRen[yScaleItem][1]][i], 
                                    coord: y2, id: yAxRen[yScaleItem][1]
                                },
                            };

                            nCol = idC.map(function(c){return c/255;});
                            //idColors.pushArray(nCol);

                            // Check if color axis is being used
                            // TODO: make sure multiple color scales can be used
                            if(this.renderSettings.colorAxis[xScaleItem]){
                                // Check if a colorscale is defined for this 
                                // attribute, if not use default (plasma)
                                var cs = 'viridis';
                                var cA = this.dataSettings[
                                    this.renderSettings.colorAxis[xScaleItem]
                                ];
                                if (cA && cA.hasOwnProperty('colorscale')){
                                    cs = cA.colorscale;
                                }
                                if(cs !== this.plotter.name){
                                    this.plotter.setColorScale(cs);
                                }
                                c = this.plotter.getColor(
                                    this.data[this.renderSettings.colorAxis[xScaleItem]][i]
                                ).map(function(c){return c/255;});

                                par_properties.col = {
                                    id: this.renderSettings.colorAxis[xScaleItem],
                                    val: this.data[this.renderSettings.colorAxis[xScaleItem]][i]
                                };

                            } else {
                                // If no color axis defined check for color 
                                // defined in data settings
                                // TODO: check for datasettings for yAxis parameter
                                // TODO: auto generate identifier color if nothing is defined
                                c = [0.1, 0.4,0.9, 1.0];
                            }
                            
                            this.colourToNode[idC.join('-')] = par_properties;

                            this.batchDrawer.addRect(x1,y1,x2,y2, c[0], c[1], c[2], 1.0);
                            this.batchDrawerReference.addRect(x1,y1,x2,y2, nCol[0], nCol[1], nCol[2], 1.0);


                        }
                    } else {
                        // TODO: Render a line
                    }
                } else {
                    // xAxis has only one element
                    // Check if yAxis has two elements
                    if(yAxRen[yScaleItem].constructor === Array){
                        // If yAxis has two elements draw lines in yAxis direction
                        // TODO: drawing of lines
                    } else {
                        // Draw normal "points" for x,y coordinates using defined symbol
                        var lp = this.data[xAxRen[xScaleItem]].length;
                        for (var j=0;j<=lp; j++) {
                            var x = (this.xScale(this.data[xAxRen[xScaleItem]][j]));
                            var y = (this.yScale(this.data[yAxRen[yScaleItem]][j]));

                            c = genColor();
                            //this.colourToNode[c.join('-')] = j;

                            par_properties = {
                                x: {
                                    val: x, id: xAxRen[xScaleItem], coord: x
                                },
                                y: {
                                    val: y, id: yAxRen[yScaleItem], coord: y
                                },
                            };

                            nCol = c.map(function(c){return c/255;});
                            var parSett = this.dataSettings[yAxRen[yScaleItem]];

                            if (parSett){

                                 if(parSett.hasOwnProperty('lineConnect') &&
                                    parSett.lineConnect && j>0){

                                    this.batchDrawer.addLine(
                                        p_x, p_y, x, y, 1, 0.258, 0.525, 0.956, 1.0
                                    );
                                }

                                if(parSett.hasOwnProperty('symbol')){
                                    if(parSett.symbol === 'dot'){
                                        this.batchDrawer.addDot(
                                            x, y, 10, 0.258, 0.525, 0.956,0.2
                                        );
                                        this.batchDrawerReference.addDot(
                                            x, y, 10, nCol[0], nCol[1], nCol[2], -1.0
                                        );
                                    }
                                }
                            }

                            this.colourToNode[c.join('-')] = par_properties;

                            p_x = x;
                            p_y = y;
                        }
                    }
                }
            }
        }


        /*for (var i=0; i<=l; i++) {

            var x = (this.xScale(this.data.mie_datetime_start[i]));
            var y = (this.yScale(this.data.mie_dem_altitude[i]));

            var x1 = (this.xScale(this.data.mie_datetime_start[i]));
            var y1 = (this.yScale(this.data.mie_altitude_bottom[i]));
            var x2 = (this.xScale(this.data.mie_datetime_stop[i]));
            var y2 = (this.yScale(this.data.mie_altitude_top[i]));

            var idC = genColor();
            this.colourToNode[idC.join('-')] = i;
            var nCol = idC.map(function(c){return c/255;});
            idColors.pushArray(nCol);

            var c = this.plotter.getColor(this.data.mie_wind_velocity[i]).map(function(c){return c/255;});

            this.batchDrawer.addRect(x1,y1,x2,y2, c[0], c[1], c[2], 1.0);
            this.batchDrawerReference.addRect(x1,y1,x2,y2, nCol[0], nCol[1], nCol[2], 1.0);

            if(i>0){
                this.batchDrawer.addLine(p_x, p_y, x, y, 1, 0.258, 0.525, 0.956, 1.0);
            }

            p_x = x;
            p_y = y;
        }*/

        this.batchDrawer.draw();
        this.batchDrawerReference.draw();

        

        if(this.debounceActive){
            this.renderCanvas.style('opacity','1');
            var prevImg = this.el.select('#previewImage');
            var img = this.renderCanvas.node().toDataURL();
            if(!prevImg.empty()){
                prevImg.attr('xlink:href', img)
                    .attr('transform', null)
                    .style('display', 'none');
            } else {
                this.renderingContainer.append('svg:image')
                    .attr('id', 'previewImage')
                    .attr('xlink:href', img)
                    .attr('x', 0)
                    .attr('y', 0)
                    .attr('width',  this.width)
                    .attr('height', this.height)
                    .style('display', 'none');
            }
            this.previewActive = false;
        }

    };

    return {
        graph: graph
    };

})();

if (typeof module !== 'undefined') {
  module.exports = graphly;
}
