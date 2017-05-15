/**
 * The main graphly module.
 * @module graphly
 * @name graphly
 * @author: Daniel Santillan
 */

var itemAmount = 86000;

Array.prototype.pushArray = function() {
    var toPush = this.concat.apply([], arguments);
    for (var i = 0, len = toPush.length; i < len; ++i) {
        this.push(toPush[i]);
    }
};

function defaultFor(arg, val) { return typeof arg !== 'undefined' ? arg : val; }

function create3DContext(canvas, opt_attribs) {
    var names = ["webgl", "experimental-webgl"];
    var context = null;
    for (var ii = 0; ii < names.length; ++ii) {
        try {
            context = canvas.getContext(names[ii], opt_attribs);
        } catch(e) {}  // eslint-disable-line
        if (context) {
            break;
        }
    }
    if (!context || !context.getExtension('OES_texture_float')) {
        return null;
    }
    return context;
}

var vertexShaderSource = 
    'attribute vec3 coordinates;' +
    'attribute vec3 color;'+
    'varying vec3 vColor;'+
    'uniform vec2 u_resolution;'+
    'void main(void) {' +
        'gl_Position = vec4(coordinates.xy/u_resolution.xy, 1.0);' +
        'gl_PointSize = 10.0;'+
        'vColor = color;'+
    '}';

