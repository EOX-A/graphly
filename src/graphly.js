/*jshint esversion: 6 */

/**
 * The main graphly module.
 * @module graphly
 * @name graphly
 * @author: Daniel Santillan
 */


import 'babel-polyfill';

let dotType = {
    rectangle: 0.0,
    rectangle_empty: 1.0,
    circle: 2.0,
    circle_empty: 3.0,
    plus: 4.0,
    x: 5.0,
    triangle: 6.0,
    triangle_empty: 7.0,
    //circle: 7.0,
};

//graphly.TYPE[settingvariable]

let DOTTYPE = 4.0;
let DOTSIZE = 9;

require('../styles/graphly.css');
require('../node_modules/choices.js/assets/styles/css/choices.css');
require('../node_modules/c-p/color-picker.css');

//import from './colorscales';
import * as u from './utils';

let regression = require('regression');
let d3 = require('d3');
//global.d3 = d3;
let msgpack = require('msgpack-lite');
global.msgpack = msgpack;
let plotty = require('plotty');
let Papa = require('papaparse');

require('c-p');


//require('msgpack-lite');

//require('./utils.js');
let BatchDrawer = require('./BatchDraw.js');
let Choices = require('choices.js');
let FilterManager = require('./FilterManager.js');
global.FilterManager = FilterManager;



function defaultFor(arg, val) { return typeof arg !== 'undefined' ? arg : val; }

function debounce(func, wait, immediate) {
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
}


class graphly {

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
    constructor(options) {

        // Passed options
        this.el = d3.select(options.el);

        window.onresize = ()=> {
            if(!this.fixedSize){
                this.resize();
            }
        };

        this.margin = defaultFor(
            options.margin,
            {top: 10, left: 90, bottom: 50, right: 10}
        );

        // TOOO: How could some defaults be guessed for rendering?
        this.dataSettings = defaultFor(options.dataSettings, {});
        this.renderSettings = defaultFor(options.renderSettings, {});

        // Go through rendersettings and provide default colors if not defined
        let rKeys = Object.keys(this.dataSettings);
        let cGen = d3.scale.category10();
        if(rKeys.length > 10){
            cGen = d3.scale.category20();
        }

        for (var i = 0; i < rKeys.length; i++) {
            let k = rKeys[i];
            if(!this.dataSettings[k].hasOwnProperty('color') || 
                typeof this.dataSettings[k].color === 'undefined'){
                let col = cGen(i);
                col = CP.HEX2RGB(col);
                col = col.map(function(c){return c/255;});
                col.push(0.8);
                this.dataSettings[k].color = col;
            }
        }

        this.renderSettings.combinedParameters = defaultFor(
            this.renderSettings.combinedParameters, {}
        );

        this.debounceActive = true;
        this.dim = this.el.node().getBoundingClientRect();
        this.width = this.dim.width - this.margin.left - this.margin.right;
        this.height = this.dim.height - this.margin.top - this.margin.bottom;
        this.currentScale = 1;
        this.currentTranlate = [0,0];
        this.colourToNode = {}; // Map to track the colour of nodes.
        this.previewActive = false;
        this.fixedSize = defaultFor(options.fixedSize, false);
        if(this.fixedSize){
            this.width = defaultFor(options.fixedWidth, 1000);
            this.height = defaultFor(options.fixedHeight, 500);
        }
        this.filters = {};
        this.filterManager = defaultFor(options.filterManager, false);

        if(this.filterManager){
            this.filterManager.getNode().addEventListener(
                'change',
                (evt)=>{
                    // Check if event comes directly from el with filters id
                    if(evt.target.id === 'filters'){
                        this.filters = evt.detail;
                        this.renderData();
                    }
                }
            );
        }

        this.debounceZoom = debounce(function(){
            this.onZoom();
        }, 350);

       this.debounceResize = debounce(function(){
            this.onResize();
        }, 500);

        let self = this;

        //plotty.addColorScale('divergent1', ['#2f3895', '#ffffff', '#a70125'], [0, 0.41, 1]);

        this.plotter = new plotty.plot({
            canvas: document.createElement('canvas'),
            domain: [0,1]
        });


        // move tooltip
        let tooltip = this.el.append('pre')
            .attr('id', 'tooltip')
            .style('position', 'absolute')
            .style('background-color', 'white')
            .style('display', 'none')
            .style('z-index', 10);

        window.onmousemove = function (e) {
            let x = e.clientX,
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
        let params = {
            forceGL1: false, // use WebGL 1 even if WebGL 2 is available
            clearColor: {r: 0, g: 0, b: 0, a: 0}, // Color to clear screen with
            coordinateSystem: 'pixels',
            contextParams: {
                preserveDrawingBuffer: true
            }
        };

        // Initialize BatchDrawer:
        this.batchDrawer = new BatchDrawer(this.renderCanvas.node(), params);


        if(!this.fixedSize){
            this.referenceCanvas = this.el.append('canvas')
                .classed('hiddenCanvas', true) 
                .attr('width', this.width - 1)
                .attr('height', this.height - 1)
                .style('position', 'absolute')
                .style('display', 'none')
                .style('transform', 'translate(' + (this.margin.left + 1) +
                  'px' + ',' + (this.margin.top + 1) + 'px' + ')');

            // Initialize BatchDrawer:
            params.contextParams.antialias = false;

            this.batchDrawerReference = new BatchDrawer(
                this.referenceCanvas.node(), params
            );
            this.referenceContext = this.batchDrawerReference.getContext();
        }

        this.svg = this.el.append('svg')
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


        if(!this.fixedSize){
            this.renderCanvas.on('mousemove', function() {

                // Clean anything inside top svg
                self.topSvg.selectAll('*').remove();
                // Get mouse positions from the main canvas.
                let mouseX = d3.event.offsetX; 
                let mouseY = d3.event.offsetY;
                // Pick the colour from the mouse position. 
                let gl = self.referenceContext;
                let pixels = new Uint8Array(4);
                gl.readPixels(
                    mouseX, (this.height-mouseY),
                    1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels
                ); 
                let col = [pixels[0], pixels[1], pixels[2]];
                let colKey = col.join('-');
                // Get the data from our map! 
                let nodeId = self.colourToNode[colKey];
                self.topSvg.selectAll('.highlightItem').remove();
                tooltip.style('display', 'none');

                if(nodeId){
                    let obj = {};
                    for (let key in nodeId) {
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
                            u.addSymbol( 
                                self.topSvg, nodeId.symbol, '#00ff00',
                                {x: nodeId.x.coord, y: nodeId.y.coord}, 3.0
                            );
                        }
                    }

                    tooltip.style('display', 'inline-block');
                    tooltip.html(
                        document.createElement('pre').innerHTML = 
                            JSON.stringify(obj, null, 2)
                    );
                }
            });
        }
    }

