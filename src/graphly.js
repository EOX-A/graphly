/**
 * The main graphly module.
 * @module graphly
 * @name graphly
 * @author: Daniel Santillan
 */




function defaultFor(arg, val) { return typeof arg !== 'undefined' ? arg : val; }


var graphly = (function() {

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

        window.onresize = ()=> {
            this.resize();
        };

        this.margin = defaultFor(
            options.margin,
            {top: 10, left: 90, bottom: 50, right: 10}
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

        this.filters = {};
        this.filterManager = defaultFor(options.filterManager, false);
        if(this.filterManager){
            this.filterManager.getNode().addEventListener(
                'change',
                (evt)=>{
                    this.filters = evt.detail;
                    this.renderData();
                }
            );
        }
        var self = this;

        //plotty.addColorScale('divergent1', ['#2f3895', '#ffffff', '#a70125'], [0, 0.41, 1]);

        this.plotter = new plotty.plot({
            canvas: document.createElement('canvas'),
            domain: [0,1]
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


        // Set parameters
        var params = {
            forceGL1: false, // use WebGL 1 even if WebGL 2 is available
            clearColor: {r: 0, g: 0, b: 0, a: 0}, // Color to clear screen with
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
        this.batchDrawerReference = new BatchDrawer(
            this.referenceCanvas.node(), params
        );
        this.referenceContext = this.batchDrawerReference.getContext();

        this.svg = this.el.append('svg')
        //this.el.insert('svg',':first-child')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom)
            .style('position', 'absolute')
            .style('z-index', 0)
            .style('pointer-events', 'none')
            .append('g')
            .attr('transform', 'translate(' + (this.margin.left+1) + ',' +
                (this.margin.top+1) + ')');

        this.topSvg = this.el.append('svg')
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
            var gl = self.referenceContext;
            var pixels = new Uint8Array(4);
            gl.readPixels(
                mouseX, (this.height-mouseY),
                1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels
            ); 
            var col = [pixels[0], pixels[1], pixels[2]];
            var colKey = col.join('-');
            // Get the data from our map! 
            var nodeId = self.colourToNode[colKey];
            self.topSvg.selectAll('.highlightItem').remove();
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
                             self.topSvg.append('rect')
                                .attr('class', 'highlightItem')
                                .attr('x', nodeId.x1.coord)
                                .attr('y', nodeId.y2.coord)
                                .attr(
                                    'width', (nodeId.x2.coord - nodeId.x1.coord)
                                )
                                .attr(
                                    'height', 
                                    Math.abs(nodeId.y1.coord - nodeId.y2.coord)
                                )
                                .style('fill', 'rgba(0,0,0,0.2)')
                                .style('stroke', 'rgba(0,0,200,1');
                        }
                    }
                }

                // Check if parameter has one value for x and y (points)
                if (nodeId.hasOwnProperty('x')){
                    if(nodeId.hasOwnProperty('y')){
                        // Draw point for selection
                        self.topSvg.append('circle')
                            .attr('class', 'highlightItem')
                            .attr('r', 3)
                            .attr('cx', nodeId.x.coord)
                            .attr('cy', nodeId.y.coord)
                            .style('fill', 'rgba(0,0,0,0.2)')
                            .style('stroke', 'rgba(0,0,200,1');
                    }
                }

                tooltip.style('display', 'inline-block');
                tooltip.html(
                    document.createElement('pre').innerHTML = 
                        JSON.stringify(obj, null, 2)
                );
            }
        });

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

        // Add rectangle as 'outline' for plot
        this.svg.append('rect')
            .attr('id', 'rectangleOutline')
            .attr('width', this.width)
            .attr('height', this.height);
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
                var data = {};
                for (var i = 0; i < results.data.length; i++) {
                    var d = results.data[i];
                    for (var prop in d) {
                        if (data.hasOwnProperty(prop)){
                            data[prop].push(d[prop]);
                        }else{
                            data[prop] = [d[prop]];
                        }
                    }
                }
                self.loadData(data);
                // TODO: not sure if this is the best way to do things
                // should the data be parsed externaly?
                if(self.filterManager){
                    self.filterManager.loadData(data);
                }
            }
        });

    };

    graph.prototype.updateBuffers = function (drawer, amount){
        drawer.maxLines = amount;
        drawer.maxDots = amount;
        drawer.maxRects = amount;
        drawer._initBuffers();
    };

    graph.prototype.loadData = function (data){
        
        this.filters = {};
        this.data = data;
        // Check for longest array and set buffer size accordingly 
        var max = 0;
        for (var prop in this.data) {
          if(max < this.data[prop].length){
            max = this.data[prop].length;
          }
        }

        max = (max +400);

        // Multiply by number of y axis elements as for each one all data points
        // for the selected parameter is drawn
        max = max * this.renderSettings.yAxis.length;

        this.updateBuffers(this.batchDrawer, ++max);
        this.updateBuffers(this.batchDrawerReference, ++max);


        // Check for special formatting of data
        var ds = this.dataSettings;
        for (var key in ds) {
            if (ds[key].hasOwnProperty('scaleFormat')){
                if (ds[key].scaleFormat === 'time'){
                    var format = defaultFor(ds[key].timeFormat, 'default');

                    // Check if key is available in data first
                    if(this.data.hasOwnProperty(key)){
                        switch(format){
                            case 'default':
                            for (var i = 0; i < this.data[key].length; i++) {
                                this.data[key][i] = new Date(this.data[key][i]);
                            }
                            break;
                            case 'MJD2000_S':
                            for (var j = 0; j < this.data[key].length; j++) {
                                var d = new Date('2000-01-01');
                                d.setSeconds(d.getSeconds() + this.data[key][j]);
                                this.data[key][j] = d;
                            }
                            break;
                        }
                    }
                }
            }
        }
        this.initAxis();
        this.renderData();
    };

    graph.prototype.initAxis = function (){

        this.svg.selectAll('*').remove();

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
            // Check to see if linear colorscale or ordinal colorscale (e.g. IDs)
            if (this.dataSettings.hasOwnProperty(cAxis)){
                var ds = this.dataSettings[cAxis];
                if(
                    ds.hasOwnProperty('scaleType') && 
                    ds.scaleType === 'ordinal' &&
                    ds.hasOwnProperty('categories') ){

                    ds.colorscaleFunction = d3.scale.ordinal()
                        .range(d3.scale.category10().range().map(hexToRgb))
                        .domain(ds.categories);
                }
            }
            for (var ca = cAxis.length - 1; ca >= 0; ca--) {
                if(cAxis[ca]){
                    // Check if an extent is already configured
                    if(this.dataSettings.hasOwnProperty(cAxis[ca]) &&
                       this.dataSettings[cAxis[ca]].hasOwnProperty('extent')){
                        domain = this.dataSettings[cAxis[ca]].extent;
                    }else{
                        domain = d3.extent(
                            this.data[cAxis[ca]]
                        );
                    }
                    
                }
            }
        }

        // TODO: Allow multiple domains!
        if(domain){
            this.plotter.setDomain(domain);
        }


        var xScaleType, yScaleType;
        // TODO: how to handle multiple different scale types
        // For now just check first object of scale
        this.xTimeScale = false;
        if (this.dataSettings.hasOwnProperty(xSelection[0])){
            if (this.dataSettings[xSelection[0]].hasOwnProperty('scaleFormat')){
                if (this.dataSettings[xSelection[0]].scaleFormat === 'time'){
                    this.xTimeScale = true;
                }
            }
        }

        if(this.xTimeScale){
            xScaleType = d3.time.scale.utc();
        } else {
            xScaleType = d3.scale.linear();
        }

        // Adapt domain so that data is not directly at border
        yExtent[0] = yExtent[0] - yRange*0.03;
        yExtent[1] = yExtent[1] + yRange*0.03;
        if(this.xTimeScale){
            xRange = xExtent[1].getTime() - xExtent[0].getTime();
            xExtent[0] = new Date(xExtent[0].getTime() - xRange*0.03);
            xExtent[1] = new Date(xExtent[1].getTime() + xRange*0.03);
        }else{
            xExtent[0] = xExtent[0] - xRange*0.03;
            xExtent[1] = xExtent[1] + xRange*0.03;
        }

        this.xScale = xScaleType
            .domain([xExtent[0], xExtent[1]])
            .range([0, this.width]);

        this.yScale = d3.scale.linear()
            .domain(yExtent)
            .range([this.height, 0]);

        this.xAxis = d3.svg.axis()
            .scale(this.xScale)
            .orient('bottom')
            .ticks(Math.max(this.width/120,2))
            .tickSize(-this.height);

        this.yAxis = d3.svg.axis()
            .scale(this.yScale)
            .innerTickSize(-this.width)
            .outerTickSize(0)
            .orient('left');

        this.xAxisSvg = this.svg.append('g')
            .attr('class', 'x axis')
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

        this.createHelperObjects();

        if (this.xTimeScale){
            this.addTimeInformation();
        }

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

    graph.prototype.addTimeInformation = function() {

        var dateFormat = d3.time.format.utc('%Y-%m-%dT%H:%M:%S');

        d3.selectAll('.start-date').remove();
        d3.selectAll('.x.axis>.tick:nth-of-type(2)')
            .append('text')
            .attr('dy', '28px')
            .attr('dx', '-64px')
            .attr('class', 'start-date')
            .text(function(d){return dateFormat(d);});

        d3.selectAll('.end-date').remove();
        d3.selectAll('.x.axis>.tick:nth-last-of-type(2)')
            .append('text')
            .attr('dy', '28px')
            .attr('dx', '-64px')
            .attr('class', 'end-date')
            .text(function(d){return dateFormat(d);});

    };

    graph.prototype.previewZoom = function() {

        this.xAxisSvg.call(this.xAxis);
        this.yAxisSvg.call(this.yAxis);

        if (this.xTimeScale){
            this.addTimeInformation();
        }

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

        this.topSvg.selectAll('.highlightItem').remove();

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
                renderer.addLine(
                    prev_point[0], prev_point[1], next_point[0],
                    next_point[1], 5, 0.258, 0.525, 0.956, 1.0
                );
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

    graph.prototype.renderRegression = function(data, reg, color, thickness) {
        var result;
        var c = defaultFor(color, [0.1, 0.4, 0.9]);
        if(c.length === 3){
            c.push(1.0);
        }
        thickness = defaultFor(thickness, 1);

        // Use current xAxis in combination with yAxis selection
        var xPoints = this.xScale.domain();
        if(this.xTimeScale){
            xPoints = [
                xPoints[0].getTime(),
                xPoints[1].getTime()
            ];
        }

        switch(reg.type){
            case 'linear':
                result = regression('linear', data);
                var slope = result.equation[0];
                var yIntercept = result.equation[1];

                var yPoints = [
                    xPoints[0]*slope + yIntercept,
                    xPoints[1]*slope + yIntercept,
                ];

                xPoints = xPoints.map(this.xScale);
                yPoints = yPoints.map(this.yScale);

                this.batchDrawer.addLine(
                    xPoints[1], yPoints[1],
                    xPoints[0], yPoints[0], 1,
                    c[0], c[1], c[2], c[3]
                );
            break;
            case 'polynomial':
                var degree = defaultFor(reg.degree, 3);
                result = regression('polynomial', data, degree);
                var lineAmount = 200;
                var extent = Math.abs(xPoints[1]-xPoints[0]);
                var delta = extent/lineAmount;
                for(var l=0; l<lineAmount-1;l++){
                    var x1, x2, y1, y2;
                    x1 = xPoints[0] + l*delta;
                    x2 = xPoints[0] + (l+1)*delta;
                    y1 = 0;
                    y2 = 0;
                    var eql = result.equation.length-1;
                    for (var i = eql; i >= 0; i--) {
                        y1 = y1 + (
                            result.equation[i] *
                            Math.pow(x1, i)
                        );
                        y2 = y2 + (
                            result.equation[i] *
                            Math.pow(x2, i)
                        );
                    }
                    if(!this.xTimeScale){
                        x1 = this.xScale(x1);
                        x2 = this.xScale(x2);
                    }else{
                        x1 = this.xScale(new Date(Math.ceil(x1)));
                        x2 = this.xScale(new Date(Math.ceil(x2)));
                    }
                    y1 = this.yScale(y1);
                    y2 = this.yScale(y2);

                    this.batchDrawer.addLine(
                        x1, y1,
                        x2, y2, 1,
                        c[0], c[1], c[2], c[3]
                    );
                }
            break;
        }
    };

    graph.prototype.createRegression = function(data, xScaleItem, yScaleItem, inactive) {

        var xAxRen = this.renderSettings.xAxis;
        var yAxRen = this.renderSettings.yAxis;
        var resultData;
        inactive = defaultFor(inactive, false);
        var reg = {
            type: this.dataSettings[yAxRen[yScaleItem]].regression,
            degree: this.dataSettings[yAxRen[yScaleItem]].regressionDegree
        };

        //Check if data has identifier creating multiple datasets
        if (this.renderSettings.hasOwnProperty('dataIdentifier')){

            for (var i = 0; i < this.renderSettings.dataIdentifier.identifiers.length; i++) {

                var id = this.renderSettings.dataIdentifier.identifiers[i];
                var parId = this.renderSettings.dataIdentifier.parameter;

                var filterFunc = function (d,i){
                    return data[parId][i] === id;
                };

                var filteredX = data[xAxRen[xScaleItem]].filter(filterFunc.bind(this));
                var filteredY = data[yAxRen[yScaleItem]].filter(filterFunc.bind(this));

                if(this.xTimeScale){

                    resultData = filteredX.map(function(d){return d.getTime();})
                        .zip(filteredY);
                }else{
                    data = filteredX.zip(filteredY);
                }

                var rC = this.getIdColor(xScaleItem, id);

                if(!inactive){
                    this.renderRegression(resultData, reg, rC);
                }else{
                    this.renderRegression(resultData, reg, [0.2,0.2,0.2,0.4]);
                }
            }
            
        }else{
            // TODO: Check for size mismatch?
            if(this.xTimeScale){
                resultData = data[xAxRen[xScaleItem]]
                    .map(function(d){return d.getTime();})
                    .zip(
                        data[yAxRen[yScaleItem]]
                    );
            }else{
                resultData = data[xAxRen[xScaleItem]].zip(
                    data[yAxRen[yScaleItem]]
                );
            }
            if(!inactive){
                this.renderRegression(resultData, reg);
            }else{
                this.renderRegression(resultData, reg, [0.2,0.2,0.2,0.4]);
            }
        }
    };

    graph.prototype.getIdColor = function(param, id) {
        var rC;
        var colorParam = this.renderSettings.colorAxis[param];
        cA = this.dataSettings[colorParam];

        if (cA && cA.hasOwnProperty('colorscaleFunction')){
            rC = cA.colorscaleFunction(id);
            rC = rC.map(function(c){return c/255;});
        }else{
            rC = [0.258, 0.525, 0.956];
        }
        return rC;
    };

    graph.prototype.getColor = function(param, index, data) {
        var rC;
        var colorParam = this.renderSettings.colorAxis[param];
        cA = this.dataSettings[colorParam];

        if (cA && cA.hasOwnProperty('colorscaleFunction')){
            rC = cA.colorscaleFunction(
                data[colorParam][index]
            );
            rC = rC.map(function(c){return c/255;});
        }else{
            // Check if color has been defined for specific parameter
            if(this.dataSettings[this.renderSettings.yAxis[param]].hasOwnProperty('color')){
                rC = this.dataSettings[this.renderSettings.yAxis[param]].color;
            }else{ 
                rC = [0.258, 0.525, 0.956];
            }
        }
        return rC;
    };

    graph.prototype.resize = function (){
        // TODO: NOT working correctly more or less a placeholder here
        this.dim = this.el.node().getBoundingClientRect();
        this.width = this.dim.width - this.margin.left - this.margin.right;
        this.height = this.dim.height - this.margin.top - this.margin.bottom;
        this.initAxis();
        this.renderData();
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
        resetColor();
        var p_x, p_y;

        var xAxRen = this.renderSettings.xAxis;
        var yAxRen = this.renderSettings.yAxis;

        var c, nCol, par_properties, cA;

        var data = {};
        var inactiveData = {};


        for(var p in this.data){
            if( Object.keys(this.filters).length > 0 ){
                inactiveData[p] = this.data[p];
            }else{
                inactiveData[p] = [];
            }
            data[p] = this.data[p];
        }

        for (var f in this.filters){
            var filter = this.filters[f];
            var currentDataset = data[f];

            for (var p in data){

                var applicableFilter = true;

                if(this.filterManager.filterSettings.hasOwnProperty('filterRelation')){
                    applicableFilter = false;
                    var filterRel = this.filterManager.filterSettings.filterRelation;
                    for (var i = 0; i < filterRel.length; i++) {
                        if( (filterRel[i].indexOf(p)!==-1) === (filterRel[i].indexOf(f)!==-1)){
                            applicableFilter = true;
                            break;
                        }
                    }
                }
                
                if(applicableFilter){
                    data[p] = data[p].filter((e,i)=>{
                        return filter(currentDataset[i]);
                    });
                    inactiveData[p] = inactiveData[p].filter((e,i)=>{
                        return !filter(currentDataset[i]);
                    });
                }else{
                    inactiveData[p] = [];
                }
                
            }
        }

        for (var xScaleItem=0; xScaleItem<xAxRen.length; xScaleItem++){
            for (var yScaleItem=0; yScaleItem<yAxRen.length; yScaleItem++){

                // If an array is provided as element we need to render either
                // a line or a rectangle as we have two parameters per item
                if(xAxRen[xScaleItem].constructor === Array){
                    // If also the yAxis item is an array we render a rectangle
                    if(yAxRen[yScaleItem].constructor === Array){

                        // TODO: How to decide which item to take for counting
                        // should we compare changes and look for errors in config?
                        var l = data[xAxRen[xScaleItem][0]].length;
                        for (var i=0; i<=l; i++) {
                            var x1 = (this.xScale(
                                data[xAxRen[xScaleItem][0]][i])
                            );
                            var x2 = (this.xScale(
                                data[xAxRen[xScaleItem][1]][i])
                            );
                            var y1 = (this.yScale(
                                data[yAxRen[yScaleItem][0]][i])
                            );
                            var y2 = (this.yScale(
                                data[yAxRen[yScaleItem][1]][i])
                            );

                            var idC = genColor();

                            par_properties = {
                                x1: {
                                    val: data[xAxRen[xScaleItem][0]][i], 
                                    coord: x1, id: xAxRen[xScaleItem][0]
                                },
                                x2: {val: data[xAxRen[xScaleItem][1]][i], 
                                    coord: x2, id: xAxRen[xScaleItem][1]
                                },
                                y1: {val: data[yAxRen[yScaleItem][0]][i], 
                                    coord: y1, id: yAxRen[yScaleItem][0]
                                },
                                y2: {val: data[yAxRen[yScaleItem][1]][i], 
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
                                cA = this.dataSettings[
                                    this.renderSettings.colorAxis[xScaleItem]
                                ];
                                if (cA && cA.hasOwnProperty('colorscale')){
                                    cs = cA.colorscale;
                                }
                                if(cs !== this.plotter.name){
                                    this.plotter.setColorScale(cs);
                                }
                                c = this.plotter.getColor(
                                    data[this.renderSettings.colorAxis[xScaleItem]][i],
                                    data
                                ).map(function(c){return c/255;});

                                par_properties.col = {
                                    id: this.renderSettings.colorAxis[xScaleItem],
                                    val: data[this.renderSettings.colorAxis[xScaleItem]][i]
                                };

                            } else {
                                // If no color axis defined check for color 
                                // defined in data settings
                                // TODO: check for datasettings for yAxis parameter
                                // TODO: auto generate identifier color if nothing is defined
                                cA = this.dataSettings[
                                    this.renderSettings.colorAxis[xScaleItem]
                                ];
                                if (cA && cA.hasOwnProperty('colorscaleFunction')){
                                    c = cA.colorscaleFunction(
                                        data[this.renderSettings.colorAxis[xScaleItem]][i]
                                    );
                                    c.map(function(c){return c/255;});
                                }else{
                                    c = [0.1, 0.4,0.9, 1.0];
                                }
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
                        // Draw normal 'points' for x,y coordinates using defined symbol
                        var lp = data[xAxRen[xScaleItem]].length;
                        for (var j=0;j<=lp; j++) {
                            var x = (this.xScale(data[xAxRen[xScaleItem]][j]));
                            var y = (this.yScale(data[yAxRen[yScaleItem]][j]));
                            var rC = this.getColor(yScaleItem, j, data);

                            c = genColor();

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

                                    // Check if using ordinal scale (multiple
                                    // parameters), do not connect if different

                                    if(cA && cA.hasOwnProperty('scaleType') && 
                                        cA.scaleType === 'ordinal'){

                                        if(data[colorParam][j-1] === 
                                            data[colorParam][j])
                                        {
                                            this.batchDrawer.addLine(
                                                p_x, p_y, x, y, 1, 
                                                rC[0], rC[1], rC[2], 0.8
                                            );
                                        }
                                    }else{
                                        this.batchDrawer.addLine(
                                            p_x, p_y, x, y, 1, 
                                            rC[0], rC[1], rC[2], 0.8
                                        );
                                    }
                                }

                                if(parSett.hasOwnProperty('symbol')){
                                    if(parSett.symbol === 'dot'){
                                        this.batchDrawer.addDot(
                                            x, y, 6, rC[0], rC[1], rC[2], rC[3]
                                        );
                                        this.batchDrawerReference.addDot(
                                            x, y, 6, nCol[0], nCol[1], nCol[2], -1.0
                                        );
                                    }
                                }
                            }

                            this.colourToNode[c.join('-')] = par_properties;

                            p_x = x;
                            p_y = y;
                        }

                        // Draw filtered out 'points' for x,y 
                        var lp = inactiveData[xAxRen[xScaleItem]].length;
                        for (var j=0;j<=lp; j++) {
                            var x = (this.xScale(inactiveData[xAxRen[xScaleItem]][j]));
                            var y = (this.yScale(inactiveData[yAxRen[yScaleItem]][j]));
                            var rC = [0.3,0.3,0.3];

                            c = genColor();

                            par_properties = {
                                x: {
                                    val: x, id: xAxRen[xScaleItem], coord: x
                                },
                                y: {
                                    val: y, id: yAxRen[yScaleItem], coord: y
                                },
                            };

                            nCol = c.map(function(c){return c/255;});
                            parSett = this.dataSettings[yAxRen[yScaleItem]];

                            if (parSett){

                                if(parSett.hasOwnProperty('symbol')){
                                    if(parSett.symbol === 'dot'){
                                        this.batchDrawer.addDot(
                                            x, y, 6, rC[0], rC[1], rC[2], 0.1
                                        );
                                        this.batchDrawerReference.addDot(
                                            x, y, 6, nCol[0], nCol[1], nCol[2], -1.0
                                        );
                                    }
                                }
                            }

                            this.colourToNode[c.join('-')] = par_properties;
                        }

                        // Check if any regression type is selected for parameter
                        if(this.dataSettings[yAxRen[yScaleItem]].hasOwnProperty('regression')){
                            this.createRegression(data, xScaleItem, yScaleItem);
                        }
                        if(inactiveData[yAxRen[yScaleItem]].length>0){
                            this.createRegression(this.data, xScaleItem, yScaleItem, true);
                        }
                    }

                }
            }
        }


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
