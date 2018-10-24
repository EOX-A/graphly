/*jshint esversion: 6 */

/**
* @typedef {Object} RenderSettings
* @property {String} xAxis Parameter id to be rendered on x axis.
* @property {Array.String} yAxis Array of parameter id strings of parameters
*         to be rendered on y axis (left). 
* @property {Array.String} y2Axis Array of parameter id strings of parameters
*        to be rendered on second y axis (right). 
* @property {Object} combinedParameters
* @property {Array.String} colorAxis Array of parameter
*        id strings of parameters to be rendered used for third dimension
*        as colorscale. If used number of array items must be equal to 
*        number of items in y and y2 axis combined. It is possible to use
*        null if any of the selected parameters for y or y2 axis should not
*        use a colorscale representation. 
*/

/**
* @typedef {Object} ParameterSettings
* @property {String} [symbol] to use for rendering, can be dotType, rectangle,
*           rectangle_empty, circle, circle_empty, plus, x, triangle, 
*           triangle_empty.
* @property {String} [uom] Unit of measurement to be added to label.
* @property {boolean} [lineConnect] Connect points with lines.
* @property {String} [colorscale] Colorscale used if parameter is selected to be
*           rendered as colorscale
* @property {Array} [extent] Extent to use if parameter selected for
*           visualization on any axis.
* @property {String} [regression] Enable calculation/visualization of regression
*           specifying type. Possible values 'linear', polynomial'.
* @property {String} [scaleType] If parameter is used for grouping data scaleType
*           can be set to 'ordinal'
* @property {Array} [categories] If ordinal scale used array of strings can be 
*           specified containing unique id strings of each group
* @property {String} [scaleFormat] If parameter is a time value set scaleFormat 
*           to 'time'.
* @property {String} [timeFormat=default] Possible to change format to MJD2000 
*           using value MJD2000_S.
* @property {String} [displayName] String to use for labels instead of parameter
*           id.
*/

/**
* @typedef  {Object.<String, ParameterSettings>} DataSettings Has string as 
*           parameter identifier and corresponding parameter setting object.
*/


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
};


let DOTSIZE = 8;

require('../styles/graphly.css');
require('../node_modules/choices.js/assets/styles/css/choices.css');
require('../node_modules/c-p/color-picker.css');

const EventEmitter = require('events');

import * as u from './utils';

let regression = require('regression');
let d3 = require('d3');
//global.d3 = d3;
let msgpack = require('msgpack-lite');
global.msgpack = msgpack;
let plotty = require('plotty');
let Papa = require('papaparse');

require('c-p');

let FileSaver = require('file-saver');
let Choices = require('choices.js');

let BatchDrawer = require('./BatchDraw.js');
let FilterManager = require('./FilterManager.js');
let canvg = require('./vendor/canvg.js');

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



/**
* The graphly class.
* @memberof module:graphly
* @fires module:graphly.graphly#pointSelect
* @fires module:graphly.graphly#axisChange
* @fires module:graphly.graphly#rendered
*/
class graphly extends EventEmitter {