    createLabels(){

         let yChoices = [];
         let xChoices = [];

         let xHidden, yHidden;

         if(!d3.select('#xSettings').empty()){
            xHidden = (d3.select('#xSettings').style('display') == 'block' ) ? 
                false : true;
        }else{
            xHidden = true;
        }

        if(!d3.select('#ySettings').empty()){
            yHidden = (d3.select('#ySettings').style('display') == 'block' ) ? 
                false : true; 
        }else{
            yHidden = true;
        }
         
         

        // Go through data settings and find currently available ones
        let ds = this.dataSettings;
        for (let key in ds) {
            // Check if key is part of a combined parameter
            let ignoreKey = false;
            for (let comKey in this.renderSettings.combinedParameters){
                if(this.renderSettings.combinedParameters[comKey].indexOf(key) !== -1){

                    ignoreKey = true;
                    let tmp = yChoices.filter(function(e){return e.value === comKey});

                    if(yChoices.filter(function(e){return e.value === comKey;}).length==0){
                        yChoices.push({value:comKey,label:comKey});
                        if(this.renderSettings.yAxis.indexOf(comKey)!==-1){
                            yChoices[yChoices.length-1].selected = true;
                        }
                    }
                    if(xChoices.indexOf(comKey) === -1){
                        xChoices.push({value:comKey,label:comKey});
                        if(this.renderSettings.xAxis.indexOf(comKey)!==-1){
                            xChoices[xChoices.length-1].selected = true;
                        }
                    }
                }
            }
            // Check if key is available in data first
            if(!ignoreKey && this.data.hasOwnProperty(key)){

                yChoices.push({value: key, label: key});
                xChoices.push({value: key, label: key});

                if(this.renderSettings.yAxis.indexOf(key)!==-1){
                    yChoices[yChoices.length-1].selected = true;
                }
                if(this.renderSettings.xAxis.indexOf(key)!==-1){
                    xChoices[xChoices.length-1].selected = true;
                }
            }
        }

        d3.selectAll('.axisLabel').on('click',null);
        d3.selectAll('.axisLabel').remove();

        //let uniqY = [ ...new Set(this.renderSettings.yAxis) ];
        let uniqY = this.renderSettings.yAxis;

        this.svg.append('text')
            .attr('class', 'yAxisLabel axisLabel')
            .attr('text-anchor', 'middle')
            .attr('transform', 'translate('+ -(this.margin.left/2+10) +','+(this.height/2)+')rotate(-90)')
            .text(uniqY.join());

        d3.select('#ySettings').remove();

        this.el.append('div')
            .attr('id', 'ySettings')
            .style('display', function(){
                return yHidden ? 'none' : 'block';
            })
            .style('top', this.height/2+'px')
            .style('left', this.margin.left+15+'px')
            .append('select')
                .attr('id', 'yScaleChoices');

        document.getElementById('yScaleChoices').multiple = true;

        d3.select('.yAxisLabel.axisLabel').on('click', function(){
            if(d3.select('#ySettings').style('display') === 'block'){
                d3.select('#ySettings').style('display', 'none');
            }else{
                d3.select('#ySettings').style('display', 'block');
            }
        });

        let ySettingParameters = new Choices(d3.select('#yScaleChoices').node(), {
          choices: yChoices,
          removeItemButton: true,
          placeholderValue: ' select ...',
          itemSelectText: '',
        });

        let that = this;

        ySettingParameters.passedElement.addEventListener('addItem', function(event) {
            that.renderSettings.yAxis.push(event.detail.value);
            that.renderSettings.xAxis.push(that.renderSettings.xAxis[0]);
            that.renderSettings.colorAxis.push(null);
            that.recalculateBufferSize();
            that.initAxis();
            that.renderData();
            that.createLabels(false);
        },false);
        ySettingParameters.passedElement.addEventListener('removeItem', function(event) {
            let index = that.renderSettings.yAxis.indexOf(event.detail.value);
            // TODO: Should it happen that the removed item is not in the list?
            // Do we need to handle this case? 
            if(index!==-1){
                that.renderSettings.yAxis.splice(index, 1);
                that.renderSettings.xAxis.pop();
                that.renderSettings.colorAxis.splice(index, 1);
                that.initAxis();
                that.renderData();
                that.createLabels();
            }
        },false);

        //let uniqX = [ ...new Set(this.renderSettings.xAxis) ];
        let uniqX = [this.renderSettings.xAxis[0]];

        this.svg.append('text')
            .attr('class', 'xAxisLabel axisLabel')
            .attr('text-anchor', 'middle')
            .attr('transform', 'translate('+ (this.width/2) +','+(this.height+(this.margin.bottom-10))+')')
            .text(uniqX.join());

        d3.select('#xSettings').remove();

        this.el.append('div')
            .attr('id', 'xSettings')
            .style('display', function(){
                return xHidden ? 'none' : 'block'; 
            })
            .style('bottom', this.margin.bottom+20+'px')
            .style('left', this.width/2-this.margin.left+50+'px')
            .append('select')
                .attr('id', 'xScaleChoices');

        d3.select('.xAxisLabel.axisLabel').on('click', function(){
            if(d3.select('#xSettings').style('display') === 'block'){
                d3.select('#xSettings').style('display', 'none');
            }else{
                d3.select('#xSettings').style('display', 'block');
            }
        });

        var xSettingParameters = new Choices(d3.select('#xScaleChoices').node(), {
          choices: xChoices,
          placeholderValue: ' select ...',
          itemSelectText: '',
        });

        xSettingParameters.passedElement.addEventListener('change', function(event) {
            //that.renderSettings.xAxis = [event.detail.value];
            // TODO: For now rewrite all defined xAxis parameters as we define
            // one for each y axis parameter, maybe there is a better way to do
            // this
            for (var i = 0; i < that.renderSettings.xAxis.length; i++) {
                that.renderSettings.xAxis[i] = event.detail.value;
            }
            that.recalculateBufferSize();
            that.initAxis();
            that.renderData();
            that.createLabels();
        },false);

    }