// Definition of fragment shader
var fragmentShaderSource = 
    'precision mediump float;\n'+
    'varying vec3 vColor;\n'+
    //'uniform vec2 u_resolution;'+
    'void main() {\n'+
        'gl_FragColor = vec4(vColor, 1.0);\n'+
    '}';



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

    function createShader(gl, shaderSource, type){
        var shader = gl.createShader(gl[type]);
        gl.shaderSource(shader, shaderSource);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new Error(gl.getShaderInfoLog(shader));
        }
        return shader;
    }

    function createAndLinkProgram(gl, vertexShader, fragmentShader){
        var program = this.program = gl.createProgram();
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);

        return program;
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
            .style('opacity', 1.0)
            //.style('display', 'none')
            .style('position', 'absolute')
            .style('z-index', 2)
            .style("transform", "translate(" + (this.margin.left + 1.0) +
              "px" + "," + (this.margin.top + 1.0) + "px" + ")");

        /*this.context = create3DContext(this.renderCanvas.node(), {preserveDrawingBuffer: true});
        var gl = this.context;
        // create the shader program

        var vertexShader = createShader(gl, vertexShaderSource, 'VERTEX_SHADER');
        var fragmentShader = createShader(gl, fragmentShaderSource, 'FRAGMENT_SHADER');

        gl.viewport(0.0, 0.0, this.renderCanvas.width, this.renderCanvas.height);

        var program = this.program = createAndLinkProgram(gl, vertexShader, fragmentShader);
        gl.useProgram(program);

        var resolutionLocation = gl.getUniformLocation(program, "u_resolution");
        gl.uniform2f(resolutionLocation, this.renderCanvas.width, this.renderCanvas.height);*/


         // Get canvas element:

        // Set parameters (these are the default values used when that option is omitted):
        var params = {
            maxLines: itemAmount*4, // used for preallocation
            maxDots: itemAmount,
            forceGL1: false, // use WebGL 1 even if WebGL 2 is available
            clearColor: {r: 0, g: 0, b: 0, a: 0}, // Color to clear screen with
            useNDC: false, // Use normalized device coordinates [0, 1] instead of pixel coordinates,
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

        // Set parameters (these are the default values used when that option is omitted):

        // Initialize BatchDrawer:
        params.contextParams = {
            antialias: false
        };
        this.batchDrawerReference = new BatchDrawer(this.referenceCanvas.node(), params);
        this.referenceContext = this.batchDrawerReference.getContext();

        /*this.referenceContext = create3DContext(this.referenceCanvas.node(), {
            preserveDrawingBuffer: true,
            antialias: false
        });

        gl = this.referenceContext;
        // create the shader program
        vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vertexShaderSource);
        gl.compileShader(vertexShader);
        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            throw new Error(gl.getShaderInfoLog(vertexShader));
        }

        fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fragmentShaderSource);
        gl.compileShader(fragmentShader);
        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            throw new Error(gl.getShaderInfoLog(fragmentShader));
        }

        var referenceProgram = this.referenceProgram = gl.createProgram();
        gl.attachShader(referenceProgram, vertexShader);
        gl.attachShader(referenceProgram, fragmentShader);
        gl.linkProgram(referenceProgram);
        gl.useProgram(this.referenceProgram);*/



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
                var p = self.data[nodeId];
                var xItem = self.xScale(p.x);
                var yItem = self.yScale(p.y);

                // Check if selection is correct or the colorId is wrong
                // because of antialiasing
                //if((Math.abs(mouseX-xItem) <10) && (Math.abs(mouseY-yItem)<10)){
                    self.svg.append('circle')
                        .attr('class', 'highlightItem')
                        .attr("r", 8)
                        .attr("cx", xItem)
                        .attr("cy", yItem)
                        .style("fill", function(d) { return 'rgba(0,0,200,1)';})
                        .style("stroke", function(d) { return 'rgba(0,0,200,1)'; });
                //}
            }
        });

        // generate random dataset
        var numberPoints = itemAmount;
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
            .range([0, this.height]);

        this.xScaleGL = d3.scale.linear()
            .domain([xExtent[0] - xRange*0.1, xExtent[1] + xRange*0.1])
            .range([-1, 1]);

        this.yScaleGL = d3.scale.linear()
            .domain([yExtent[0] - yRange*0.1, yExtent[1] + yRange*0.1])
            .range([1, -1]);

        this.svg = this.el.append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom)
            .style('position', 'absolute')
            .style('z-index', 10)
            .style('pointer-events', 'none')
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
        this.xScaleGL.domain(this.xScale.domain());
        this.yScaleGL.domain(this.yScale.domain());

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

        for (var i = this.data.length - 1; i >= 0; i--) {

            var x = (this.xScale(this.data[i].x));
            var y = (this.yScale(this.data[i].y));



            //vertices.pushArray([x,y,0.0]);

            var c = genColor();
            this.colourToNode[c.join('-')] = i;
            var nCol = c.map(function(c){return c/255;});
            idColors.pushArray(nCol);
            //colors.pushArray([0.258, 0.525, 0.956]);

            //indices.push(i);
            var w = 3;
            this.batchDrawer.addLine(x-(w/2)-w, y-w, x+(w/2)+w, y-w, w, 0.258, 0.525, 0.956, 1.0);
            this.batchDrawer.addLine(x+w, y-w, x+w, y+w, w, 0.258, 0.525, 0.956, 1.0);
            this.batchDrawer.addLine(x+(w/2)+w, y+w, x-(w/2)-w, y+w, w, 0.258, 0.525, 0.956, 1.0);
            this.batchDrawer.addLine(x-w, y+w, x-w, y-w, w, 0.258, 0.525, 0.956, 1.0);

            this.batchDrawerReference.addLine(x-(w/2)-w, y, x+(w/2)+w, y, w*4, nCol[0], nCol[1], nCol[2], 1);

            /*this.batchDrawer.addDot(x, y, 20, 0.258, 0.525, 0.956, 1);
            this.batchDrawerReference.addDot(x, y, 20, nCol[0], nCol[1], nCol[2], 1);*/
        }

        this.batchDrawer.draw();
        this.batchDrawerReference.draw();


        /*var gl = this.context;


        // Create an empty buffer object to store the vertex buffer
        var vertex_buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        // Create an empty buffer object and store Index data
        var Index_Buffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Index_Buffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

        // Create an empty buffer object and store color data
        var color_buffer = gl.createBuffer ();
        gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);



        // Bind vertex buffer object
        gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
        // Get the attribute location
        var coord = gl.getAttribLocation(this.program, "coordinates");
        // Point an attribute to the currently bound VBO
        gl.vertexAttribPointer(coord, 3, gl.FLOAT, false, 0, 0);
        // Enable the attribute
        gl.enableVertexAttribArray(coord);




        // bind the color buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
        // get the attribute location
        var color = gl.getAttribLocation(this.program, "color");
        // point attribute to the volor buffer object
        gl.vertexAttribPointer(color, 3, gl.FLOAT, false,0,0) ;
        // enable the color attribute
        gl.enableVertexAttribArray(color);


        gl.clearColor(1.0, 1.0, 1.0, 0.0);
        // Enable the depth test
        gl.enable(gl.DEPTH_TEST);
        // Clear the color buffer bit
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        // Set the view port
        gl.viewport(0,0,this.width,this.height);
        // Clear the color buffer bit
        gl.clear(gl.COLOR_BUFFER_BIT);
        // Draw the triangle
        gl.drawArrays(gl.POINTS, 0, itemAmount);*/



        /*gl = this.referenceContext;

        // Create an empty buffer object to store the vertex buffer
        vertex_buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        // Create an empty buffer object and store Index data
        Index_Buffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Index_Buffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

        // Create an empty buffer object and store color data
        color_buffer = gl.createBuffer ();
        gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(idColors), gl.STATIC_DRAW);



        // Bind vertex buffer object
        gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
        // Get the attribute location
        coord = gl.getAttribLocation(this.referenceProgram, "coordinates");
        // Point an attribute to the currently bound VBO
        gl.vertexAttribPointer(coord, 3, gl.FLOAT, false, 0, 0);
        // Enable the attribute
        gl.enableVertexAttribArray(coord);


        // bind the color buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
        // get the attribute location
        color = gl.getAttribLocation(this.referenceProgram, "color");
        // point attribute to the volor buffer object
        gl.vertexAttribPointer(color, 3, gl.FLOAT, false,0,0) ;
        // enable the color attribute
        gl.enableVertexAttribArray(color);

        gl.viewport(0,0,this.width,this.height);
        gl.clearColor(1.0, 1.0, 1.0, 1.0);
        // Clean the screen and the depth buffer
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        // Draw the triangle
        gl.drawArrays(gl.POINTS, 0, itemAmount);*/


    };

    return {
        graph: graph
    };

})();

if (typeof module !== "undefined") {
  module.exports = graphly;
}