    /**
    * @memberof module:graphly
    * @constructor
    * @param {Object} options Parameters to configure the plot.
    * @param {String} options.el Required d3 selector identifier for container
    * @param {RenderSettings} options.renderSettings Configuration options for what
    *        should be rendered.
    * @param {DataSettings} options.dataSettings Additional information to 
    *        set parameter specific rules.
    * @param {boolean} [options.debounceActive=true] Setting to determine if 
    *        rendering is  done once user interaction is finished using a 
    *        prerendered image to show interaction. For less then ~6k points 
    *        debounce can be set  to false.
    * @param {boolean} [options.displayParameterLabel=true] Setting to configure 
    *        if parameter label box is always shown or is hidden and can be
    *        opened with the cog symbol.
    * @param {boolean} [options.displayColorscaleOptions=true] Setting to allow
    *        adding colorscale as third dimensio nto rendered points
    * @param {boolean} [options.displayAlphaOptions=true] Enable/disable
    *        possibility to change alpha value for rendered parameters
    * @param {boolean} [options.fixedSize=false] Enable/disable use of fixed 
             size. Rendering is done for specific size not allowing resizing and 
             not using margins in the extent of the axis. 
    * @param {Number} [options.fixedWidth=1000] Width used when using fixed size 
    *        rendering.
    * @param {Number} [options.fixedHeight=500] Height used when using fixed
             size rendering.
    * @param {boolean} [options.autoColorExtent=false] Dynamically adapt color
             extent for color range parameters
    * @param {Object} [options.filterManager] Instanced filtermanager object to
             connect to.
    * @param {Object} [options.connectedGraph] Instanced graphly object to sync
             x axis to.
    * @param {boolean} [options.enableFit=true] Enable/disable fitting
             functionality.
    * @param {boolean} [options.logX=false] Use logarithmic scale for x axis.
    * @param {boolean} [options.logY=false] Use logarithmic scale for left y axis.
    * @param {boolean} [options.logY2=false] Use logarithmic scale for right y axis.
    * @param {String} [options.colorAxisTickFormat='g'] d3 format string to use 
             as default tick format.
    * @param {Number} [options.defaultAlpha=0.9] Alpha value used as default
    *        when rendering.
    *
    */
    constructor(options) {
        super();

        // Passed options
        this.el = d3.select(options.el);
        this.nsId = options.el;
        this.yAxisLabel = null;
        this.y2AxisLabel = null;
        this.xAxisLabel = null;
        this.colorCache = {};
        this.defaultAlpha = defaultFor(options.defaultAlpha, 0.9);
        this.ignoreParameters = defaultFor(options.ignoreParameters, []);

        // Set default font-size main element
        this.el.style('font-size', '0.8em');


        this.el.append('canvas')
            .attr('id', 'imagerenderer')
            .style('display', 'none');

        // We need to container to be relative to make sure all otherabsolute
        // parameters inside are relative to parent
        this.el.style('position', 'relative');
        let contId = this.el.attr('id');

        // If an event listener was already registered for the same type on
        // the selected element, the existing listener is removed before the 
        // new listener is added.
        // Meaning if we have multiple graphs instanciated only the last one
        // will resize, so we use the div ID to namespace the event listener
        d3.select(window).on('resize.'+contId, ()=> {
            if(!this.fixedSize){
                this.resize();
            }
        });

        // TOOO: How could some defaults be guessed for rendering?
        this.dataSettings = defaultFor(options.dataSettings, {});
        this.setRenderSettings(options.renderSettings);
        this.timeScales = [];

        this.margin = defaultFor(
            options.margin,
            {top: 10, left: 90, bottom: 50, right: 30}
        );

        this.marginY2Offset = 0;
        this.marginCSOffset = 0;

        if(this.renderSettings.hasOwnProperty('y2Axis') && 
           this.renderSettings.y2Axis.length>0){
            this.marginY2Offset = 40;
        }


        this.renderSettings.combinedParameters = defaultFor(
            this.renderSettings.combinedParameters, {}
        );

        this.renderSettings.y2Axis = defaultFor(
            this.renderSettings.y2Axis, []
        );

        this.debounceActive = defaultFor(options.debounceActive, true);
        this.dim = this.el.node().getBoundingClientRect();

        this.displayParameterLabel = defaultFor(
            options.displayParameterLabel, true
        );
        this.displayColorscaleOptions = defaultFor(
            options.displayColorscaleOptions, true
        );
        this.displayAlphaOptions = defaultFor(
            options.displayAlphaOptions, true
        );

        // If there are colorscales to be rendered we need to apply additional
        // margin to the right reducing the total width
        let csAmount = 0;
        for (var i = 0; i < this.renderSettings.colorAxis.length; i++) {
            if(this.renderSettings.colorAxis[i] !== null){
                csAmount++;
            }
        }
        this.marginCSOffset += csAmount*100;

        this.width = this.dim.width - this.margin.left - 
                     this.margin.right - this.marginY2Offset - this.marginCSOffset;
        this.height = this.dim.height - this.margin.top - this.margin.bottom;
        // Sometimes if the element is not jet completely created the height 
        // might not be defined resulting in a negative value resulting
        // in multiple error, we make sure here the value is not negative
        if(this.height<0){
            this.height = 10;
        }
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
        this.connectedGraph = defaultFor(options.connectedGraph, false);
        this.autoColorExtent = defaultFor(options.autoColorExtent, false);
        this.enableFit = defaultFor(options.enableFit, true);
        this.fixedXDomain = undefined;
        this.mouseDown = false;
        this.prevMousePos = null;

        this.logX = defaultFor(options.logX, false);
        this.logY = defaultFor(options.logY, false);
        this.logY2 = defaultFor(options.logY2, false);

        this.colorAxisTickFormat = defaultFor(options.colorAxisTickFormat, 'g');

        if(this.filterManager){
            this.filterManager.on('filterChange', this.onFilterChange.bind(this));
        }

        this.debounceZoom = debounce(function(){
            this.onZoom();
        }, 350);

       this.debounceResize = debounce(function(){
            this.onResize();
        }, 500);

        // Keep track if graph is the one emitting the zoom event or not for use
        // when synchronizing multiple graphs in x axis
        this.slaveGraph = false;
        

        let self = this;

        //plotty.addColorScale('divergent1', ['#2f3895', '#ffffff', '#a70125'], [0, 0.41, 1]);

        this.plotter = new plotty.plot({
            canvas: document.createElement('canvas'),
            domain: [0,1]
        });


        // tooltip
        this.tooltip = this.el.append('div')
            .attr('class', 'graphlyTooltip paramTable')

        this.renderCanvas = this.el.append('canvas')
            .attr('id', 'renderCanvas')
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
            .attr('width', this.width + this.margin.left + 
                  this.margin.right + this.marginY2Offset + this.marginCSOffset
            )
            .attr('height', this.height + this.margin.top + this.margin.bottom)
            .style('position', 'absolute')
            .style('z-index', 0)
            .style('pointer-events', 'none')
            .append('g')
            .attr('transform', 'translate(' + (this.margin.left+1) + ',' +
                (this.margin.top+1) + ')');

        this.topSvg = this.el.append('svg')
            .attr('width', this.width + this.margin.left + 
                   this.margin.right + this.marginY2Offset + this.marginCSOffset)
            .attr('height', this.height + this.margin.top + this.margin.bottom)
            .style('position', 'absolute')
            .style('z-index', 10)
            .style('pointer-events', 'none')
            .append('g')
            .attr('transform', 'translate(' + (this.margin.left+1) + ',' +
                (this.margin.top+1) + ')')
            .style('clip-path','url('+this.nsId+'clipbox)');

        // Make sure we hide the tooltip as soon as we get out of the canvas
        // else it can kind of "stick" when moving the mouse fast
        this.renderCanvas.on('mouseout', ()=>{
            self.topSvg.selectAll('.temporary').remove();
        });


        if(!this.fixedSize){

            this.renderCanvas.on('mousedown', ()=> {
                // Save mouse position to see if when releasing it the user has
                // panned the canvas
                this.prevMousePos = [d3.event.clientX, d3.event.clientY];
                this.mouseDown = true;
                this.tooltip.style('display', 'none');
                this.tooltip.selectAll('*').remove();
                self.topSvg.selectAll('*').remove();
                this.emit('pointSelect', null);
            });

            this.renderCanvas.on('mouseout', ()=> {
               this.mouseDown = false;
            });

            this.renderCanvas.on('mousemove', function() {

                // If mouse is being pressed don't pick anything
                if(self.mouseDown){
                    return;
                }

                // Clean anything inside top svg
                self.topSvg.selectAll('.temporary').remove();
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
                                    .attr('class', 'temporary')
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
                            if( Math.abs(nodeId.x.coord - mouseX) > 20 ||
                                Math.abs(nodeId.y.coord - mouseY) > 20){
                                // Picked element is far away from mouse
                                // position, this is an antialias issue
                                return;
                            }
                            u.addSymbol( 
                                self.topSvg, nodeId.symbol, '#00ff00',
                                {x: nodeId.x.coord, y: nodeId.y.coord},
                                3.0, nodeId.dotsize, 'temporary'
                            );
                        }
                    }
                }
            });

            this.renderCanvas.on('mouseup', ()=> {

                this.mouseDown = false;
                // If there was movement of mouse bigger then delta do not
                // trigger picking
                if(this.prevMousePos && Math.max(
                    Math.abs(this.prevMousePos[0]-d3.event.clientX),
                    Math.abs(this.prevMousePos[1]-d3.event.clientY) 
                    ) > 5
                ){
                    return;
                }

                this.tooltip.style('display', 'none');
                this.tooltip.selectAll('*').remove();
                self.topSvg.selectAll('*').remove();

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
                
                if(nodeId){
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
                            if( Math.abs(nodeId.x.coord - mouseX) > 20 ||
                                Math.abs(nodeId.y.coord - mouseY) > 20){
                                // Picked element is far away from mouse
                                // position, this is an antialias issue
                                return;
                            }
                            u.addSymbol( 
                                self.topSvg, nodeId.symbol, '#00ff00',
                                {x: nodeId.x.coord, y: nodeId.y.coord}, 4.0,
                                nodeId.dotsize
                            );
                        }
                    }

                    let dim = this.el.node().getBoundingClientRect();
                    let ttdim = this.tooltip.node().getBoundingClientRect();
                
                    // TODO: make sure tooltip is inside window
                    var topPos = d3.event.pageY - dim.top + 10;

                    if (topPos+ttdim.height > dim.height){
                        topPos = topPos - ttdim.height + 10;
                    }
                    var leftPos = (d3.event.pageX - dim.left + 10);
                    if(leftPos+240 > dim.width){
                        leftPos = leftPos - 275;
                    }

                    this.tooltip.style('top', topPos + 'px');
                    this.tooltip.style('left', leftPos + 'px');

                    this.tooltip.style('display', 'inline-block');

                    // Add close button
                    this.tooltip.append('div')
                        .attr('class', 'labelClose cross')
                        .on('click', ()=>{
                            this.topSvg.selectAll('*').remove();
                            this.tooltip.style('display', 'none');
                            this.emit('pointSelect', null);
                        });

                    if (typeof self.currentData !== 'undefined' && 
                        nodeId.hasOwnProperty('index')){

                        let keysSorted = Object.keys(self.currentData).sort();

                        /*for (var i = 0; i < keysSorted.length; i++) {
                            let key = keysSorted[i];
                            let val = self.currentData[key][nodeId.index];
                            if (val instanceof Date){
                                val = val.toISOString();
                            }
                            this.tooltip.append('div')
                                .text(key+': '+val)
                        }*/
                        let tabledata = [];
                        let uomAvailable = false;
                        for (var i = 0; i < keysSorted.length; i++) {
                            let key = keysSorted[i];
                            let val = self.currentData[key][nodeId.index];
                            if (val instanceof Date){
                                val = val.toISOString();
                            }
                            let tObj = {
                                'Parameter': key,
                                'Value': val
                            }
                            if(self.dataSettings[key].hasOwnProperty('uom') &&
                               self.dataSettings[key].uom !== null){
                                uomAvailable = true;
                                tObj.Unit = self.dataSettings[key].uom;
                            }
                            tabledata.push(tObj);
                        }

                        let columns = ['Parameter', 'Value'];
                        if(uomAvailable){
                            columns.push('Unit')
                        }
                        let table = this.tooltip.append('table')
                        let thead = table.append('thead')
                        let tbody = table.append('tbody');

                        // append the header row
                        thead.append('tr')
                          .selectAll('th')
                          .data(columns).enter()
                          .append('th')
                            .text(function (column) { return column; });

                        // create a row for each object in the data
                        let rows = tbody.selectAll('tr')
                          .data(tabledata)
                          .enter()
                          .append('tr');

                        // create a cell in each row for each column
                        let cells = rows.selectAll('td')
                          .data(function (row) {
                            return columns.map(function (column) {
                              return {column: column, value: row[column]};
                            });
                          })
                          .enter()
                          .append('td')
                            .text(function (d) { return d.value; });


                        // Check to see if data has set some position aliases
                        if(self.renderSettings.hasOwnProperty('positionAlias')){
                            let posAlias = self.renderSettings.positionAlias;
                            var lat, lon, alt;
                            var cmobPar = self.renderSettings.combinedParameters;

                            if(cmobPar.hasOwnProperty(posAlias.latitude)){
                                var key = cmobPar[posAlias.latitude];
                                if(self.currentData.hasOwnProperty(key[0]) && 
                                   self.currentData.hasOwnProperty(key[1]) ){
                                    lat = [
                                        self.currentData[key[0]][nodeId.index],
                                        self.currentData[key[1]][nodeId.index]
                                    ];
                                }
                                
                            } else {
                                if(self.currentData.hasOwnProperty(posAlias.latitude)){
                                    lat = self.currentData[[posAlias.latitude]][nodeId.index];
                                }
                            }

                            if(cmobPar.hasOwnProperty(posAlias.longitude)){
                                var key = cmobPar[posAlias.longitude];
                                if(self.currentData.hasOwnProperty(key[0]) && 
                                   self.currentData.hasOwnProperty(key[1]) ){
                                    lon = [
                                        self.currentData[key[0]][nodeId.index],
                                        self.currentData[key[1]][nodeId.index]
                                    ];
                                }
                                
                            } else {
                                if(self.currentData.hasOwnProperty(posAlias.longitude)){
                                    lon = self.currentData[[posAlias.longitude]][nodeId.index];
                                }
                            }

                            if(cmobPar.hasOwnProperty(posAlias.altitude)){
                                var key = cmobPar[posAlias.altitude];
                                if(self.currentData.hasOwnProperty(key[0]) && 
                                   self.currentData.hasOwnProperty(key[1]) ){
                                    alt = [
                                        self.currentData[key[0]][nodeId.index],
                                        self.currentData[key[1]][nodeId.index]
                                    ];
                                }
                                
                            } else {
                                if(self.currentData.hasOwnProperty(posAlias.altitude)){
                                    alt = self.currentData[[posAlias.altitude]][nodeId.index];
                                }
                            }

                            /**
                            * Fires when a point is selected in plot position
                            * information if it was configured which parameter
                            * is mapped to lat, lon and altitude.
                            *
                            * @event module:graphly.graphly#pointSelect
                            * @property {Object} position - Object is passed 
                            * containing Latitude, Longitude and Radius parameter.
                            */
                            this.emit('pointSelect', {
                                Latitude: lat,
                                Longitude: lon,
                                Radius: alt
                            });
                        } else {
                            if(self.currentData.hasOwnProperty('Latitude') &&
                               self.currentData.hasOwnProperty('Longitude') &&
                               self.currentData.hasOwnProperty('Radius') ){
                                this.emit('pointSelect', {
                                    Latitude: self.currentData.Latitude[nodeId.index],
                                    Longitude: self.currentData.Longitude[nodeId.index],
                                    Radius: self.currentData.Radius[nodeId.index]
                                });
                            }
                        }
                    } else {
                        for (let key in nodeId) {
                            let val = nodeId[key].val;
                            if(key !== 'symbol'){
                                if (val instanceof Date){
                                    val = val.toISOString();
                                }
                                this.tooltip.append('div')
                                    .text(nodeId[key].id+': '+val)
                            }
                        }
                    }
                    

                }
            });
        }
    }

    onFilterChange(filters){

        if(!this.batchDrawer){
            return;
        }
        // Remove all color caches
        for(let k in this.colorCache){
            delete this.colorCache[k];
        }
        // Reset colorscale range if filter changed for parameter with 
        // colorscale
        if(this.autoColorExtent){
            let filterKeys = Object.keys(filters);
            for (var i = 0; i < filterKeys.length; i++) {
                if(this.filters.hasOwnProperty(filterKeys[i])){
                    // New parameter has been added, reset color scale range
                    // if available in datasettings
                    if(this.dataSettings.hasOwnProperty(filterKeys[i]) &&
                       this.dataSettings[filterKeys[i]].hasOwnProperty('extent') ){
                        delete this.dataSettings[filterKeys[i]].extent;
                    }
                }else{
                    // New parameter has been added, reset color scale range
                    // if available in datasettings
                    if(this.dataSettings.hasOwnProperty(filterKeys[i]) &&
                       this.dataSettings[filterKeys[i]].hasOwnProperty('extent') ){
                        delete this.dataSettings[filterKeys[i]].extent;
                    }
                }
            }
        }
        this.filters = filters;
        this.applyDataFilters();
        this.renderData();
    }

    destroy(){
        let contId = this.el.attr('id');
        d3.select(window).on('resize.'+contId, null);
        d3.select(window).on('mousemove.'+contId, null);
        this.renderCanvas.on('mouseout', null);
        this.renderCanvas.on('mousemove', null);
        this.filterManager.removeListener('filterChange', this.onFilterChange);

        if(!this.fixedSize){
            this.batchDrawerReference.destroy();
        }
        this.batchDrawer.destroy();
        delete this.batchDrawer;
        delete this.batchDrawerReference;
    }

    /**
    * Update used render settings without re-rendering
    * @param {Object} settings See renderSettings description of graphly constructor.
    */
    setRenderSettings(settings){
        this.renderSettings = defaultFor(settings, {});

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
                col = CP.HEX2RGB(col.slice(1));
                col = col.map(function(c){return c/255;});
                this.dataSettings[k].color = col;
            }
        }
    }

    /**
    * Update used data settings without re-rendering
    * @param {Object} settings See dataSettings description of graphly constructor.
    */
    setDataSettings(settings){
        this.dataSettings = defaultFor(settings, {});
    }

    /**
    * Connect x axis of a scond graph to update when x axis of first graph is updated.
    * @param {Object} graph graphly instance.
    */
    connectGraph(graph){
        this.connectedGraph = graph;
    }

    /**
    * Save current plot as image opening save dialog for download.
    */
    saveImage(){
        // We need to first render the canvas if the debounce active is false
        if(!this.debounceActive){
            this.renderCanvas.style('opacity','1');
            let prevImg = this.el.select('#previewImage');
            let img = this.renderCanvas.node().toDataURL();
            if(!prevImg.empty()){
                prevImg.attr('xlink:href', img)
                    .attr('transform', 'translate(0,0)scale(1)')
                    .style('display', 'none');
            }
        }


        this.svg.select('#previewImage').style('display', 'block');
        this.svg.select('#previewImage2').style('display', 'block');
        if(this.displayParameterLabel && 
            !this.el.select('#parameterInfo').selectAll('*').empty()){
            this.svg.select('#svgInfoContainer').style('visibility', 'visible');
        }

        // Set interactive blue to black for labels
        this.svg.selectAll('.axisLabel').attr('fill', 'black');
        this.svg.selectAll('.axisLabel').attr('font-weight', 'normal');
        this.svg.selectAll('.axisLabel').attr('text-decoration', 'none');
        // Check if one of the labels says Add parameter ...
        d3.selectAll('.axisLabel').filter(function(){ 
            return d3.select(this).text() == 'Add parameter ...'
        })
        .attr('fill', 'none');


        // Apply all styles directly so they render as expected
        // css styles are not applied to rendering

        this.el.selectAll('.axis path, .axis line')
            .attr('fill', 'none')
            .attr('stroke', '#ccc')
            .attr('stroke-width', 1)
            .attr('shape-rendering', 'crispEdges')
            .attr('stroke-dasharray', 2);

        this.el.selectAll('.color.axis path, .color.axis line')
            .attr('fill', 'none')
            .attr('stroke', '#ccc')
            .attr('stroke-width', 1)
            .attr('shape-rendering', 'crispEdges')
            .attr('stroke-dasharray', 0);

        this.el.selectAll('#filters .axis path, #filters .axis line')
            .attr('fill', 'none')
            .attr('stroke', 'black')
            .attr('stroke-width', 1)
            .attr('shape-rendering', 'crispEdges')
            .attr('stroke-dasharray', 'none');

        this.el.selectAll('text')
            .attr('stroke', 'none')
            .attr('shape-rendering', 'crispEdges');

        // Set fontsize for text explicitly
        this.svg.selectAll('text')
            .attr('font-size', '12px');

        // TODO: We introduce a short timeout here because it seems for some
        // reason the rendered image is not ready when not using the debounce
        // flag, not sure how to discover if the image is ready or not,
        // when debugging the svg_html shows the correct image, but the 
        // redering is empty
        if(!this.debounceActive){
            setTimeout(this.createOutputPNG.bind(this), 10);
        } else {
            this.createOutputPNG();
        }
    }

    createOutputPNG(){

        this.dim = this.el.select('svg').node().getBoundingClientRect();
        let renderWidth = this.dim.width;
        let renderHeight = this.dim.height;

        var svg_html = this.el.select('svg')
            .attr("version", 1.1)
            .attr("xmlns", "http://www.w3.org/2000/svg")
            .attr('xmlns:xlink', 'http://www.w3.org/1999/xlink')
            .node().outerHTML;

        this.el.select('#imagerenderer').attr('width', renderWidth);
        this.el.select('#imagerenderer').attr('height', renderHeight);

        var c = this.el.select('#imagerenderer').node();
        var ctx = c.getContext('2d');
        ctx.clearRect(0, 0, c.width, c.height);
        ctx.drawSvg(svg_html, 0, 0, renderWidth, renderHeight);

        this.svg.select('#previewImage').style('display', 'none');
        this.svg.select('#previewImage2').style('display', 'none');
        this.svg.select('#svgInfoContainer').style('visibility', 'hidden');

        // Set interactive blue to black for labels
        this.svg.selectAll('.axisLabel').attr('fill', '#007bff');
        this.svg.selectAll('.axisLabel').attr('font-weight', 'bold');

        c.toBlob((blob)=> {
            FileSaver.saveAs(blob, this.fileSaveString);
        }, "image/png" ,1);
    }

    addTextMouseover(text){
        // Reset listeners to avoid issues
        text.on('mouseover', null);
        text.on('mouseout', null);

        text.on('mouseover', ()=>{
            text.attr('text-decoration', 'underline');
        })
        text.on('mouseout', ()=>{
            d3.select(d3.event.target).attr('text-decoration', 'none');
        })
    }

    createAxisLabels(){

         let yChoices = [];
         let y2Choices = [];
         let xChoices = [];

         let xHidden, yHidden, y2Hidden;

         if(!this.el.select('#xSettings').empty()){
            xHidden = (this.el.select('#xSettings').style('display') == 'block' ) ? 
                false : true;
        }else{
            xHidden = true;
        }

        if(!this.el.select('#ySettings').empty()){
            yHidden = (this.el.select('#ySettings').style('display') == 'block' ) ? 
                false : true; 
        }else{
            yHidden = true;
        }

        if(!this.el.select('#y2Settings').empty()){
            y2Hidden = (this.el.select('#y2Settings').style('display') == 'block' ) ? 
                false : true; 
        }else{
            y2Hidden = true;
        }

        // Go through data settings and find currently available ones
        let ds = this.dataSettings;
        for (let key in ds) {
            // Check if key is part of a combined parameter
            let ignoreKey = false;
            let comKey = null;
            for (comKey in this.renderSettings.combinedParameters){
                if(this.renderSettings.combinedParameters[comKey].indexOf(key) !== -1){
                    ignoreKey = true;
                }
            }
            // Check if key is available in data first
            if( !ignoreKey && (this.data.hasOwnProperty(key)) ){

                yChoices.push({value: key, label: key});
                y2Choices.push({value: key, label: key});
                xChoices.push({value: key, label: key});

                if(this.renderSettings.yAxis.indexOf(key)!==-1){
                    yChoices[yChoices.length-1].selected = true;
                    y2Choices.pop();
                }
                if(this.renderSettings.y2Axis.indexOf(key)!==-1){
                    y2Choices[y2Choices.length-1].selected = true;
                    yChoices.pop();
                }
                if(this.renderSettings.xAxis === key){
                    xChoices[xChoices.length-1].selected = true;
                }
            }
        }

        // Go through combined parameters and see if corresponding parameters
        // are available in the current dataset, if they are add the combined
        // parameter to the choices
        let comPars =  this.renderSettings.combinedParameters;
        for (let comKey in comPars){
            let includePar = true;
            for (let par=0; par<comPars[comKey].length; par++){
                if(!this.data.hasOwnProperty(comPars[comKey][par])){
                    includePar = false;
                }
            }
            if(includePar){
                yChoices.push({value: comKey, label: comKey});
                y2Choices.push({value: comKey, label: comKey});
                xChoices.push({value: comKey, label: comKey});

                if(this.renderSettings.yAxis.indexOf(comKey)!==-1){
                    yChoices[yChoices.length-1].selected = true;
                    y2Choices.pop();
                }
                // Add selected attribute also to y2 axis selections
                if(this.renderSettings.y2Axis.indexOf(comKey)!==-1){
                    y2Choices[y2Choices.length-1].selected = true;
                    yChoices.pop();
                }
                if(this.renderSettings.xAxis === comKey){
                    xChoices[xChoices.length-1].selected = true;
                }
            }
        }

        this.el.selectAll('.axisLabel').on('click',null);
        this.el.selectAll('.axisLabel').remove();

        let uniqY = this.renderSettings.yAxis;

        let listText = [];
        // Add uom info to unique elements
        for (var i = 0; i < uniqY.length; i++) {
            if(this.dataSettings.hasOwnProperty(uniqY[i]) && 
               this.dataSettings[uniqY[i]].hasOwnProperty('uom') &&
               this.dataSettings[uniqY[i]].uom !== null){
                listText.push(uniqY[i]+' ['+this.dataSettings[uniqY[i]].uom+'] ');
            }else{
                listText.push(uniqY[i]);
            }
        }

        if(listText.length === 0){
            // No items selected, add "filler text"
            listText.push('Add parameter ...');
        }
        if(this.yAxisLabel){
            listText = [this.yAxisLabel];
        }
        
        let labelytext = this.svg.append('text')
            .attr('class', 'yAxisLabel axisLabel')
            .attr('text-anchor', 'middle')
            .attr('transform', 
                'translate('+ -(this.margin.left/2+10) +','+
                (this.height/2)+')rotate(-90)'
            )
            .attr('fill', '#007bff')
            .attr('stroke', 'none')
            .attr('font-weight', 'bold')
            .attr('text-decoration', 'none')
            .text(listText.join(', '));

        this.addTextMouseover(labelytext);

        this.el.select('#ySettings').remove();

        this.el.append('div')
            .attr('id', 'ySettings')
            .style('display', function(){
                return yHidden ? 'none' : 'block';
            })
            .style('top', this.height/2+'px')
            .style('left', this.margin.left+15+'px')
            .append('select')
                .attr('id', 'yScaleChoices');

        this.el.select('#ySettings').append('div')
            .attr('class', 'labelClose cross')
            .on('click', ()=>{
                this.el.select('#ySettings').style('display', 'none');
            });

        let con = this.el.select('#ySettings').append('div')
            .attr('class', 'axisOption');
        let that = this;

        con.append('input')
            .attr('id', 'yAxisCustomLabel')
            .attr('type', 'text')
            .property('value', listText.join(', '))
            .on('input', function(){
                that.el.select('.yAxisLabel.axisLabel').text(this.value);
                that.yAxisLabel = this.value;
            });

        con.append('label')
            .attr('for', 'yAxisCustomLabel')
            .text('Label');

        con = this.el.select('#ySettings').append('div')
            .attr('class', 'axisOption');

        if(!this.yTimeScale){
            con.append('input')
                .attr('id', 'logYoption')
                .attr('type', 'checkbox')
                .property('checked', 
                    defaultFor(that.logY, false)
                )
                .on('change', function(){
                    that.logY = !that.logY;
                    that.initAxis();
                    that.renderData();
                });

            con.append('label')
                .attr('for', 'logYoption')
                .text('Logarithmic scale (base-10) ');
        }


        this.el.select('#yScaleChoices').attr('multiple', true);

        this.el.select('.yAxisLabel.axisLabel').on('click', ()=>{
            if(this.el.select('#ySettings').style('display') === 'block'){
                this.el.select('#ySettings').style('display', 'none');
            }else{
                this.el.select('#ySettings').style('display', 'block');
            }
        });

        let ySettingParameters = new Choices(this.el.select('#yScaleChoices').node(), {
          choices: yChoices,
          removeItemButton: true,
          placeholderValue: ' select ...',
          itemSelectText: '',
        });

        ySettingParameters.passedElement.addEventListener('addItem', function(event) {
            that.yAxisLabel = null;
            let renSett = that.renderSettings;
            // Check if the yAxis is currently showing a time parameter and the
            // new parameter is not, then we remove the previous time parameter
            if(that.yTimeScale){
               renSett.yAxis.pop();
               renSett.yAxis.push(event.detail.value);
               renSett.colorAxis[that.renderSettings.yAxis.length-1] = null;
            } else {
                // If newly added parameter is a time scale we remove also the
                // previous parameters from the y scale
                if(that.checkTimeScale(event.detail.value)){
                    let y2ColScale = renSett.colorAxis.slice(
                        renSett.yAxis.length-1, renSett.colorAxis.length);
                    if(y2ColScale.length > 0){
                        renSett.colorAxis = [null].concat(y2ColScale);
                    }else {
                        renSett.colorAxis = [null];
                    }
                    renSett.yAxis = [event.detail.value];
                } else {
                    renSett.yAxis.push(event.detail.value);
                    // If y2 axis has parameters we need to add the coloraxis element
                    // taking them into account as color axis is shared
                    if(renSett.y2Axis.length > 0){
                        renSett.colorAxis.splice(
                            renSett.yAxis.length-1, 0, null
                        );
                    } else {
                        renSett.colorAxis.push(null);
                    }
                }
            }
            
            that.recalculateBufferSize();
            that.initAxis();
            that.renderData();
            that.createAxisLabels();
            /**
            * Event is fired When modifying a parameter for any of the 
            * axis settings.
            * @event module:graphly.graphly#axisChange
            */
            that.emit('axisChange');
        },false);
        ySettingParameters.passedElement.addEventListener('removeItem', function(event) {
            that.yAxisLabel = null;
            let index = that.renderSettings.yAxis.indexOf(event.detail.value);
            // TODO: Should it happen that the removed item is not in the list?
            // Do we need to handle this case? 
            if(index!==-1){
                that.renderSettings.yAxis.splice(index, 1);
                that.renderSettings.colorAxis.splice(index, 1);
                that.initAxis();
                that.renderData();
                that.createAxisLabels();
                that.emit('axisChange');
            }
        },false);


        // Create labels for y2 axis

        let uniqY2 = this.renderSettings.y2Axis;
        listText = [];
        // Add uom info to unique elements
        for (let i = 0; i < uniqY2.length; i++) {
            if(this.dataSettings.hasOwnProperty(uniqY2[i]) && 
               this.dataSettings[uniqY2[i]].hasOwnProperty('uom') &&
               this.dataSettings[uniqY2[i]].uom !== null){
                listText.push(uniqY2[i]+' ['+this.dataSettings[uniqY2[i]].uom+'] ');
            }else{
                listText.push(uniqY2[i]);
            }
        }
        let addMar = this.margin.right + this.marginY2Offset - 10;
        if(listText.length === 0){
            // No items selected, add "filler text"
            listText.push('Add parameter ...');
            addMar = 20;
        }
        if(this.y2AxisLabel){
            listText = [this.y2AxisLabel];
        }
        
        let labely2text = this.svg.append('text')
            .attr('class', 'y2AxisLabel axisLabel')
            .attr('text-anchor', 'middle')
            .attr('transform', 
                'translate('+ (this.width+addMar) +','+
                (this.height/2)+')rotate(-90)'
            )
            .attr('fill', '#007bff')
            .attr('stroke', 'none')
            .attr('font-weight', 'bold')
            .attr('text-decoration', 'none')
            .text(listText.join(', '));

        this.addTextMouseover(labely2text);

        this.el.select('#y2Settings').remove();

        this.el.append('div')
            .attr('id', 'y2Settings')
            .style('display', function(){
                return y2Hidden ? 'none' : 'block';
            })
            .style('top', this.height/2+'px')
            .style('left', (this.width-165)+'px')
            .append('select')
                .attr('id', 'y2ScaleChoices');

        this.el.select('#y2Settings').append('div')
            .attr('class', 'labelClose cross')
            .on('click', ()=>{
                this.el.select('#y2Settings').style('display', 'none');
            });

        con = this.el.select('#y2Settings').append('div')
            .attr('class', 'axisOption');
        con.append('input')
            .attr('id', 'y2AxisCustomLabel')
            .attr('type', 'text')
            .property('value', listText.join(', '))
            .on('input', function(){
                that.el.select('.y2AxisLabel.axisLabel').text(this.value);
                that.y2AxisLabel = this.value;
            });
        con.append('label')
            .attr('for', 'y2AxisCustomLabel')
            .text('Label');

        con = this.el.select('#y2Settings').append('div')
            .attr('class', 'axisOption');

        if(!this.y2TimeScale){
            con.append('input')
                .attr('id', 'logY2option')
                .attr('type', 'checkbox')
                .property('checked', 
                    defaultFor(that.logY2, false)
                )
                .on('change', function(){
                    that.logY2 = !that.logY2;
                    that.initAxis();
                    that.renderData();
                });

            con.append('label')
                .attr('for', 'logY2option')
                .text('Logarithmic scale (base-10) ');
        }

        this.el.select('#y2ScaleChoices').attr('multiple', true);

        this.el.select('.y2AxisLabel.axisLabel').on('click', ()=>{
            if(this.el.select('#y2Settings').style('display') === 'block'){
                this.el.select('#y2Settings').style('display', 'none');
            }else{
                this.el.select('#y2Settings').style('display', 'block');
            }
        });

        let y2SettingParameters = new Choices(this.el.select('#y2ScaleChoices').node(), {
          choices: y2Choices,
          removeItemButton: true,
          placeholderValue: ' select ...',
          itemSelectText: '',
        });

        y2SettingParameters.passedElement.addEventListener('addItem', function(event) {
            let renSett = that.renderSettings;
            that.y2AxisLabel = null;
            // Check if the y2Axis is currently showing a time parameter and the
            // new parameter is not, then we remove the previous time parameter
            if(that.y2TimeScale){
               renSett.y2Axis.pop();
               renSett.y2Axis.push(event.detail.value);
               renSett.colorAxis[renSett.y2Axis.length-1] = null;
            } else {
                // If newly added parameter is a time scale we remove also the
                // previous parameters from the y scale
                if(that.checkTimeScale(event.detail.value)){
                    for (var i = renSett.y2Axis.length - 1; i >= 0; i--) {
                        renSett.y2Axis.pop();
                        renSett.colorAxis.pop();
                    }
                    renSett.y2Axis.push(event.detail.value);
                    renSett.colorAxis.push(null);
                } else {
                    renSett.y2Axis.push(event.detail.value);
                    renSett.colorAxis.push(null);
                }
            }

            that.recalculateBufferSize();
            that.initAxis();
            that.renderData();
            that.createAxisLabels();
            that.emit('axisChange');
            // One item was added and none where before, we resize the right margin
            if(that.renderSettings.y2Axis.length === 1){
                that.resize();
            }
        },false);
        y2SettingParameters.passedElement.addEventListener('removeItem', function(event) {
            that.y2AxisLabel = null;
            let index = that.renderSettings.y2Axis.indexOf(event.detail.value);
            // TODO: Should it happen that the removed item is not in the list?
            // Do we need to handle this case? 
            if(index!==-1){
                that.renderSettings.y2Axis.splice(index, 1);
                that.renderSettings.colorAxis.splice((index+that.renderSettings.yAxis.length), 1);
                that.initAxis();
                that.renderData();
                that.createAxisLabels();
                that.emit('axisChange');
                // No items in y2 axis we resize the right margin
                if(that.renderSettings.y2Axis.length === 0){
                    that.resize();
                }
            }
        },false);


        let xLabel = this.renderSettings.xAxis;
        if(this.dataSettings.hasOwnProperty(xLabel) && 
           this.dataSettings[xLabel].hasOwnProperty('uom') &&
           this.dataSettings[xLabel].uom !== null){
            xLabel+=' ['+this.dataSettings[xLabel].uom+']';
        }
        if(this.xAxisLabel){
            xLabel = this.xAxisLabel;
        }

        let labelxtext = this.svg.append('text')
            .attr('class', 'xAxisLabel axisLabel')
            .attr('text-anchor', 'middle')
            .attr('transform', 'translate('+ (this.width/2) +','+(this.height+(this.margin.bottom-10))+')')
            .attr('fill', '#007bff')
            .attr('stroke', 'none')
            .attr('font-weight', 'bold')
            .attr('text-decoration', 'none')
            .text(xLabel);

        this.addTextMouseover(labelxtext);

        this.el.select('#xSettings').remove();

        this.el.append('div')
            .attr('id', 'xSettings')
            .style('display', function(){
                return xHidden ? 'none' : 'block'; 
            })
            .style('bottom', this.margin.bottom+'px')
            .style('left', this.width/2-this.margin.left+50+'px')
            .append('select')
                .attr('id', 'xScaleChoices');

        this.el.select('#xSettings').append('div')
            .attr('class', 'labelClose cross')
            .on('click', ()=>{
                this.el.select('#xSettings').style('display', 'none');
            });

        this.el.select('.xAxisLabel.axisLabel').on('click', ()=>{
            if(this.el.select('#xSettings').style('display') === 'block'){
                this.el.select('#xSettings').style('display', 'none');
            }else{
                this.el.select('#xSettings').style('display', 'block');
            }
        });

        var xSettingParameters = new Choices(this.el.select('#xScaleChoices').node(), {
          choices: xChoices,
          placeholderValue: ' select ...',
          itemSelectText: '',
        });

        con = this.el.select('#xSettings').append('div')
            .attr('class', 'axisOption');
        con.append('input')
            .attr('id', 'xAxisCustomLabel')
            .attr('type', 'text')
            .property('value', xLabel)
            .on('input', function(){
                that.el.select('.xAxisLabel.axisLabel').text(this.value);
                that.xAxisLabel = this.value;
            });
        con.append('label')
            .attr('for', 'xAxisCustomLabel')
            .text('Label');

        xSettingParameters.passedElement.addEventListener('change', function(event) {
            that.xAxisLabel = null;
            that.renderSettings.xAxis = event.detail.value;
            that.recalculateBufferSize();
            that.initAxis();
            that.renderData();
            that.createAxisLabels();
            that.emit('axisChange');
        },false);

    }

    createColorScale(id, index){

        let ds = this.dataSettings[id];
        let dataRange = [0,1];

        if(ds.hasOwnProperty('extent')){
            dataRange = ds.extent;
        }

        let innerHeight = this.height;
        let width = 100;

        // Ther are some situations where the object is not initialiezed 
        // completely and size can be 0 or negative, this should prevent this
        if(innerHeight<=0){
            innerHeight = 100;
        }

        let colorAxisScale = d3.scale.linear();
        colorAxisScale.domain(dataRange);
        colorAxisScale.range([innerHeight, 0]);

        let colorAxis = d3.svg.axis()
            .orient("right")
            .tickSize(5)
            .scale(colorAxisScale);

        let step = (colorAxisScale.domain()[1] - colorAxisScale.domain()[0]) / 10;

        colorAxis.tickFormat(d3.format(this.colorAxisTickFormat));

        let csOffset = this.margin.right + this.marginY2Offset + width/2 + width*index;
        
        let g = this.el.select('svg').select('g').append("g")
            .attr('id', ('colorscale_'+id))
            .attr("class", "color axis")
            .style('pointer-events', 'all')
            .attr("transform", "translate(" + (this.width+csOffset) + ",0)")
            .call(colorAxis);

        // Check if parameter has specific colorscale configured
        let cs = 'viridis';
        let cA = this.dataSettings[id];
        if (cA && cA.hasOwnProperty('colorscale')){
            cs = cA.colorscale;
        }

        // If current cs not equal to the set in the plotter update cs
        if(cs !== this.plotter.name){
            this.plotter.setColorScale(cs);
        }
        let image = this.plotter.getColorScaleImage().toDataURL("image/jpg");

        g.append("image")
            .attr("class", "colorscaleimage")
            .attr("width",  innerHeight)
            .attr("height", 20)
            .attr("transform", "translate(" + (-25) + " ,"+(innerHeight)+") rotate(270)")
            .attr("preserveAspectRatio", "none")
            .attr("xlink:href", image);

        let label = id;

        if(this.dataSettings.hasOwnProperty(id) && 
           this.dataSettings[id].hasOwnProperty('uom') && 
           this.dataSettings[id].uom !== null){
            label += ' ['+this.dataSettings[id].uom+'] ';
        }

        g.append('text')
            .attr('text-anchor', 'middle')
            .attr('transform', 'translate(' + (-35) + ' ,'+(innerHeight/2)+') rotate(270)')
            .text(label);

        let csZoomEvent = ()=>{
            delete this.colorCache[id];
            g.call(colorAxis);
            this.dataSettings[id].extent = colorAxisScale.domain();
            this.renderData();
        };

        let csZoom = d3.behavior.zoom()
          .y(colorAxisScale)
          .on('zoom', csZoomEvent);

        g.call(csZoom);
    }

    createColorScales(){

        let filteredCol = this.renderSettings.colorAxis.filter(
            (c)=>{return c!==null;}
        );

        this.el.selectAll('.color.axis').remove();

        for (var i = 0; i < filteredCol.length; i++) {
            this.createColorScale(filteredCol[i], i);
        }



    }

    /**
    * Get currant canvas as data URI (using toDataURL).
    * @return {DOMString} A DOMString containing the requested image data URI.
    */
    getCanvasImage(){
        return this.renderCanvas.node().toDataURL();
    }

    /**
    * Get currant canvas node.
    * @return {HTMLElement} Canvas DOM node element.
    */
    getCanvas(){
        return this.renderCanvas.node();
    }


    createHelperObjects(){
        this.renderingContainer = this.svg.append('g')
            .attr('id','renderingContainer')
            .attr('fill', 'none')
            .style('clip-path','url('+this.nsId+'clipbox)');

        // Add clip path so only points in the area are shown
        let clippath = this.svg.append('defs').append('clipPath')
            .attr('id', (this.nsId.substring(1)+'clipbox'))
            .append('rect')
                .attr('fill', 'none')
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

        if(this.renderSettings.y2Axis.length>0){
            this.svg.append('rect')
                .attr('id', 'zoomY2Box')
                .attr('width', this.margin.right + this.marginY2Offset)
                .attr('height', this.height )
                .attr('transform', 'translate(' + (
                    this.width
                    ) + ',' + 0 + ')'
                )
                .attr('fill', 'red')
                .style('visibility', 'hidden')
                .attr('pointer-events', 'all');
        }

        // Add rectangle as 'outline' for plot
        this.svg.append('rect')
            .attr('id', 'rectangleOutline')
            .attr('fill', 'none')
            .attr('stroke', '#ccc')
            .attr('stroke-width', 1)
            .attr('shape-rendering', 'crispEdges')
            .attr('width', this.width)
            .attr('height', this.height);

        this.createColorScales();
        this.createInfoBoxes();
        this.createParameterInfo();

        // Add settings button to display/hide parameter information
        if(!this.displayParameterLabel) {
            if(this.el.select('#cogIcon').empty()){
                this.el.append('div')
                    .attr('id', 'cogIcon')
                    .style('left', (this.margin.left)+'px')
                    .style('top', '10px')
                    .on('click', ()=>{
                        let info = this.el.select('#parameterInfo');
                        if(info.style('visibility') == 'visible'){
                            info.style('visibility', 'hidden');
                            this.el.select('#parameterSettings')
                                .style('display', 'none');
                            this.displayParameterLabel = false;
                        }else{
                            info.style('visibility', 'visible');
                            this.displayParameterLabel = true;
                        }
                    })
                    .on('mouseover', function(){
                        d3.select(this).style('background-size', '45px 45px');
                    })
                    .on('mouseout', function(){
                        d3.select(this).style('background-size', '41px 41px');
                    });
            }
        }

    }

    
    /**
    * Load data from csv file.
    * @param {String} url Path/url to csv file
    */
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
        let parAmount = 0;
        if(this.renderSettings.hasOwnProperty('yAxis')){
            parAmount += this.renderSettings.yAxis.length;
        }
        if(this.renderSettings.hasOwnProperty('y2Axis')){
            parAmount += this.renderSettings.y2Axis.length;
        }
        max = max * parAmount * 2;

        this.updateBuffers(this.batchDrawer, ++max);

        if(!this.fixedSize){
            this.updateBuffers(this.batchDrawerReference, ++max);
        }
    }

    setXDomain(domain){
        this.fixedXDomain = domain;
    }

    clearXDomain(){
        this.fixedXDomain = undefined;
    }

    setDefaultValues(){
        // Add some default values for datasettings if nothing is defined yet
        let keys = Object.keys(this.data);
        for (var i = 0; i < keys.length; i++) {

            // If the parameter is multi-Id we initialize it differnetly
            if (this.renderSettings.hasOwnProperty('dataIdentifier')){
                let parIds = this.renderSettings.dataIdentifier.identifiers;
                if(!this.dataSettings.hasOwnProperty(keys[i]) ){
                    this.dataSettings[keys[i]] = {};
                }
                for (let j = 0; j < parIds.length; j++) {
                    if(!this.dataSettings[keys[i]].hasOwnProperty(parIds[j])) {
                        this.dataSettings[keys[i]][parIds[j]] = {
                            symbol: 'circle',
                            color: [Math.random(), Math.random(), Math.random()],
                            alpha: this.defaultAlpha
                        };
                    }
                }

            } else {
                if(!this.dataSettings.hasOwnProperty(keys[i])) {
                    this.dataSettings[keys[i]] = {
                        uom: null,
                        color: [Math.random(), Math.random(), Math.random()],
                        alpha: this.defaultAlpha
                    };
                }
            }

        }
    }

    /**
    * Load data from data object
    * @param {Object} data Data object containing parameter identifier as keys and 
             arrays of values as corresponding parameter. {'parId1': [1, 2, 3], 
             'parId2': [0.6, 0.1, 3.2]}
    */
    loadData(data){
        
        // Clean colorcache
        for(let k in this.colorCache){
            delete this.colorCache[k];
        }

        this.data = {};
        for (var dk in data){
            // Ignore keys added to ignore list
            var ignoreKey = false;
            for (var i = 0; i < this.ignoreParameters.length; i++) {
                if(this.ignoreParameters[i] instanceof RegExp){
                    if(this.ignoreParameters[i].test(dk)){
                        ignoreKey = true;
                    }
                } else if ( typeof(this.ignoreParameters[i]) === 'string' ){
                    if(dk === this.ignoreParameters[i]){
                        ignoreKey = true;
                    }
                }
            }
            if(!ignoreKey){
                this.data[dk] = data[dk];
            }
        };

        this.timeScales = [];

        this.renderSettings.combinedParameters = defaultFor(
            this.renderSettings.combinedParameters, {}
        );

        this.recalculateBufferSize();

        // Check for special formatting of data
        let ds = this.dataSettings;
        for (let key in ds) {
            
            if (ds[key].hasOwnProperty('scaleFormat')){
                if (ds[key].scaleFormat === 'time'){
                    this.timeScales.push(key);
                    let format = defaultFor(ds[key].timeFormat, 'default');

                    // Check if key is available in data first
                    if(this.data.hasOwnProperty(key)){
                        // Sanity check to see if data already a date object
                        if (!(this.data[key][0] instanceof Date)){
                            switch(format){
                                case 'default':
                                for (let i = 0; i < this.data[key].length; i++) {
                                    this.data[key][i] = new Date(this.data[key][i]);
                                }
                                break;
                                case 'MJD2000_S':
                                for (let j = 0; j < this.data[key].length; j++) {
                                    let d = new Date('2000-01-01');
                                    d.setUTCMilliseconds(d.getUTCMilliseconds() + this.data[key][j]*1000);
                                    this.data[key][j] = d;
                                }
                                break;
                            }
                        }
                    }
                }
            }
        }

        this.applyDataFilters();
        this.setDefaultValues();

        // Add some default values for combined params datasettings if nothing 
        // is defined yet
        if(this.renderSettings.hasOwnProperty('combinedParameters')){
            for (let cP in this.renderSettings.combinedParameters) {
                if( !this.dataSettings.hasOwnProperty(cP) ){
                    this.dataSettings[cP] = {
                        uom: null,
                        color: [Math.random(), Math.random(), Math.random()],
                        alpha: this.defaultAlpha
                    };
                }
            }
        }
        
        this.initAxis();
        this.renderData();
    }

    checkTimeScale(id) {
        // See if id is from combined dataset
        if(this.renderSettings.combinedParameters.hasOwnProperty(id)){
            id = this.renderSettings.combinedParameters[id][0];
        }
        if (this.dataSettings.hasOwnProperty(id)){
            if (this.dataSettings[id].hasOwnProperty('scaleFormat')){
                if (this.dataSettings[id].scaleFormat === 'time'){
                    return true;
                }
            }
        }
        return false;
    }

    calculateExtent(selection) {
        let currExt, resExt; 
        for (var i = selection.length - 1; i >= 0; i--) {
            currExt = d3.extent(this.data[selection[i]]);
            if(resExt){
                if(currExt[0]<resExt[0]){
                    resExt[0] = currExt[0];
                }
                if(currExt[1]>resExt[1]){
                    resExt[1] = currExt[1];
                }
            }else{
                resExt = currExt;
            }
        }
        if(selection.length === 0){
            return [0,1];
        }
        if(resExt[0] == resExt[1]){
            resExt[0]-=1;
            resExt[1]+=1;
        }
        return resExt;
    }

    initAxis(){

        this.svg.selectAll('*').remove();

        let xExtent, yExtent, y2Extent;

        // "Flatten selections"
        let xSelection = [];
        let ySelection = [];
        let y2Selection = [];
        let rs = this.renderSettings;

        this.renderSettings.y2Axis = defaultFor(this.renderSettings.y2Axis, []);

        if(rs.combinedParameters.hasOwnProperty(rs.xAxis)){
            xSelection = [].concat.apply([], rs.combinedParameters[rs.xAxis]);
        } else {
            xSelection.push(this.renderSettings.xAxis);
        }

        for (var h = 0; h < this.renderSettings.yAxis.length; h++) {
            if(rs.combinedParameters.hasOwnProperty(rs.yAxis[h])){
                ySelection = [].concat.apply([], rs.combinedParameters[rs.yAxis[h]]);
            } else {
                ySelection.push(this.renderSettings.yAxis[h]);
            }
        }

        for (var i = 0; i < this.renderSettings.y2Axis.length; i++) {
            if(rs.combinedParameters.hasOwnProperty(rs.y2Axis[i])){
                y2Selection = [].concat.apply([], rs.combinedParameters[rs.y2Axis[i]]);
            } else {
                y2Selection.push(this.renderSettings.y2Axis[i]);
            }
        }



        if(this.fixedXDomain !== undefined){
            xExtent = this.fixedXDomain;
        } else {
            xExtent = this.calculateExtent(xSelection);
        }
        yExtent = this.calculateExtent(ySelection);
        y2Extent = this.calculateExtent(y2Selection);

        let xRange = xExtent[1] - xExtent[0];
        let yRange = yExtent[1] - yExtent[0];
        let y2Range = y2Extent[1] - y2Extent[0];

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
                        // Set current calculated extent to settings
                        this.dataSettings[cAxis[ca]].extent = domain;
                    }
                    
                }
            }
        }

        // TODO: Allow multiple domains!
        if(domain){
            this.plotter.setDomain(domain);
        }


        let xScaleType, yScaleType, y2ScaleType;
        // TODO: how to handle multiple different scale types
        // For now just check first object of scale
        this.xTimeScale = this.checkTimeScale(xSelection[0]);
        this.yTimeScale = this.checkTimeScale(ySelection[0]);
        this.y2TimeScale = this.checkTimeScale(y2Selection[0]);

        function getScale(isTime){
            if(isTime){
                return d3.time.scale.utc();
            } else {
                return d3.scale.linear();
            }
        }

        xScaleType = getScale(this.xTimeScale);
        yScaleType = getScale(this.yTimeScale);
        y2ScaleType = getScale(this.y2TimeScale);

        function calcExtent(extent, range, timescale, margin){
            margin = defaultFor(margin, [0.01, 0.01]);
            let returnExt = [];
            if(timescale){
                range = extent[1].getTime() - extent[0].getTime();
                returnExt[0] = new Date(extent[0].getTime() - range*margin[0]);
                returnExt[1] = new Date(extent[1].getTime() + range*margin[1]);
            }else{
                returnExt[0] = extent[0] - range*margin[0];
                returnExt[1] = extent[1] + range*margin[1];
            }
            return returnExt;
        }

        // Adapt domain so that data is not directly at border
        if(!this.fixedSize){
            yExtent = calcExtent(yExtent, yRange, this.yTimeScale, [0.02, 0.02]);
            y2Extent = calcExtent(y2Extent, y2Range, this.y2TimeScale, [0.02, 0.02]);
            xExtent = calcExtent(xExtent, xRange, this.xTimeScale);
        }

        this.xScale = xScaleType
            .domain([xExtent[0], xExtent[1]])
            .range([0, this.width]);


        if(this.logY){
            let start = yExtent[0];
            let end = yExtent[1];

            // if both positive or negative all fine else
            if(yExtent[0]<=0 && yExtent[1]>0){
                start = 0.005;
            }
            if(yExtent[0]>=0 && yExtent[1]<0){
                start = -0.005;
            }

            this.yScale = d3.scale.log()
                .domain([start,end])
                .range([this.height, 0]);
        }else{
            this.yScale = yScaleType
                .domain(yExtent)
                .range([this.height, 0]);
        }

        if(this.logY2){
            let start = y2Extent[0];
            let end = y2Extent[1];

            // if both positive or negative all fine else
            if(y2Extent[0]<=0 && y2Extent[1]>0){
                start = 0.005;
            }
            if(y2Extent[0]>=0 && y2Extent[1]<0){
                start = -0.005;
            }

            this.y2Scale = d3.scale.log()
                .domain([start,end])
                .range([this.height, 0]);
        }else{
            this.y2Scale = y2ScaleType
                .domain(y2Extent)
                .range([this.height, 0]);
        }

        this.xAxis = d3.svg.axis()
            .scale(this.xScale)
            .orient('bottom')
            .ticks(Math.max(this.width/120,2))
            .tickSize(-this.height);
        if(this.xTimeScale){
            this.xAxis.tickFormat(u.getCutomUTCTimeTickFormat());
        }
        // Check if axis is using periodic parameter
        let tickformat = d3.format('g');
        if(this.dataSettings.hasOwnProperty(xSelection) && 
           this.dataSettings[xSelection].hasOwnProperty('periodic')){

            this.xAxis.tickFormat((d,i)=>{
                let offset = defaultFor(
                    this.dataSettings[xSelection].periodic.offset, 0
                );
                let period = this.dataSettings[xSelection].periodic.period;

                let dm = d-offset;
                if(d<0){
                    dm = d-offset;
                }
                let offsetAmount = Math.floor(dm/period);
                if(dm%period !== 0){
                    d -= offsetAmount*period;
                    d = tickformat(d.toFixed(10));
                } else {
                    d = tickformat(period+offset)+' / '+tickformat(offset);
                }
                return d;
            });
        }

        this.yAxis = d3.svg.axis()
            .scale(this.yScale)
            .innerTickSize(-this.width)
            .outerTickSize(0)
            .orient('left');
        if(this.yTimeScale){
            this.yAxis.tickFormat(u.getCutomUTCTimeTickFormat());
        }

        this.y2Axis = d3.svg.axis()
            .scale(this.y2Scale)
            .innerTickSize(this.width)
            .outerTickSize(0)
            .orient('right');
        if(this.y2TimeScale){
            this.y2Axis.tickFormat(u.getCutomUTCTimeTickFormat());
        }

        this.xAxisSvg = this.svg.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0,' + this.height + ')')
            .call(this.xAxis);

        if(this.renderSettings.yAxis.length > 0){
            this.yAxisSvg = this.svg.append('g')
                .attr('class', 'y axis')
                .call(this.yAxis);
        }

        if(this.renderSettings.y2Axis.length > 0){
            this.y2AxisSvg = this.svg.append('g')
                .attr('class', 'y2 axis')
                .call(this.y2Axis);
        }

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

        this.y2zoom = d3.behavior.zoom()
          .y(this.y2Scale)
          .on('zoom', this.previewZoom.bind(this));


        // Limit zoom step to 10% of scale size to make sure zoom kumps are not
        // to big. Solves issue on big zoom jumps in Firefox (FF)
        /*this.xyzoom.scaleExtent([
            this.xyzoom.scale()*0.9,
            this.xyzoom.scale()*1.1
        ]);*/

        this.createHelperObjects();
        this.addTimeInformation();


        this.renderCanvas.call(this.xyzoom);
        this.el.select('#zoomXBox').call(this.xzoom);
        this.el.select('#zoomYBox').call(this.yzoom);
        this.el.select('#zoomY2Box').call(this.y2zoom);

        this.createAxisLabels();
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
        this.y2zoom = d3.behavior.zoom()
            .y(this.y2Scale)
            .on('zoom', this.previewZoom.bind(this));

        this.renderCanvas.call(this.xyzoom);
        this.el.select('#zoomXBox').call(this.xzoom);
        this.el.select('#zoomYBox').call(this.yzoom);
        this.el.select('#zoomY2Box').call(this.y2zoom);


    }

    onZoom() {
        this.zoom_update();
        this.renderData();
    }


    addTimeInformation() {

        let dateFormat = d3.time.format.utc('%Y-%m-%dT%H:%M:%S');
        this.el.selectAll('.start-date').remove();
        this.el.selectAll('.end-date').remove();

        if(this.xTimeScale) {
            this.el.selectAll('.x.axis>.tick:nth-of-type(2)')
                .append('text')
                .attr('dy', '28px')
                .attr('dx', '-64px')
                .attr('class', 'start-date')
                .text(function(d){return dateFormat(d);});
            this.el.selectAll('.x.axis>.tick:nth-last-of-type(2)')
                .append('text')
                .attr('dy', '28px')
                .attr('dx', '-64px')
                .attr('class', 'end-date')
                .text(function(d){return dateFormat(d);});
        }
        if(this.yTimeScale) {
            this.el.selectAll('.y.axis>.tick:nth-of-type(2)')
                .append('text')
                .attr('dy', '-42px')
                .attr('dx', '-60px')
                .attr("transform", "rotate(-90)")
                .attr('class', 'start-date')
                .text(function(d){return dateFormat(d);});
            this.el.selectAll('.y.axis>.tick:nth-last-of-type(2)')
                .append('text')
                .attr('dy', '-42px')
                .attr('dx', '-60px')
                .attr("transform", "rotate(-90)")
                .attr('class', 'end-date')
                .text(function(d){return dateFormat(d);});
        }
        if(this.y2TimeScale) {
            this.el.selectAll('.y2.axis>.tick:nth-of-type(2)')
                .append('text')
                .attr('dy', this.width+52)
                .attr('dx', '-60px')
                .attr("transform", "rotate(-90)")
                .attr('class', 'start-date')
                .text(function(d){return dateFormat(d);});
            this.el.selectAll('.y2.axis>.tick:nth-last-of-type(2)')
                .append('text')
                .attr('dy',  this.width+52)
                .attr('dx', '-60px')
                .attr("transform", "rotate(-90)")
                .attr('class', 'end-date')
                .text(function(d){return dateFormat(d);});
        }
    }


    triggerZoomPreview(xZoom, xyZoom, xAxis, xScale){

        // TODO: Only passing the zoom scale and translate is possible
        // and should be the best way to synchronize axis, but with the debounce
        // zoom the scale and translate is reset, to manage the overview image
        // correctly which breaks the functionality...
        
        /*var xytrns = xyZoom.translate();
        let xtrns = xZoom.translate();

        if(xyZoom.scale() !== 1 || (xytrns[0]!==0 && xytrns[1]!==0) ){
            this.xzoom.scale(xyZoom.scale()).translate(xyZoom.translate());
        }else if(xZoom.scale() !== 1 || (xtrns[0]!==0 && xtrns[1]!==0) ){
            this.xzoom.scale(xZoom.scale()).translate(xZoom.translate());
        }*/

        this.xzoom = xZoom;

        var xytrns = xyZoom.translate();

        if(xyZoom.scale() !== 1 || (xytrns[0]!==0 && xytrns[1]!==0) ){
            this.xzoom = xyZoom;
        }

        this.xAxis = xAxis;
        this.xScale = xScale;

        this.slaveGraph = true;
        this.previewZoom();

    }

    previewZoom() {

        // Zooming out
        let nonUnScale = false;
        if(d3.event.scale < 1){
            let xSel = this.renderSettings.xAxis;
            // Check if we have a periodic scale where we have to limit zoom out
            if(this.dataSettings.hasOwnProperty(xSel) &&
               this.dataSettings[xSel].hasOwnProperty('periodic') ){
                let period = this.dataSettings[xSel].periodic.period;
                let xdom = this.xScale.domain();
                if(xdom[1]-xdom[0] >= period){
                    this.xzoom.scale(1);
                    this.xzoom.translate([0,0]);
                    nonUnScale = true;
                }
            }
        }

        this.topSvg.selectAll('.temporary').remove();
        this.tooltip.style('display', 'none');

        if(this.connectedGraph && !this.slaveGraph){
            this.connectedGraph.triggerZoomPreview(
                this.xzoom, this.xyzoom,
                this.xAxis, this.xScale
            );
        }else if(this.slaveGraph){
            this.slaveGraph = false;
        }


        this.xAxisSvg.call(this.xAxis);

        if(this.renderSettings.yAxis.length > 0){
            this.yAxisSvg.call(this.yAxis);
        }

        this.addTimeInformation();

        // Limit zoom step to 10% of scale size to make sure zoom kumps are not
        // to big. Solves issue on big zoom jumps in Firefox (FF)
        /*this.xyzoom.scaleExtent([
            this.xyzoom.scale()*0.9,
            this.xyzoom.scale()*1.1
        ]);*/

        let xScale = this.xzoom.scale();
        let yScale = this.yzoom.scale();
        let y2Scale = this.y2zoom.scale();
        let xyScale = this.xyzoom.scale();

        let transXY = this.xyzoom.translate();
        let transX = this.xzoom.translate();
        let transY = this.yzoom.translate();
        let transY2 = this.y2zoom.translate();

        if(this.renderSettings.y2Axis.length > 0){
            if(transXY[0] !== 0 || transXY[1]!==0 || xyScale !== 1){
                this.y2zoom
                    .scale(xyScale)
                    .translate(transXY);
            }
            this.y2AxisSvg.call(this.y2Axis);
        }
        

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
                this.svg.select('#previewImage2').style('display', 'block');
            }


            if(xyScale!==1.0){
                if(!nonUnScale){
                    this.svg.select('#previewImage').attr('transform', 'translate(' + 
                    transXY + ')scale(' + xyScale + ')');
                    this.svg.select('#previewImage2').attr('transform', 'translate(' + 
                    transXY + ')scale(' + xyScale + ')');
                } else {
                    transXY[0] = 0;
                    this.svg.select('#previewImage').attr('transform', 'translate(' + 
                    transXY + ')scale(' + [1,xyScale] + ')');
                    this.svg.select('#previewImage2').attr('transform', 'translate(' + 
                    transXY + ')scale(' + [1,xyScale] + ')');
                }
            }else if(xScale !== 1.0){
                this.svg.select('#previewImage').attr('transform', 'translate(' + 
                [transX[0], 0.0] + ')scale(' + [xScale, 1.0] + ')');
                this.svg.select('#previewImage2').attr('transform', 'translate(' + 
                [transX[0], 0.0] + ')scale(' + [xScale, 1.0] + ')');
            }else if(yScale !== 1.0){
                this.svg.select('#previewImage').attr('transform', 'translate(' + 
                [0.0, transY[1.0]] + ')scale(' + [1.0, yScale] + ')');
            }else if(y2Scale !== 1.0){
                this.svg.select('#previewImage2').attr('transform', 'translate(' + 
                [0.0, transY2[1.0]] + ')scale(' + [1.0, y2Scale] + ')');
            }else if(transXY[0]!==0.0 || transXY[1] !==0.0){
                this.svg.select('#previewImage').attr('transform', 'translate(' + 
                transXY + ')scale(1)');
                this.svg.select('#previewImage2').attr('transform', 'translate(' + 
                transXY + ')scale(1)');
            }else if(transX[0]!==0.0 || transX[1] !==0.0){
                this.svg.select('#previewImage').attr('transform', 'translate(' + 
                [transX[0], 0.0] + ')scale(1)');
                this.svg.select('#previewImage2').attr('transform', 'translate(' + 
                [transX[0], 0.0] + ')scale(1)');
            }else if(transY[0]!==0.0 || transY[1] !==0.0){
                this.svg.select('#previewImage').attr('transform', 'translate(' + 
                [0.0, transY[1.0]] + ')scale(1)');
            }else if(transY2[0]!==0.0 || transY2[1] !==0.0){
                this.svg.select('#previewImage2').attr('transform', 'translate(' + 
                [0.0, transY2[1.0]] + ')scale(1)');
            }

        }else{
            this.debounceZoom.bind(this)();
            // While interaction is happening only render visible plot once
            // debounce finished render also reference canvas to allow interaction
            this.renderData(false);
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

    renderRegression(data, reg, yScale, color, thickness) {
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
            case 'linear': {
                result = regression('linear', data);
                let slope = result.equation[0];
                let yIntercept = result.equation[1];

                let yPoints = [
                    xPoints[0]*slope + yIntercept,
                    xPoints[1]*slope + yIntercept,
                ];

                xPoints = xPoints.map(this.xScale);
                yPoints = yPoints.map(yScale);

                this.batchDrawer.addLine(
                    xPoints[1], yPoints[1],
                    xPoints[0], yPoints[0], 1,
                    c[0], c[1], c[2], c[3]
                );
                break;
            }
            case 'polynomial': {
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
                    py1 = yScale(y1);
                    py2 = yScale(y2);

                    this.batchDrawer.addLine(
                        px1, py1,
                        px2, py2, 1,
                        c[0], c[1], c[2], c[3]
                    );
                }
                break;
            }
        }

        if(typeof reg.type !== 'undefined'){
            // render regression label
            let regrString = '';
            for (var rPos = result.equation.length - 1; rPos >= 0; rPos--) {
                regrString += result.equation[rPos].toPrecision(4);
                if(rPos>1){
                    regrString += 'x<sup>'+rPos+'</sup>';
                } else if (rPos === 1){
                    regrString += 'x';
                }
                if(rPos>0){
                    regrString += ' + ';
                }
            }
            regrString += '  (r<sup>2</sup>: '+ (result.r2).toPrecision(4)+')';

            this.el.select('#regressionInfo')
                .append('div')
                .style('color', u.rgbToHex(c[0], c[1], c[2]))
                .style('opacity', c[3])
                .html(u.createSuperscript(regrString));
        }
    }

    createRegression(data, parPos, yAxRen, inactive) {

        let xAxRen = this.renderSettings.xAxis;
        let resultData;
        inactive = defaultFor(inactive, false);

        //Check if data has identifier creating multiple datasets
        if (this.renderSettings.hasOwnProperty('dataIdentifier')){

            let datIds = this.renderSettings.dataIdentifier.identifiers;
            for (let i = 0; i < datIds.length; i++) {

                // Check if regression is activated for this parameter and id
                let id = datIds[i];
                let regSett = this.dataSettings[yAxRen[parPos]];

                if( this.dataSettings[yAxRen[parPos]].hasOwnProperty(id) ){
                    regSett = regSett[id];
                }

                let reg = {
                    type: regSett.regression,
                    order: regSett.regressionOrder
                };

                if(reg.type === undefined){
                    continue;
                }
                
                let parId = this.renderSettings.dataIdentifier.parameter;

                let filterFunc = function (d,i){
                    return data[parId][i] === id;
                };

                var filteredX = data[xAxRen].filter(filterFunc.bind(this));
                var filteredY = data[yAxRen[parPos]].filter(filterFunc.bind(this));

                if(this.xTimeScale){

                    resultData = filteredX.map(function(d){return d.getTime();})
                        .zip(filteredY);
                }else{
                    resultData = filteredX.zip(filteredY);
                }

                let rC = this.getIdColor(parPos, id);
                if(regSett.hasOwnProperty('color')){
                    rC = regSett.color;
                    rC[3] = 1.0;
                }
                
                let yScale = this.yScale;
                if(this.renderSettings.y2Axis.indexOf(yAxRen[parPos]) !== -1){
                    yScale = this.y2Scale;
                }

                if(!inactive){
                    this.renderRegression(resultData, reg, yScale, rC);
                }else{
                    this.renderRegression(resultData, reg, yScale, [0.2,0.2,0.2,0.4]);
                }
            }
            
        }else{
            let regSett = this.dataSettings[yAxRen[parPos]];
            let reg = {
                type: regSett.regression,
                order: regSett.regressionOrder
            };

            let yScale = this.yScale;
            if(this.renderSettings.y2Axis.indexOf(yAxRen[parPos]) !== -1){
                yScale = this.y2Scale;
            }

            if(typeof reg.type !== 'undefined'){
                // TODO: Check for size mismatch?
                if(this.xTimeScale){
                    resultData = data[xAxRen]
                        .map(function(d){return d.getTime();})
                        .zip(
                            data[yAxRen[parPos]]
                        );
                }else{
                    resultData = data[xAxRen].zip(
                        data[yAxRen[parPos]]
                    );
                }
                if(!inactive){
                    // Check for predefined color
                    if(this.dataSettings.hasOwnProperty(yAxRen[parPos]) &&
                       this.dataSettings[yAxRen[parPos]].hasOwnProperty('color')){
                        this.renderRegression(
                            resultData, reg, yScale,
                            this.dataSettings[yAxRen[parPos]].color
                        );
                }else{
                    this.renderRegression(resultData, reg, yScale);
                }
                    
                }else{
                    this.renderRegression(resultData, reg, yScale, [0.2,0.2,0.2,0.4]);
                }
            }
        }
    }

    getIdColor(param, id) {
        let rC;
        let colorParam = this.renderSettings.colorAxis[param];
        let cA = this.dataSettings[colorParam];
        let selPar = this.renderSettings.yAxis[param];

        if (cA && cA.hasOwnProperty('colorscaleFunction')){
            rC = cA.colorscaleFunction(id);
            rC = [rC[0]/255, rC[1]/255, rC[2]/255];
        }else{
            // Check if color has been defined for specific parameter
            if (this.renderSettings.hasOwnProperty('dataIdentifier')){
                rC = this.dataSettings[selPar][id].color;
            } else if(this.dataSettings[selPar].hasOwnProperty('color')){
                rC = this.dataSettings[selPar].color;
            } else { 
                rC = [0.258, 0.525, 0.956];
            }
        }
        return rC;
    }


    /**
    * Resize graph
    * @param {boolean} [debounce=true] Do not resize if consecutive resize calls
    *        are being made. 
    */
    resize(debounce){
        debounce = defaultFor(debounce, true);
        if(debounce){
            this.debounceResize.bind(this)();
        }
        this.dim = this.el.node().getBoundingClientRect();
        // If there are colorscales to be rendered we need to apply additional
        // margin to the right reducing the total width
        let csAmount = 0;
        for (var i = 0; i < this.renderSettings.colorAxis.length; i++) {
            if(this.renderSettings.colorAxis[i] !== null){
                csAmount++;
            }
        }
        if(this.renderSettings.hasOwnProperty('y2Axis') && 
           this.renderSettings.y2Axis.length>0){
            this.marginY2Offset = 40;
        } else {
            this.marginY2Offset = 0;
        }
        this.marginCSOffset = csAmount*100;
        this.width = this.dim.width - this.margin.left - 
                     this.margin.right - this.marginY2Offset - this.marginCSOffset;
        this.height = this.dim.height - this.margin.top - this.margin.bottom;
        this.resize_update();
        this.createColorScales();
        this.createAxisLabels();

        this.batchDrawer.updateCanvasSize(this.width, this.height);
        this.batchDrawerReference.updateCanvasSize(this.width, this.height);
        this.renderData();
        this.zoom_update();
    }


    resize_update() {

        this.xScale.range([0, this.width]);
        this.yScale.range([this.height, 0]);
        this.xAxisSvg.attr('transform', 'translate(0,' + this.height + ')');
        this.xAxis.tickSize(-this.height);
        this.yAxis.innerTickSize(-this.width);
        this.xAxisSvg.call(this.xAxis);

        if(this.renderSettings.yAxis.length > 0){
            this.yAxisSvg.call(this.yAxis);
        }

        if(this.renderSettings.y2Axis.length > 0){
            this.y2Axis.innerTickSize(this.width);
            this.y2Scale.range([this.height, 0]);
            this.y2AxisSvg.call(this.y2Axis);
        }

        this.renderCanvas
            .attr('width', this.width - 1)
            .attr('height', this.height - 1);
   
        this.referenceCanvas
            .attr('width', this.width - 1)
            .attr('height', this.height - 1);
           
        // TODO: in this.svg actually the first g element is saved, this is 
        // confusing and shoulg maybe be changed, maybe change name?
        d3.select(this.svg.node().parentNode)
            .attr('width', this.width + this.margin.left + this.margin.right +
                           this.marginY2Offset + this.marginCSOffset)
            .attr('height', this.height + this.margin.top + this.margin.bottom);
           
        d3.select(this.topSvg.node().parentNode)
            .attr('width', this.width + this.margin.left + this.margin.right + 
                           this.marginY2Offset + this.marginCSOffset)
            .attr('height', this.height + this.margin.top + this.margin.bottom);

        this.el.select((this.nsId+'clipbox')).select('rect')
            .attr('width', this.width)
            .attr('height', this.height);

        this.el.select('#zoomXBox')
            .attr('width', this.width)
            .attr('height', this.margin.bottom)
            .attr('transform', 'translate(' + 0 + ',' + (this.height) + ')');

        this.el.select('#zoomYBox')
            .attr('width', this.margin.left)
            .attr('height', this.height );

        this.el.select('#zoomY2Box')
            .attr('width', this.margin.right + this.marginY2Offset)
            .attr('height', this.height )
            .attr('transform', 'translate(' + (
                this.width
                ) + ',' + 0 + ')'
            );

        this.el.select('#zoomXBox')
            .attr('width', this.width)
            .attr('height', this.margin.bottom)
            .attr('transform', 'translate(' + 0 + ',' + (this.height) + ')');

        this.el.select('#rectangleOutline')
            .attr('width', this.width)
            .attr('height', this.height);

        this.el.select('#previewImage')
            .attr('width',  this.width)
            .attr('height', this.height);

        this.el.select('#previewImage2')
            .attr('width',  this.width)
            .attr('height', this.height);

        this.addTimeInformation();

    }

    onResize() {
        this.batchDrawer.updateCanvasSize(this.width, this.height);
        this.batchDrawerReference.updateCanvasSize(this.width, this.height);
        this.renderData();
        this.zoom_update();
        //this.createHelperObjects();
    }

    renderRectangles(data, idY, xGroup, yGroup, cAxis, updateReferenceCanvas) {

        // TODO: How to decide which item to take for counting
        // should we compare changes and look for errors in config?
        var l = data[xGroup[0]].length;

        let currColCache = null;
        let colCacheAvailable = false;

        let yScale = this.yScale;
        // Check if parameter part of left or right y Scale
        if(this.renderSettings.y2Axis.indexOf(idY) !== -1){
            yScale = this.y2Scale;
        }

        // Identify how colors are applied to the points
        let singleColor = true;
        let colorObj;
        let identParam;

        if (this.renderSettings.hasOwnProperty('dataIdentifier')){
            singleColor = false;
            identParam = this.renderSettings.dataIdentifier.parameter;
            // Check if alpha value is set for all parameters
            let identifiers = this.renderSettings.dataIdentifier.identifiers;
            for (var i = 0; i < identifiers.length; i++) {
                if(!this.dataSettings[identParam][identifiers[i]].hasOwnProperty('alpha')){
                    this.dataSettings[identParam][identifiers[i]].alpha = this.defaultAlpha;
                }
            }
        }

        let constAlpha = this.defaultAlpha;

        if(this.dataSettings[idY].hasOwnProperty('alpha')){
            constAlpha = this.dataSettings[idY].alpha;
        } else {
            this.dataSettings[idY].alpha = constAlpha;
        }

        if(singleColor) {
            if(this.dataSettings[idY].hasOwnProperty('color')){
                colorObj = this.dataSettings[idY].color.slice();
            } else {
                colorObj = [0.258, 0.525, 0.956];
            }
            colorObj.push(constAlpha);
        }

        if(cAxis !== null){
            // Check if a colorscale is defined for this 
            // attribute, if not use default (plasma)
            let cs = 'viridis';
            let cA = this.dataSettings[cAxis];
            if (cA && cA.hasOwnProperty('colorscale')){
                cs = cA.colorscale;
            }
            if(cA && cA.hasOwnProperty('extent')){
                this.plotter.setDomain(cA.extent);
            }
            // If current cs not equal to the set in the plotter update cs
            if(cs !== this.plotter.name){
                this.plotter.setColorScale(cs);
            }
            // Check if colorcache is available to be used
            if(this.colorCache.hasOwnProperty(cAxis) && this.colorCache[cAxis].length > 0){
                colCacheAvailable = true;
                currColCache = this.colorCache[cAxis];
            } else {
                this.colorCache[cAxis] = [];
            }
        }

        for (let i=0; i<l; i++) {

            let x1 = (this.xScale(data[xGroup[0]][i]));
            let x2 = (this.xScale(data[xGroup[1]][i]));
            let y1 = (yScale(data[yGroup[0]][i]));
            let y2 = (yScale(data[yGroup[1]][i]));

            let idC = u.genColor();

            let par_properties = {
                index: i,
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

            let nCol = [idC[0]/255, idC[1]/255, idC[2]/255];

            let rC;
            if(cAxis !== null){
                if(colCacheAvailable){
                    rC = currColCache[i];
                } else {
                    rC = this.plotter.getColor(data[cAxis][i])
                        .map(function(c){return c/255;});
                    rC[3] = constAlpha;
                    this.colorCache[cAxis].push(rC);
                }
            } else {
                if(singleColor){
                    rC = colorObj;
                } else {
                    let val = data[identParam][i];
                    rC = this.dataSettings[idY][val].color;
                    if(this.dataSettings[idY][val].hasOwnProperty('alpha')){
                        rC.push(this.dataSettings[idY][val].alpha);
                    }
                }
            }
            this.colourToNode[idC.join('-')] = par_properties;
            this.batchDrawer.addRect(x1,y1,x2,y2, rC[0], rC[1], rC[2], rC[3]);

            if(!this.fixedSize && updateReferenceCanvas){
                this.batchDrawerReference.addRect(
                    x1,y1,x2,y2, nCol[0], nCol[1], nCol[2], 1.0
                );
            }
        }
    }


    renderPoints(data, xAxis, yAxis, cAxis, updateReferenceCanvas) {

        let lp;
        let p_x, p_y;
        let yScale = this.yScale;
        let currColCache = null;
        let colCacheAvailable = false;

        let combPars = this.renderSettings.combinedParameters;
        let xGroup = false;
        let yGroup = false;
        // Check if either x or y axis is a combined parameter
        if(combPars.hasOwnProperty(xAxis)){
            xGroup = combPars[xAxis];
        } else {
            lp = data[xAxis].length;
        }
        if(combPars.hasOwnProperty(yAxis)){
            yGroup = combPars[yAxis];
        } else {
            lp = data[yAxis].length;
        }

        // Check if parameter part of left or right y Scale
        if(this.renderSettings.y2Axis.indexOf(yAxis) !== -1){
            yScale = this.y2Scale;
        }

        // Identify how colors are applied to the points
        let singleColor = true;
        let colorObj;
        let identParam;

        if (this.renderSettings.hasOwnProperty('dataIdentifier')){
            singleColor = false;
            identParam = this.renderSettings.dataIdentifier.parameter;
            // Check if alpha value is set for all parameters
            let identifiers = this.renderSettings.dataIdentifier.identifiers;
            for (var i = 0; i < identifiers.length; i++) {
                if(!this.dataSettings[identParam][identifiers[i]].hasOwnProperty('alpha')){
                    this.dataSettings[identParam][identifiers[i]].alpha = this.defaultAlpha;
                }
            }
        }

        let constAlpha = this.defaultAlpha;

        if(this.dataSettings[yAxis].hasOwnProperty('alpha')){
            constAlpha = this.dataSettings[yAxis].alpha;
        } else {
            this.dataSettings[yAxis].alpha = constAlpha;
        }

        if(singleColor) {
            if(this.dataSettings[yAxis].hasOwnProperty('color')){
                colorObj = [
                    this.dataSettings[yAxis].color[0],
                    this.dataSettings[yAxis].color[1],
                    this.dataSettings[yAxis].color[2]
                ];
            } else {
                colorObj = [0.258, 0.525, 0.956];
            }
            colorObj.push(constAlpha);
        }

        if(cAxis !== null){
            // Check if a colorscale is defined for this 
            // attribute, if not use default (plasma)
            let cs = 'viridis';
            let cA = this.dataSettings[cAxis];
            if (cA && cA.hasOwnProperty('colorscale')){
                cs = cA.colorscale;
            }
            if(cA && cA.hasOwnProperty('extent')){
                this.plotter.setDomain(cA.extent);
            }
            // If current cs not equal to the set in the plotter update cs
            if(cs !== this.plotter.name){
                this.plotter.setColorScale(cs);
            }
            // Check if colorcache is available to be used
            if(this.colorCache.hasOwnProperty(cAxis) && this.colorCache[cAxis].length > 0){
                colCacheAvailable = true;
                currColCache = this.colorCache[cAxis];
            } else {
                this.colorCache[cAxis] = [];
            }
        }

        // Check if cyclic axis and if currently displayed axis range needs to
        // offset to be shown in "next cycle" above or below
        let xMax, xMin, period, xoffset;
        let yMax = yScale.domain()[1];
        let yMin = yScale.domain()[0];

        let xperiodic = false;
        if(this.dataSettings.hasOwnProperty(xAxis) && 
           this.dataSettings[xAxis].hasOwnProperty('periodic')){
            xoffset = defaultFor(
                this.dataSettings[xAxis].periodic.offset, 0
            );
            xperiodic = true;
            period = this.dataSettings[xAxis].periodic.period;
            xMax = this.xScale.domain()[1]-xoffset;
            xMin = this.xScale.domain()[0]+xoffset;

        }

        let dotsize = defaultFor(this.dataSettings[yAxis].size, DOTSIZE);
        
        for (let j=0;j<lp; j++) {

            let x, y, valX, valY;

            if(!xGroup){
                valX = data[xAxis][j];
            } else {
                // Check if we have a time variable
                if(this.timeScales.indexOf(xGroup[0])!==-1){
                    valX = new Date(
                        data[xGroup[0]][j].getTime() +
                        (
                            data[xGroup[1]][j].getTime()-
                            data[xGroup[0]][j].getTime()
                        )/2
                    );
                } else {
                    valX = data[xGroup[0]][j] +
                         (data[xGroup[1]][j] - data[xGroup[0]][j])/2;
                }
            }
            // Manipulate value if we have a periodic parameter
            if(xperiodic){
                let shiftpos = Math.abs(parseInt(xMax/period));
                let shiftneg = Math.abs(parseInt(xMin/period));
                if(xoffset===0){
                    shiftneg = Math.abs(Math.floor(xMin/period));
                }
                let shift = Math.max(shiftpos, shiftneg);
                if(shiftneg>shiftpos){
                    shift*=-1;
                }

                if(Math.abs(shift) > 0){
                    valX = valX + shift*period;
                    if(valX-xoffset > xMax){
                        valX -= period;
                    }
                    if(valX+xoffset < xMin){
                        valX += period;
                    }
                    
                }
            }
            x = this.xScale(valX);

            if(!yGroup){
                valY = data[yAxis][j];
            } else {
                // Check if we have a time variable
                if(this.timeScales.indexOf(yGroup[0])!==-1){
                    valY = new Date(
                        data[yGroup[0]][j].getTime() +
                        (data[yGroup[1]][j].getTime() - data[yGroup[0]][j].getTime())/2
                    );
                } else {
                    valY = data[yGroup[0]][j] +
                         (data[yGroup[1]][j] - data[yGroup[0]][j])/2;
                }
            }

            y =  yScale(valY);
            
            // If render settings uses colorscale axis get color from there
            let rC;
            if(cAxis !== null){
                if(colCacheAvailable){
                    rC = currColCache[j];
                } else {
                    rC = this.plotter.getColor(data[cAxis][j]);
                    rC = [rC[0]/255, rC[1]/255, rC[2]/255, constAlpha];
                    this.colorCache[cAxis].push(rC);
                }
                
            } else {
                if(singleColor){
                    rC = colorObj;
                } else {
                    let val = data[identParam][j];
                    let col = this.dataSettings[yAxis][val].color;
                    rC = [
                        col[0], col[1], col[2],
                        this.dataSettings[yAxis][val].alpha
                    ];
                }
            }
            

            let c = u.genColor();

            let par_properties = {
                index: j,
                x: {
                    val: valX,
                    id: xAxis,
                    coord: x
                },
                y: {
                    val: valY,
                    id: yAxis,
                    coord: y
                },
            };

            let nCol = [c[0]/255, c[1]/255, c[2]/255];
            let parSett = this.dataSettings[yAxis];

            if (identParam){
                let val = data[identParam][j];
                parSett = this.dataSettings[yAxis][val];
            }

            let cA = this.dataSettings[cAxis];

            if (parSett){

                 if(parSett.hasOwnProperty('lineConnect') &&
                    parSett.lineConnect && j>0){

                    // Check if using ordinal scale (multiple
                    // parameters), do not connect if different
                    if(cA && cA.hasOwnProperty('scaleType') && 
                        cA.scaleType === 'ordinal'){

                        if(data[cAxis][j-1] === data[cAxis][j])
                        {
                            // Do not connect lines going in negative x direction
                            // as some datasets loop and it looks messy
                            if(x-p_x>-this.width/2){
                                this.batchDrawer.addLine(
                                    p_x, p_y, x, y, 1.5, 
                                    rC[0], rC[1], rC[2], rC[3]
                                );
                            }
                        }
                    }else{
                        // Do not connect lines going in negative x direction
                        // as some datasets loop and it looks messy
                        if(x-p_x>-this.width/2){
                            this.batchDrawer.addLine(
                                p_x, p_y, x, y, 1.5, 
                                rC[0], rC[1], rC[2], rC[3]
                            );
                        }
                    }
                }

                if(!parSett.hasOwnProperty('symbol')){
                    parSett.symbol = 'circle';
                }
                par_properties.dotsize = dotsize;

                if(parSett.symbol !== null && parSett.symbol !== 'none'){
                    par_properties.symbol = parSett.symbol;
                    var sym = defaultFor(dotType[parSett.symbol], 2.0);
                    this.batchDrawer.addDot(
                        x, y, dotsize, sym, rC[0], rC[1], rC[2], rC[3]
                    );
                    if(!this.fixedSize && updateReferenceCanvas){
                        this.batchDrawerReference.addDot(
                            x, y, dotsize, sym, nCol[0], nCol[1], nCol[2], -1.0
                        );
                    }
                }
            }
            this.colourToNode[c.join('-')] = par_properties;

            p_x = x;
            p_y = y;
        }
    }

    renderFilteredOutPoints(data, xAxis, yAxis) {

        let lp = data[xAxis].length;
        let yScale = this.yScale;

        // Check if parameter part of left or right y Scale
        if(this.renderSettings.y2Axis.indexOf(yAxis) !== -1){
            yScale = this.y2Scale;
        }

        for (let j=0;j<lp; j++) {

            let x = this.xScale(data[xAxis][j]);
            let y = yScale(data[yAxis][j]);
            let rC = [0.5, 0.5, 0.5];

            let par_properties = {
                index: j,
                x: {
                    val: data[xAxis][j],
                    id: xAxis,
                    coord: x
                },
                y: {
                    val: data[yAxis][j],
                    id: yAxis,
                    coord: y
                },
            };

            let parSett = this.dataSettings[yAxis];

            if (this.renderSettings.hasOwnProperty('dataIdentifier')){
                let identParam = this.renderSettings.dataIdentifier.parameter;
                let val = data[identParam][j];
                parSett = this.dataSettings[yAxis][val];
            }

            if (parSett){

                if(!parSett.hasOwnProperty('symbol')){
                    parSett.symbol = 'circle';
                }
                if(parSett.symbol !== null && parSett.symbol !== 'none'){
                    par_properties.symbol = parSett.symbol;
                    let symbol = parSett.symbol;
                    if(symbol === 'circle'){
                        symbol = 'circle_empty'
                    } else if(symbol === 'rectangle'){
                        symbol = 'rectangle_empty'
                    } else if(symbol === 'triangle'){
                        symbol = 'triangle_empty'
                    }
                    var sym = defaultFor(dotType[symbol], 2.0);
                    this.batchDrawer.addDot(
                        x, y, DOTSIZE, sym, rC[0], rC[1], rC[2], 0.2
                    );
                }
            }
        }
    }


    addApply() {
        if(!this.el.select('#applyButton').empty()){
            this.el.select('#applyButton').remove();
        }
        if(this.el.select('#applyButton').empty()){
            let applyButtonCont = this.el.select('#parameterSettings')
                .attr('class', 'buttonContainer')
                .append('div');
                
            applyButtonCont.append('button')
                .attr('type', 'button')
                .attr('id', 'applyButton')
                .text('Apply')
                .on('click', ()=>{
                    this.createParameterInfo();
                    this.resize(false);
                    this.renderData();
                    this.createColorScales();
                });
        }
    }


    renderRegressionOptions(id, regressionTypes, dataSettings) {
        let checked = this.el.select('#regressionCheckbox').property('checked');
        let that = this;

        if(checked){

            this.el.select('#parameterSettings')
                .append('label')
                .attr('id', 'labelRegression')
                .attr('for', 'regressionSelect')
                .text('Approach');

            let regressionSelect = this.el.select('#parameterSettings')
              .append('select')
                .attr('id','regressionSelect')
                .on('change',onregressionChange);

            regressionSelect.selectAll('option')
                .data(regressionTypes).enter()
                .append('option')
                    .text(function (d) { return d.name; })
                    .attr('value', function (d) { return d.value; })
                    .property('selected', function(d){
                        return d.value === dataSettings.regression;
                    });

            addOrder();

            function onregressionChange() {
                let selectValue = 
                    that.el.select('#regressionSelect').property('value');
                dataSettings.regression = selectValue;
                addOrder();
                that.addApply();
            }

            function addOrder(){
                that.el.select('#regressionOrderLabel').remove();
                that.el.select('#regressionOrder').remove();
                if(dataSettings.regression === 'polynomial'){
                    that.el.select('#parameterSettings')
                        .append('label')
                        .attr('id', 'regressionOrderLabel')
                        .attr('for', 'regressionOrder')
                        .text('Order');

                    that.el.select('#parameterSettings')
                        .append('input')
                        .attr('id', 'regressionOrder')
                        .attr('type', 'text')
                        .attr('value', defaultFor(dataSettings.regressionOrder, 3))
                        .on('input', function(){
                            dataSettings.regressionOrder = Number(this.value);
                            //that.renderRegressionOptions(id, regressionTypes);
                            that.addApply();
                        });
                }
            }


        }else{
            this.el.select('#labelRegression').remove();
            this.el.select('#regressionSelect').remove();
            this.el.select('#regressionOrderLabel').remove();
            this.el.select('#regressionOrder').remove();
            delete dataSettings.regression;
            delete dataSettings.regressionOrder;
            this.addApply();
        }

    }


    createInfoBoxes(){
        // Setup div for regression info rendering
        this.el.select('#regressionInfo').remove();
        this.el.append('div')
            .attr('id', 'regressionInfo')
            .style('bottom', this.margin.bottom+'px')
            .style('left', (this.width/2)+'px');

        if(this.el.select('#parameterInfo').empty()){
            this.el.append('div')
                .attr('id', 'parameterInfo')
                .style('top', this.margin.top*2+'px')
                .style('left', (this.width/2)+'px')
                .style('visibility', 'hidden');
        } else {
            this.el.select('#parameterInfo').selectAll('*').remove();
            this.el.select('#parameterInfo')
                .style('top', this.margin.top*2+'px')
                .style('left', (this.width/2)+'px');
        }


        this.el.select('#parameterSettings').remove();
        this.el.append('div')
            .attr('id', 'parameterSettings')
            .style('left', (this.width/2)+'px')
            .style('display', 'none');

        if(this.el.select('#parameterInfo').selectAll('*').empty()){
            this.el.select('#parameterInfo').style('visibility', 'hidden');
            this.el.select('#svgInfoContainer').style('visibility', 'hidden');
        }
    }

    updateInfoBoxes(){
        this.el.select('#regressionInfo')
            .style('bottom', this.margin.bottom+'px')
            .style('left', (this.width/2)+'px');

        this.el.select('#parameterInfo')
                .style('top', this.margin.top*2+'px')
                .style('left', (this.width/2)+'px');

        d3.select('#svgInfoContainer')
            .attr('transform', 'translate(' + (this.width/2 - 90) + ',' +
            (this.margin.top+1) + ')');

        this.el.select('#parameterSettings')
            .style('left', (this.width/2)+'px')
            .style('display', 'none');
    }

    applyDataFilters(){

        let data = {};
        let inactiveData = {};

        for(let p in this.data){
            data[p] = this.data[p];
            inactiveData[p] = [];
        }

        for (let f in this.filters){
            let filter = this.filters[f];
            let currentDataset = data[f];

            // Check if parameter is actually in current data
            if(!data.hasOwnProperty(f)){
                continue;
            }

            for (let p in data){

                let applicableFilter = true;

                if(this.filterManager.filterSettings.hasOwnProperty('filterRelation')){
                    applicableFilter = false;
                    let filterRel = this.filterManager.filterSettings.filterRelation;
                    let insideGroup = false;
                    for (let i = 0; i < filterRel.length; i++) {
                        // Check if both parameters are in the same group
                        if( (filterRel[i].indexOf(p)!==-1) && 
                            (filterRel[i].indexOf(f)!==-1)){
                            applicableFilter = true;
                            break;
                        }
                        // Check if current parameter is in any group
                        if(filterRel[i].indexOf(p)!==-1){
                            insideGroup = true;
                        }
                    }
                    if(!insideGroup){
                        applicableFilter = true;
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

        this.currentData = data;
        this.currentInactiveData = inactiveData;
    }

    createParameterInfo(){
        d3.select('#svgInfoContainer').remove();
        // Add rendering representation to svg
        let infoGroup = this.svg.append('g')
            .attr('id', 'svgInfoContainer')
            .attr('transform', 'translate(' + (this.width/2 - 90) + ',' +
            (this.margin.top+1) + ')')
            .style('visibility', 'hidden');
        infoGroup.append('rect')
            .attr('id', 'svgInfoRect')
            .attr('width', 280)
            .attr('height', 100)
            .attr('fill', 'white')
            .attr('stroke', 'black');

        if(!this.el.select('#parameterInfo').empty()){
            this.el.select('#parameterInfo').selectAll('*').remove();
        }

        let yAxRen = this.renderSettings.yAxis;
        for (let parPos=0; parPos<yAxRen.length; parPos++){

            let idY = yAxRen[parPos];
            // Add item to labels if there is no coloraxis is defined
            this.addParameterLabel(idY);
        }

        let y2AxRen = this.renderSettings.y2Axis;
        for (let parPos=0; parPos<y2AxRen.length; parPos++){

            let idY2 = y2AxRen[parPos];
            // Add item to labels if there is no coloraxis is defined
            this.addParameterLabel(idY2);
        }

        // Change height of settings panel to be just under labels
        let dim = this.el.select('#parameterInfo').node().getBoundingClientRect();
        this.el.select('#parameterSettings')
                .style('top', (dim.height+this.margin.top+9)+'px');

         if(this.displayParameterLabel && 
            !this.el.select('#parameterInfo').selectAll('*').empty()){
            this.el.select('#parameterInfo').style('visibility', 'visible');
        }
    }


    renderColorScaleOptions(colorIndex){

        this.el.select('#parameterSettings')
            .append('label')
            .attr('id', 'labelColorParamSelection')
            .attr('for', 'colorParamSelection')
            .text('Parameter');

        let labelColorParamSelect = this.el.select('#parameterSettings')
          .append('select')
            .attr('id','colorParamSelection')
            .on('change',oncolorParamSelectionChange);

        // Go through data settings and find currently available ones
        let ds = this.dataSettings;
        let selectionChoices = [];
        for (let key in ds) {
            // Check if key is part of a combined parameter
            let ignoreKey = false;
            let comKey = null;
            for (comKey in this.renderSettings.combinedParameters){
                if(this.renderSettings.combinedParameters[comKey].indexOf(key) !== -1){
                    ignoreKey = true;
                }
            }
            if( !ignoreKey && (this.data.hasOwnProperty(key)) ){
                selectionChoices.push({value: key, label: key});
                if(this.renderSettings.colorAxis[colorIndex] === key){
                    selectionChoices[selectionChoices.length-1].selected = true;
                }
            }
        }

        labelColorParamSelect.selectAll('option')
            .data(selectionChoices).enter()
            .append('option')
                .text(function (d) { return d.label; })
                .attr('value', function (d) { return d.value; })
                .property('selected', function(d){
                    return d.hasOwnProperty('selected');
                });

        let that = this;

        function oncolorParamSelectionChange() {
            let selectValue = 
                that.el.select('#colorParamSelection').property('value');
            delete that.colorCache[that.renderSettings.colorAxis[colorIndex]];
            that.renderSettings.colorAxis[colorIndex] = selectValue;
            that.addApply();
        }


        this.el.select('#parameterSettings')
            .append('label')
            .attr('id', 'labelColorScaleSelection')
            .attr('for', 'colorScaleSelection')
            .text('Colorscale');

        let labelColorScaleSelect = this.el.select('#parameterSettings')
          .append('select')
            .attr('id','colorScaleSelection')
            .on('change',oncolorScaleSelectionChange);

        let colorscales = [
          'viridis', 'inferno', 'rainbow', 'jet', 'hsv', 'hot', 'cool', 'spring',
          'summer', 'autumn', 'winter', 'bone', 'copper', 'greys', 'yignbu',
          'greens', 'yiorrd', 'bluered', 'rdbu', 'picnic', 'portland',
          'blackbody', 'earth', 'electric', 'magma', 'plasma'
        ];

        labelColorScaleSelect.selectAll('option')
            .data(colorscales).enter()
            .append('option')
                .text(function (d) { return d; })
                .attr('value', function (d) { return d; })
                .property('selected', (d)=>{
                    let csId = this.renderSettings.colorAxis[colorIndex];
                    let obj = this.dataSettings[csId];
                    if(obj && obj.hasOwnProperty('colorscale')){
                        return d === this.dataSettings[csId].colorscale;
                    } else {
                        return false;
                    }
                    
                });
        function oncolorScaleSelectionChange() {
            let csId = that.renderSettings.colorAxis[colorIndex];
            delete that.colorCache[csId];
            let selectValue = that.el.select('#colorScaleSelection').property('value');
            that.dataSettings[csId].colorscale = selectValue;
            that.addApply();
        }

    }


    renderParameterOptions(dataSettings, id){

        let that = this;
        this.el.select('#parameterSettings').selectAll('*').remove();

        this.el.select('#parameterSettings')
            .style('display', 'block');

        this.el.select('#parameterSettings')
            .append('div')
            .attr('class', 'parameterClose cross')
            .on('click', ()=>{
                this.el.select('#parameterSettings')
                    .selectAll('*').remove();
                this.el.select('#parameterSettings')
                    .style('display', 'none');
            });

        this.el.select('#parameterSettings')
            .append('label')
            .attr('for', 'displayName')
            .text('Label');
            

        this.el.select('#parameterSettings')
            .append('input')
            .attr('id', 'displayName')
            .attr('type', 'text')
            .attr('value', dataSettings.displayName)
            .on('input', function(){
                dataSettings.displayName = this.value;
                that.addApply();
            });

        // Check if parameter is combined for x and y axis
        let combined = false;
        let combPars = this.renderSettings.combinedParameters;

        if(combPars.hasOwnProperty(this.renderSettings.xAxis)){
            if(combPars.hasOwnProperty(id)){
                combined = true;
            }
        }

        if(!combined){
            this.el.select('#parameterSettings')
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


            let select = this.el.select('#parameterSettings')
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
                        return d.value === dataSettings.symbol;
                    });

            function onchange() {
                let selectValue = that.el.select('#symbolSelect').property('value');
                dataSettings.symbol = selectValue;
                that.addApply();
            }

            this.el.select('#parameterSettings')
                .append('label')
                .attr('for', 'colorSelection')
                .text('Color');

            let colorSelect = this.el.select('#parameterSettings')
                .append('input')
                .attr('id', 'colorSelection')
                .attr('type', 'text')
                .attr('value', 
                    '#'+CP.RGB2HEX(
                        dataSettings.color
                        .map(function(c){return Math.round(c*255);})
                    )
                );

            let picker = new CP(colorSelect.node());

            let firstChange = true;

            picker.on('change', function(color) {
                this.target.value = '#' + color;
                let c = CP.HEX2RGB(color);
                c = c.map(function(c){return c/255;});
                if(!firstChange){
                    dataSettings.color = c;
                    that.addApply();
                }else{
                    dataSettings.color = c;
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

            // Add point size option
            this.el.select('#parameterSettings')
                .append('label')
                .attr('for', 'sizeSelection')
                .text('Point size');

            let sizeSelect = this.el.select('#parameterSettings')
                .append('input')
                .attr('id', 'sizeSelection')
                .attr('type', 'text')
                .attr('value', 
                    defaultFor(dataSettings.size, DOTSIZE)
                )
                .on('input', ()=>{
                    let val = Number(d3.event.currentTarget.value);
                    dataSettings.size = val;
                    that.addApply();
                });;
        }

        if(this.displayAlphaOptions){
            
            this.el.select('#parameterSettings')
                .append('label')
                .attr('for', 'opacitySelection')
                .text('Opacity');

            this.el.select('#parameterSettings').append('input')
                .attr('id', 'opacityInput')
                .attr('type', 'range')
                .attr('min', 0)
                .attr('max', 1)
                .attr('step', 0.05)
                .attr('value', defaultFor(
                    dataSettings.alpha,
                    this.defaultAlpha
                ))
                .on('input', ()=>{
                    let val = d3.event.currentTarget.valueAsNumber;
                    dataSettings.alpha = val;
                    // TODO: Possibly only update alpha in colorcache
                    for(let k in this.colorCache){
                        delete this.colorCache[k];
                    }
                    that.addApply();
                });
        }

        // Create and manage colorscale selection
        // Find index of id
        let renderIndex = this.renderSettings.yAxis.indexOf(id);
        if(renderIndex === -1){
            renderIndex = this.renderSettings.y2Axis.indexOf(id);
            if(renderIndex !== -1){
                renderIndex += this.renderSettings.yAxis.length;
            }
        }
        // Should normally always have an index
        if(renderIndex !== -1 && this.displayColorscaleOptions){
            let colorAxis = this.renderSettings.colorAxis[renderIndex];
            let active = false;
            if(colorAxis !== null){
                active = true;
            }

            this.el.select('#parameterSettings')
                .append('label')
                .attr('for', 'colorscaleSelection')
                .text('Apply colorscale');

            this.el.select('#parameterSettings')
                .append('input')
                .attr('id', 'colorscaleSelection')
                .attr('type', 'checkbox')
                .property('checked', active)
                .on('change', ()=>{
                    if(d3.select("#colorscaleSelection").property("checked")){
                        // Go through data settings and find currently available ones
                        let ds = this.dataSettings;
                        let selectionChoices = [];
                        for (let key in ds) {
                            // Check if key is part of a combined parameter
                            let ignoreKey = false;
                            let comKey = null;
                            for (comKey in this.renderSettings.combinedParameters){
                                if(this.renderSettings.combinedParameters[comKey].indexOf(key) !== -1){
                                    ignoreKey = true;
                                }
                            }
                            if( !ignoreKey && (this.data.hasOwnProperty(key)) ){
                                selectionChoices.push(key);
                            }
                        }
                        // Select first option
                        that.renderSettings.colorAxis[renderIndex] = selectionChoices[0];
                    } else {
                        that.renderSettings.colorAxis[renderIndex] = null;
                    }
                    that.renderParameterOptions(dataSettings, id);
                    that.addApply();
                });
            // Need to add additional necessary options
            // drop down with possible parameters and colorscale
            if(active){                           
                this.renderColorScaleOptions(renderIndex);
            }

        }

        if(combined) {
            this.addApply();
            return;
        }

        this.el.select('#parameterSettings')
            .append('label')
            .attr('for', 'lineConnect')
            .text('Line connect');
            

        this.el.select('#parameterSettings')
            .append('input')
            .attr('id', 'lineConnect')
            .attr('type', 'checkbox')
            .property('checked', 
                defaultFor(dataSettings.lineConnect, false)
            )
            .on('change', function(){
                dataSettings.lineConnect = 
                    !defaultFor(dataSettings.lineConnect, false);
                that.addApply();
            });

        if(this.enableFit){
            this.el.select('#parameterSettings')
                .append('label')
                .attr('for', 'regressionCheckbox')
                .text('Regression');
                
            let regressionTypes = [
                {name: 'Linear', value: 'linear'},
                {name: 'Polynomial', value: 'polynomial'}
            ];


            this.el.select('#parameterSettings')
                .append('input')
                .attr('id', 'regressionCheckbox')
                .attr('type', 'checkbox')
                .property('checked', 
                    dataSettings.hasOwnProperty('regression')
                )
                .on('change', function(){
                    // If activated there is no type defined so we
                    // define a defualt one, for now linear
                    if(that.el.select('#regressionCheckbox').property('checked')){
                         dataSettings.regression = defaultFor(
                            dataSettings.regression,
                            'linear'
                        );
                    }

                    that.renderRegressionOptions(id, regressionTypes, dataSettings);
                    that.addApply();
                });

            that.renderRegressionOptions(id, regressionTypes, dataSettings);
        }

    }


    addParameterLabel(id){

        // TODO: check for available objects instead of deleting and recreating them

        let parIds;
        // If parameter is separated by identifier we need to create multiple
        // labels for each identifier
        if (this.renderSettings.hasOwnProperty('dataIdentifier')){
            parIds = this.renderSettings.dataIdentifier.identifiers;

        } else {
            parIds = [null];
        }

        for (var i = 0; i < parIds.length; i++) {

            // Check if parameter is combined for x and y axis
            let combined = false;
            let combPars = this.renderSettings.combinedParameters;

            if(combPars.hasOwnProperty(this.renderSettings.xAxis)){
                if(combPars.hasOwnProperty(id)){
                    combined = true;
                }
            }


            let parDiv = this.el.select('#parameterInfo').append('div')
                .attr('class', 'labelitem');

            let infoGroup = this.el.select('#svgInfoContainer');
            infoGroup.style('visibility', 'hidden');

            let dataSettings = this.dataSettings[id];
            if(parIds[i]!==null){
                dataSettings = this.dataSettings[id][parIds[i]];
            }

            let displayName;

            if(dataSettings.hasOwnProperty('displayName')){
                displayName = dataSettings.displayName;
            }else{
                displayName = id;
                if(parIds[i]!==null){
                    displayName += ' ('+parIds[i]+')';
                }
            }
            dataSettings.displayName = displayName;

            parDiv.append('div')
                .style('display', 'inline')
                .attr('id', id)
                .html(displayName);

            // Update size of rect based on size of original div
            let boundRect = this.el.select('#parameterInfo').node().getBoundingClientRect();
            this.el.select('#svgInfoRect').attr('height', boundRect.height);

            // check amount of elements and calculate offset
            let offset = 21 + d3.select('#svgInfoContainer').selectAll('text').size() *20;
            let labelText = infoGroup.append('text')
                .attr('text-anchor', 'middle')
                .attr('y', offset)
                .attr('x', 153)
                .text(displayName);

            let labelBbox = labelText.node().getBBox();
            if(!combined){
                let iconSvg = parDiv.insert('div', ':first-child')
                    .attr('class', 'svgIcon')
                    .style('display', 'inline')
                    .append('svg')
                    .attr('width', 20).attr('height', 10);

                let symbolColor = '';

                // If we have a multi-id parameter the datasettings of it is an object
                if( parIds[i]!== null ){
                    if(!this.dataSettings[id].hasOwnProperty(parIds[i])){
                        this.dataSettings[id][parIds[i]] = {};
                    }
                    dataSettings = this.dataSettings[id][parIds[i]];
                }


                if(dataSettings.hasOwnProperty('color')){

                    symbolColor = '#'+ CP.RGB2HEX(
                        dataSettings.color
                        .map(function(c){return Math.round(c*255);})
                    );
                }

                if(dataSettings.hasOwnProperty('lineConnect') && 
                   dataSettings.lineConnect){
                    iconSvg.append('line')
                        .attr('x1', 0).attr('y1', 5)
                        .attr('x2', 20).attr('y2', 5)
                        .attr("stroke-width", 1.5)
                        .attr("stroke", symbolColor);
                }

                dataSettings.symbol = defaultFor(
                    dataSettings.symbol, 'circle'
                );

                u.addSymbol(iconSvg, dataSettings.symbol, symbolColor);

                let symbolGroup = infoGroup.append('g')
                    .attr('transform', 'translate(' + (130-labelBbox.width/2) + ',' +
                    (offset-10) + ')');
                u.addSymbol(symbolGroup, dataSettings.symbol, symbolColor);

                if(dataSettings.hasOwnProperty('lineConnect') && 
                   dataSettings.lineConnect){
                    symbolGroup.append('line')
                        .attr('x1', 0).attr('y1', 5)
                        .attr('x2', 20).attr('y2', 5)
                        .attr("stroke-width", 1.5)
                        .attr("stroke", symbolColor);
                }
            }

            parDiv.on('click', this.renderParameterOptions.bind(this, dataSettings, id));
        }
    }


    renderParameter(idX, idY, idCS, yAxisSet, parPos, data, inactiveData, updateReferenceCanvas){

        let combPars = this.renderSettings.combinedParameters;

        // If a combined parameter is provided we need to render either
        // a line or a rectangle as we have two parameters per item
        if(combPars.hasOwnProperty(idX)){
            // If also the yAxis item is an array we render a rectangle
            //if(yAxRen[yScaleItem].constructor === Array){
            if(combPars.hasOwnProperty(idY)){
                let xGroup = this.renderSettings.combinedParameters[idX];
                let yGroup = this.renderSettings.combinedParameters[idY];
                this.renderRectangles(
                    data, idY, xGroup, yGroup, idCS, updateReferenceCanvas
                );
            } else {
                this.renderPoints(data, idX, idY, idCS, updateReferenceCanvas);
            }
        } else {
            if(combPars.hasOwnProperty(idY)){
                this.renderPoints(data, idX, idY, idCS, updateReferenceCanvas);
            } else {
                this.renderFilteredOutPoints(
                    inactiveData, idX, idY,
                    updateReferenceCanvas
                );
                this.renderPoints(
                    data, idX, idY, idCS,
                    updateReferenceCanvas
                );
                // Check if any regression type is selected for parameter
                if(this.enableFit){
                    this.createRegression(data, parPos, yAxisSet);
                    if(inactiveData[yAxisSet[parPos]].length>0){
                        this.createRegression(this.data, parPos, yAxisSet, true);
                    }
                }
                
            }
        }
    }


    /**
    * Render the data as graph
    * @param {boolean} [updateReferenceCanvas=true] Update the corresponding 
    *        color reference canvas
    */
    renderData(updateReferenceCanvas) {

        let xAxRen = this.renderSettings.xAxis;
        let yAxRen = this.renderSettings.yAxis;
        let y2AxRen = this.renderSettings.y2Axis;
        
        this.batchDrawer.clear();
        if(this.batchDrawerReference){
            this.batchDrawerReference.clear();
        }

        // If data object is undefined or empty return
        // TODO: There should be a cleaner way to do this, maybe clean all
        // canvases among other things?

        if(typeof this.data === 'undefined' ||
            (Object.keys(this.data).length === 0 && 
            this.data.constructor === Object)){
            return;
        }

        updateReferenceCanvas = defaultFor(updateReferenceCanvas, true);

        this.colourToNode = {}; // Map to track the colour of nodes.

        // reset color count
        u.resetColor();

        // Clear possible regression information
        this.el.select('#regressionInfo').selectAll('*').remove();

        // Check if we need to update extents which have been reset because
        // of filtering on parameter
        for (var i = 0; i < this.renderSettings.colorAxis.length; i++) {
            let ca = this.renderSettings.colorAxis[i];
            if(ca !== null){
                if(this.dataSettings.hasOwnProperty(ca)){
                    if(!this.dataSettings[ca].hasOwnProperty('extent')){
                        // Set current calculated extent to settings
                        this.dataSettings[ca].extent = d3.extent(this.currentData[ca]);
                        this.createColorScales();
                    }
                }
            }
        }

        this.updateInfoBoxes();

        let idX = xAxRen;

        for (let parPos=0; parPos<yAxRen.length; parPos++){

            let idY = yAxRen[parPos];
            let idCS = this.renderSettings.colorAxis[parPos];

            this.renderParameter(
                idX, idY, idCS, this.renderSettings.yAxis,
                parPos, this.currentData, this.currentInactiveData, updateReferenceCanvas
            );
        }

        this.batchDrawer.draw();
        if(!this.fixedSize && updateReferenceCanvas){
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
        } else {
            let prevImg = this.el.select('#previewImage');
            if(prevImg.empty()){
                this.renderingContainer.append('svg:image')
                    .attr('id', 'previewImage')
                    .attr('x', 0)
                    .attr('y', 0)
                    .attr('width',  this.width)
                    .attr('height', this.height)
                    .style('display', 'none');
            }
        }

        if(y2AxRen.length > 0){

            // If y2 Axis needs to be rendered we need to create a separate 
            // image for each y axis, so we clear the rendering for the first y-Axis
            this.batchDrawer.clear();
            this.el.select('#regressionInfo').remove();
            this.el.append('div')
                .attr('id', 'regressionInfo')
                .style('bottom', this.margin.bottom+'px')
                .style('left', (this.width/2)+'px');

            for (let parPos=0; parPos<y2AxRen.length; parPos++){

                let idY2 = y2AxRen[parPos];
                let idCS = this.renderSettings.colorAxis[
                    this.renderSettings.yAxis.length + parPos
                ];
                
                this.renderParameter(
                    idX, idY2, idCS, this.renderSettings.y2Axis,
                    parPos, this.currentData, this.currentInactiveData, updateReferenceCanvas
                );
            }

            // Save preview image of rendering of second y axis 
            // without data from first y axis
            this.batchDrawer.draw();
            if(!this.fixedSize && updateReferenceCanvas){
                this.batchDrawerReference.draw();
            }
            if(this.debounceActive){
                this.renderCanvas.style('opacity','1');
                let prevImg = this.el.select('#previewImage2' );
                let img = this.renderCanvas.node().toDataURL();
                if(!prevImg.empty()){
                    prevImg.attr('xlink:href', img)
                        .attr('transform', null)
                        .style('display', 'none');
                } else {
                    this.renderingContainer.insert('svg:image', ':first-child')
                        .attr('id', 'previewImage2')
                        .attr('xlink:href', img)
                        .attr('x', 0)
                        .attr('y', 0)
                        .attr('width',  this.width)
                        .attr('height', this.height)
                        .style('display', 'none');
                }
                this.previewActive = false;
            } else {
                let prevImg = this.el.select('#previewImage2' );
                if(prevImg.empty()){
                    this.renderingContainer.append('svg:image')
                        .attr('id', '#previewImage2')
                        .attr('x', 0)
                        .attr('y', 0)
                        .attr('width',  this.width)
                        .attr('height', this.height)
                        .style('display', 'none');
                }
            }

            // Re-render data points of first yAxis parameters
            // that were cleared before
            for (let parPos=0; parPos<yAxRen.length; parPos++){
                let idY = yAxRen[parPos];
                let idCS = this.renderSettings.colorAxis[parPos];
                this.renderParameter(
                    idX, idY, idCS, this.renderSettings.yAxis,
                    parPos, this.currentData, this.currentInactiveData, updateReferenceCanvas
                );
            }

            this.batchDrawer.draw();
            if(!this.fixedSize && updateReferenceCanvas){
                this.batchDrawerReference.draw();
            }
        }
        /**
        * Event is fired when graph has finished rendering plot.
        * @event module:graphly.graphly#rendered
        */
        this.emit('rendered');
    }




}

export {graphly};