    createHelperObjects(){

        this.renderingContainer = this.svg.append('g')
            .attr('id','renderingContainer')
            .style('clip-path','url(#clip)');

        // Add clip path so only points in the area are shown
        let clippath = this.svg.append('defs').append('clipPath')
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
    }

    


    loadCSV(csv){
        let self = this;
        // Parse local CSV file
        Papa.parse(csv, {
            download: true,
            header: true,
            dynamicTyping: true,
            complete: function(results) {
                let data = {};
                for (let i = 0; i < results.data.length; i++) {
                    let d = results.data[i];
                    for (let prop in d) {
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
    }

    updateBuffers(drawer, amount){
        drawer.maxLines = amount;
        drawer.maxDots = amount;
        drawer.maxRects = amount;
        drawer._initBuffers();
    }

    recalculateBufferSize(){
        // Check for longest array and set buffer size accordingly 
        let max = 0;
        for (let prop in this.data) {
          if(max < this.data[prop].length){
            max = this.data[prop].length;
          }
        }

        max = (max +400);

        // Multiply by number of y axis elements as for each one all data points
        // for the selected parameter is drawn
        max = max * this.renderSettings.yAxis.length * this.renderSettings.xAxis.length;

        this.updateBuffers(this.batchDrawer, ++max);

        if(!this.fixedSize){
            this.updateBuffers(this.batchDrawerReference, ++max);
        }
    }

    loadData(data){
        
        this.filters = {};
        this.data = data;

        this.renderSettings.combinedParameters = defaultFor(
            this.renderSettings.combinedParameters, {}
        );

        this.recalculateBufferSize();

        // Check for special formatting of data
        let ds = this.dataSettings;
        for (let key in ds) {
            if (ds[key].hasOwnProperty('scaleFormat')){
                if (ds[key].scaleFormat === 'time'){
                    let format = defaultFor(ds[key].timeFormat, 'default');

                    // Check if key is available in data first
                    if(this.data.hasOwnProperty(key)){
                        switch(format){
                            case 'default':
                            for (let i = 0; i < this.data[key].length; i++) {
                                this.data[key][i] = new Date(this.data[key][i]);
                            }
                            break;
                            case 'MJD2000_S':
                            for (let j = 0; j < this.data[key].length; j++) {
                                let d = new Date('2000-01-01');
                                d.setMilliseconds(d.getMilliseconds() + this.data[key][j]*1000);
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
    }

    initAxis(){

        this.svg.selectAll('*').remove();

        let xExtent, yExtent, xExt;

        // "Flatten selections"
        let xSelection = [];
        let ySelection = [];
        let rs = this.renderSettings;

        for (let i = 0; i < this.renderSettings.xAxis.length; i++) {
            if(rs.combinedParameters.hasOwnProperty(rs.xAxis[i])){
                xSelection = [].concat.apply([], rs.combinedParameters[rs.xAxis[i]]);
            } else {
                xSelection.push(this.renderSettings.xAxis[i]);
            }
        }

        for (var h = 0; h < this.renderSettings.xAxis.length; h++) {
            if(rs.combinedParameters.hasOwnProperty(rs.yAxis[h])){
                ySelection = [].concat.apply([], rs.combinedParameters[rs.yAxis[h]]);
            } else {
                ySelection.push(this.renderSettings.yAxis[h]);
            }
        }


        for (var i = xSelection.length - 1; i >= 0; i--) {
            xExt = d3.extent(this.data[xSelection[i]]);
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

        for (let j = ySelection.length - 1; j >= 0; j--) {
            let yExt = d3.extent(this.data[ySelection[j]]);
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

        let xRange = xExtent[1] - xExtent[0];
        let yRange = yExtent[1] - yExtent[0];

        let domain;
        if(this.renderSettings.hasOwnProperty('colorAxis')){
            let cAxis = this.renderSettings.colorAxis;
            // Check to see if linear colorscale or ordinal colorscale (e.g. IDs)
            if (this.dataSettings.hasOwnProperty(cAxis)){
                let ds = this.dataSettings[cAxis];
                if(
                    ds.hasOwnProperty('scaleType') && 
                    ds.scaleType === 'ordinal' &&
                    ds.hasOwnProperty('categories') ){

                    ds.colorscaleFunction = d3.scale.ordinal()
                        .range(d3.scale.category10().range().map(u.hexToRgb))
                        .domain(ds.categories);
                }
            }
            for (let ca = cAxis.length - 1; ca >= 0; ca--) {
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


        let xScaleType, yScaleType;
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
        if(!this.fixedSize){
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

        this.createLabels();
    }


    zoom_update() {
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
    }

    onZoom() {
        this.renderData();
        this.zoom_update();
    }


    addTimeInformation() {

        let dateFormat = d3.time.format.utc('%Y-%m-%dT%H:%M:%S');

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
    }

    previewZoom() {

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

        let xScale = this.xzoom.scale();
        let yScale = this.yzoom.scale();
        let xyScale = this.xyzoom.scale();

        let transXY = this.xyzoom.translate();
        let transX = this.xzoom.translate();
        let transY = this.yzoom.translate();

        this.topSvg.selectAll('.highlightItem').remove();

        if(this.debounceActive){

            this.debounceZoom.bind(this)();

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
    }


    drawCircle(renderer, cx, cy, r, num_segments) { 
        let theta = 2 * 3.1415926 / num_segments; 
        let c = Math.cos(theta);//precalculate the sine and cosine
        let s = Math.sin(theta);

        x = r;//we start at angle = 0 
        y = 0; 
        
        let prev_point = null;
        for(let i = 0; i <= num_segments; i++) 
        { 
            if(prev_point){
                let next_point = [x + cx, y + cy];
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
    }

    renderRegression(data, reg, color, thickness) {
        let result;
        let c = defaultFor(color, [0.1, 0.4, 0.9]);
        if(c.length === 3){
            c.push(1.0);
        }
        thickness = defaultFor(thickness, 1);

        // Use current xAxis in combination with yAxis selection
        let xPoints = this.xScale.domain();
        if(this.xTimeScale){
            xPoints = [
                xPoints[0].getTime(),
                xPoints[1].getTime()
            ];
        }

        switch(reg.type){
            case 'linear':
                result = regression('linear', data);
                let slope = result.equation[0];
                let yIntercept = result.equation[1];

                let yPoints = [
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
                let degree = defaultFor(reg.order, 3);
                result = regression('polynomial', data, degree);
                let lineAmount = 200;
                let extent = Math.abs(xPoints[1]-xPoints[0]);
                let delta = extent/lineAmount;
                let x1, x2, y1, y2;
                for(let l=0; l<lineAmount-1;l++){
                    
                    x1 = xPoints[0] + l*delta;
                    x2 = xPoints[0] + (l+1)*delta;
                    y1 = 0;
                    y2 = 0;
                    let eql = result.equation.length-1;

                    for (let i = eql; i >= 0; i--) {
                        y1 = y1 + (
                            result.equation[i] *
                            Math.pow(x1, i)
                        );
                        y2 = y2 + (
                            result.equation[i] *
                            Math.pow(x2, i)
                        );
                    }

                    let px1, px2, py1, py2;
                    if(!this.xTimeScale){
                        px1 = this.xScale(x1);
                        px2 = this.xScale(x2);
                    }else{
                        px1 = this.xScale(new Date(Math.ceil(x1)));
                        px2 = this.xScale(new Date(Math.ceil(x2)));
                    }
                    py1 = this.yScale(y1);
                    py2 = this.yScale(y2);

                    this.batchDrawer.addLine(
                        px1, py1,
                        px2, py2, 1,
                        c[0], c[1], c[2], c[3]
                    );
                }
            break;
        }

        if(typeof reg.type !== 'undefined'){
            // render regression label
            let regrString = 
                result.string + '  (r^2: '+ (result.r2).toPrecision(3)+')';

            d3.select('#regressionInfo')
                .append('div')
                .style('color', u.rgbToHex(c[0], c[1], c[2]))
                .style('opacity', c[3])
                .html(u.createSuperscript(regrString));
        }
    }

    createRegression(data, parPos, inactive) {

        let xAxRen = this.renderSettings.xAxis;
        let yAxRen = this.renderSettings.yAxis;
        let resultData;
        inactive = defaultFor(inactive, false);
        var reg = {
            type: this.dataSettings[yAxRen[parPos]].regression,
            order: this.dataSettings[yAxRen[parPos]].regressionOrder
        };


        //Check if data has identifier creating multiple datasets
        if (this.renderSettings.hasOwnProperty('dataIdentifier')){

            for (let i = 0; i < this.renderSettings.dataIdentifier.identifiers.length; i++) {

                let id = this.renderSettings.dataIdentifier.identifiers[i];
                let parId = this.renderSettings.dataIdentifier.parameter;

                let filterFunc = function (d,i){
                    return data[parId][i] === id;
                };

                var filteredX = data[xAxRen[parPos]].filter(filterFunc.bind(this));
                var filteredY = data[yAxRen[parPos]].filter(filterFunc.bind(this));

                if(this.xTimeScale){

                    resultData = filteredX.map(function(d){return d.getTime();})
                        .zip(filteredY);
                }else{
                    data = filteredX.zip(filteredY);
                }

                var rC = this.getIdColor(parPos, id);

                if(!inactive){
                    this.renderRegression(resultData, reg, rC);
                }else{
                    this.renderRegression(resultData, reg, [0.2,0.2,0.2,0.4]);
                }
            }
            
        }else{
            // TODO: Check for size mismatch?
            if(this.xTimeScale){
                resultData = data[xAxRen[parPos]]
                    .map(function(d){return d.getTime();})
                    .zip(
                        data[yAxRen[parPos]]
                    );
            }else{
                resultData = data[xAxRen[parPos]].zip(
                    data[yAxRen[parPos]]
                );
            }
            if(!inactive){
                // Check for predefined color
                if(this.dataSettings.hasOwnProperty(yAxRen[parPos]) &&
                   this.dataSettings[yAxRen[parPos]].hasOwnProperty('color')){
                    this.renderRegression(
                        resultData, reg, 
                        this.dataSettings[yAxRen[parPos]].color
                    );
            }else{
                this.renderRegression(resultData, reg);
            }
                
            }else{
                this.renderRegression(resultData, reg, [0.2,0.2,0.2,0.4]);
            }
        }
    }

    getIdColor(param, id) {
        let rC;
        let colorParam = this.renderSettings.colorAxis[param];
        let cA = this.dataSettings[colorParam];

        if (cA && cA.hasOwnProperty('colorscaleFunction')){
            rC = cA.colorscaleFunction(id);
            rC = rC.map(function(c){return c/255;});
        }else{
            rC = [0.258, 0.525, 0.956];
        }
        return rC;
    }

    getColor(param, index, data) {
        let rC;
        let colorParam = this.renderSettings.colorAxis[param];
        let cA = this.dataSettings[colorParam];

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
        if(rC.length == 3){
            rC.push(0.8);
        }
        return rC;
    }

    resize(){
        this.debounceResize.bind(this)();
        this.dim = this.el.node().getBoundingClientRect();
        this.width = this.dim.width - this.margin.left - this.margin.right;
        this.height = this.dim.height - this.margin.top - this.margin.bottom;
        this.resize_update();
    }


    resize_update() {

        this.xScale.range([0, this.width]);
        this.yScale.range([this.height, 0]);
        this.xAxisSvg.attr('transform', 'translate(0,' + this.height + ')');
        this.xAxis.tickSize(-this.height);
        this.yAxis.innerTickSize(-this.width);
        this.xAxisSvg.call(this.xAxis);
        this.yAxisSvg.call(this.yAxis);

        this.renderCanvas
            .attr('width', this.width - 1)
            .attr('height', this.height - 1);
   
        this.referenceCanvas
            .attr('width', this.width - 1)
            .attr('height', this.height - 1);
           
        // TODO: in this.svg actually the first g element is saved, this is 
        // confusing and shoulg maybe be changed, maybe change name?
        d3.select(this.svg.node().parentNode)
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom);
           
        d3.select(this.topSvg.node().parentNode)
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom);

        d3.select('#clip').select('rect')
            .attr('width', this.width)
            .attr('height', this.height);

        d3.select('#zoomXBox')
            .attr('width', this.width)
            .attr('height', this.margin.bottom)
            .attr('transform', 'translate(' + 0 + ',' + (this.height) + ')');

        d3.select('#zoomYBox')
            .attr('width', this.margin.left)
            .attr('height', this.height );
            
        d3.select('#rectangleOutline')
            .attr('width', this.width)
            .attr('height', this.height);

        this.el.select('#previewImage')
            .attr('width',  this.width)
            .attr('height', this.height);

    }

    onResize() {
        this.batchDrawer.updateCanvasSize(this.width, this.height);
        this.batchDrawerReference.updateCanvasSize(this.width, this.height);
        this.renderData();
        this.zoom_update();
    }

    renderRectangles(data, parPos, xGroup, yGroup) {

        // TODO: How to decide which item to take for counting
        // should we compare changes and look for errors in config?
        var l = data[xGroup[0]].length;
        let c;

        for (let i=0; i<l; i++) {

            let x1 = (this.xScale(data[xGroup[0]][i]));
            let x2 = (this.xScale(data[xGroup[1]][i]));
            let y1 = (this.yScale(data[yGroup[0]][i]));
            let y2 = (this.yScale(data[yGroup[1]][i]));

            let idC = u.genColor();

            let par_properties = {
                x1: {
                    val: data[xGroup[0]][i],
                    coord: x1, id: xGroup[0]
                },
                x2: {val: data[xGroup[1]][i],
                    coord: x2, id: xGroup[1]
                },
                y1: {val: data[yGroup[0]][i],
                    coord: y1, id: yGroup[0]
                },
                y2: {val: data[yGroup[1]][i],
                    coord: y2, id: yGroup[1]
                },
            };

            let nCol = idC.map(function(c){return c/255;});

            // Check if color axis is being used
            // TODO: make sure multiple color scales can be used
            if(this.renderSettings.colorAxis[parPos]){
                // Check if a colorscale is defined for this 
                // attribute, if not use default (plasma)
                let cs = 'viridis';
                let cA = this.dataSettings[
                    this.renderSettings.colorAxis[parPos]
                ];
                if (cA && cA.hasOwnProperty('colorscale')){
                    cs = cA.colorscale;
                }
                if(cs !== this.plotter.name){
                    this.plotter.setColorScale(cs);
                }
                c = this.plotter.getColor(
                    data[this.renderSettings.colorAxis[parPos]][i],
                    data
                ).map(function(c){return c/255;});

                par_properties.col = {
                    id: this.renderSettings.colorAxis[parPos],
                    val: data[this.renderSettings.colorAxis[parPos]][i]
                };

            } else {
                // If no color axis defined check for color 
                // defined in data settings
                // TODO: check for datasettings for yAxis parameter
                // TODO: auto generate identifier color if nothing is defined
                cA = this.dataSettings[
                    this.renderSettings.colorAxis[parPos]
                ];
                if (cA && cA.hasOwnProperty('colorscaleFunction')){
                    c = cA.colorscaleFunction(
                        data[this.renderSettings.colorAxis[parPos]][i]
                    );
                    c.map(function(c){return c/255;});
                }else{
                    c = [0.1, 0.4,0.9, 1.0];
                }
            }
            
            this.colourToNode[idC.join('-')] = par_properties;

            this.batchDrawer.addRect(x1,y1,x2,y2, c[0], c[1], c[2], 1.0);
            if(!this.fixedSize){
                this.batchDrawerReference.addRect(
                    x1,y1,x2,y2, nCol[0], nCol[1], nCol[2], 1.0
                );
            }
        }
    }

   renderMiddlePoints(data, parPos, xGroup) {

        let xAxRen = this.renderSettings.xAxis;
        let yAxRen = this.renderSettings.yAxis;
        let p_x, p_y;
        // TODO: How to decide which item to take for counting
        // should we compare changes and look for errors in config?
        let l = data[xGroup[0]].length;

        for (let i=0; i<l; i++) {

            let x1 = (this.xScale(
                data[xGroup[0]][i])
            );
            let x2 = (this.xScale(
                data[xGroup[1]][i])
            );
            let x = x1 + (x2-x1)/2;
            let y = (this.yScale(
                data[yAxRen[parPos]][i])
            );

            let rC = this.getColor(parPos, i, data);

            let c = u.genColor();

            let xVal;
            if (data[xGroup[0]][i] instanceof Date){
                xVal = new Date (
                    data[xGroup[0]][i].getTime() +
                        (data[xGroup[1]][i]-
                        data[xGroup[0]][i])/2
                );
            }else{
                xVal = data[xGroup[0]][i] +
                        (data[xGroup[1]][i]-
                        data[xGroup[0]][i])/2;
            }
            let par_properties = {
                x: {
                    val: xVal,
                    id: xAxRen[parPos],
                    coord: x
                },
                y: {
                    val: data[yAxRen[parPos]][i],
                    id: yAxRen[parPos],
                    coord: y
                },
            };

            let nCol = c.map(function(c){return c/255;});
            let parSett = this.dataSettings[yAxRen[parPos]];
            let cA = this.dataSettings[
                this.renderSettings.colorAxis[parPos]
            ];

            if (parSett){

                 if(parSett.hasOwnProperty('lineConnect') &&
                    parSett.lineConnect && i>0){

                    // Check if using ordinal scale (multiple
                    // parameters), do not connect if different

                    if(cA && cA.hasOwnProperty('scaleType') && 
                        cA.scaleType === 'ordinal'){

                        let colorParam = this.renderSettings.colorAxis[parPos];
                        if(data[colorParam][i-1] === data[colorParam][i])
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

                 if(!parSett.hasOwnProperty('symbol')){
                    parSett.symbol = 'circle';
                }
                if(parSett.symbol !== null){
                    par_properties.symbol = parSett.symbol;
                    var sym = defaultFor(dotType[parSett.symbol], 2.0);
                    this.batchDrawer.addDot(
                        x, y, DOTSIZE, sym, rC[0], rC[1], rC[2], rC[3]
                    );
                    if(!this.fixedSize){
                        this.batchDrawerReference.addDot(
                            x, y, DOTSIZE, sym, nCol[0], nCol[1], nCol[2], -1.0
                        );
                    }
                }
            }

            this.colourToNode[c.join('-')] = par_properties;

            p_x = x;
            p_y = y;
        }
    }


    renderPoints(data, parPos) {

        // Draw normal 'points' for x,y coordinates using defined symbol
        let xAxRen = this.renderSettings.xAxis;
        let yAxRen = this.renderSettings.yAxis;
        let lp = data[xAxRen[parPos]].length;
        let p_x, p_y;

        for (let j=0;j<=lp; j++) {

            let x = this.xScale(data[xAxRen[parPos]][j]);
            let y = this.yScale(data[yAxRen[parPos]][j]);
            let rC = this.getColor(parPos, j, data);

            let c = u.genColor();

            let par_properties = {
                x: {
                    val: data[xAxRen[parPos]][j],
                    id: xAxRen[parPos],
                    coord: x
                },
                y: {
                    val: data[yAxRen[parPos]][j],
                    id: yAxRen[parPos],
                    coord: y
                },
            };

            let nCol = c.map(function(c){return c/255;});
            let parSett = this.dataSettings[yAxRen[parPos]];
            let cA = this.dataSettings[
                this.renderSettings.colorAxis[parPos]
            ];

            if (parSett){

                 if(parSett.hasOwnProperty('lineConnect') &&
                    parSett.lineConnect && j>0){

                    // Check if using ordinal scale (multiple
                    // parameters), do not connect if different

                    if(cA && cA.hasOwnProperty('scaleType') && 
                        cA.scaleType === 'ordinal'){

                        let colorParam = this.renderSettings.colorAxis[parPos];
                        if(data[colorParam][j-1] === data[colorParam][j])
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

                if(!parSett.hasOwnProperty('symbol')){
                    parSett.symbol = 'circle';
                }
                if(parSett.symbol !== null && parSett.symbol !== 'none'){
                    par_properties.symbol = parSett.symbol;
                    var sym = defaultFor(dotType[parSett.symbol], 2.0);
                    this.batchDrawer.addDot(
                        x, y, DOTSIZE, sym, rC[0], rC[1], rC[2], rC[3]
                    );
                    if(!this.fixedSize){
                        this.batchDrawerReference.addDot(
                            x, y, DOTSIZE, sym, nCol[0], nCol[1], nCol[2], -1.0
                        );
                    }
                }
                
            }

            this.colourToNode[c.join('-')] = par_properties;

            p_x = x;
            p_y = y;
        }
    }


     addApply() {
        if(!d3.select('#applyButton').empty()){
            d3.select('#applyButton').remove();
        }
        if(d3.select('#applyButton').empty()){
            let applyButtonCont = d3.select('#parameterSettings')
                .attr('class', 'buttonContainer')
                .append('div');
                
            applyButtonCont.append('button')
                .attr('type', 'button')
                .attr('id', 'applyButton')
                .text('Apply')
                .on('click', ()=>{
                    this.renderData();
                });
        }
    }


    renderRegressionOptions(id, regressionTypes) {
        let checked = d3.select('#regressionCheckbox').property('checked');
        let that = this;

        if(checked){

            d3.select('#parameterSettings')
                .append('label')
                .attr('id', 'labelRegression')
                .attr('for', 'regressionSelect')
                .text('Approach');

            let regressionSelect = d3.select('#parameterSettings')
              .append('select')
                .attr('id','regressionSelect')
                .on('change',onregressionChange);

            let options = regressionSelect
              .selectAll('option')
                .data(regressionTypes).enter()
                .append('option')
                    .text(function (d) { return d.name; })
                    .attr('value', function (d) { return d.value; })
                    .property('selected', function(d){
                        return d.value === that.dataSettings[id].regression;
                    });

            addOrder();

            function onregressionChange() {
                let selectValue = 
                    d3.select('#regressionSelect').property('value');
                that.dataSettings[id].regression = selectValue;
                addOrder();
                that.addApply();
            }

            function addOrder(){
                d3.select('#regressionOrderLabel').remove();
                d3.select('#regressionOrder').remove();
                if(that.dataSettings[id].regression === 'polynomial'){
                    d3.select('#parameterSettings')
                        .append('label')
                        .attr('id', 'regressionOrderLabel')
                        .attr('for', 'regressionOrder')
                        .text('Order');

                    d3.select('#parameterSettings')
                    .append('input')
                    .attr('id', 'regressionOrder')
                    .attr('type', 'text')
                    .attr('value', defaultFor(that.dataSettings[id].regressionOrder, 3))
                    .on('input', function(){
                        that.dataSettings[id].regressionOrder = Number(this.value);
                        //that.renderRegressionOptions(id, regressionTypes);
                        that.addApply();
                    });
                }
            }


        }else{
            d3.select('#labelRegression').remove();
            d3.select('#regressionSelect').remove();
            delete that.dataSettings[id].regression;
            delete that.dataSettings[id].regressionOrder;
            this.addApply();
        }

    }


    /**
    * Render the colorscale to the specified canvas.
    * @memberof module:plotty
    * @param {String} name the name of the color scale to render
    * @param {HTMLCanvasElement} canvas the canvas to render to
    */
    renderData() {

        this.colourToNode = {}; // Map to track the colour of nodes.

        let vertices = [];
        let colors = [];
        let idColors = [];
        let indices = [];
        let radius = 5;

        // reset color count
        u.resetColor();
        let p_x, p_y;

        let xAxRen = this.renderSettings.xAxis;
        let yAxRen = this.renderSettings.yAxis;
        let combPars = this.renderSettings.combinedParameters;

        let c, nCol, par_properties, cA;

        let data = {};
        let inactiveData = {};


        for(let p in this.data){
            data[p] = this.data[p];
            inactiveData[p] = [];
        }

        // Setup div for regression info rendering
        d3.select('#regressionInfo').remove();
        this.el.append('div')
            .attr('id', 'regressionInfo')
            .style('bottom', this.margin.bottom*2+'px')
            .style('left', (this.width/2-this.margin.left)+'px');

        d3.select('#parameterInfo').remove();
        this.el.append('div')
            .attr('id', 'parameterInfo')
            .style('top', this.margin.top*2+'px')
            .style('left', (this.width/2)+'px');

        d3.select('#parameterSettings').remove();
        this.el.append('div')
            .attr('id', 'parameterSettings')
            .style('left', (this.width/2)+'px')
            .style('display', 'none');

        for (let f in this.filters){
            let filter = this.filters[f];
            let currentDataset = data[f];

            for (let p in data){

                let applicableFilter = true;

                if(this.filterManager.filterSettings.hasOwnProperty('filterRelation')){
                    applicableFilter = false;
                    let filterRel = this.filterManager.filterSettings.filterRelation;
                    for (let i = 0; i < filterRel.length; i++) {
                        if( (filterRel[i].indexOf(p)!==-1) === 
                            (filterRel[i].indexOf(f)!==-1)){
                            applicableFilter = true;
                            break;
                        }
                    }
                }
                
                if(applicableFilter){
                    let tmpArray = data[p];
                    data[p] = data[p].filter((e,i)=>{
                        return filter(currentDataset[i]);
                    });
                    inactiveData[p].pushArray(
                        tmpArray.filter((e,i)=>{
                            return !filter(currentDataset[i]);
                        })
                    );
                }
            }
        }

        let that = this;

        for (let parPos=0; parPos<xAxRen.length; parPos++){
            //for (let yScaleItem=0; yScaleItem<yAxRen.length; yScaleItem++){

            let id = yAxRen[parPos];

            // Add item to labels if there is no coloraxis is defined
            if(this.renderSettings.colorAxis[parPos] === null){

                let parDiv = d3.select('#parameterInfo').append('div')
                    .attr('class', 'labelitem');

                let iconSvg = parDiv.append('div')
                    .attr('class', 'svgIcon')
                    .style('display', 'inline')
                    .append('svg')
                    .attr('width', 20).attr('height', 10);

                let symbolColor = '#'+ CP.RGB2HEX(
                    that.dataSettings[id].color.slice(0,-1)
                    .map(function(c){return Math.round(c*255);})
                );

                if(this.dataSettings[id].lineConnect){
                    iconSvg.append('line')
                        .attr('x1', 0).attr('y1', 5)
                        .attr('x2', 20).attr('y2', 5)
                        .attr("stroke-width", 1.5)
                        .attr("stroke", symbolColor);
                }

                u.addSymbol(iconSvg, this.dataSettings[id].symbol, symbolColor);

                parDiv.append('div')
                    .style('display', 'inline')
                    .attr('id', id)
                    .html(defaultFor(this.dataSettings[id].displayName, id))
                    .on('click', function(){
                        let id = this.id;
                        d3.select('#parameterSettings').selectAll('*').remove();

                        d3.select('#parameterSettings')
                            .style('display', 'block');

                        d3.select('#parameterSettings')
                            .append('div')
                            .attr('class', 'closeButton')
                            .text('x')
                            .on('click', ()=>{
                                d3.select('#parameterSettings')
                                    .selectAll('*').remove();
                                d3.select('#parameterSettings')
                                    .style('display', 'none');
                            });

                        d3.select('#parameterSettings')
                            .append('label')
                            .attr('for', 'displayName')
                            .text('Label');
                            

                        d3.select('#parameterSettings')
                            .append('input')
                            .attr('id', 'displayName')
                            .attr('type', 'text')
                            .attr('value', that.dataSettings[id].displayName)
                            .on('input', function(){
                                that.dataSettings[id].displayName = this.value;
                                that.addApply();
                            });

                        d3.select('#parameterSettings')
                            .append('label')
                            .attr('for', 'symbolSelect')
                            .text('Symbol');
                            

                        let data = [
                            { name:'None', value: 'none' },
                            { name:'Rectangle', value: 'rectangle' },
                            { name:'Rectangle outline', value: 'rectangle_empty'},
                            { name:'Circle', value: 'circle'},
                            { name:'Circle outline', value: 'circle_empty'},
                            { name:'Plus', value: 'plus'},
                            { name:'X', value: 'x'},
                            { name:'Triangle', value: 'triangle'},
                            { name:'Triangle outline', value: 'triangle_empty'}
                        ];


                        let select = d3.select('#parameterSettings')
                          .append('select')
                            .attr('id','symbolSelect')
                            .on('change',onchange);

                        let options = select
                          .selectAll('option')
                            .data(data).enter()
                            .append('option')
                                .text(function (d) { return d.name; })
                                .attr('value', function (d) { return d.value; })
                                .property('selected', function(d){
                                    return d.value === that.dataSettings[id].symbol;
                                });

                        function onchange() {
                            let selectValue = d3.select('#symbolSelect').property('value');
                            that.dataSettings[id].symbol = selectValue;
                            that.addApply();
                        }

                        d3.select('#parameterSettings')
                            .append('label')
                            .attr('for', 'colorSelection')
                            .text('Color');

                        let colorSelect = d3.select('#parameterSettings')
                            .append('input')
                            .attr('id', 'colorSelection')
                            .attr('type', 'text')
                            .attr('value', 
                                '#'+CP.RGB2HEX(
                                    that.dataSettings[id].color.slice(0,-1)
                                    .map(function(c){return Math.round(c*255);})
                                )
                            );

                        let picker = new CP(colorSelect.node());

                        let firstChange = true;

                        picker.on('change', function(color) {
                            this.target.value = '#' + color;
                            let c = CP.HEX2RGB(color);
                            c = c.map(function(c){return c/255;});
                            c.push(0.8);
                            if(!firstChange){
                                that.dataSettings[id].color = c;
                                that.addApply();
                            }else{
                                firstChange = false;
                            }
                            
                        });

                        let x = document.createElement('a');
                            x.href = 'javascript:;';
                            x.innerHTML = 'Close';
                            x.addEventListener('click', function() {
                                picker.exit();
                            }, false);

                        picker.picker.appendChild(x);

                        d3.select('#parameterSettings')
                            .append('label')
                            .attr('for', 'lineConnect')
                            .text('Line connect');
                            

                        d3.select('#parameterSettings')
                            .append('input')
                            .attr('id', 'lineConnect')
                            .attr('type', 'checkbox')
                            .property('checked', 
                                defaultFor(that.dataSettings[id].lineConnect, false)
                            )
                            .on('change', function(){
                                that.dataSettings[id].lineConnect = 
                                    !defaultFor(that.dataSettings[id].lineConnect, false);
                                that.addApply();
                            });

                        d3.select('#parameterSettings')
                            .append('label')
                            .attr('for', 'regressionCheckbox')
                            .text('Regression');
                            
                        let regressionTypes = [
                            {name: 'Linear', value: 'linear'},
                            {name: 'Polynomial', value: 'polynomial'}
                        ];


                        d3.select('#parameterSettings')
                            .append('input')
                            .attr('id', 'regressionCheckbox')
                            .attr('type', 'checkbox')
                            .property('checked', 
                                that.dataSettings[id].hasOwnProperty('regression')
                            )
                            .on('change', function(){
                                // If activated there is no type defined so we
                                // define a defualt one, for now linear
                                if(d3.select('#regressionCheckbox').property('checked')){
                                     that.dataSettings[id].regression = defaultFor(
                                        that.dataSettings[id].regression,
                                        'linear'
                                    );
                                }

                                that.renderRegressionOptions(id, regressionTypes);
                                that.addApply();
                            });

                        that.renderRegressionOptions(id, regressionTypes);

                    });

            }else{
                
            }

            if(d3.select('#parameterInfo').selectAll('*').empty()){
                d3.select('#parameterInfo').style('display', 'none');
            }

            // Change height of settings panel to be just under labels
            
            let dim = d3.select('#parameterSettings').node().getBoundingClientRect();

            d3.select('#parameterSettings')
                .style('top', (this.margin.top+dim.height-5)+'px');

            // If a combined parameter is provided we need to render either
            // a line or a rectangle as we have two parameters per item
            if(combPars.hasOwnProperty(xAxRen[parPos])){
                // If also the yAxis item is an array we render a rectangle
                //if(yAxRen[yScaleItem].constructor === Array){
                if(combPars.hasOwnProperty(yAxRen[parPos])){

                    let xGroup = this.renderSettings.combinedParameters[
                        xAxRen[parPos]
                    ];
                    let yGroup = this.renderSettings.combinedParameters[
                        yAxRen[parPos]
                    ];
                    this.renderRectangles(data, parPos, xGroup, yGroup);
                    
                } else {
                    // Use middle value of composite xAxis parameter
                    // to render point
                    let xGroup = this.renderSettings.combinedParameters[xAxRen[parPos]];
                    this.renderMiddlePoints(data, parPos, xGroup);

                }
            } else {
                // xAxis has only one element
                // Check if yAxis has two elements
                if(yAxRen[parPos].constructor === Array){
                    // If yAxis has two elements draw lines in yAxis direction
                    // TODO: drawing of lines
                } else {

                    this.renderPoints(data, parPos);

                    // Draw filtered out 'points' for x,y 
                    let lp = inactiveData[xAxRen[parPos]].length;
                    for (let j=0;j<=lp; j++) {
                        let x = (this.xScale(inactiveData[xAxRen[parPos]][j]));
                        let y = (this.yScale(inactiveData[yAxRen[parPos]][j]));
                        let rC = [0.3,0.3,0.3];

                        let c = u.genColor();

                        let par_properties = {
                            x: {
                                val: x, id: xAxRen[parPos], coord: x
                            },
                            y: {
                                val: y, id: yAxRen[parPos], coord: y
                            },
                        };

                        let nCol = c.map(function(c){return c/255;});
                        let parSett = this.dataSettings[yAxRen[parPos]];

                        if (parSett){

                            if(parSett.hasOwnProperty('symbol') && parSett.symbol !== 'none'){
                                var sym = defaultFor(dotType[parSett.symbol], 2.0);
                                this.batchDrawer.addDot(
                                    x, y, DOTSIZE, sym, rC[0], rC[1], rC[2], 0.1
                                );
                                if(!this.fixedSize){
                                    this.batchDrawerReference.addDot(
                                        x, y, DOTSIZE, sym, nCol[0], nCol[1], nCol[2], -1.0
                                    );
                                }
                                
                            }
                        }

                        this.colourToNode[c.join('-')] = par_properties;
                    }

                    // Check if any regression type is selected for parameter
                    if(this.dataSettings[yAxRen[parPos]].hasOwnProperty('regression')){
                        this.createRegression(data, parPos);
                    }
                    if(inactiveData[yAxRen[parPos]].length>0){
                        this.createRegression(this.data, parPos, true);
                    }
                }
            }
        }


        this.batchDrawer.draw();
        if(!this.fixedSize){
            this.batchDrawerReference.draw();
        }

        

        if(this.debounceActive){
            this.renderCanvas.style('opacity','1');
            let prevImg = this.el.select('#previewImage');
            let img = this.renderCanvas.node().toDataURL();
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
    }

}

export {graphly};
