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
* @property {Object} [dataIdentifier] Contains key "parameter" with identifier 
*       string of paramter used to separate data into groups and key 
*       "identifiers" with array of strings with possible values in data array.
* @property {Object} [renderGroups] When using complex data with different sizes
*       that still should be visualized together (in different plots) it is
*       possible to use renderGroups object. The key is used as identifier
*       and can be selected from a drop down for each plot. Only the parameters
*       defined in the group will be used and accessible in the plot
* @property {Object} [sharedParameters] When using renderGroups it is necessary
*       to define the common axis, the key is used as parameter name as value an 
*       array of all parameters from different groups that represent the same
*       axis can be defined.
* @property {Array.String} [groups] When using renderGoups array (same size as yAxis)
*       defines which group is used on each of the plots.
* @property {Array.String} [additionalXTicks] Array with parameter ids for 
*        additional labels that should be used for the x axis
* @property {Array.String} [additionalYTicks] Array with parameter ids for 
*        additional labels that should be used for the y axis
* @property {Array.String} [additionalY2Ticks] Array with parameter ids for 
*        additional labels that should be used for the second y axis
* @property {Object} [availableParameters] When using dataIdentifier an object
*        with keys for each possible identifier and an array with parameter 
*        identifiers as stringslist of can be provided so that only those
*        are shown as parameter labels that allow configuration
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
* @property {Object} [periodic] Can be set when parameter has periodic pattern.
*           The object must have the 'period' value and can have a possible
*           offset. For example longitude values from -180 to 180 would have 360
*           as period and -180 as offset. Default offset value is 0.
* @property {Number} [nullValue] Value to be interpreted as null, used for 
*           colorscale extent calculation.
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
let plotty = require('plotty');
let Papa = require('papaparse');

require('c-p');

let FileSaver = require('file-saver');
let Choices = require('choices.js');

let BatchDrawer = require('./BatchDraw.js');
let FilterManager = require('./FilterManager.js');
let canvg = require('./vendor/canvg.js');

global.FilterManager = FilterManager;
global.plotty = plotty;
global.msgpack = msgpack;


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
    * @param {RenderSettings} options.renderSettings Configuration options for
    *        what should be rendered.
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
    *        size. Rendering is done for specific size not allowing resizing and 
    *        not using margins in the extent of the axis. 
    * @param {Number} [options.fixedWidth=1000] Width used when using fixed size 
    *        rendering.
    * @param {Number} [options.fixedHeight=500] Height used when using fixed
    *        size rendering.
    * @param {boolean} [options.autoColorExtent=false] Dynamically adapt color
    *        extent for color range parameters
    * @param {Object} [options.filterManager] Instanced filtermanager object to
    *        connect to.
    * @param {boolean} [options.enableFit=true] Enable/disable fitting
    *        functionality.
    * @param {boolean} [options.logX=false] Use logarithmic scale for x axis.
    * @param {boolean} [options.logY=false] Use logarithmic scale for left y axis.
    * @param {boolean} [options.logY2=false] Use logarithmic scale for right y axis.
    * @param {String} [options.colorAxisTickFormat='g'] d3 format string to use 
    *        as default tick format.
    * @param {Number} [options.defaultAlpha=0.9] Alpha value used as default
    *        when rendering.
    * @param {boolean} [options.debug=false] Show debug messages
    * @param {boolean} [options.enableSubXAxis=false] Enable selection option
    *        for x axis subticks, can also be a String if only enabled for one
    *        parameter.
    * @param {boolean} [options.enableSubYAxis=false] Enable selection option
    *        for x axis subticks, can also be a String if only enabled for one
    *        parameter.
    * @property {boolean} [multiYAxis=false] Adds controls for managing 
    *        multiple y axis with single x axis,
    *
    * @param {String} [options.labelAllignment='right'] allignment for label box
    * @param {Array} [options.colorscales] Array of strings with colorscale 
    *        identifiers that should be provided for selection, default list
    *        includes colorscales from plotty
    * @param {boolean} [options.showFilteredData=true] Option to show greyed out
    *        data points when filtering
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
        this.defaultAlpha = defaultFor(options.defaultAlpha, 1.0);
        this.ignoreParameters = defaultFor(options.ignoreParameters, []);
        this.resFactor = 1;
        this.debug = defaultFor(options.debug, false);
        this.enableSubXAxis = defaultFor(options.enableSubXAxis, false);
        this.enableSubYAxis = defaultFor(options.enableSubYAxis, false);
        this.multiYAxis = defaultFor(options.multiYAxis, false);
        this.labelAllignment = defaultFor(options.labelAllignment, 'right');
        this.zoomActivity = false;

        // Separation of plots in multiplot functionality
        this.separation = 25;

        // Set default font-size main element
        this.el.style('font-size', '0.8em');


        let IRcanvas = this.el.append('canvas')
            .attr('id', 'imagerenderer')
            .style('display', 'none');

        this.IRc = IRcanvas.node();
        this.IRctx = this.IRc.getContext('2d');

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

        this.logX = defaultFor(options.logX, false);
        this.logY = defaultFor(options.logY, false);
        this.logY2 = defaultFor(options.logY2, false);

        this.defaultTickSize = 12;
        this.defaultLabelSize = 12;

        if(!this.multiYAxis){
            // Manage configuration as it would be a 1 element multi plot
            // this should bring together both functionalities
            this.renderSettings.yAxis = [this.renderSettings.yAxis];
            if(this.renderSettings.y2Axis){
                this.renderSettings.y2Axis = [this.renderSettings.y2Axis];
            } else {
                this.renderSettings.y2Axis = [[]];
            }
            if(this.renderSettings.colorAxis){
                this.renderSettings.colorAxis = [this.renderSettings.colorAxis];
            } else {
                this.renderSettings.colorAxis = [[]];
            }
            if(this.renderSettings.colorAxis2){
                this.renderSettings.colorAxis2 = [this.renderSettings.colorAxis2];
            } else {
                this.renderSettings.colorAxis2 = [[]];
            }
        }

        this.renderSettings.availableParameters = defaultFor(
            this.renderSettings.availableParameters, false
        );
        this.renderSettings.renderGroups = defaultFor(
            this.renderSettings.renderGroups, false
        );
        this.renderSettings.sharedParameters = defaultFor(
            this.renderSettings.sharedParameters, false
        );
        this.renderSettings.groups = defaultFor(
            this.renderSettings.groups, false
        );

        this.yAxisLabel = [];
        this.y2AxisLabel = [];
        this.logY = [];
        this.logY2 = [];
        for (let i = 0; i < this.renderSettings.yAxis.length; i++) {
            this.yAxisLabel.push(null);
            this.y2AxisLabel.push(null);
            this.logY.push(false);
            this.logY2.push(false);
        }

        // Check if sub axis option set if not initialize with empty array
        if(this.enableSubXAxis){
            this.renderSettings.additionalXTicks = defaultFor(
                this.renderSettings.additionalXTicks, []
            );
        }
        this.renderSettings.additionalYTicks = defaultFor(
            this.renderSettings.additionalYTicks, []
        );

        if(this.enableSubYAxis){
            if(this.multiYAxis){
                for (let i = 0; i < this.renderSettings.yAxis.length; i++) {
                    this.renderSettings.additionalYTicks.push([]);
                }
            }
        } else {
            this.renderSettings.additionalYTicks = [
                this.renderSettings.additionalYTicks
            ];
        }

        this.timeScales = [];

        this.margin = defaultFor(
            options.margin,
            {top: 10, left: 90, bottom: 50, right: 30}
        );

        this.subAxisMarginX = 0;
        this.subAxisMarginY = 0;
        this.marginY2Offset = 0;
        this.marginCSOffset = 0;


        if(this.renderSettings.hasOwnProperty('y2Axis') && 
           this.getMaxArrayLenght(this.renderSettings.y2Axis)>0){
            this.marginY2Offset = 40;
        }


        // Calculate necessary additional offset if sub ticks have been selected
        if(this.enableSubXAxis) {
            this.subAxisMarginX = 40*this.renderSettings.additionalXTicks.length;
        }

        if(this.enableSubYAxis) {
            let addYT = this.renderSettings.additionalYTicks;
            let maxL = 0;
            for(let i=0; i<addYT.length; i++){
                maxL = Math.max(maxL, addYT[i].length);
            }
            this.subAxisMarginY = 80*maxL;
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

        this.colorscaleOptionLabel = defaultFor(
            options.colorscaleOptionLabel,
            'Apply colorscale'
        );

        this.showFilteredData = defaultFor(
            options.showFilteredData,
            true
        );

        // If there are colorscales to be rendered we need to apply additional
        // margin to the right reducing the total width
        let csAmount = this.getMaxCSAmount();
        this.marginCSOffset += csAmount*100;

        this.width = this.dim.width - this.margin.left - 
                     this.margin.right - this.marginY2Offset - 
                     this.marginCSOffset - this.subAxisMarginY;
        this.height = this.dim.height - this.margin.top -
                      this.margin.bottom - this.subAxisMarginX;
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
        this.autoColorExtent = defaultFor(options.autoColorExtent, false);
        this.enableFit = defaultFor(options.enableFit, true);
        this.fixedXDomain = undefined;
        this.mouseDown = false;
        this.prevMousePos = null;

        this.colorscales = defaultFor(
            options.colorscales,
            [
              'viridis', 'inferno', 'rainbow', 'jet', 'hsv', 'hot', 'cool', 'spring',
              'summer', 'autumn', 'winter', 'bone', 'copper', 'greys', 'yignbu',
              'greens', 'yiorrd', 'bluered', 'rdbu', 'picnic', 'portland',
              'blackbody', 'earth', 'electric', 'magma', 'plasma'
            ]
        );

        function customColorAxisTickFormat(value){
            if(value  instanceof Date){
                tickFormat = u.getCustomUTCTimeTickFormat()(value);
            } else {
                var tickFormat = parseFloat(value.toFixed(11));
            }
            return tickFormat;
        }

        if(options.hasOwnProperty('colorAxisTickFormat')){
            this.colorAxisTickFormat = d3.format(options.colorAxisTickFormat);
        } else {
            this.colorAxisTickFormat = customColorAxisTickFormat;
        }

        if(this.filterManager){
            this.filterManager.on('filterChange', this.onFilterChange.bind(this));
        }

        let timeDelay = 600;
        if(this.debounceActive){
            timeDelay = 200;
        }
        this.debounceZoom = debounce(function(){
            this.onZoom();
        }, timeDelay);

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
            //.style('pointer-events', 'none')
            .style('position', 'absolute')
            .style('z-index', 2)
            .style(
                'transform',
                'translate(' + (this.margin.left+this.subAxisMarginY + 1.0) +
                'px' + ',' + (this.margin.top + 1.0) + 'px' + ')'
            );


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
                .style(
                    'transform',
                    'translate(' + (this.margin.left+this.subAxisMarginY + 1) +
                    'px' + ',' + (this.margin.top + 1) + 'px' + ')'
                );

            // Initialize BatchDrawer:
            params.contextParams.antialias = false;

            this.batchDrawerReference = new BatchDrawer(
                this.referenceCanvas.node(), params
            );
            this.referenceContext = this.batchDrawerReference.getContext();
        }

        this.svg = this.el.append('svg')
            .attr('width', this.width + this.margin.left + 
                  this.margin.right + this.marginY2Offset + 
                  this.marginCSOffset + this.subAxisMarginY
            )
            .attr(
                'height', 
                this.height + this.margin.top +
                this.margin.bottom + this.subAxisMarginX
            )
            .style('position', 'absolute')
            .style('z-index', 0)
            .style('pointer-events', 'none')
            .append('g')
            .attr(
                'transform',
                'translate(' + (this.margin.left+this.subAxisMarginY+1) + ',' +
                (this.margin.top+1) + ')'
            );

        this.topSvg = this.el.append('svg')
            .attr('width', this.width + this.margin.left + 
                   this.margin.right + this.marginY2Offset + 
                   this.marginCSOffset + this.subAxisMarginY)
            .attr(
                'height', this.height + this.margin.top +
                this.margin.bottom + this.subAxisMarginX
            )
            .style('position', 'absolute')
            .style('z-index', 10)
            .style('pointer-events', 'none')
            .append('g')
            .attr(
                'transform',
                'translate(' + (this.margin.left+this.subAxisMarginY+1) + ',' +
                (this.margin.top+1) + ')'
            );

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

                let heighChunk = self.height/self.renderSettings.yAxis.length;
                let modifier = Math.floor(
                    d3.event.offsetY / heighChunk
                );
                // Adapt zoom center depending on which plot he mouse is positioned
                if(typeof self.xyzoomCombined !== 'undefined'){
                    self.xyzoomCombined.center([
                        d3.event.offsetX,
                        d3.event.offsetY-(heighChunk*modifier)
                    ]);
                }

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

                // TODO: Not sure if this is the best approach to retrieve
                // with which of the plots we are interacting
                // Calculate y plot value
                let plotAmount = this.renderSettings.yAxis.length;
                let plotHeight = this.height / plotAmount;
                let plotY = Math.floor(mouseY/plotHeight);

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
                        .style('margin-right', '10px')
                        .on('click', ()=>{
                            this.topSvg.selectAll('*').remove();
                            this.tooltip.style('display', 'none');
                            this.emit('pointSelect', null);
                        });

                    if (typeof self.currentData !== 'undefined' && 
                        nodeId.hasOwnProperty('index')){

                        let keysSorted = Object.keys(self.currentData).sort();
                        // Check for groups and remove 
                        let tabledata = [];
                        let uomAvailable = false;
                        for (var i = 0; i < keysSorted.length; i++) {
                            // check for rendergroups for possible parameters 
                            // that need to be ignored
                             // Check for renderGroups
                            if(this.renderSettings.renderGroups && 
                                this.renderSettings.groups){
                                let rGroup = this.renderSettings.groups[plotY];
                                if(this.renderSettings.renderGroups[rGroup].parameters.indexOf(keysSorted[i]) === -1){
                                    continue;
                                }
                            }
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

    startTiming(processId){
        if(this.debug){
            console.time(processId);
        }
    }

    endTiming(processId){
        if(this.debug){
            console.timeEnd(processId);
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
    * Save current plot as rendering opening save dialog for download.
    * @param {String} [format=png] Format to save rendering, possible formats 
    *        are png, jpeg, svg.
    * @param {Number} [resFactor=1] Factor to scale rendering up/down for
    *        creating higher res renderings
    */
    saveImage(format, resFactor){

        this.outFormat = defaultFor(format, 'png');
        this.resFactor = defaultFor(resFactor, 1);

        if (this.resFactor !== 1){

            this.batchDrawer.updateCanvasSize(
                Math.floor(this.width*this.resFactor),
                Math.floor(this.height*this.resFactor)
            );
            this.renderCanvas.style('width', this.width+'px');
            this.renderCanvas.style('height', this.height+'px');

            this.batchDrawer.clear();

            this.xScale.range([0, Math.floor(this.width*this.resFactor)]);

            let currHeight = this.height/this.yScale.length;

            for (let yPos = 0; yPos < this.yScale.length; yPos++) {
                this.yScale[yPos].range([
                    Math.floor((currHeight-this.separation)*this.resFactor), 0
                ]);
            }

            for (let yPos = 0; yPos < this.y2Scale.length; yPos++) {
                this.y2Scale[yPos].range([
                    Math.floor((currHeight-this.separation)*this.resFactor), 0
                ]);
            }

            let xAxRen = this.renderSettings.xAxis;
            
            let yAxRen = this.renderSettings.yAxis;
            let y2AxRen = this.renderSettings.y2Axis;

            // Hide axis edit buttons
            this.svg.selectAll('.modifyColorscaleIcon').style('display', 'none');


            // Draw y2 first so it is on bottom
            for (let plotY = 0; plotY < y2AxRen.length; plotY++) {
                for (let parPos=0; parPos<y2AxRen[plotY].length; parPos++){
                    if(typeof y2AxRen[plotY][parPos] !== 'undefined'){
                        this.renderParameter(
                            false, xAxRen,
                            this.renderSettings.y2Axis[plotY][parPos],
                            this.renderSettings.colorAxis2[plotY][parPos],
                            plotY, y2AxRen, this.y2Scale,
                            parPos, this.currentData, this.currentInactiveData,
                            false
                        );
                    }
                }
            }

            for (let plotY = 0; plotY < this.renderSettings.yAxis.length; plotY++) {

                for (let parPos=0; parPos<yAxRen[plotY].length; parPos++){
                    if(typeof yAxRen[plotY][parPos] !== 'undefined'){
                        this.renderParameter(
                            true, xAxRen,
                            this.renderSettings.yAxis[plotY][parPos],
                            this.renderSettings.colorAxis[plotY][parPos],
                            plotY,
                            yAxRen, this.yScale,
                            parPos, this.currentData, this.currentInactiveData,
                            false
                        );
                    }
                }
            }

            this.batchDrawer.draw();

        }

        // We need to first render the canvas if the debounce active is false
        if(!this.debounceActive || this.resFactor !== 1){

            // Render all to first previewimage
            this.renderCanvas.style('opacity','1');
            let prevImg = this.el.select('#previewImageR0');

            prevImg
                .attr('width',  this.width)
                .attr('height', this.height);

            this.el.select('#renderingContainer0').style('clip-path',null);

            let img = this.renderCanvas.node().toDataURL();
            
            prevImg.attr('xlink:href', img)
                .attr('transform', 'translate(0,0)scale(1)');
            
            prevImg.style('display', 'block');
        } else {
            this.svg.selectAll('.previewImage').style('display', 'block');
        }


        // Go through the parameter labels and check if they are visible or not
        let parsInf = this.el.selectAll('.parameterInfo');
        this.el.selectAll('.svgInfoContainer').each(function(d,i){

            if(d3.select(this).selectAll('text').empty()){
                d3.select(this).style('visibility', 'hidden');
            } else {
                if(parsInf[0].length>i){
                    d3.select(this).style('visibility', d3.select(parsInf[0][i]).style('visibility'));
                } else {
                    d3.select(this).style('visibility', 'visible');
                }
            }
        });


        // Set interactive blue to black for labels
        this.svg.selectAll('.axisLabel').attr('fill', 'black');
        this.svg.selectAll('.axisLabel').attr('font-weight', 'normal');
        this.svg.selectAll('.axisLabel').attr('text-decoration', 'none');
        // Check if one of the labels says Add parameter ...
        this.el.selectAll('.axisLabel').filter(function(){ 
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

        this.el.selectAll('.subaxis path, .subaxis line')
            .attr('fill', 'none')
            .attr('stroke', '#777')
            .attr('stroke-width', 1)
            .attr('shape-rendering', 'crispEdges');

        this.el.selectAll('text')
            .attr('stroke', 'none')
            .attr('shape-rendering', 'crispEdges');

        // Set fontsize for text explicitly
        /*this.svg.selectAll('text')
            .attr('font-size', '12px');*/

        // TODO: We introduce a short timeout here because it seems for some
        // reason the rendered image is not ready when not using the debounce
        // flag, not sure how to discover if the image is ready or not,
        // when debugging the svg_html shows the correct image, but the 
        // redering is empty
        if(!this.debounceActive || this.resFactor !== 1){
            setTimeout(this.createOutputFile.bind(this), 1000);
        } else {
            this.createOutputFile();
        }
    }

    createOutputFile(){

        this.dim = this.el.select('svg').node().getBoundingClientRect();
        let renderWidth = Math.floor(this.dim.width * this.resFactor);
        let renderHeight = Math.floor(this.dim.height * this.resFactor);

        var svg_html = this.el.select('svg')
            .attr("version", 1.1)
            .attr("xmlns", "http://www.w3.org/2000/svg")
            .attr('xmlns:xlink', 'http://www.w3.org/1999/xlink')
            .node().outerHTML;

        if(this.outFormat === 'svg'){
            let blob = new Blob([ svg_html ], {type: 'image/svg+xml'});
            FileSaver.saveAs(blob, this.fileSaveString);
        } else {
            this.el.select('#imagerenderer').attr('width', renderWidth);
            this.el.select('#imagerenderer').attr('height', renderHeight);

            // Clear possible previous renderings
            this.IRctx.clearRect(0, 0, this.IRc.width, this.IRc.height);
            
            // If format is jpeg we need to "remove" transparent pixels as they 
            // are turned black
            if(this.outFormat === 'jpeg'){
                var imgData=this.IRctx.getImageData(0,0,this.IRc.width,this.IRc.height);
                var data=imgData.data;
                for(var i=0;i<data.length;i+=4){
                    if(data[i+3]<255){
                        data[i] = 255 - data[i];
                        data[i+1] = 255 - data[i+1];
                        data[i+2] = 255 - data[i+2];
                        data[i+3] = 255 - data[i+3];
                    }
                }
                this.IRctx.putImageData(imgData,0,0);
            }

            this.IRctx.drawSvg(svg_html, 0, 0, renderWidth, renderHeight);


            // Set interactive blue to black for labels
            this.svg.selectAll('.axisLabel').attr('fill', '#007bff');
            this.svg.selectAll('.axisLabel').attr('font-weight', 'bold');

            let outformat = 'image/'+ this.outFormat;
            this.IRc.toBlob((blob)=> {
                FileSaver.saveAs(blob, this.fileSaveString);
            }, outformat ,1);
        }


        this.svg.selectAll('.previewImage').style('display', 'none');
        this.svg.selectAll('.svgInfoContainer').style('visibility', 'hidden');
        // Hide axis edit buttons
        this.svg.selectAll('.modifyColorscaleIcon').style('display', 'block');

        // Set first render container as it was before
        this.el.select('#renderingContainer0')
            .style('clip-path','url('+this.nsId+'clipbox)');

        this.resFactor = 1;
        this.resize();
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


    creatAxisLabelElement(
        elId, basename, choices, ySubChoices, currAxis, yAxisLabel,
        yPos, orientation, currHeightCenter ){

        let elHidden;
        let settObj = this.el.select('#'+elId);

        if(!settObj.empty()){
            elHidden = (settObj.style('display') == 'block' ) ? 
                false : true;
        }else{
            elHidden = true;
        }
        settObj.remove();

        let uniq = currAxis;

        let listText = [];
        // Add uom info to unique elements
        for (var i = 0; i < uniq.length; i++) {
            if(this.dataSettings.hasOwnProperty(uniq[i]) && 
               this.dataSettings[uniq[i]].hasOwnProperty('uom') &&
               this.dataSettings[uniq[i]].uom !== null){
                listText.push(uniq[i]+' ['+this.dataSettings[uniq[i]].uom+'] ');
            }else{
                listText.push(uniq[i]);
            }
        }

        if(listText.length === 0){
            // No items selected, add "filler text"
            listText.push('Add parameter ...');
        }

        if(yAxisLabel[yPos]){
            listText = [yAxisLabel[yPos]];
        }
        
        let labelText = this.svg.append('text')
            .attr('class', basename+' axisLabel')
            .attr('text-anchor', 'middle')
            .attr('fill', '#007bff')
            .attr('stroke', 'none')
            .attr('font-weight', 'bold')
            .attr('text-decoration', 'none')
            .text(listText.join(', '));

        if(orientation === 'left'){
            labelText.attr('transform', 
                'translate('+ -(this.margin.left/2+10) +','+
                currHeightCenter+')rotate(-90)'
            )
        }else if(orientation === 'right'){
            labelText.attr('transform', 
                'translate('+ (this.width+this.marginY2Offset+20) +','+
                currHeightCenter+')rotate(-90)'
            )
        }

        this.addTextMouseover(labelText);

        let setDiv = this.el.append('div')
            .attr('id', elId)
            .attr('class', basename+'Panel')
            .style('display', function(){
                return elHidden ? 'none' : 'block';
            })
            .style('top', currHeightCenter+'px')
            .style(orientation, this.margin.left+this.subAxisMarginY+15+'px');

        let scaleChoices = setDiv.append('select')
                .attr('id', basename+'ScaleChoices'+yPos);

        setDiv.append('div')
            .attr('class', 'labelClose cross')
            .on('click', ()=>{
                setDiv.style('display', 'none');
            });

        let con = setDiv.append('div')
            .attr('class', 'axisOption');

        let that = this;

        con.append('input')
            .attr('id', basename+'CustomLabel'+yPos)
            .attr('type', 'text')
            .property('value', listText.join(', '))
            .on('input', function(){
                labelText.text(this.value);
                yAxisLabel[yPos] = this.value;
            });

        con.append('label')
            .attr('for', basename+'CustomLabel'+yPos)
            .text('Label');

        con = setDiv.append('div')
            .attr('class', 'axisOption');

        if(!this.yTimeScale){
            con.append('input')
                .attr('id', 'logYoption')
                .attr('type', 'checkbox')
                .property('checked', 
                    function(){
                        if(orientation==='left'){
                            return defaultFor(that.logY[yPos], false)
                        } else if (orientation === 'right'){
                            return defaultFor(that.logY2[yPos], false)
                        }
                    }
                )
                .on('change', function(){
                    if(orientation==='left'){
                        that.logY[yPos] = !that.logY[yPos];
                    } else if (orientation === 'right'){
                        that.logY2[yPos] = !that.logY2[yPos];
                    }
                    that.initAxis();
                    that.renderData();
                });

            con.append('label')
                .attr('for', 'logYoption')
                .text('Logarithmic scale (base-10) ');
        }


        scaleChoices.attr('multiple', true);

        var toggleView = function(divEl){
            if(divEl.style('display') === 'block'){
                divEl.style('display', 'none');
            }else{
                divEl.style('display', 'block');
            }
        };

        labelText.on('click', toggleView.bind(null, setDiv));

        let settingParameters = new Choices(scaleChoices.node(), {
          choices: choices,
          removeItemButton: true,
          placeholderValue: ' select ...',
          itemSelectText: '',
        });

        

        settingParameters.passedElement.addEventListener('addItem', function(event) {

            yAxisLabel[yPos] = null;
            let renSett = that.renderSettings;
            let curryAxArr = renSett.yAxis;

            if(orientation === 'left'){
                renSett.colorAxis[yPos].push(null);
            } else if(orientation === 'right'){
                curryAxArr = renSett.y2Axis;
                renSett.colorAxis2[yPos].push(null);
            }

            curryAxArr[yPos].push(event.detail.value);
            // TODO: Check for adding of time parameter

            that.recalculateBufferSize();
            that.initAxis();
            that.resize(false);
            //that.renderData();

            // Recheck if parameter info should be shown now
            that.el.selectAll('.parameterInfo').each(function(){
                if(d3.select(this).node().childNodes.length > 0){
                    d3.select(this).style('display', 'block');
                }
            });

            /**
            * Event is fired When modifying a parameter for any of the 
            * axis settings.
            * @event module:graphly.graphly#axisChange
            */
            that.emit('axisChange');
        },false);


        settingParameters.passedElement.addEventListener('removeItem', function(event) {

            yAxisLabel[yPos] = null;

            let renSett = that.renderSettings;
            let index = currAxis.indexOf(event.detail.value);

            // TODO: Should it happen that the removed item is not in the list?
            // Do we need to handle this case? 
            if(index!==-1){

                currAxis.splice(index, 1);
                if(orientation === 'left'){
                    renSett.colorAxis[yPos].splice(index,1);
                } else if(orientation === 'right'){
                    renSett.colorAxis2[yPos].splice(index,1);
                }

                that.initAxis();
                that.resize(false);
                that.createAxisLabels();
                that.emit('axisChange');
            }

            // Recheck if parameter info should be hidden 
            that.el.selectAll('.parameterInfo').each(function(){
                if(d3.select(this).node().childNodes.length === 0){
                    d3.select(this).style('display', 'none');
                }
            });

        },false);


        if(this.enableSubYAxis && orientation === 'left'){
            if( (typeof this.enableSubXAxis !== 'string') || 
                (
                    this.renderSettings.yAxis[yPos].length === 1 &&
                    this.renderSettings.yAxis[yPos][0] === this.enableSubYAxis
                ) ){

                con.append('div')
                    .style('margin-top', '20px')
                    .text('Secondary ticks');
                    
                let selCh = con.append('select')
                    .attr('id', 'subYChoices'+yPos)
                    .attr('multiple', true);

                
                let subYParameters = new Choices(
                    selCh.node(), {
                        choices: ySubChoices,
                        removeItemButton: true,
                        placeholderValue: ' select ...',
                        itemSelectText: '',
                    }
                );

                subYParameters.passedElement.addEventListener('addItem', function(event) {
                    let addYT = that.renderSettings.additionalYTicks;
                    addYT[yPos].push(event.detail.value);
                    let maxL = 0;
                    for(let i=0;i<addYT.length;i++){
                        maxL = Math.max(maxL, addYT[i].length);
                    }
                    that.subAxisMarginY = 80*maxL;
                    that.initAxis();
                    that.resize();
                    //that.renderData();
                    that.createAxisLabels();
                    that.emit('axisChange');
                }, false);

                subYParameters.passedElement.addEventListener('removeItem', function(event) {
                    let addYT = that.renderSettings.additionalYTicks;
                    let index = addYT[yPos].indexOf(event.detail.value);
                    if(index!==-1){
                        addYT[yPos].splice(index, 1);
                        let maxL = 0;
                        for(let i=0;i<addYT.length;i++){
                            maxL = Math.max(maxL, addYT[i].length);
                        }
                        that.subAxisMarginY = 80*maxL;
                        that.initAxis();
                        that.resize();
                        //that.renderData();
                        that.createAxisLabels();
                        that.emit('axisChange');
                    }
                },false);
            }
            
        }


    }

    createAxisLabels(){

        // Create x axis label
        let xHidden;
        if(!this.el.select('#xSettings').empty()){
            xHidden = (this.el.select('#xSettings').style('display') == 'block' ) ? 
                false : true;
        }else{
            xHidden = true;
        }

        let xChoices = [];
        let xSubChoices = [];
        

        // Do some cleanup
        this.el.selectAll('.axisLabel').on('click',null);
        this.el.selectAll('.axisLabel').remove();
        this.el.selectAll('.subAxisLabel').remove();


        // Go through data settings and find currently available ones
        for (let key in this.data) {
            // Check if key is part of a combined parameter
            let ignoreKey = false;
            let comKey = null;
            for (comKey in this.renderSettings.combinedParameters){
                if(this.renderSettings.combinedParameters[comKey].indexOf(key) !== -1){
                    ignoreKey = true;
                }
            }

            // Check for renderGroups
            if(this.renderSettings.renderGroups && this.renderSettings.groups){
                // only important for first plot
                let rGroup = this.renderSettings.groups[0];
                if(this.renderSettings.renderGroups[rGroup].parameters.indexOf(key) === -1){
                    ignoreKey = true;
                }
            }

            // Check if key is available in data first
            if( !ignoreKey && (this.data.hasOwnProperty(key)) ){
                xChoices.push({value: key, label: key});
                if(this.renderSettings.xAxis === key){
                    xChoices[xChoices.length-1].selected = true;
                }
            } 

            if (this.data.hasOwnProperty(key)){
                xSubChoices.push({value: key, label: key});
                if(this.enableSubXAxis &&
                   this.renderSettings.additionalXTicks.indexOf(key)!==-1){
                    xSubChoices[xSubChoices.length-1].selected = true;
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

            // Check for renderGroups
            if(this.renderSettings.renderGroups && this.renderSettings.groups){
                // only important for first plot
                let rGroup = this.renderSettings.groups[0];

                for (let par=0; par<comPars[comKey].length; par++){
                    if(this.renderSettings.renderGroups[rGroup].parameters.indexOf(comPars[comKey][par]) === -1){
                        includePar = false;
                    }
                }
            }

            if(includePar){
                xChoices.push({value: comKey, label: comKey});
                if(this.renderSettings.xAxis === comKey){
                    xChoices[xChoices.length-1].selected = true;
                }
            }
        }

        // Check for renderGroups and shared parameters
        if(this.renderSettings.renderGroups && this.renderSettings.sharedParameters){
            // For single plot allow normal choices selection based on current group
            // but limit the selection to current group parameters
            if(this.renderSettings.yAxis.length === 1){
                // Currently selected one is the corresponding shared one part
                // of the group
                if(this.renderSettings.sharedParameters.hasOwnProperty(this.renderSettings.xAxis)){
                    let sharPars = this.renderSettings.sharedParameters[this.renderSettings.xAxis];
                    for (var i = 0; i < xChoices.length; i++) {
                        if(sharPars.indexOf(xChoices[i].value)!==-1){
                            xChoices[i].selected = true;
                        }
                    }
                }
            } else if(this.renderSettings.yAxis.length > 1){
                xChoices = [];
                for (var key in this.renderSettings.sharedParameters){
                    xChoices.push({value: key, label: key});
                    if(this.renderSettings.xAxis === key){
                        xChoices[xChoices.length-1].selected = true;
                    }
                }
            }
        }

        let multiLength = this.renderSettings.yAxis.length;

        for (let yPos=0; yPos<multiLength; yPos++){

            let heighChunk = this.height/multiLength;
            let offsetY = yPos*heighChunk;
            let currHeightCenter = ((heighChunk - this.separation)/2) + offsetY;

            let currYAxis = this.renderSettings.yAxis[yPos];
            let currY2Axis = defaultFor(this.renderSettings.y2Axis[yPos], []);

             // Check for available parameter options
            let yChoices = [];
            let y2Choices = [];
            let ySubChoices = [];

            // Go through data settings and find currently available ones
            for (let key in this.data) {
                // Check if key is part of a combined parameter
                let ignoreKey = false;
                let comKey = null;
                for (comKey in this.renderSettings.combinedParameters){
                    if(this.renderSettings.combinedParameters[comKey].indexOf(key) !== -1){
                        ignoreKey = true;
                    }
                }

                // Check for renderGroups
                if(this.renderSettings.renderGroups && this.renderSettings.groups){
                    let rGroup = this.renderSettings.groups[yPos];
                    if(this.renderSettings.renderGroups[rGroup].parameters.indexOf(key) === -1){
                        ignoreKey = true;
                    }
                }

                // Check if key is available in data first
                if( !ignoreKey && (this.data.hasOwnProperty(key)) ){

                    yChoices.push({value: key, label: key});
                    y2Choices.push({value: key, label: key});

                    if(currYAxis.indexOf(key)!==-1){
                        yChoices[yChoices.length-1].selected = true;
                        y2Choices.pop();
                    }
                    if(currY2Axis.indexOf(key)!==-1){
                        y2Choices[y2Choices.length-1].selected = true;
                        yChoices.pop();
                    }
                } 

                if (this.data.hasOwnProperty(key)){

                    ySubChoices.push({value: key, label: key});

                    if(this.enableSubYAxis &&
                       this.renderSettings.additionalYTicks[yPos].indexOf(key)!==-1){
                        ySubChoices[ySubChoices.length-1].selected = true;
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

                // Check for renderGroups
                if(this.renderSettings.renderGroups && this.renderSettings.groups){
                    let rGroup = this.renderSettings.groups[yPos];
                    if(this.renderSettings.renderGroups[rGroup].parameters.indexOf(comKey) === -1){
                        includePar = false;
                    }
                }

                if(includePar){
                    yChoices.push({value: comKey, label: comKey});
                    y2Choices.push({value: comKey, label: comKey});

                    if(currYAxis.indexOf(comKey)!==-1){
                        yChoices[yChoices.length-1].selected = true;
                        y2Choices.pop();
                    }
                    // Add selected attribute also to y2 axis selections
                    if(currY2Axis.indexOf(comKey)!==-1){
                        y2Choices[y2Choices.length-1].selected = true;
                        yChoices.pop();
                    }
                }
            }

            this.creatAxisLabelElement(
                ('ySettings'+yPos), 'yAxis', yChoices, ySubChoices, currYAxis,
                this.yAxisLabel, yPos, 'left', currHeightCenter
            );

            this.creatAxisLabelElement(
                ('y2Settings'+yPos), 'y2Axis', y2Choices, ySubChoices, currY2Axis,
                this.y2AxisLabel, yPos, 'right', currHeightCenter
            );
        }

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
            .attr('transform', 'translate('+ (
                this.width/2) +','+(this.height+(
                    this.margin.bottom-20
                )
            )+')')
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
            .style('bottom', (this.margin.bottom+this.subAxisMarginX)+'px')
            .style(
                'left',
                ((
                    (this.width+this.margin.left+this.subAxisMarginY+
                     this.marginY2Offset+this.margin.right+this.marginCSOffset)/2)
                -105)+'px'
            )
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

        let that = this;
        let con = this.el.select('#xSettings').append('div')
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


        if(this.enableSubXAxis){
            if( (typeof this.enableSubXAxis !== 'string') || 
                (this.renderSettings.xAxis === this.enableSubXAxis) ){

                con.append('div')
                    .style('margin-top', '20px')
                    .text('Secondary ticks');
                    
                con.append('select')
                    .attr('id', 'subXChoices');


                this.el.select('#subXChoices').attr('multiple', true);
                
                let subXParameters = new Choices(
                    this.el.select('#subXChoices').node(), {
                        choices: xSubChoices,
                        removeItemButton: true,
                        placeholderValue: ' select ...',
                        itemSelectText: '',
                    }
                );

                subXParameters.passedElement.addEventListener('addItem', function(event) {
                    that.renderSettings.additionalXTicks.push(event.detail.value);
                    that.subAxisMarginX = 40*that.renderSettings.additionalXTicks.length;
                    that.initAxis();
                    that.resize();
                    //that.renderData();
                    that.createAxisLabels();
                    that.emit('axisChange');
                }, false);

                subXParameters.passedElement.addEventListener('removeItem', function(event) {
                    let index = that.renderSettings.additionalXTicks.indexOf(event.detail.value);
                    if(index!==-1){
                        that.renderSettings.additionalXTicks.splice(index, 1);
                        that.subAxisMarginX = 40*that.renderSettings.additionalXTicks.length;
                        that.initAxis();
                        that.resize();
                        //that.renderData();
                        that.createAxisLabels();
                        that.emit('axisChange');
                    }
                },false);
            }
        }

        xSettingParameters.passedElement.addEventListener('change', function(event) {
            //Reset subaxis parameters when changing main parameter
            that.renderSettings.additionalXTicks = [];

            that.xAxisLabel = null;
            that.renderSettings.xAxis = event.detail.value;
            that.recalculateBufferSize();
            that.initAxis();
            that.renderData();
            that.createAxisLabels();
            that.emit('axisChange');
        },false);


        // Create subticks lables
        if(this.renderSettings.hasOwnProperty('additionalXTicks')){
            for (let i = 0; i < this.renderSettings.additionalXTicks.length; i++) {
                this.svg.append('text')
                    .attr('class', 'subXAxisLabel subAxisLabel')
                    .attr('text-anchor', 'middle')
                    .attr('transform', 'translate('+ (
                        this.width/2) +','+(this.height+(
                            this.margin.bottom+((i)*40) + 20 
                        )
                    )+')')
                    .attr('stroke', 'none')
                    .attr('text-decoration', 'none')
                    .text(this.renderSettings.additionalXTicks[i]);
            }
        }

        if(this.renderSettings.hasOwnProperty('additionalYTicks')){
            let aYT = this.renderSettings.additionalYTicks;
            let heighChunk = this.height/this.renderSettings.yAxis.length;
            for (let i = 0; i < aYT.length; i++) {
                if(typeof aYT[i] !== 'undefined'){
                    for(let j=0; j<aYT[i].length; j++){

                        this.svg.append('text')
                            .attr('class', 'subYAxisLabel subAxisLabel')
                            .attr('text-anchor', 'middle')
                            .attr('transform',
                                'translate('+ -((j*80)+this.margin.left/2+90) +','+
                                (heighChunk*i+heighChunk/2)+')rotate(-90)'
                            )
                            .attr('stroke', 'none')
                            .attr('text-decoration', 'none')
                            .text(aYT[i][j]);
                    }
                }
            }
        }

        d3.selectAll('.axisLabel').attr('font-size', this.defaultLabelSize+'px');
        d3.selectAll('.svgaxisLabel').attr('font-size', this.defaultLabelSize+'px');
    }

    createColorScale(id, index, yPos){

        let ds = this.dataSettings[id];
        let dataRange = [0,1];

        if(ds.hasOwnProperty('extent')){
            dataRange = ds.extent;
        }

        let innerHeight = (this.height/this.renderSettings.yAxis.length)-this.separation;
        let yOffset = (innerHeight+this.separation) * yPos;
        let width = 100;


        // Ther are some situations where the object is not initialized 
        // completely and size can be 0 or negative, this should prevent this
        if(innerHeight<=0){
            innerHeight = 100;
        }

        let colorAxisScale = d3.scale.linear();

        if(this.checkTimeScale(id)){
            colorAxisScale = d3.time.scale.utc();
        }

        colorAxisScale.domain(dataRange);
        colorAxisScale.range([innerHeight, 0]);

        let colorAxis = d3.svg.axis()
            .orient("right")
            .tickSize(5)
            .scale(colorAxisScale);

        colorAxis.tickFormat(this.colorAxisTickFormat);

        let csOffset = this.margin.right/2 + this.marginY2Offset + width/2 + width*index;
        
        let g = this.el.select('svg').select('g').append("g")
            .attr('id', ('colorscale_'+id))
            .attr("class", "color axis")
            .style('pointer-events', 'all')
            .attr('transform', 
                'translate(' + (this.width+csOffset) + ','+yOffset+')'
            )
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
            .attr('transform', 'translate(' + 60 + ' ,'+(innerHeight/2)+') rotate(270)')
            .text(label);

        let csZoomEvent = ()=>{
            delete this.colorCache[id];
            g.call(colorAxis);
            this.dataSettings[id].extent = colorAxisScale.domain();
            this.renderData(false);
        };

        let csZoom = d3.behavior.zoom()
          .y(colorAxisScale)
          .on('zoom', csZoomEvent);

        g.call(csZoom).on('dblclick.zoom', null);

        if(!this.checkTimeScale(id)){
            g.append('text')
                .attr('class', 'modifyColorscaleIcon')
                .text('✐')
                .style('font-size', '1.7em')
                .attr('transform', 'translate(-' + 45 + ' ,' + 0 + ') rotate(' + 90 + ')')
                .on('click', function (){
                    let evtx = d3.event.layerX;
                    let evty = d3.event.layerY; 
                    this.positionAxisForms(colorAxis, id, g, evtx, evty);
                }.bind(this))
        }
        
    }
    
    positionAxisForms(colorAxis, id, g, evtx, evty){
    // takes care of positioning and defining functions of axis edit forms
        // to pre-fill forms
        let extent = this.dataSettings[id].extent;
        // offset of form from the click event position
        let formYOffset = 20;
        let formXOffset = 2;

        d3.selectAll('.rangeEdit')
            .classed('hidden', false);

        d3.select('#rangeEditMax')
            .property('value', extent[1])
            .style('top', evty + formYOffset  + 'px')
            .style('left', evtx + formXOffset + 'px')
            .node()
            .focus();
        d3.select('#rangeEditMax')
            .node()
            .select();

        let formMaxPos = d3.select('#rangeEditMax').node().getBoundingClientRect();

        d3.select('#rangeEditMin')
            .property('value', extent[0])
            .style('top', evty + formYOffset + formMaxPos.height + 5 + 'px')
            .style('left', evtx + formXOffset + 'px')

        let formMinPos = d3.select('#rangeEditMin').node().getBoundingClientRect();

        d3.selectAll('#rangeEditMax, #rangeEditMin')
            .on('keypress', function(){
                // confirm forms on enter
                if(d3.event.keyCode === 13){
                    this.submitAxisForm(colorAxis, id, g);
                }
            }.bind(this))

        d3.select('#rangeEditConfirm')
            .style('top', evty + formYOffset + formMaxPos.height + 5 +'px')
            .style('left', evtx + formXOffset + formMinPos.width + 'px')
            .on('click', function(){
                this.submitAxisForm(colorAxis, id, g);
            }.bind(this));


        d3.select('#rangeEditCancel')
            .style('top', evty +  formYOffset + 'px')
            .style('left', evtx + formXOffset + formMaxPos.width + 'px')
            .on('click', function(){
                d3.selectAll('.rangeEdit')
                    .classed('hidden', true);
                });
    }

    submitAxisForm (axis, id, axisElement) {
        let min = Number(d3.select('#rangeEditMin').property('value'));
        let max = Number(d3.select('#rangeEditMax').property('value'));
        //checks for invalid values
        if (!isNaN(min) && !isNaN(max)){
            // if user reversed order, fix it
            let newDataDomain = (min < max) ? [min, max] : [max, min];

            //update domain of axis scale
            let updateAxis = () => {
                delete this.colorCache[id];
                axisElement.call(axis);
                this.dataSettings[id].extent = axis.scale().domain();
                this.renderData(false);
            };

            axis.scale().domain(newDataDomain);
            updateAxis();

            //update colorscale zoom to take changes into account
            let csZoom = d3.behavior.zoom()
                .y(axis.scale())
                .on('zoom', updateAxis);
            axisElement.call(csZoom);

            d3.selectAll('#rangeEditMin, #rangeEditMax')
                .classed('wrongFormInput', false);

            d3.selectAll('.rangeEdit')
                .classed('hidden', true);

      } else {
            if (isNaN(min)){
                d3.select('#rangeEditMin')
                    .classed('wrongFormInput', true);
            }
            if (isNaN(max)){
                d3.select('rangeEditMax')
                    .classed('wrongFormInput', true);
            }
        }
    }
    
    createColorScales(){

        let colAxis = this.renderSettings.colorAxis;
        let colAxis2 = this.renderSettings.colorAxis2;
        

        this.el.selectAll('.color.axis').remove();

        for (let plotY=0; plotY<this.renderSettings.yAxis.length; plotY++){

            let csIndex = 0;

            for(let pos=0; pos<colAxis[plotY].length; pos++){
                if(colAxis[plotY][pos] !== null){
                    this.createColorScale(colAxis[plotY][pos], csIndex++, plotY);
                }
            }

            for(let pos=0; pos<colAxis2[plotY].length; pos++){
                if(colAxis2[plotY][pos] !== null){
                    this.createColorScale(colAxis2[plotY][pos], csIndex++, plotY);
                }
            }
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

        let rec = this.svg.append('rect')
            .attr('id', 'zoomXBox')
            .attr('width', this.width)
            .attr('height', (this.margin.bottom+this.subAxisMarginX))
            .attr('transform', 'translate(' + 0 + ',' + (this.height) + ')')
            .style('visibility', 'hidden')
            .attr('pointer-events', 'all');

        if(this.debug){
            rec.attr('fill', 'blue')
                .attr('opacity', 0.3)
                .style('visibility', 'visible');
        }

        // Add rectangles as 'outline' for plots

        if(this.multiYAxis){
            // Add button to create new plot
            if(d3.select('#newPlotLink').empty()){
                this.el.append('div')
                    .attr('id', 'newPlotLink')
                    .style('left', (this.width/2)+this.margin.left+40+'px')
                    .text('+ Add plot')
                    .style('top', (this.margin.top-20)+'px')
                    .on('click', ()=>{
                        this.renderSettings.yAxis.push([]);
                        this.renderSettings.y2Axis.push([]);
                        this.renderSettings.colorAxis.push([]);
                        this.renderSettings.colorAxis2.push([]);
                        this.renderSettings.additionalYTicks.push([]);

                        if(this.renderSettings.renderGroups && 
                            this.renderSettings.groups){

                            this.renderSettings.groups.push(
                                Object.keys(this.renderSettings.renderGroups)[0]
                            );
                            // If going from one plot to two, check for shared
                            // x axis parameter
                            if(this.renderSettings.yAxis.length === 2){
                                let shPars = this.renderSettings.sharedParameters;
                                let convAvailable = false;
                                for (var shK in shPars){
                                    if(shPars[shK].indexOf(this.renderSettings.xAxis) !== -1){
                                        this.renderSettings.xAxis = shK;
                                        convAvailable = true;
                                    }
                                }
                                if(!convAvailable){
                                    this.renderSettings.xAxis = Object.keys(shPars)[0];
                                }
                            }
                        }

                        this.emit('axisChange');
                        this.loadData(this.data);
                    });
            }

            // Clear possible remove buttons
            d3.selectAll('.removePlot').remove();
            d3.selectAll('.arrowChangePlot').remove();
        }

        if(d3.select('#globalSettings').empty()){

            let con = this.el.append('div')
                .attr('id', 'globalSettingsContainer')
                .style('left', (this.width/2)+this.margin.left-75+'px')
                .style('width', '150px')
                .style('top', (this.margin.top)+1+'px');

            con.append('div')
                .attr('class', 'labelClose cross')
                .on('click', ()=>{
                    d3.select('#globalSettingsContainer').style('display', 'none');
                });

            con.append('label')
                .attr('for', 'labelFontSize')
                .text('Label font size');

            con.append('input')
                .attr('id', 'labelFontSize')
                .attr('type', 'text')
                .property('value', this.defaultLabelSize)
                .on('input', ()=>{
                    this.defaultLabelSize = d3.event.currentTarget.value;
                    d3.selectAll('.axisLabel').attr('font-size', this.defaultLabelSize+'px');
                    d3.selectAll('.svgaxisLabel').attr('font-size', this.defaultLabelSize+'px');
                    d3.selectAll('.labelitem').style('font-size', this.defaultLabelSize+'px');
                });

            con.append('label')
                .attr('for', 'tickFontSize')
                .text('Tick font size');

            con.append('input')
                .attr('id', 'tickFontSize')
                .attr('type', 'text')
                .property('value', this.defaultTickSize)
                .on('input', ()=>{
                    this.defaultTickSize = d3.event.currentTarget.value;
                    this.svg.selectAll('.tick').attr('font-size', this.defaultTickSize+'px');
                });

            con.append('label')
                .attr('for', 'showFilteredDataOption')
                .text('Show filtered data');

            con.append('input')
                .attr('id', 'showFilteredDataOption')
                .attr('type', 'checkbox')
                .property('checked', this.showFilteredData)
                .on('input', ()=>{
                    this.showFilteredData = 
                        d3.select("#showFilteredDataOption").property("checked");
                    this.renderData(false);
                });

            this.el.append('div')
                .attr('id', 'globalSettings')
                .style('left', (this.width/2)+this.margin.left-40+'px')
                .text('Config')
                .style('top', (this.margin.top-20)+'px')
                .on('click', ()=>{
                    let vis = d3.select('#globalSettingsContainer').style('display');
                    if (vis === 'block'){
                         d3.select('#globalSettingsContainer').style('display', 'none');
                    } else {
                        d3.select('#globalSettingsContainer').style('display', 'block');
                        d3.select('#labelFontSize').node().focus();
                        d3.select('#labelFontSize').node().select();
                    }
                });
        }




        let multiLength = this.renderSettings.yAxis.length;
        let heighChunk = this.height/multiLength;
        let currHeight = heighChunk - this.separation;

        // Add clip path so only points in the area are shown
        let clippath = this.svg.append('defs').append('clipPath')
            .attr('id', (this.nsId.substring(1)+'clipbox'))
            .attr(
                'transform',
                'translate(0,0)'
            );

        clippath.append('rect')
            .attr('fill', 'none')
            .attr('y', 0)
            .attr('width', this.width)
            .attr('height', currHeight);

        // Remove previous cog icons
        this.el.selectAll('.cogIcon').remove();


        for (let plotY = 0; plotY < this.renderSettings.yAxis.length; plotY++) {

            let offsetY = plotY*heighChunk;

            if(this.multiYAxis && this.renderSettings.yAxis.length>1){
                // Add remove button to remove plot
                this.el.append('div')
                    .attr('class', 'cross removePlot')
                    .attr('data-index', plotY)
                    .style('left', '10px')
                    .style('top', (offsetY+this.margin.top+10)+'px')
                    .on('click', ()=>{

                        let renSett = this.renderSettings;
                        let index = Number(d3.select(d3.event.target).attr('data-index'));

                        renSett.yAxis.splice(index, 1);
                        renSett.y2Axis.splice(index, 1);
                        // Remove color settings from left side
                        renSett.colorAxis.splice(index, 1);
                        renSett.colorAxis2.splice(index, 1);

                        let addYT = this.renderSettings.additionalYTicks; 
                        addYT.splice(index,1);
                        // Recalculate subaxis margin
                        let maxL = 0;
                        for(let i=0; i<addYT.length; i++){
                            maxL = Math.max(maxL, addYT[i].length);
                        }
                        this.subAxisMarginY = 80*maxL;

                        if(renSett.renderGroups && renSett.groups){

                            renSett.groups.splice(index, 1);
                            // If going from two plots to one, check for shared
                            // x axis parameter
                            if(renSett.yAxis.length === 1){
                                if(renSett.sharedParameters.hasOwnProperty(renSett.xAxis)){
                                    // Find matchin parameter for current group
                                    let currShared = renSett.sharedParameters[renSett.xAxis];
                                    // eg datetime: 2 pars
                                    let currGroup = renSett.groups[0];
                                    // currgroup mie
                                    for (let i = 0; i < currShared.length; i++) {
                                        if(renSett.renderGroups[currGroup]
                                            .parameters.indexOf(currShared[i]) !== -1){
                                            this.renderSettings.xAxis = currShared[i];
                                        }
                                    }
                                }
                            }
                        }

                        this.emit('axisChange');
                        this.loadData(this.data);
                    });

                // Add move up arrow 
                if(plotY>0){
                    this.el.append('div')
                        .attr('class', 'arrowChangePlot up')
                        .html('&#9650;')
                        .attr('data-index', plotY)
                        .style('left', '10px')
                        .style('top', (offsetY+this.margin.top+20)+'px')
                        .on('click', ()=>{

                            let index = Number(d3.select(d3.event.target).attr('data-index'));
                            let rS = this.renderSettings;

                            let curryAxis = rS.yAxis[index];
                            let curry2Axis = rS.y2Axis[index];
                            let currColAx = rS.colorAxis[index];
                            let currColAx2 = rS.colorAxis2[index];
                            let curraddYTicks = rS.additionalYTicks[index];

                            rS.yAxis[index] = rS.yAxis[index-1];
                            rS.y2Axis[index] = rS.y2Axis[index-1];
                            rS.additionalYTicks[index] = rS.additionalYTicks[index-1];
                            rS.colorAxis[index] = rS.colorAxis[index-1];
                            rS.colorAxis2[index] = rS.colorAxis2[index-1];

                            rS.yAxis[index-1] = curryAxis;
                            rS.y2Axis[index-1] = curry2Axis;
                            rS.additionalYTicks[index-1] = curraddYTicks;
                            rS.colorAxis[index-1] = currColAx;
                            rS.colorAxis2[index-1] = currColAx2;

                            if(rS.renderGroups && rS.groups){
                                let currGroup = rS.groups[index];
                                rS.groups[index] = rS.groups[index-1];
                                rS.groups[index-1] = currGroup;
                            }

                            this.emit('axisChange');
                            this.loadData(this.data);
                        });
                }

                // Add move down arrow 
                if(plotY<this.renderSettings.yAxis.length-1){
                    let addoff = 45;
                    if(plotY === 0){
                        addoff = 20;
                    }
                    this.el.append('div')
                        .attr('class', 'arrowChangePlot down')
                        .html('&#9660;')
                        .attr('data-index', plotY)
                        .style('left', '10px')
                        .style('top', (offsetY+this.margin.top+addoff)+'px')
                        .on('click', ()=>{

                            let index = Number(d3.select(d3.event.target).attr('data-index'));
                            let rS = this.renderSettings;

                            let curryAxis = rS.yAxis[index];
                            let curry2Axis = rS.y2Axis[index];
                            let currColAx = rS.colorAxis[index];
                            let currColAx2 = rS.colorAxis2[index];
                            let curraddYTicks = rS.additionalYTicks[index];

                            rS.yAxis[index] = rS.yAxis[index+1];
                            rS.y2Axis[index] = rS.y2Axis[index+1];
                            rS.additionalYTicks[index] = rS.additionalYTicks[index+1];
                            rS.colorAxis[index] = rS.colorAxis[index+1];
                            rS.colorAxis2[index] = rS.colorAxis2[index+1];

                            rS.yAxis[index+1] = curryAxis;
                            rS.y2Axis[index+1] = curry2Axis;
                            rS.additionalYTicks[index+1] = curraddYTicks;
                            rS.colorAxis[index+1] = currColAx;
                            rS.colorAxis2[index+1] = currColAx2;

                            if(rS.renderGroups && rS.groups){
                                let currGroup = rS.groups[index];
                                rS.groups[index] = rS.groups[index+1];
                                rS.groups[index+1] = currGroup;
                            }

                            this.emit('axisChange');
                            this.loadData(this.data);
                        });
                }
            }

             // Add settings button to display/hide parameter information
            if(!this.displayParameterLabel) {
                if(this.el.select('#cogIcon'+plotY).empty()){
                    this.el.append('div')
                        .attr('id', ('cogIcon'+plotY))
                        .attr('class', 'cogIcon')
                        .style('left', (this.margin.left+this.subAxisMarginY)+'px')
                        .style('top', (offsetY+this.margin.top)+'px')
                        .on('click', ()=>{
                            let info = this.el.select(('#parameterInfo'+plotY));
                            if(info.style('visibility') == 'visible'){
                                info.style('visibility', 'hidden');
                                this.el.select(('#parameterSettings'+plotY))
                                    .style('display', 'none');
                            }else{
                                info.style('visibility', 'visible');
                            }
                        })
                        .on('mouseover', function(){
                            d3.select(this).style('background-size', '45px 45px');
                        })
                        .on('mouseout', function(){
                            d3.select(this).style('background-size', '41px 41px');
                        });
                }
            } else {
                let info = this.el.select(('#parameterInfo'+plotY));
                info.style('visibility', 'visible');
            }

            this.svg.append('g')
                .attr('id','renderingContainer'+plotY)
                .attr('fill', 'none')
                .attr(
                    'transform',
                    'translate(0,' + heighChunk*plotY + ')'
                )
                .style('clip-path','url('+this.nsId+'clipbox)');


            this.svg.append('rect')
                .attr('id', 'zoomXYBox'+plotY)
                .attr('class', 'rectangleOutline zoomXYBox')
                .attr('fill', 'none')
                .attr('stroke', '#333')
                .attr('stroke-width', 1)
                .attr('shape-rendering', 'crispEdges')
                .attr('width', this.width)
                .attr('height', currHeight)
                .attr(
                    'transform',
                    'translate(0,' + offsetY + ')'
                );

            let rec = this.svg.append('rect')
                .attr('id', ('zoomYBox'+plotY))
                .attr('class', 'zoomYBox')
                .attr('width', this.margin.left)
                .attr('height', currHeight )
                .attr(
                    'transform',
                    'translate(' + -(this.margin.left+this.subAxisMarginY) + 
                    ',' + offsetY + ')'
                )
                .style('visibility', 'hidden')
                .attr('pointer-events', 'all');

                if(this.debug){
                    rec.attr('fill', 'red')
                        .attr('opacity', 0.3)
                        .style('visibility', 'visible');
                }

            rec = this.svg.append('rect')
                .attr('id', 'zoomY2Box'+plotY)
                .attr('class', 'zoomY2Box')
                .attr('width', this.margin.right + this.marginY2Offset)
                .attr('height', currHeight )
                .attr('transform', 'translate(' + (
                    this.width
                    ) + ',' + offsetY + ')'
                )
                .style('visibility', 'hidden')
                .attr('pointer-events', 'all');

            if(this.debug){
                rec.attr('fill', 'yellow')
                    .attr('opacity', 0.3)
                    .style('visibility', 'visible');
            }

        }

        this.createColorScales();
        this.createInfoBoxes();
        this.createParameterInfo();

        

        // Cleanup
        this.el.selectAll('.rangeEdit').remove();
        
        // range edit forms 
        this.el.append('input')
            .attr('class', 'rangeEdit hidden')
            .attr('id', 'rangeEditMax')
            .attr('type', 'text')
            .attr('size', 7);
        this.el.append('input')
            .attr('class', 'rangeEdit hidden')
            .attr('id', 'rangeEditMin')
            .attr('type', 'text')
            .attr('size', 7);
        this.el.append('input')
            .attr('class', 'rangeEdit hidden')
            .attr('id', 'rangeEditCancel')
            .attr('type', 'button')
            .attr('value', '✕');
        this.el.append('input')
            .attr('class', 'rangeEdit hidden')
            .attr('id', 'rangeEditConfirm')
            .attr('type', 'button')
            .attr('value', '✔');
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

    getMaxArrayLenght(compList){
        let maxL = 0;
        for (let x=0; x<compList.length; x++){
            maxL = d3.max([ compList[x].length, maxL]);
        }
        return maxL;
    }

    getMaxCSAmount(){
        let csAmount = 0;
        for (let plotY=0; plotY<this.renderSettings.yAxis.length; plotY++){
            csAmount = d3.max([
                this.renderSettings.colorAxis[plotY].filter(
                    function(o) {return o !== null;}
                ).length + 
                this.renderSettings.colorAxis2[plotY].filter(
                    function(o) {return o !== null;}
                ).length,
                csAmount
            ]);
        }
        return csAmount;
    }

    /**
    * Load data from data object
    * @param {Object} data Data object containing parameter identifier as keys and 
             arrays of values as corresponding parameter. {'parId1': [1, 2, 3], 
             'parId2': [0.6, 0.1, 3.2]}
    */
    loadData(data){
        
        this.startTiming('loadData');
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
        // Do some cleanup
        this.el.selectAll('.parameterInfo').remove();

        this.initAxis();

        // Make sure all elements have correct size after possible changes 
        // because of difference in data and changes in size since initialization
        // Do this only for non fixed configured plots

        if(!this.fixedSize){
            // Clear possible canvas styles
            this.renderCanvas.style('width', null);
            this.renderCanvas.style('height', null);

            this.dim = this.el.node().getBoundingClientRect();
            // If there are colorscales to be rendered we need to apply additional
            // margin to the right reducing the total width

            let csAmount = this.getMaxCSAmount();

            if(this.renderSettings.hasOwnProperty('y2Axis') && 
               this.getMaxArrayLenght(this.renderSettings.y2Axis)>0){
                this.marginY2Offset = 40;
            } else {
                this.marginY2Offset = 0;
            }

            this.marginCSOffset = csAmount*100;
            this.width = this.dim.width - this.margin.left - 
                         this.margin.right - this.marginY2Offset - 
                         this.marginCSOffset- this.subAxisMarginY;
            this.height = this.dim.height - this.margin.top - 
                          this.margin.bottom - this.subAxisMarginX;
            this.resize_update();
            this.createColorScales();
            this.createAxisLabels();

            this.batchDrawer.updateCanvasSize(this.width, this.height);
            this.batchDrawerReference.updateCanvasSize(this.width, this.height);
        }

        this.endTiming('loadData');
        this.renderData();
    }


    calculateExtent(selection) {
        let currExt, resExt; 
        for (var i = selection.length - 1; i >= 0; i--) {
            // Check if null value has been defined
            if(this.dataSettings[selection[i]].hasOwnProperty('nullValue')){
                let nV = this.dataSettings[selection[i]].nullValue;
                // If parameter has nullvalue defined ignore it 
                // when calculating extent
                currExt = d3.extent(
                    this.data[selection[i]], (v)=>{
                        if(v !== nV){
                            return v;
                        } else {
                            return null;
                        }
                    }
                );
            } else {
                if(this.checkTimeScale(selection[i])){
                    currExt = d3.extent(this.data[selection[i]], (item)=>{
                        return item.getTime();
                    });
                } else {
                    currExt = d3.extent(this.data[selection[i]]);
                }
            }
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
        if(isNaN(resExt[0])){
            resExt[0] = 0;
        }
        if(isNaN(resExt[1])){
            resExt[1] = resExt[0]+1;
        }
        if(resExt[0] == resExt[1]){
            resExt[0]-=1;
            resExt[1]+=1;
        }
        if(resExt[0]>resExt[1]){
            resExt = resExt.reverse();
        }
        return resExt;
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

    customSubtickFormat(currParDat, addT, d){
        // TODO: Check if selection is group
        //let currParDat = this.data[xSelection[0]];
        let tickformat = d3.format('g');
        let secParDat;
        let addValues = [];
        let timeScale = d instanceof Date;
        if(timeScale){
            addValues.push(u.getCustomUTCTimeTickFormat()(d));
        } else {
            // cut small decimals to solve float problems for axis labels
            addValues.push(tickformat(d.toFixed(11)));
        }
        // Find corresponding value(s) for additional axis
        for (let x = 0; x < addT.length; x++) {
            secParDat = this.data[addT[x]];
            let idx = -1;
            let dataLength = currParDat.length-1;
            for (let j = 0; j < currParDat.length; j++) {
                if(timeScale){
                    if(currParDat[0]-currParDat[dataLength]<=0 &&
                        currParDat[j].getTime()>=d.getTime()){
                        idx = j-1;
                        break;
                    }
                    else if(currParDat[0]-currParDat[dataLength]>0 &&
                        currParDat[j].getTime()<=d.getTime()){
                        idx = j;
                        break;
                    }
                } else {
                    if(currParDat[0]-currParDat[1]<=0 && 
                       currParDat[j]>=d){
                        idx = j-1;
                        break;
                    } else if(currParDat[0]-currParDat[1]>0 && 
                       currParDat[j]<=d){
                        idx = j;
                        break;
                    }
                }
            }
            if(idx >= 0 && idx<secParDat.length){
                if(secParDat[idx]<100){
                    addValues.push(secParDat[idx].toFixed(2));
                }else{
                    addValues.push(secParDat[idx].toFixed(0));
                }
            } else {
                addValues.push(' ');
            }
        }
        return addValues.join('|');
    }

    getAxisFormat(parameter, enableSubAxis, additionalTicks){

        let tickformat = d3.format('g');
        let axisformat = tickformat;

        if(this.dataSettings.hasOwnProperty(parameter) && 
           this.dataSettings[parameter].hasOwnProperty('periodic')){
            let perSet = this.dataSettings[parameter].periodic;
            if(perSet.hasOwnProperty('specialTicks')){
                axisformat = (d)=>{
                    d = tickformat(d.toFixed(11));
                    let period = perSet.period;
                    let tickText;
                    let dm = Math.abs(d)%period;
                    let sign = '+ ';
                    if(dm<180){
                        sign = '- ';
                    }
                    if(dm > 0 && dm < 90){
                        tickText = sign+dm%90 + '↓';
                    }  else if(dm > 90 && dm < 180){
                        tickText = sign+(180-dm) + '↑';
                    } else if(dm > 180 && dm < 270){
                        tickText = sign+dm%90 + '↑';
                    }  else if(dm > 270 && dm < 360){
                        tickText = sign+(360-dm) + '↓';
                    } else if(dm === 0){
                        tickText = dm + '↓';
                    } else if(dm === 90){
                        tickText = sign+dm;
                    } else if(dm === 180){
                        tickText = dm%180 + '↑';
                    } else {
                        tickText = dm%180;
                    }
                    return tickText;
                };
            } else {
                axisformat = (d)=>{
                    let offset = defaultFor(
                        perSet.offset, 0
                    );
                    let period = perSet.period;
                    let dm = d-offset;
                    let offsetAmount = Math.floor(dm/period);
                    if(dm%period !== 0){
                        d = tickformat( (d - (offsetAmount*period)).toFixed(11) );
                    } else {
                        d = tickformat((period+offset).toFixed(11) )+' / '+
                            tickformat( offset.toFixed(11) );
                    }
                    return d;
                };
            }
        } else if(enableSubAxis){
            axisformat = this.customSubtickFormat.bind(
                this, this.data[parameter], additionalTicks
            );
        } else if(this.checkTimeScale(parameter)){
            axisformat = u.getCustomUTCTimeTickFormat();
            //this.xAxis.tickFormat(u.getCustomUTCTimeTickFormat());
        } else {
            axisformat = (d)=>{
                return tickformat(d.toFixed(11));
            };
        }
        return axisformat;
    }

    findClosestParameterMatch(currentParamenter, newGroupParameters){
        let decPar = currentParamenter.split('_');
        let selected = false;
        let maxMatches = 0;
        for(let par=0; par<newGroupParameters.length; par++){
            let matches = 0;
            let decgp = newGroupParameters[par].split('_');
            for (let i = 0; i < decgp.length; i++) {
                if(decPar.indexOf(decgp[i]) !== -1){
                    matches++;
                }
            }
            if(matches>maxMatches){
                maxMatches = matches;
                selected = newGroupParameters[par];
            }
        }
        return selected;
    }

    initAxis(){

        function getScale(isTime){
            if(isTime){
                return d3.time.scale.utc();
            } else {
                return d3.scale.linear();
            }
        }

        function calcExtent(extent, range, timescale, margin){
            margin = defaultFor(margin, [0.01, 0.01]);
            let returnExt = [];
            returnExt[0] = extent[0] - range*margin[0];
            returnExt[1] = extent[1] + range*margin[1];
            return returnExt;
        }

        this.svg.selectAll('*').remove();

        d3.selectAll('.parameterInfo').remove();

        let xExtent;
        let rs = this.renderSettings;

        // "Flatten selections"
        let xSelection = [];

        if(this.renderSettings.renderGroups !== false && 
            this.renderSettings.groups!== false && 
            this.renderSettings.sharedParameters !== false && 
            this.renderSettings.sharedParameters.hasOwnProperty(this.renderSettings.xAxis)){

            xSelection.push(this.renderSettings.xAxis);

            if(this.fixedXDomain !== undefined){
                xExtent = this.fixedXDomain;
            } else {
                let sharedPars = this.renderSettings.sharedParameters[xSelection];
                let rs = this.renderSettings;
                // Check for group parameters inside the shared parameters
                for (var i = 0; i < sharedPars.length; i++) {
                    if(rs.combinedParameters.hasOwnProperty(sharedPars[i])){
                        xSelection = [].concat.apply(
                            [], rs.combinedParameters[sharedPars[i]]
                        );
                    } else {
                        xSelection.push(sharedPars[i]);
                    }
                }
                xExtent = this.calculateExtent(xSelection);
            }

        } else {
            if(rs.combinedParameters.hasOwnProperty(rs.xAxis)){
                xSelection = [].concat.apply([], rs.combinedParameters[rs.xAxis]);
            } else {
                xSelection.push(this.renderSettings.xAxis);
            }

            if(this.fixedXDomain !== undefined){
                xExtent = this.fixedXDomain;
            } else {
                xExtent = this.calculateExtent(xSelection);
            }
        }

        


        let xScaleType;
        this.xTimeScale = this.checkTimeScale(xSelection[0]);
        xScaleType = getScale(this.xTimeScale);

        let xRange = xExtent[1] - xExtent[0];

        // Adapt domain so that data is not directly at border
        if(!this.fixedSize){
            xExtent = calcExtent(xExtent, xRange, this.xTimeScale);
        }

        this.xScale = xScaleType
            .domain([xExtent[0], xExtent[1]])
            .range([0, this.width]);


        this.xAxis = d3.svg.axis()
            .scale(this.xScale)
            .orient('bottom')
            .ticks(Math.max(this.width/120,2))
            .tickSize(-this.height);

        // Creating additional axis for sub parameters
        this.additionalXAxis = [];
        if(this.renderSettings.hasOwnProperty('additionalXTicks')){
            let addXTicks = this.renderSettings.additionalXTicks;
            for (let i = 0; i < addXTicks.length; i++) {

                this.additionalXAxis.push(
                    d3.svg.axis()
                        .scale(this.xScale)
                        .orient('bottom')
                        .ticks(Math.max(this.width/120,2))
                        .tickSize(5)
                        .tickFormat(()=>{return '';})
                );
            }
        }

        let xS = this.renderSettings.xAxis;

        let axisformat = this.getAxisFormat(
            xS, this.enableSubXAxis, this.renderSettings.additionalXTicks
        );

        this.xAxis.tickFormat(axisformat);

        this.xAxisSvg = this.svg.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0,' + this.height + ')')
            .call(this.xAxis);

        if(this.renderSettings.yAxis.length>0){
            // Add clip path so only points in the area are shown
            let clippathseparation = this.xAxisSvg.append('defs').append('clipPath')
                .attr("x", "0")
                .attr("y", "0")
                .attr('id', this.nsId.substring(1)+'clipseparation');

            let heighChunk = this.height/this.renderSettings.yAxis.length;
            for (let yy = 0; yy<this.renderSettings.yAxis.length; yy++) {
                clippathseparation.append('rect')
                    .attr('fill', 'none')
                    .attr('y', 0)
                    .attr('width', this.width)
                    .attr('height', heighChunk-this.separation)
                    .attr(
                        'transform',
                        'translate(0,-'+(this.height-(heighChunk*yy))+')'
                    );
            }
            // Add rect to contain all x axis tick labels
            clippathseparation.append('rect')
                .attr('fill', 'none')
                .attr('y', 0)
                .attr('width', this.width+this.margin.right)
                .attr('height', this.margin.bottom+10)
                .attr(
                    'transform',
                    'translate(0,1)'
                );
        }

        this.xAxisSvg.style('clip-path','url('+this.nsId+'clipseparation)');


        this.addXAxisSvg = [];
        for (let i = 0; i < this.additionalXAxis.length; i++) {
            this.addXAxisSvg.push(
                this.svg.append('g')
                    .attr('class', 'x_add subaxis')
                    .attr(
                        'transform', 
                        'translate(0,' + (this.height+35+(i*40)) + ')'
                    )
                    .call(this.additionalXAxis[i])
            );
        }

        let multiLength = this.renderSettings.yAxis.length;
        let heighChunk = this.height/multiLength;
        
        this.yScale = [];
        this.yAxis = [];
        this.yAxisSvg = [];

        this.y2Scale = [];
        this.y2Axis = [];
        this.y2AxisSvg = [];

        // Creating additional axis for sub parameters
        this.additionalYAxis = [];
        this.addYAxisSvg = [];

        this.yScaleCombined = d3.scale.linear()
            .domain([0,1])
            .range([this.height, 0]);

        this.el.selectAll('.groupSelect').remove();

        for (let yPos = 0; yPos < multiLength; yPos++) {

            // Add group selection drop down and functionality
            if(this.renderSettings.renderGroups !== false && 
                this.renderSettings.groups!== false){

                let selectionGroups = Object.keys(this.renderSettings.renderGroups);
                let currG = this.renderSettings.groups[yPos];
                var that = this;

                let select = this.el
                    .append('select')
                        .attr('class','groupSelect')
                        .style('top', Math.round((yPos*heighChunk)+this.margin.top-10)+'px')
                        .style('left', Math.round(this.width/2)+'px')
                        .on('change', function(){
                            // Go through current configuration and try to 
                            // adapt all parameters to the other group selected
                            // if not all is available try to check defaults
                            let groupKey = selectionGroups[this.selectedIndex];
                            let newGroup =  that.renderSettings.renderGroups[groupKey];
                            let newGroupPars = newGroup.parameters;
                            let prevGroup = that.renderSettings.groups[yPos];
                            //let prevGroupPars = that.renderSettings.renderGroups[prevGroup].parameters;
                            let currYAxis = that.renderSettings.yAxis[yPos];
                            let currY2Axis = that.renderSettings.y2Axis[yPos];
                            let currColAxis = that.renderSettings.colorAxis[yPos];
                            let currCol2Axis = that.renderSettings.colorAxis2[yPos];

                            let newYAxis = [];
                            let newY2Axis = [];
                            let newColAxis = [];
                            let newCol2Axis = [];

                            for (var i = 0; i < currYAxis.length; i++) {

                                // Try to find equvalent parameter
                                let tmpPar = currYAxis[i].replace(prevGroup, groupKey);
                                if(newGroupPars.indexOf(tmpPar)!==-1){
                                    newYAxis.push(tmpPar);
                                } else {
                                    // If not found check for defaults
                                    if(newGroup.hasOwnProperty('defaults') && 
                                       newGroup.defaults.hasOwnProperty('yAxis')){
                                        newYAxis.push(newGroup.defaults.yAxis);
                                    } else {
                                        // If now default try to find closest match
                                        let selected = that.findClosestParameterMatch(
                                            currYAxis[i], newGroupPars
                                        );
                                        if(selected){
                                            newYAxis.push(selected);
                                        }
                                    }
                                }

                                if(currColAxis[i] !== null){
                                    // Check for corresponding color
                                    let tmpCol = currColAxis[i].replace(prevGroup, groupKey);
                                    if(newGroupPars.indexOf(tmpCol)!==-1){
                                        newColAxis.push(tmpCol)
                                    } else {
                                        // If not found check for defaults
                                        if(newGroup.hasOwnProperty('defaults') && 
                                           newGroup.defaults.hasOwnProperty('yAxis')){
                                            newColAxis.push(newGroup.defaults.colorAxis);
                                        } else {
                                            // Search for closest match
                                            let selected = that.findClosestParameterMatch(
                                                currColAxis[i], newGroupPars
                                            );
                                            if(selected){
                                                newColAxis.push(selected);
                                            } else {
                                                newColAxis.push(null);
                                            }
                                        }
                                    }
                                }
                            }

                            for (var i = 0; i < currY2Axis.length; i++) {
                                // Try to find equvalent parameter
                                let tmpPar = currY2Axis[i].replace(prevGroup, groupKey);
                                if(newGroupPars.indexOf(tmpPar)!==-1){
                                    newY2Axis.push(tmpPar);
                                    // Check for corresponding color
                                    let tmpCol = currCol2Axis[i].replace(prevGroup, groupKey);
                                    if(newGroupPars.indexOf(tmpCol)!==-1){
                                        newCol2Axis.push(tmpCol)
                                    } else {
                                        // If no colorscale equivalent found set to null
                                        newCol2Axis.push(null);
                                    }
                                } else {
                                    // TODO
                                }
                            }

                            that.renderSettings.groups[yPos] = groupKey;
                            // Check if any of the parameters could be converted
                            // if not look for defaults
                            if(newYAxis.length>0 || newY2Axis.length>0){
                                that.renderSettings.yAxis[yPos] = newYAxis;
                                that.renderSettings.colorAxis[yPos] = newColAxis;
                                that.renderSettings.y2Axis[yPos] = newY2Axis;
                                that.renderSettings.colorAxis2[yPos] = newCol2Axis;
                            } else {
                                that.renderSettings.yAxis[yPos] = [];
                                that.renderSettings.colorAxis[yPos] = [];
                                that.renderSettings.y2Axis[yPos] = [];
                                that.renderSettings.colorAxis2[yPos] = [];
                            }
                            that.emit('axisChange');
                            that.loadData(that.data);

                        });

                select.selectAll('option')
                    .data(selectionGroups).enter()
                    .append('option')
                        .text((d) => { return d; })
                        .property('selected', (d) => { return d===currG; });

                /*function onchange() {
                    selectValue = d3.select('select').property('value')
                    d3.select('body')
                        .append('p')
                        .text(selectValue + ' is the last selected option.')
                };*/

            }

            let currYAxis = this.renderSettings.yAxis[yPos];
            let currY2Axis = defaultFor(this.renderSettings.y2Axis[yPos], []);

            let yExtent, y2Extent;
            let ySelection = [];
            let y2Selection = [];


            for (var h = 0; h < currYAxis.length; h++) {
                if(rs.combinedParameters.hasOwnProperty(currYAxis[h])){
                    ySelection = [].concat.apply([], rs.combinedParameters[currYAxis[h]]);
                } else {
                    ySelection.push(currYAxis[h]);
                }
            }

            for (var i = 0; i < currY2Axis.length; i++) {
                if(rs.combinedParameters.hasOwnProperty(currY2Axis[i])){
                    y2Selection = [].concat.apply([], rs.combinedParameters[currY2Axis[i]]);
                } else {
                    y2Selection.push(currY2Axis[i]);
                }
            }



            yExtent = this.calculateExtent(ySelection);
            y2Extent = this.calculateExtent(y2Selection);

            let yRange = yExtent[1] - yExtent[0];
            let y2Range = y2Extent[1] - y2Extent[0];

            let domain;
            // TODO: Not sure if this is checking all it should be checking, 
            // check second color axis (coloraxis2)
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

                // Check if we need to update extents which have been reset because
                // of filtering on parameter
                for (let i = 0; i < this.renderSettings.colorAxis.length; i++) {
                    for (let j = 0; j < this.renderSettings.colorAxis.length; j++) {
                        this.calculateColorDomain(this.renderSettings.colorAxis[i][j]);
                    }
                    for (let j = 0; j < this.renderSettings.colorAxis2.length; j++) {
                        this.calculateColorDomain(this.renderSettings.colorAxis2[i][j]);
                    }
                }
            }

            // TODO: Allow multiple domains!
            if(domain){
                this.plotter.setDomain(domain);
            }


            let yScaleType, y2ScaleType;
            // TODO: how to handle multiple different scale types
            // For now just check first object of scale
            
            this.yTimeScale = this.checkTimeScale(ySelection[0]);
            this.y2TimeScale = this.checkTimeScale(y2Selection[0]);

            yScaleType = getScale(this.yTimeScale);
            y2ScaleType = getScale(this.y2TimeScale);


            // Recalculate domain so that data is not directly at border
            if(!this.fixedSize){
                yExtent = calcExtent(
                    yExtent, yRange, this.yTimeScale, [0.02, 0.02]
                );
                y2Extent = calcExtent(
                    y2Extent, y2Range, this.y2TimeScale, [0.02, 0.02]
                );
            }


            if(this.logY[yPos]){
                let start = yExtent[0];
                let end = yExtent[1];

                // if both positive or negative all fine else
                if(yExtent[0]<=0 && yExtent[1]>0){
                    start = 0.005;
                }
                if(yExtent[0]>=0 && yExtent[1]<0){
                    start = -0.005;
                }

                this.yScale.push(
                    d3.scale.log()
                        .domain([start,end])
                        .range([heighChunk-this.separation, 0])
                );
            }else{
                this.yScale.push(
                    yScaleType
                        .domain(yExtent)
                        .range([heighChunk-this.separation, 0])
                );
            }

            if(this.logY2[yPos]){
                let start = y2Extent[0];
                let end = y2Extent[1];

                // if both positive or negative all fine else
                if(y2Extent[0]<=0 && y2Extent[1]>0){
                    start = 0.005;
                }
                if(y2Extent[0]>=0 && y2Extent[1]<0){
                    start = -0.005;
                }

                this.y2Scale.push(
                    d3.scale.log()
                        .domain([start,end])
                        .range([heighChunk-this.separation, 0])
                );
            }else{
                this.y2Scale.push(
                    y2ScaleType
                        .domain(y2Extent)
                        .range([heighChunk-this.separation, 0])
                );
            }

            
            this.yAxis.push(
                d3.svg.axis()
                    .scale(this.yScale[yPos])
                    .innerTickSize(-this.width)
                    .outerTickSize(0)
                    .orient('left')
            );


            // Check if axis is using periodic parameter (only one parameter)
            let yS = this.renderSettings.yAxis[yPos];
           
            let yAxisformat = this.getAxisFormat(
                yS[0], this.enableSubYAxis,
                this.renderSettings.additionalYTicks[yPos]
            );
            this.yAxis[yPos].tickFormat(yAxisformat);


            if(currYAxis.length > 0){
                this.yAxisSvg.push(
                    this.svg.append('g')
                        .attr('class', 'y axis')
                        .attr(
                            'transform', 'translate(0,'+yPos*heighChunk+')'
                        )
                        .call(this.yAxis[yPos])
                );
            } else {
                this.yAxisSvg.push(null);
            }

            // Creating additional axis for sub parameters
            if(this.renderSettings.hasOwnProperty('additionalYTicks')){
                let addYTicks = this.renderSettings.additionalYTicks[yPos];
                if(typeof addYTicks !== 'undefined'){
                    for (let i = 0; i < addYTicks.length; i++) {

                        this.additionalYAxis.push(
                            d3.svg.axis()
                                .scale(this.yScale[yPos])
                                .outerTickSize(5)
                                .orient('left')
                                .tickFormat(()=>{return '';})
                        );
                    }
                }
            }

            if(this.enableSubYAxis){
                let currAddYAxisSVG = [];
                for (let i = 0; i < this.renderSettings.additionalYTicks[yPos].length; i++) {
                    currAddYAxisSVG.push(
                        this.svg.append('g')
                            .attr('class', 'y_add subaxis')
                            .attr(
                                'transform', 'translate(-'+((i*80)+80)+ ','+yPos*heighChunk+')'
                            )
                            .call(this.additionalYAxis[yPos])
                    );
                }
                this.addYAxisSvg.push(currAddYAxisSVG);
            }

            this.y2Axis.push(
                d3.svg.axis()
                    .scale(this.y2Scale[yPos])
                    .innerTickSize(this.width)
                    .outerTickSize(0)
                    .orient('right')
            );
            if(this.y2TimeScale){
                this.y2Axis[yPos].tickFormat(u.getCustomUTCTimeTickFormat());
            }

            if(currY2Axis.length > 0){
                this.y2AxisSvg.push(
                    this.svg.append('g')
                        .attr('class', 'y2 axis')
                        .attr(
                            'transform', 'translate(0,'+yPos*heighChunk+')'
                        )
                        .call(this.y2Axis[yPos])
                );
            } else {
                this.y2AxisSvg.push(null);
            }

        }

        let maxzoomout = 0;
        
        let xSel = this.renderSettings.xAxis;
        if(this.dataSettings.hasOwnProperty(xSel) &&
           this.dataSettings[xSel].hasOwnProperty('periodic') ){
            let period = this.dataSettings[xSel].periodic.period;
            let xd = this.xScale.domain();
            maxzoomout = Math.abs(xd[1]-xd[0])/period;
        }

        // Define zoom behaviour based on parameter dependend x and y scales

        this.xzoom = d3.behavior.zoom()
            .x(this.xScale)
            .scaleExtent([maxzoomout,Infinity])
            .on('zoom', this.previewZoom.bind(this))
            .on('zoomend', this.debounceEndZoomEvent.bind(this));

        this.yzoom = [];
        let maxZOut = 0;
        for (let plotY = 0; plotY < this.renderSettings.yAxis.length; plotY++) {
            let maxZOutY = 0;
            if(this.renderSettings.yAxis[plotY].length === 1){
                let ySel = this.renderSettings.yAxis[plotY][0];
                if(this.dataSettings.hasOwnProperty(ySel) &&
                   this.dataSettings[ySel].hasOwnProperty('periodic') ){
                    let period = this.dataSettings[ySel].periodic.period;
                    let xd = this.yScale[plotY].domain();
                    maxZOutY = Math.abs(xd[1]-xd[0])/period;
                    maxZOut = d3.max([maxZOutY, maxZOut]);
                }
            }
            this.yzoom.push(
                d3.behavior.zoom()
                    .y(this.yScale[plotY])
                    .scaleExtent([maxZOutY,Infinity])
                    .on('zoom', this.previewZoom.bind(this,plotY))
                    .on('zoomend', this.debounceEndZoomEvent.bind(this))
                );
        }
        maxZOut = d3.max([maxzoomout, maxZOut]);
        this.xyzoomCombined = d3.behavior.zoom()
            .x(this.xScale)
            .y(this.yScaleCombined)
            .scaleExtent([maxZOut,Infinity])
            .on('zoom', this.previewZoom.bind(this))
            .on('zoomend', this.debounceEndZoomEvent.bind(this));

        this.y2zoom = [];

        for (let plotY = 0; plotY < this.renderSettings.y2Axis.length; plotY++) {
            this.y2zoom.push(
                d3.behavior.zoom()
                    .y(this.y2Scale[plotY])
                    .on('zoom', this.previewZoom.bind(this,plotY))
                    .on('zoomend', this.debounceEndZoomEvent.bind(this))
                );
        }

        // Limit zoom step to 10% of scale size to make sure zoom kumps are not
        // to big. Solves issue on big zoom jumps in Firefox (FF)
        /*this.xyzoom.scaleExtent([
            this.xyzoom.scale()*0.9,
            this.xyzoom.scale()*1.1
        ]);*/

        this.createHelperObjects();
        this.addTimeInformation();
        this.breakTicks();

        var that = this;
        this.el.select('#zoomXBox').call(this.xzoom);
        this.el.selectAll('.zoomYBox').each(function(d, i){
            d3.select(this).call(that.yzoom[i]);
        });
        this.el.selectAll('.zoomY2Box').each(function(d, i){
            d3.select(this).call(that.y2zoom[i]);
        });

        this.renderCanvas.call(this.xyzoomCombined.bind(this));

        this.createAxisLabels();
    }

    zoom_update() {

        let maxzoomout = 0;
        let xSel = this.renderSettings.xAxis;
        if(this.dataSettings.hasOwnProperty(xSel) &&
           this.dataSettings[xSel].hasOwnProperty('periodic') ){
            let period = this.dataSettings[xSel].periodic.period;
            let xd = this.xScale.domain();
            maxzoomout = Math.abs(xd[1]-xd[0])/period;
        }

        this.xzoom = d3.behavior.zoom()
            .x(this.xScale)
            .scaleExtent([maxzoomout,Infinity])
            .on('zoom', this.previewZoom.bind(this))
            .on('zoomend', this.debounceEndZoomEvent.bind(this));

        this.yzoom = [];
        let maxZOut = 0;
        for (let plotY = 0; plotY < this.renderSettings.yAxis.length; plotY++) {
            let maxZOutY = 0;
            if(this.renderSettings.yAxis[plotY].length === 1){
                let ySel = this.renderSettings.yAxis[plotY][0];
                if(this.dataSettings.hasOwnProperty(ySel) &&
                   this.dataSettings[ySel].hasOwnProperty('periodic') ){
                    let period = this.dataSettings[ySel].periodic.period;
                    let xd = this.yScale[plotY].domain();
                    maxZOutY = Math.abs(xd[1]-xd[0])/period;
                    maxZOut = d3.max([maxZOutY, maxZOut]);
                }
            }
            if(this.renderSettings.yAxis[plotY].length>0){
                this.yzoom.push(
                    d3.behavior.zoom()
                        .y(this.yScale[plotY])
                        .scaleExtent([maxZOutY,Infinity])
                        .on('zoom', this.previewZoom.bind(this,plotY))
                        .on('zoomend', this.debounceEndZoomEvent.bind(this))
                );
            } else {
                this.yzoom.push(false);
            }
        }
        maxZOut = d3.max([maxzoomout, maxZOut]);

        // Preserve previous center if it was already set
        let prevCenter = this.xyzoomCombined.center();

        this.xyzoomCombined = d3.behavior.zoom()
                .x(this.xScale)
                .y(this.yScaleCombined)
                .scaleExtent([maxZOut,Infinity])
                .on('zoom', this.previewZoom.bind(this))
                .on('zoomend', this.debounceEndZoomEvent.bind(this));

        if(prevCenter){
            this.xyzoomCombined.center(prevCenter);
        }

        this.y2zoom = [];

        for (let plotY = 0; plotY < this.renderSettings.y2Axis.length; plotY++) {
            if(this.renderSettings.y2Axis[plotY].length>0){
                this.y2zoom.push(
                    d3.behavior.zoom()
                        .y(this.y2Scale[plotY])
                        .on('zoom', this.previewZoom.bind(this,plotY))
                        .on('zoomend', this.debounceEndZoomEvent.bind(this))
                    );
            } else {
                this.y2zoom.push(false);
            }
        }

        var that = this;
        this.el.select('#zoomXBox').call(this.xzoom);
        this.el.selectAll('.zoomYBox').each(function(d, i){
            if(that.yzoom[i]){
                d3.select(this).call(that.yzoom[i]);
            }
        });
        this.el.selectAll('.zoomY2Box').each(function(d, i){
            if(that.y2zoom[i]){
                d3.select(this).call(that.y2zoom[i]);
            }
        });

        this.renderCanvas.call(this.xyzoomCombined.bind(this));

    }

    onZoom() {
        // TODO: resetting of zooms is not necessary when not using debounce
        // but it breaks the interaction between different zoom objects
        // maybe there is a better way of doing this instead of resetting it
        if(!this.zoomActivity){
            this.zoom_update();
            this.renderData();
        }
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

        let rsY = this.renderSettings.yAxis;

        for (let posY=0; posY<rsY.length; posY++) {

            if(this.checkTimeScale(rsY[posY][0])){
                let yAx = this.el.selectAll('.y.axis')[0][posY];
                if(yAx){
                    d3.select(yAx).selectAll('.tick:nth-of-type(2)')
                        .append('text')
                        .attr('dy', '-60px')
                        .attr('dx', '-60px')
                        .attr("transform", "rotate(-90)")
                        .attr('class', 'start-date')
                        .text(function(d){return dateFormat(d);});
                    d3.select(yAx).selectAll('.tick:nth-last-of-type(2)')
                        .append('text')
                        .attr('dy', '-60px')
                        .attr('dx', '-60px')
                        .attr("transform", "rotate(-90) translate(-55,0)")
                        .attr('class', 'end-date')
                        .text(function(d){return dateFormat(d);});
                }
            }
        }


        let rsY2 = this.renderSettings.y2Axis;

        for (let posY=0; posY<rsY2.length; posY++) {

            if(this.checkTimeScale(rsY2[posY][0])){
                let yAx = this.el.selectAll('.y2.axis')[0][posY];
                if(yAx){
                    d3.select(yAx).selectAll('.tick:nth-of-type(2)')
                        .append('text')
                        .attr('dy', '60px')
                        .attr('dx', '60px')
                        .attr('transform', 'rotate(-90) translate(-125,0)')
                        .attr('class', 'start-date')
                        .text(function(d){return dateFormat(d);});
                    d3.select(yAx).selectAll('.tick:nth-last-of-type(2)')
                        .append('text')
                        .attr('dy', '60px')
                        .attr('dx', '60px')
                        .attr('transform', 'rotate(-90) translate(-125,0)')
                        .attr('class', 'end-date')
                        .text(function(d){return dateFormat(d);});
                }
            }
        }
    }

    breakTickDown(text) {
      text.each(function() {
            let text = d3.select(this),
                words = text.text().split('|').reverse(),
                word,
                line = [],
                lineNumber = 0,
                lineHeight = 40, // px
                y = text.attr("y"),
                dy = 10,
                tspan = text.text(null);
            while (word = words.pop()) {
                line.push(word);
                tspan.text(line.join(" "));
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan")
                    .attr("x", 0)
                    .attr("y", y)
                    .attr("dy", lineNumber++ * lineHeight + dy  + "px")
                    .text(word);
            }
        });
    }

    breakTickLeft(text) {
      text.each(function() {
            let text = d3.select(this),
                words = text.text().split('|').reverse(),
                word,
                line = [],
                lineNumber = 0,
                offset = 80, // px
                x = text.attr("x"),
                dx = 10,
                tspan = text.text(null);
            text.empty();
            while (word = words.pop()) {
                line.push(word);
                tspan.text(line.join(" "));
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan")
                    .attr("x", x)
                    .attr("y", 0)
                    .attr("dx", -(lineNumber++ * offset + dx)  + "px")
                    .text(word);
            }
        });
    }

    breakTicks() {

        this.el.selectAll('.x.axis>.tick text:first-of-type')
            .call(this.breakTickDown);

        this.el.selectAll('.y.axis>.tick text')
            .call(this.breakTickLeft);

    }

    debounceEndZoomEvent(){
        this.zoomActivity = false;
        this.debounceZoom.bind(this)();
    }

    previewZoom(yPos) {

        this.zoomActivity = true;
        this.topSvg.selectAll('.temporary').remove();
        this.tooltip.style('display', 'none');

        this.xAxisSvg.call(this.xAxis);
        for (let i = 0; i < this.additionalXAxis.length; i++) {
            this.addXAxisSvg[i].call(this.additionalXAxis[i]) ;
        }

        for (let yy=0; yy<this.renderSettings.yAxis.length; yy++){
            let currYAxis = this.renderSettings.yAxis[yy];
            if(currYAxis.length > 0){
                if(this.yAxisSvg[yy]){
                    this.yAxisSvg[yy].call(this.yAxis[yy]);
                }
            }
        }

        for (let yy=0; yy<this.renderSettings.y2Axis.length; yy++){
            let currY2Axis = this.renderSettings.y2Axis[yy];
            if(currY2Axis.length > 0){
                if(this.y2AxisSvg[yy]){
                    this.y2AxisSvg[yy].call(this.y2Axis[yy]);
                }
            }
        }

        for (let i = 0; i < this.addYAxisSvg.length; i++) {
            for (let j = 0; j < this.addYAxisSvg[i].length; j++) {
                this.addYAxisSvg[i][j].call(this.additionalYAxis[i]);
            }
        }


        // Limit zoom step to 10% of scale size to make sure zoom kumps are not
        // to big. Solves issue on big zoom jumps in Firefox (FF)
        /*this.xyzoom.scaleExtent([
            this.xyzoom.scale()*0.9,
            this.xyzoom.scale()*1.1
        ]);*/

        if (typeof yPos === 'undefined'){
            yPos = 0;
        }

        if (typeof this.pXYS === 'undefined'){
            this.pXYS = 1;
        }

        let xScale = this.xzoom.scale();
        let xyScale = this.xyzoomCombined.scale();

        let transXY = this.xyzoomCombined.translate();
        let transX = this.xzoom.translate();

        let y2Scale, transY2;
        if(this.y2zoom[yPos]){
            y2Scale = this.y2zoom[yPos].scale();
            transY2 = this.y2zoom[yPos].translate();
        } else {
            y2Scale = 1;
            transY2 = [0,0];
        }

        let yScale, transY;
        if(this.yzoom[yPos]){
            yScale = this.yzoom[yPos].scale();
            transY = this.yzoom[yPos].translate();
        } else {
            yScale = 1;
            transY = [0,0];
        }


        /*let heighChunk = this.height/this.renderSettings.yAxis.length;
        let modifier = Math.floor(
            d3.event.sourceEvent.offsetY / heighChunk
        );

        // Recenter zoom point depending on which plot mouse is as we 
        // only have one big zoom area
        if(this.debounceActive || (this.pXYS !== xyScale)){
            this.xyzoomCombined.center([
                d3.event.sourceEvent.offsetX,
                d3.event.sourceEvent.offsetY-(heighChunk*modifier)
            ]);
        }*/
        this.pXYS = xyScale;

        let xyCombinedChanged = false;

        if( transXY[0] !== 0 || transXY[1]!==0 || xyScale !== 1 ){
            xyCombinedChanged = true;
            //console.log( transXY[0] +'; '+ transXY[1] +'; '+ xyScale);
            for (let yy=0; yy<this.renderSettings.yAxis.length; yy++){
                // Update all right y2 axis based on xy scale and trans
                if(this.y2zoom[yy]){
                    this.y2zoom[yy]
                        .scale(xyScale)
                        .translate(transXY);
                    if(this.y2AxisSvg[yy]){
                        this.y2AxisSvg[yy].call(this.y2Axis[yy]);
                    }
                }
                if(this.yzoom[yy]){
                    this.yzoom[yy]
                        .scale(xyScale)
                        .translate(transXY);
                    if(this.yAxisSvg[yy]){
                        this.yAxisSvg[yy].call(this.yAxis[yy]);
                    }
                }
            }
        }

        this.topSvg.selectAll('.highlightItem').remove();

        if(this.debounceActive){

            if(!this.previewActive){
                this.renderCanvas.style('opacity','0');
                this.previewActive = true;
                for (let yPos=0; yPos<this.renderSettings.yAxis.length; yPos++){
                    this.svg.select('#previewImageL'+yPos).style('display', 'block');
                    this.svg.select('#previewImageR'+yPos).style('display', 'block');
                }
            }

            for (let imgYPos=0; imgYPos<this.renderSettings.yAxis.length; imgYPos++){

                let prevImg = this.el.select('#previewImageL'+imgYPos);
                let prevImg2 = this.el.select('#previewImageR'+imgYPos);
                let alreadyMod = false;

                if(xyScale!==1.0){
                    alreadyMod = true;
                    prevImg.attr('transform', 
                        'translate(' +  transXY + ')scale(' + xyScale + ')'
                    );
                    prevImg2.attr('transform',
                        'translate(' +   transXY + ')scale(' + xyScale + ')'
                    );
                }else if(xScale !== 1.0){
                    prevImg.attr('transform', 'translate(' + 
                    [transX[0], 0.0] + ')scale(' + [xScale, 1.0] + ')');
                    prevImg2.attr('transform', 'translate(' + 
                    [transX[0], 0.0] + ')scale(' + [xScale, 1.0] + ')');

                }else if(transXY[0]!==0.0 || transXY[1] !==0.0){
                    alreadyMod = true;
                    prevImg.attr('transform', 'translate(' + 
                    transXY + ')scale(1)');
                    prevImg2.attr('transform', 'translate(' + 
                    transXY + ')scale(1)');

                }else if(transX[0]!==0.0 || transX[1] !==0.0){
                    prevImg.attr('transform', 'translate(' + 
                    [transX[0], 0.0] + ')scale(1)');
                    prevImg2.attr('transform', 'translate(' + 
                    [transX[0], 0.0] + ')scale(1)');

                }

                if(imgYPos === yPos){
                    if(!xyCombinedChanged && yScale !== 1.0){
                        prevImg.attr('transform', 'translate(' + 
                        [0.0, transY[1]] + ')scale(' + [1.0, yScale] + ')');

                    }else if(!alreadyMod && (y2Scale !== 1.0)){
                        prevImg2.attr('transform', 'translate(' + 
                        [0.0, transY2[1]] + ')scale(' + [1.0, y2Scale] + ')');

                    } else if(!xyCombinedChanged && (transY[0]!==0.0 || transY[1] !==0.0)){
                        prevImg.attr('transform', 'translate(' + 
                        [0.0, transY[1.0]] + ')scale(1)');

                    }else if(!alreadyMod && (transY2[0]!==0.0 || transY2[1] !==0.0)){
                        prevImg2.attr('transform', 'translate(' + 
                        [0.0, transY2[1.0]] + ')scale(1)');
                    }
                }
            }

        }else{
            // Transfer scale interactions from different zoom events
            // While interaction is happening only render visible plot once
            // debounce finished render also reference canvas to allow interaction
            this.renderData(false);
        }

        this.addTimeInformation();
        this.breakTicks();

        // Set size of ticks once they have changed
        this.svg.selectAll('.tick').attr('font-size', this.defaultTickSize+'px');
    }


    renderRegression(data, plotY, reg, yScale, color, thickness) {
        yScale = yScale[plotY];
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

        let axisOffset = plotY * (this.height/this.renderSettings.yAxis.length)  * this.resFactor;

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
                yPoints = yPoints.map((p)=>{return p+axisOffset;});

                this.batchDrawer.addLine(
                    xPoints[1], yPoints[1],
                    xPoints[0], yPoints[0], thickness,
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
                    py1 = yScale(y1) + axisOffset;
                    py2 = yScale(y2) + axisOffset;

                    this.batchDrawer.addLine(
                        px1, py1,
                        px2, py2, thickness,
                        c[0], c[1], c[2], c[3]
                    );
                }
                break;
            }
        }

        if(typeof reg.type !== 'undefined'){
            // render regression label
            let regrString = '';
            if(reg.type === 'linear'){
                regrString = result.equation[0].toPrecision(4)+'x + '+
                             result.equation[1].toPrecision(4);
            } else {
                for (let rPos = result.equation.length - 1; rPos >= 0; rPos--) {
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
            }
            
            regrString += '  (r<sup>2</sup>: '+ (result.r2).toPrecision(4)+')';

            this.el.select('#regressionInfo')
                .append('div')
                .style('color', u.rgbToHex(c[0], c[1], c[2]))
                .style('opacity', c[3])
                .html(u.createSuperscript(regrString));
        }
    }

    createRegression(data, parPos, plotY, yAxRen, yScale, inactive) {

        let xAxRen = this.renderSettings.xAxis;
        let resultData;
        inactive = defaultFor(inactive, false);

        //Check if data has identifier creating multiple datasets
        if (this.renderSettings.hasOwnProperty('dataIdentifier')){

            let datIds = this.renderSettings.dataIdentifier.identifiers;
            for (let i = 0; i < datIds.length; i++) {

                // Check if regression is activated for this parameter and id
                let id = datIds[i];
                let regSett = this.dataSettings[yAxRen];

                if( this.dataSettings[yAxRen].hasOwnProperty(id) ){
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
                var filteredY = data[yAxRen].filter(filterFunc.bind(this));

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

                if(!inactive){
                    this.renderRegression(resultData, plotY, reg, yScale, rC);
                }else{
                    this.renderRegression(resultData, plotY, reg, yScale, [0.2,0.2,0.2,0.4]);
                }
            }
            
        }else{
            let regSett = this.dataSettings[yAxRen];
            let reg = {
                type: regSett.regression,
                order: regSett.regressionOrder
            };

            if(typeof reg.type !== 'undefined'){
                // TODO: Check for size mismatch?
                if(this.xTimeScale){
                    resultData = data[xAxRen]
                        .map(function(d){return d.getTime();})
                        .zip(
                            data[yAxRen]
                        );
                }else{
                    resultData = data[xAxRen].zip(
                        data[yAxRen]
                    );
                }
                if(!inactive){
                    // Check for predefined color
                    if(this.dataSettings.hasOwnProperty(yAxRen) &&
                       this.dataSettings[yAxRen].hasOwnProperty('color')){
                        this.renderRegression(
                            resultData, plotY, reg, yScale,
                            this.dataSettings[yAxRen].color
                        );
                }else{
                    this.renderRegression(resultData, plotY, reg, yScale);
                }
                    
                }else{
                    this.renderRegression(resultData, plotY, reg, yScale, [0.2,0.2,0.2,0.4]);
                }
            }
        }
    }

    getIdColor(param, id) {
        // TODO: What todo when parameter has colorscale
        let rC;
        let selPar = this.renderSettings.yAxis[param];

        // Check if color has been defined for specific parameter
        if (this.renderSettings.hasOwnProperty('dataIdentifier')){
            rC = this.dataSettings[selPar][id].color;
        } else if(this.dataSettings[selPar].hasOwnProperty('color')){
            rC = this.dataSettings[selPar].color;
        } else { 
            rC = [0.258, 0.525, 0.956];
        }
        
        return rC;
    }


    /**
    * Resize graph
    * @param {boolean} [debounce=true] Do not resize if consecutive resize calls
    *        are being made. 
    */
    resize(debounce){

        // Clear possible canvas styles
        this.renderCanvas.style('width', null);
        this.renderCanvas.style('height', null);


        debounce = defaultFor(debounce, true);
        if(debounce){
            this.debounceResize.bind(this)();
        }
        this.dim = this.el.node().getBoundingClientRect();
        // If there are colorscales to be rendered we need to apply additional
        // margin to the right reducing the total width
        let csAmount = this.getMaxCSAmount();
        
        if(this.renderSettings.hasOwnProperty('y2Axis') && 
           this.getMaxArrayLenght(this.renderSettings.y2Axis)>0){
            this.marginY2Offset = 40;
        } else {
            this.marginY2Offset = 0;
        }

        this.marginCSOffset = csAmount*100;
        this.width = this.dim.width - this.margin.left - 
                     this.margin.right - this.marginY2Offset - 
                     this.marginCSOffset - this.subAxisMarginY;
        this.height = this.dim.height - this.margin.top - 
                      this.margin.bottom - this.subAxisMarginX;

        this.renderCanvas.style(
            'transform',
            'translate(' + (this.margin.left+this.subAxisMarginY + 1.0) +
            'px' + ',' + (this.margin.top + 1.0) + 'px' + ')'
        );
   
        this.referenceCanvas.style(
            'transform',
            'translate(' + (this.margin.left+this.subAxisMarginY + 1.0) +
            'px' + ',' + (this.margin.top + 1.0) + 'px' + ')'
        );

        this.resize_update();
        //this.createColorScales();
        this.createAxisLabels();

        // Hide/show parameter info depending on if they have parameters
        this.el.selectAll('.parameterInfo').each(function(){
            if(d3.select(this).node().childNodes.length === 0){
                d3.select(this).style('display', 'none');
            } else {
                d3.select(this).style('display', 'block')
            }
        });

        this.batchDrawer.updateCanvasSize(this.width, this.height);
        this.batchDrawerReference.updateCanvasSize(this.width, this.height);
        this.renderData();
        this.zoom_update();

        // Update size of labels
        d3.selectAll('.axisLabel').attr('font-size', this.defaultLabelSize+'px');
        d3.selectAll('.svgaxisLabel').attr('font-size', this.defaultLabelSize+'px');
        d3.selectAll('.labelitem').style('font-size', this.defaultLabelSize+'px');
    }


    resize_update() {

        this.xScale.range([0, this.width]);

        this.svg.attr(
            'transform',
            'translate(' + (this.margin.left+this.subAxisMarginY+1) + ',' +
            (this.margin.top+1) + ')'
        );

        this.topSvg.attr(
            'transform',
            'translate(' + (this.margin.left+this.subAxisMarginY+1) + ',' +
            (this.margin.top+1) + ')'
        );

        this.xAxisSvg.attr('transform', 'translate(0,' + this.height + ')');
        for (let i = 0; i < this.addXAxisSvg.length; i++) {
            this.addXAxisSvg[i].attr(
                'transform', 'translate(0,' + (this.height+35+(i*40)) + ')'
            );
            this.addXAxisSvg[i].call(this.additionalXAxis[i]);
        }

        this.xAxis.tickSize(-this.height);
        this.xAxisSvg.call(this.xAxis);

        // Update config and add plot buttons 
        this.el.select('#globalSettingsContainer')
            .style('left', (this.width/2)+this.margin.left-75+'px');
        this.el.select('#globalSettings')
            .style('left', (this.width/2)+this.margin.left-40+'px');
        this.el.select('#newPlotLink')
            .style('left', (this.width/2)+this.margin.left+40+'px');

        let heighChunk = this.height/this.yScale.length;

        // Update rendergroups selections if available
        this.el.selectAll('.groupSelect')
            .style('top', (d,i)=>{return (Math.round(i*heighChunk)+this.margin.top-10)+'px'})
            .style('left', Math.round(this.width/2)+'px');

        this.el.selectAll('.cogIcon')
            .style('top', (d,i)=>{return (Math.round(i*heighChunk)+this.margin.top)+'px'});

        for (let yPos = 0; yPos < this.yScale.length; yPos++) {

            this.yScale[yPos].range([heighChunk-this.separation, 0]);
            this.yAxis[yPos].innerTickSize(-this.width);
            
            if(this.renderSettings.yAxis[yPos].length > 0){
                if(this.yAxisSvg[yPos]){
                    this.yAxisSvg[yPos].attr(
                        'transform', 'translate(0,'+yPos*heighChunk+')'
                    );
                    this.yAxisSvg[yPos].call(this.yAxis[yPos]);
                }
            }

            this.el.select('#renderingContainer'+yPos)
                .attr('fill', 'none')
                .attr(
                    'transform',
                    'translate(0,' + heighChunk*yPos + ')'
                )
                .attr('height', heighChunk-this.separation);
        }

        for (let i = 0; i < this.addYAxisSvg.length; i++) {
            for (let j = 0; j < this.addYAxisSvg[i].length; j++) {
                this.addYAxisSvg[i][j].attr(
                    'transform', 'translate(-'+((j*80)+80)+ ','+i*heighChunk+')');
                this.addYAxisSvg[i][j].call(this.additionalYAxis[i]);
            }
        }

        this.el.select(this.nsId+'clipbox').select('rect')
            .attr('height', heighChunk-this.separation)
            .attr('width', this.width);

        if(this.renderSettings.yAxis.length>1){

            let heighChunk = this.height/this.renderSettings.yAxis.length;
            let yy;
            let clipnode = d3.select(this.nsId+'clipseparation').node();

            for (yy = 0; yy<this.renderSettings.yAxis.length; yy++) {
                d3.select(clipnode.childNodes[yy])
                    .attr('width', this.width)
                    .attr('height', heighChunk-this.separation)
                    .attr(
                        'transform',
                        'translate(0,-'+(this.height-(heighChunk*yy))+')'
                    );
            }
            // Update rect to contain all x axis tick labels
            d3.select(clipnode.childNodes[yy])
                .attr('width', this.width+this.margin.right)
                .attr('height', this.margin.bottom+10+this.subAxisMarginX)
                .attr(
                    'transform',
                    'translate(0,1)'
                );
        }

        for (let yPos = 0; yPos < this.y2Scale.length; yPos++) {

            this.y2Scale[yPos].range([heighChunk-this.separation, 0]);
            this.y2Axis[yPos].innerTickSize(-this.width);
            
            if(this.renderSettings.y2Axis[yPos].length > 0){
                if(this.y2AxisSvg[yPos]){
                    this.y2AxisSvg[yPos].attr(
                        'transform', 'translate('+this.width+','+yPos*heighChunk+')'
                    );
                    this.y2AxisSvg[yPos].call(this.y2Axis[yPos]);
                }
            }
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
            .attr('width', 
                this.width + this.margin.left + this.margin.right +
                this.marginY2Offset + this.marginCSOffset + this.subAxisMarginY
            )
            .attr(
                'height',
                this.height + this.margin.top + 
                this.margin.bottom + this.subAxisMarginX
            );
           
        d3.select(this.topSvg.node().parentNode)
            .attr(
                'width', 
                this.width + this.margin.left + this.margin.right + 
                this.marginY2Offset + this.marginCSOffset + this.subAxisMarginY
            )
            .attr(
                'height',
                this.height + this.margin.top +
                this.margin.bottom + this.subAxisMarginX
            );

        this.el.select('#zoomXBox')
            .attr('width', this.width)
            .attr('height', (this.margin.bottom+this.subAxisMarginX))
            .attr('transform', 'translate(' + 0 + ',' + (this.height) + ')');


        var that = this;

        for (let yPos = 0; yPos < this.renderSettings.yAxis.length; yPos++) {
            this.el.select('#zoomYBox'+yPos)
                .attr('width', this.margin.left)
                .attr('height', heighChunk-this.separation )
                .attr(
                    'transform',
                    'translate(' + -(this.margin.left+this.subAxisMarginY) + 
                    ',' + (heighChunk*yPos) + ')'
                )
                .attr('pointer-events', 'all');

            this.el.select('#zoomY2Box'+yPos)
                .attr('width', this.margin.right + this.marginY2Offset)
                .attr('height', heighChunk-this.separation )
                .attr(
                    'transform',
                    'translate(' + this.width + 
                    ',' + (heighChunk*yPos) + ')'
                )
                .attr('pointer-events', 'all');
        }

        this.el.select('#zoomXBox')
            .attr('width', this.width)
            .attr('height', (this.margin.bottom+this.subAxisMarginX))
            .attr('transform', 'translate(' + 0 + ',' + (this.height) + ')');

        this.el.selectAll('.rectangleOutline').each(function(d,i){
            d3.select(this)
                .attr('width', that.width)
                .attr('height', heighChunk-that.separation)
                .attr(
                    'transform',
                    'translate(0,' + (heighChunk*i) + ')'
                );
        });


        this.el.selectAll('.removePlot').each(function(d,i){
            d3.select(this).style('top', ((heighChunk*i)+10+that.margin.top)+'px')
        });

        this.el.selectAll('.arrowChangePlot.up').each(function(d,i){
            d3.select(this).style('top', ((heighChunk*(i+1))+that.margin.top+20)+'px')
        });
        this.el.selectAll('.arrowChangePlot.down').each(function(d,i){
            d3.select(this).style('top', ((heighChunk*(i))+that.margin.top+45)+'px')
        });

        this.el.selectAll('.previewImage')
            .attr('width',  this.width)
            .attr('height', heighChunk-that.separation);

        this.addTimeInformation();
        this.breakTicks();

    }

    onResize() {
        this.batchDrawer.updateCanvasSize(this.width, this.height);
        this.batchDrawerReference.updateCanvasSize(this.width, this.height);
        this.renderData();
        this.zoom_update();
    }

    renderRectangles(data, xAxis, yAxis, xGroup, yGroup, cAxis, yScale, plotY,
                     leftYAxis, updateReferenceCanvas) {

        // TODO: How to decide which item to take for counting
        // should we compare changes and look for errors in config?
        var l = data[xGroup[0]].length;

        let currColCache = null;
        let colCacheAvailable = false;

        yScale = yScale[plotY];

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
                colorObj = this.dataSettings[yAxis].color.slice();
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

        let yMax, yMin, yoffset, yperiod;
        let yperiodic = false;
        if(this.dataSettings.hasOwnProperty(yAxis) && 
           this.dataSettings[yAxis].hasOwnProperty('periodic') && leftYAxis){
            yoffset = defaultFor(
                this.dataSettings[yAxis].periodic.offset, 0
            );
            yperiodic = true;
            yperiod = this.dataSettings[yAxis].periodic.period;
            yMax = this.yScale[plotY].domain()[1]-yoffset;
            yMin = this.yScale[plotY].domain()[0]+yoffset;
        }

        let axisOffset = plotY * (this.height/this.renderSettings.yAxis.length)  * this.resFactor;

        for (let i=0; i<l; i++) {

            // Manipulate value if we have a periodic parameter
            let valY = data[yGroup[0]][i];
            let valY2 = data[yGroup[1]][i]
            if(yperiodic){
                let shiftpos = Math.abs(parseInt(yMax/yperiod));
                let shiftneg = Math.abs(parseInt(yMin/yperiod));
                if(yoffset===0){
                    shiftneg = Math.abs(Math.floor(yMin/yperiod));
                }
                let shift = Math.max(shiftpos, shiftneg);
                if(shiftneg>shiftpos){
                    shift*=-1;
                }

                if(Math.abs(shift) > 0){
                    valY = valY + shift*yperiod;
                    if(valY-yoffset > yMax){
                        valY -= yperiod;
                    }
                    if(valY+yoffset < yMin){
                        valY += yperiod;
                    }

                    valY2 = valY2 + shift*yperiod;
                    if(valY2-yoffset > yMax){
                        valY2 -= yperiod;
                    }
                    if(valY2+yoffset < yMin){
                        valY2 += yperiod;
                    }
                }
            }

            let x1 = (this.xScale(data[xGroup[0]][i]));
            let x2 = (this.xScale(data[xGroup[1]][i]));

            let y1 = yScale(valY);
            y1+=axisOffset;
            let y2 = yScale(valY2);
            y2+=axisOffset;


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
        } // end data for loop
    }


    renderPoints(data, xAxis, yAxis, cAxis, plotY, yScale, leftYAxis, updateReferenceCanvas) {

        let lp;
        let p_x, p_y;
        yScale = yScale[plotY];
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
        /*let rightYaxis = false;
        if(this.renderSettings.y2Axis.indexOf(yAxis) !== -1){
            yScale = this.y2Scale;
            rightYaxis = true;
        }*/

        // Identify how colors are applied to the points
        let singleSettings = true;
        let colorObj;
        let identParam;
        let dotsize = defaultFor(this.dataSettings[yAxis].size, DOTSIZE);
        dotsize *= this.resFactor;

        if (this.renderSettings.hasOwnProperty('dataIdentifier')){
            singleSettings = false;
            dotsize = {};
            identParam = this.renderSettings.dataIdentifier.parameter;
            // Check if alpha value is set for all parameters
            let identifiers = this.renderSettings.dataIdentifier.identifiers;
            for (var i = 0; i < identifiers.length; i++) {
                if(!this.dataSettings[yAxis][identifiers[i]].hasOwnProperty('alpha')){
                    this.dataSettings[yAxis][identifiers[i]].alpha = this.defaultAlpha;
                }
                dotsize[identifiers[i]] = defaultFor(
                    this.dataSettings[yAxis][identifiers[i]].size,
                    DOTSIZE
                );
                dotsize[identifiers[i]] *= this.resFactor;
            }
        }

        

        let constAlpha = this.defaultAlpha;

        if(this.dataSettings[yAxis].hasOwnProperty('alpha')){
            constAlpha = this.dataSettings[yAxis].alpha;
        } else {
            this.dataSettings[yAxis].alpha = constAlpha;
        }

        if(singleSettings) {
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

        let yMax, yMin, yoffset, yperiod;
        let yperiodic = false;
        if(this.dataSettings.hasOwnProperty(yAxis) && 
           this.dataSettings[yAxis].hasOwnProperty('periodic') && leftYAxis){
            yoffset = defaultFor(
                this.dataSettings[yAxis].periodic.offset, 0
            );
            yperiodic = true;
            yperiod = this.dataSettings[yAxis].periodic.period;
            yMax = this.yScale[plotY].domain()[1]-yoffset;
            yMin = this.yScale[plotY].domain()[0]+yoffset;
        }

        let axisOffset = plotY * (this.height/this.renderSettings.yAxis.length)  * this.resFactor;

        let x, y, valX, valY, currDotSize;

        for (let j=0;j<lp; j++) {

            if(singleSettings){
                currDotSize = dotsize;
            } else {
                currDotSize = dotsize[data[identParam][j]];
            }

            if(!yGroup){
                valY = data[yAxis][j];
            } else {
                // Check if we have a time variable
                if(this.timeScales.indexOf(yGroup[0])!==-1){
                    if( isNaN(data[yGroup[0]][j]) || isNaN(data[yGroup[1]][j]) ){
                        valY = NaN;
                    } else {
                        valY = new Date(
                            data[yGroup[0]][j].getTime() +
                            (data[yGroup[1]][j].getTime() - data[yGroup[0]][j].getTime())/2
                        );
                    }
                } else {
                    valY = data[yGroup[0]][j] +
                         (data[yGroup[1]][j] - data[yGroup[0]][j])/2;
                }
            }

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
                if(singleSettings){
                    rC = colorObj;
                } else {
                    let val = data[identParam][j];
                    if(val){
                        let col = this.dataSettings[yAxis][val].color;
                        rC = [
                            col[0], col[1], col[2],
                            this.dataSettings[yAxis][val].alpha
                        ];
                    } else {
                        rC = colorObj;
                    }
                }
            }

            // Manipulate value if we have a periodic parameter
            if(yperiodic){
                let shiftpos = Math.abs(parseInt(yMax/yperiod));
                let shiftneg = Math.abs(parseInt(yMin/yperiod));
                if(yoffset===0){
                    shiftneg = Math.abs(Math.floor(yMin/yperiod));
                }
                let shift = Math.max(shiftpos, shiftneg);
                if(shiftneg>shiftpos){
                    shift*=-1;
                }

                if(Math.abs(shift) > 0){
                    valY = valY + shift*yperiod;
                    if(valY-yoffset > yMax){
                        valY -= yperiod;
                    }
                    if(valY+yoffset < yMin){
                        valY += yperiod;
                    }
                    
                }
            }

            y = yScale(valY);
            y+=axisOffset;

            if(!xGroup){
                valX = data[xAxis][j];
            } else {
                // Check if we have a time variable
                if(this.timeScales.indexOf(xGroup[0])!==-1){
                    if( isNaN(data[xGroup[0]][j]) || isNaN(data[xGroup[1]][j]) ){
                        valX = NaN;
                    } else {
                        valX = new Date(
                            data[xGroup[0]][j].getTime() +
                            (
                                data[xGroup[1]][j].getTime()-
                                data[xGroup[0]][j].getTime()
                            )/2
                        );
                    }

                   
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
                                    p_x, p_y, x, y, (1.5*this.resFactor),
                                    rC[0], rC[1], rC[2], rC[3]
                                );
                            }
                        }
                    }else{
                        // Do not connect lines going in negative x direction
                        // as some datasets loop and it looks messy
                        if(x-p_x>-this.width/2){
                            this.batchDrawer.addLine(
                                p_x, p_y, x, y, (1.5*this.resFactor),
                                rC[0], rC[1], rC[2], rC[3]
                            );
                        }
                    }
                }

                if(!parSett.hasOwnProperty('symbol')){
                    parSett.symbol = 'circle';
                }
                par_properties.dotsize = currDotSize;

                if(parSett.symbol !== null && parSett.symbol !== 'none'){
                    par_properties.symbol = parSett.symbol;
                    var sym = defaultFor(dotType[parSett.symbol], 2.0);
                    this.batchDrawer.addDot(
                        x, y, currDotSize, sym, rC[0], rC[1], rC[2], rC[3]
                    );
                    if(!this.fixedSize && updateReferenceCanvas){
                        this.batchDrawerReference.addDot(
                            x, y, currDotSize, sym, nCol[0], nCol[1], nCol[2], -1.0
                        );
                    }
                }
            }
            this.colourToNode[c.join('-')] = par_properties;

            p_x = x;
            p_y = y;
        }

    }

    renderFilteredOutPoints(data, xAxis, yAxis, plotY, yScale, leftYAxis) {

        let lp = data[xAxis].length;
        yScale = yScale[plotY];

        // Check if parameter part of left or right y Scale
        if(this.renderSettings.y2Axis.indexOf(yAxis) !== -1){
            yScale = this.y2Scale;
        }

        let x, y, valX, valY;

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

        let yperiodic = false;
        let yperiod, yoffset;
        if(this.dataSettings.hasOwnProperty(yAxis) && 
           this.dataSettings[yAxis].hasOwnProperty('periodic') && leftYAxis){
            yoffset = defaultFor(
                this.dataSettings[yAxis].periodic.offset, 0
            );
            yperiodic = true;
            yperiod = this.dataSettings[yAxis].periodic.period;
            yMax = this.yScale[plotY].domain()[1]-yoffset;
            yMin = this.yScale[plotY].domain()[0]+yoffset;

        }

        // Identify how colors are applied to the points
        let singleSettings = true;
        let colorObj;
        let identParam;
        let dotsize = defaultFor(this.dataSettings[yAxis].size, DOTSIZE);
        dotsize *= this.resFactor;

        if (this.renderSettings.hasOwnProperty('dataIdentifier')){
            singleSettings = false;
            dotsize = {};
            identParam = this.renderSettings.dataIdentifier.parameter;
            // Check if alpha value is set for all parameters
            let identifiers = this.renderSettings.dataIdentifier.identifiers;
            for (var i = 0; i < identifiers.length; i++) {
                if(!this.dataSettings[yAxis][identifiers[i]].hasOwnProperty('alpha')){
                    this.dataSettings[yAxis][identifiers[i]].alpha = this.defaultAlpha;
                }
                dotsize[identifiers[i]] = defaultFor(
                    this.dataSettings[yAxis][identifiers[i]].size,
                    DOTSIZE
                );
                dotsize[identifiers[i]] *= this.resFactor;
            }
        }

        let blockSize = (
            this.height/this.renderSettings.yAxis.length - this.separation
        ) * this.resFactor;
        let axisOffset = plotY * (this.height/this.renderSettings.yAxis.length)  * this.resFactor;

        let currDotSize;

        for (let j=0;j<lp; j++) {

            if(singleSettings){
                currDotSize = dotsize;
            } else {
                currDotSize = dotsize[data[identParam][j]];
            }

            valY = data[yAxis][j];

            // Manipulate value if we have a periodic parameter
            if(yperiodic){
                let shiftpos = Math.abs(parseInt(yMax/yperiod));
                let shiftneg = Math.abs(parseInt(yMin/yperiod));
                if(yoffset===0){
                    shiftneg = Math.abs(Math.floor(yMin/yperiod));
                }
                let shift = Math.max(shiftpos, shiftneg);
                if(shiftneg>shiftpos){
                    shift*=-1;
                }

                if(Math.abs(shift) > 0){
                    valY = valY + shift*yperiod;
                    if(valY-yoffset > yMax){
                        valY -= yperiod;
                    }
                    if(valY+yoffset < yMin){
                        valY += yperiod;
                    }
                }
            }

            y = yScale(valY);

            if(y<0 || y>blockSize){
                continue;
            }

            y+=axisOffset;

            valX = data[xAxis][j];
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
                        x, y, currDotSize, sym, rC[0], rC[1], rC[2], 0.2
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
                    this.emit('axisChange');
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


        let currHeight = this.height / this.yScale.length;

        for (let yPos = 0; yPos < this.renderSettings.yAxis.length; yPos++) {

            if(this.el.select('#parameterInfo'+yPos).empty()){
                this.el.append('div')
                    .attr('id', 'parameterInfo'+yPos)
                    .attr('class', 'parameterInfo')
                    .style('top', ((currHeight)*yPos + 10 + this.margin.top) +'px')
                    .style(this.labelAllignment, ()=>{
                        if(this.labelAllignment === 'left'){
                            return this.margin.left+20+'px';
                        } else {
                            return this.margin.right+this.marginCSOffset+50+'px';
                        }
                    })
                    .style('visibility', 'hidden');
            } else {
                this.el.select('#parameterInfo'+yPos).selectAll('*').remove();
                this.el.select('#parameterInfo'+yPos)
                    .style('top', ((currHeight)*yPos +10) + this.margin.top +'px')
                    .style(this.labelAllignment, ()=>{
                        if(this.labelAllignment === 'left'){
                            return this.margin.left+20+'px';
                        } else {
                            return this.margin.right+this.marginCSOffset+50+'px';
                        }
                    });
            }
        }

        // Setup div for regression info rendering
        this.el.select('#regressionInfo').remove();
        this.el.append('div')
            .attr('id', 'regressionInfo')
            .style('bottom', (this.margin.bottom+this.subAxisMarginX+40)+'px')
            .style('left', ((this.width/2)-200+this.margin.left)+'px');

        


        this.el.select('#parameterSettings').remove();
        this.el.append('div')
            .attr('id', 'parameterSettings')
            .style(this.labelAllignment, ()=>{
                let xOffset = this.margin.right+this.marginCSOffset+50+'px';
                if(this.labelAllignment === 'left'){
                    xOffset = this.margin.left+20+'px';
                }
                return xOffset;
            })
            .style('display', 'none');

    }

    updateInfoBoxes(){
        this.el.select('#regressionInfo')
            .style('bottom', (this.margin.bottom+this.subAxisMarginX+40)+'px')
            .style('left', ((this.width/2)-200+this.margin.left)+'px');

        let currHeight = this.height / this.yScale.length;
        for (let yPos = 0; yPos < this.renderSettings.yAxis.length; yPos++) {

            this.el.select('#parameterInfo'+yPos)
                .style('top', ((currHeight)*yPos + 10 + this.margin.top) +'px')
                .style(this.labelAllignment, ()=>{
                    if(this.labelAllignment === 'left'){
                        return this.margin.left+20+'px';
                    } else {
                        return this.margin.right+this.marginCSOffset+50+'px';
                    }
                });

            this.el.select('#svgInfoContainer'+yPos)
                .attr('transform', ()=>{
                    let xOffset = (
                        this.width - this.margin.right - 260
                    );
                    if(this.labelAllignment === 'left'){
                        xOffset = '20';
                    }
                    return 'translate(' + 
                        xOffset + ',' +
                        ((currHeight)*yPos + 10) + ')';
                });
        }

        this.el.select('#parameterSettings')
            .style(this.labelAllignment, ()=>{
                let xOffset = this.margin.right+this.marginCSOffset+50+'px';
                if(this.labelAllignment === 'left'){
                    xOffset = this.margin.left+20+'px';
                }
                return xOffset;
            })
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
            let currFilter = this.filters[f];
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
                    data[p] = data[p].map((rec, i)=>{
                        if(currFilter(currentDataset[i])){
                            return rec;
                        } else {
                            return NaN;
                        }
                    });
                    inactiveData[p].pushArray(
                        tmpArray.filter((e,i)=>{
                            return !currFilter(currentDataset[i]);
                        })
                    );
                }
            }
        }

        this.currentData = data;
        this.currentInactiveData = inactiveData;
    }

    createParameterInfo(){

        let currHeight = this.height/this.renderSettings.yAxis.length;

        for (let yPos = 0; yPos < this.renderSettings.yAxis.length; yPos++) {

            this.el.select('#svgInfoContainer'+yPos).remove();
            // Add rendering representation to svg
            let infoGroup = this.svg.append('g')
                .attr('id', 'svgInfoContainer'+yPos)
                .attr('class', 'svgInfoContainer')
                .attr('transform', ()=>{
                    let xOffset = (this.width - this.margin.right - 260);
                    if(this.labelAllignment === 'left'){
                        xOffset = '20';
                    }
                    return 'translate(' + 
                        xOffset + ',' +
                        ((currHeight)*yPos + 10) + ')';
                })
                .style('visibility', 'hidden');

            infoGroup.append('rect')
                .attr('id', 'svgInfoRect')
                .attr('width', 280)
                .attr('height', 100)
                .attr('fill', 'white')
                .attr('stroke', 'black');

            let parInfEl = this.el.select('#parameterInfo'+yPos);
            if(!parInfEl.empty()){
                parInfEl.selectAll('*').remove();
            }

            let yAxRen = this.renderSettings.yAxis[yPos];
            for (let parPos=0; parPos<yAxRen.length; parPos++){

                let idY = yAxRen[parPos];
                // Add item to labels if there is no coloraxis is defined
                this.addParameterLabel(idY, infoGroup, parInfEl, yPos, 'left', parPos);
            }

            let y2AxRen = this.renderSettings.y2Axis[yPos];
            for (let parPos=0; parPos<y2AxRen.length; parPos++){

                let idY2 = y2AxRen[parPos];
                // Add item to labels if there is no coloraxis is defined
                this.addParameterLabel(idY2, infoGroup, parInfEl, yPos, 'right', parPos);
            }

            // Change height of settings panel to be just under labels
            /*let dim = parInfEl.node().getBoundingClientRect();
            this.el.select('#parameterSettings'+yPos)
                    .style('top', (dim.height+this.margin.top+9)+'px');
            */

            if(this.displayParameterLabel && !parInfEl.selectAll('*').empty()){
                parInfEl.style('visibility', 'visible');
            }
        }
    }


    renderColorScaleOptions(yPos, orientation, yAxisId, parPos){

        let colAxis = this.renderSettings.colorAxis;
        if(orientation==='right'){
            colAxis = this.renderSettings.colorAxis2;
        }

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

            // Check for renderGroups
            if(this.renderSettings.renderGroups && this.renderSettings.groups){
                let rGroup = this.renderSettings.groups[yPos];
                if(this.renderSettings.renderGroups[rGroup].parameters.indexOf(key) === -1){
                    ignoreKey = true;
                }
            }

            if( !ignoreKey && (this.data.hasOwnProperty(key)) ){
                selectionChoices.push({value: key, label: key});
                if(colAxis[yPos][parPos] === key){
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
            delete that.colorCache[colAxis[yPos][parPos]];
            colAxis[yPos][parPos] = selectValue;
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

        // Check if colorscales are available in plotty
        this.colorscales = this.colorscales.filter((cs)=>{
            return plotty.colorscales.hasOwnProperty(cs);
        });


        labelColorScaleSelect.selectAll('option')
            .data(this.colorscales).enter()
            .append('option')
                .text(function (d) { return d; })
                .attr('value', function (d) { return d; })
                .property('selected', (d)=>{
                    let csId = colAxis[yPos][parPos];
                    let obj = this.dataSettings[csId];
                    if(obj && obj.hasOwnProperty('colorscale')){
                        return d === this.dataSettings[csId].colorscale;
                    } else {
                        return false;
                    }
                });

        // Check if any colorscale has been selected, if not set viridis
        // to default
        if(labelColorScaleSelect.selectAll('option[selected]').empty()){
            labelColorScaleSelect.selectAll('option[value="viridis"]').property(
                'selected', true
            );
        }


        function oncolorScaleSelectionChange() {
            let csId = colAxis[yPos][parPos];
            delete that.colorCache[csId];
            let selectValue = that.el.select('#colorScaleSelection').property('value');
            that.dataSettings[csId].colorscale = selectValue;
            that.addApply();
        }

    }

    renderParameterOptions(dataSettings, id, yPos, orientation, keepOpen, parPos){

        let parSetEl = this.el.select('#parameterSettings');
        if(!keepOpen && parSetEl.style('display') === 'block' && parSetEl.attr('data-id')===id){
            parSetEl.style('display', 'none');
            return;
        }

        parSetEl.attr('data-id', id);

        let that = this;
        parSetEl.selectAll('*').remove();

        // Get parameterInfo box to know where to place parametersettings
        let currHeight = this.height/this.renderSettings.y2Axis.length;
        let divHeight = this.el.select('#parameterInfo'+yPos).node().offsetHeight;

        parSetEl
            .style('top', ((currHeight*yPos)+divHeight+9+this.margin.top)+'px')
            .style('display', 'block');

        parSetEl
            .append('div')
            .attr('class', 'parameterClose cross')
            .on('click', ()=>{
                parSetEl
                    .selectAll('*').remove();
                parSetEl
                    .style('display', 'none');
            });

        parSetEl
            .append('label')
            .attr('for', 'displayName')
            .text('Label');
            

        parSetEl
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
            parSetEl
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


            let select = parSetEl
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

            parSetEl
                .append('label')
                .attr('for', 'colorSelection')
                .text('Color');

            let colorSelect = parSetEl
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
                this.source.value = '#' + color;
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

            function update() {
                picker.set(this.value).enter();
            }

            picker.source.oncut = update;
            picker.source.onpaste = update;
            picker.source.onkeyup = update;
            picker.source.oninput = update;

            let x = document.createElement('a');
                x.href = 'javascript:;';
                x.innerHTML = 'Close';
                x.addEventListener('click', function() {
                    picker.exit();
                }, false);

            picker.self.appendChild(x);

            // Add point size option
            parSetEl
                .append('label')
                .attr('for', 'sizeSelection')
                .text('Point size');

            let sizeSelect = parSetEl
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
                });
        }

        if(this.displayAlphaOptions){
            
            parSetEl
                .append('label')
                .attr('for', 'opacitySelection')
                .text('Opacity');

            parSetEl.append('input')
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

        // Should normally always have an index
        if(this.displayColorscaleOptions){

            let colorAxis = this.renderSettings.colorAxis;
            if(orientation==='right'){
                colorAxis = this.renderSettings.colorAxis2;
            }

            let active = false;
            if(typeof colorAxis[yPos][parPos] !== 'undefined' && 
                      colorAxis[yPos][parPos]!==null){
                active = true;
            }

            parSetEl
                .append('label')
                .attr('for', 'colorscaleCB')
                .text(this.colorscaleOptionLabel);

            parSetEl
                .append('input')
                .attr('id', 'colorscaleCB')
                .attr('type', 'checkbox')
                .property('checked', active)
                .on('change', ()=>{
                    if(this.el.select("#colorscaleCB").property("checked")){
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

                            // Check for rendergroups for parameters we need to 
                            // ignore
                            if(this.renderSettings.renderGroups && 
                                this.renderSettings.groups){
                                let rGroup = this.renderSettings.groups[yPos];
                                if(this.renderSettings.renderGroups[rGroup].parameters.indexOf(key) === -1){
                                    ignoreKey = true;
                                }
                            }
                            if( !ignoreKey && (this.data.hasOwnProperty(key)) ){
                                selectionChoices.push(key);
                            }
                        }

                        // Select first option
                        if(typeof colorAxis[yPos][parPos]!=='undefined'){
                            colorAxis[yPos][parPos] = selectionChoices[0];
                        } else {
                            colorAxis[yPos].push(selectionChoices[0]);
                        }
                    } else {
                        colorAxis[yPos][parPos] = null;
                    }
                    that.renderParameterOptions(
                        dataSettings, id, yPos, orientation, true, parPos
                    );
                    that.addApply();
                });
            // Need to add additional necessary options
            // drop down with possible parameters and colorscale
            if(active){
                this.renderColorScaleOptions(yPos, orientation, id, parPos);
            }

        }

        if(combined) {
            this.addApply();
            return;
        }

        parSetEl
            .append('label')
            .attr('for', 'lineConnect')
            .text('Line connect');
            

        parSetEl
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
            parSetEl
                .append('label')
                .attr('for', 'regressionCheckbox')
                .text('Regression');
                
            let regressionTypes = [
                {name: 'Linear', value: 'linear'},
                {name: 'Polynomial', value: 'polynomial'}
            ];


            parSetEl
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


    addParameterLabel(id, infoGroup, parInfEl, yPos, orientation, parPos){

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

            // Check if current combination is available in data as per config
            if(this.renderSettings.availableParameters.hasOwnProperty(parIds[i])){
                if(this.renderSettings.availableParameters[parIds[i]].indexOf(id) === -1){
                    continue;
                }
            }


            // Check if parameter is combined for x and y axis
            let combined = false;
            let combPars = this.renderSettings.combinedParameters;
            let idX = this.renderSettings.xAxis;

            // Check also for sharedParameters
            let rS = this.renderSettings; 
            if(rS.renderGroups !== false && rS.groups!== false && 
                rS.sharedParameters !== false){
                let currGroup = rS.renderGroups[rS.groups[yPos]];
                if(rS.sharedParameters.hasOwnProperty(idX)){
                    let sharedPars = rS.sharedParameters[idX];
                    for (let i = 0; i < sharedPars.length; i++) {
                        if(currGroup.parameters.indexOf(sharedPars[i])!==-1){
                            idX = sharedPars[i];
                        }
                    }
                }
            }

            if(combPars.hasOwnProperty(idX)){
                if(combPars.hasOwnProperty(id)){
                    combined = true;
                }
            }


            let parDiv = parInfEl.append('div')
                .attr('class', 'labelitem');

            infoGroup.style('visibility', 'hidden');

            let dataSettings = this.dataSettings[id];
            if(parIds[i]!==null){
                dataSettings = this.dataSettings[id][parIds[i]];
            }

            let displayName;

            let colorAxis = this.renderSettings.colorAxis;
            if(orientation==='right'){
                colorAxis = this.renderSettings.colorAxis2;
            }

            let colorAxisLabel = null;
            if(typeof colorAxis[yPos][parPos] !== 'undefined' && 
                      colorAxis[yPos][parPos]!==null){
                colorAxisLabel = colorAxis[yPos][parPos];
            }

            if(dataSettings.hasOwnProperty('displayName')){
                displayName = dataSettings.displayName;
            }else if(colorAxisLabel !== null){
                displayName = colorAxisLabel;
                if(parIds[i]!==null){
                    displayName += ' ('+parIds[i]+')';
                }
            }else {
                displayName = id;
                if(parIds[i]!==null){
                    displayName += ' ('+parIds[i]+')';
                }
            }
            //dataSettings.displayName = displayName;

            parDiv.append('div')
                .style('display', 'inline')
                .attr('id', id)
                .html(displayName);

            // Update size of rect based on size of original div
            let boundRect = parInfEl.node().getBoundingClientRect();
            infoGroup.select('rect').attr('height', boundRect.height);

            // check amount of elements and calculate offset
            let offset = 21 + infoGroup.selectAll('text').size() *20;
            let labelText = infoGroup.append('text')
                .attr('class', 'svgaxisLabel')
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

            parDiv.on('click', this.renderParameterOptions.bind(
                this, dataSettings, id, yPos, orientation, false, parPos
            ));
        }
    }


    renderParameter(leftYAxis, idX, idY, idCS, plotY, yAxisSet, currYScale, 
                    parPos, data, inactiveData, updateReferenceCanvas){

        this.startTiming('renderParameter:'+idY);


        // Check if groups are being used and if a shared parameter is used as 
        // x axis
        let rS = this.renderSettings; 
        if(rS.renderGroups !== false && rS.groups!== false && 
            rS.sharedParameters !== false){

            let currGroup = rS.renderGroups[rS.groups[plotY]];
            if(rS.sharedParameters.hasOwnProperty(idX)){
                let sharedPars = rS.sharedParameters[idX];

                for (var i = 0; i < sharedPars.length; i++) {
                    if(currGroup.parameters.indexOf(sharedPars[i])!==-1){
                        idX = sharedPars[i];
                    }
                }
            }
        }

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
                    data, idX, idY, xGroup, yGroup, idCS, currYScale, plotY,
                    leftYAxis, updateReferenceCanvas
                );
            } else {
                this.renderPoints(
                    data, idX, idY, idCS, plotY,
                    currYScale, leftYAxis, updateReferenceCanvas
                );
            }
        } else {
            if(combPars.hasOwnProperty(idY)){
                this.renderPoints(
                    data, idX, idY, idCS, plotY, currYScale, leftYAxis,
                    updateReferenceCanvas
                );
            } else {
                if(this.showFilteredData) {
                    this.renderFilteredOutPoints(
                        inactiveData, idX, idY, plotY, currYScale, leftYAxis
                    );
                }
                this.renderPoints(
                    data, idX, idY, idCS, plotY, currYScale, leftYAxis,
                    updateReferenceCanvas
                );
                // Check if any regression type is selected for parameter
                if(this.enableFit){
                    this.createRegression(
                        data, parPos, plotY, yAxisSet[parPos], currYScale
                    );
                    if(inactiveData[yAxisSet[parPos]].length>0){
                        this.createRegression(
                            this.data, parPos, plotY, yAxisSet[parPos],
                            currYScale, true
                        );
                    }
                }
                
            }
        }
        this.endTiming('renderParameter:'+idY);
    }


    updatePreviewImage(imageEl){

        if(this.debounceActive){

            this.renderCanvas.style('opacity','1');
            this.startTiming('createPreviewImage:'+imageEl);
            
            this.endTiming('createPreviewImage:'+imageEl);
            let heighChunk = this.height/this.renderSettings.yAxis.length;

            for (let yPos=0; yPos<this.renderSettings.yAxis.length; yPos++){

                // Render specific area of image corresponding to current plot
                // Clear possible previous renderings
                this.IRc.width = this.width;
                this.IRc.height = heighChunk-this.separation;
                this.IRctx.clearRect(0, 0, this.IRc.width, this.IRc.height);

                this.IRctx.drawImage(
                    this.renderCanvas.node(),
                    0, heighChunk*yPos,
                    this.IRc.width, this.IRc.height,
                    0, 0,
                    this.IRc.width, this.IRc.height
                );

                let img = this.IRc.toDataURL();

                let prevImg = this.el.select('#'+imageEl+yPos);
                let renderingContainer = this.el.select('#renderingContainer'+yPos);

                if(!prevImg.empty()){
                    prevImg.attr('xlink:href', img)
                        .attr('transform', null)
                        .style('display', 'none');
                } else {
                    renderingContainer.insert('svg:image', ':first-child')
                        .attr('id', imageEl+yPos)
                        .attr('class', 'previewImage')
                        .attr('xlink:href', img)
                        .attr('x', 0)
                        .attr('y', 0)
                        .attr('width',  this.width)
                        .attr('height', heighChunk-this.separation)
                        .style('display', 'none');
                }
                this.previewActive = false;
            }

            if(this.debug){
                this.el.select('#'+imageEl)
                    .style('display', 'block')
                    .attr('opacity', 0.5);
            }

        } else {
            // We use the "first" (0) element as preview image for non
            // debounce rendering
            let renderingContainer = this.el.select('#renderingContainer'+0);
            let prevImg = this.el.select('#'+imageEl+0);
            if(prevImg.empty()){
                renderingContainer.append('svg:image')
                    .attr('id', imageEl+0)
                    .attr('class', 'previewImage')
                    .attr('x', 0)
                    .attr('y', 0)
                    .attr('width',  this.width)
                    .attr('height', this.height)
                    .style('display', 'none');
            }
        }

        
    }

    calculateColorDomain(colorAxis) {
        if(colorAxis !== null){
            if(this.dataSettings.hasOwnProperty(colorAxis)){
                if(!this.dataSettings[colorAxis].hasOwnProperty('extent')){
                    let domain;
                    // Set current calculated extent to settings
                    if(this.dataSettings[colorAxis].hasOwnProperty('nullValue')){
                        let nV = this.dataSettings[colorAxis].nullValue;
                        // If parameter has nullvalue defined ignore it 
                        // when calculating extent
                        domain = d3.extent(
                            this.currentData[colorAxis], (v)=>{
                                if(v !== nV){
                                    return v;
                                } else {
                                    return null;
                                }
                            }
                        );
                    } else {
                        if(this.checkTimeScale(colorAxis)){
                            domain = d3.extent(
                                this.currentData[colorAxis],
                                (item)=>{return item.getTime()});
                        } else {
                            domain = d3.extent(this.currentData[colorAxis]);
                        }
                    }
                    if(isNaN(domain[0])){
                        domain[0] = 0;
                    }
                    if(isNaN(domain[1])){
                        domain[1] = domain[0]+1;
                    }
                    if(domain[0] == domain[1]){
                        domain[0]-=1;
                        domain[1]+=1;
                    }
                    if(domain[0]>domain[1]){
                        domain = domain.reverse();
                    }
                    this.dataSettings[colorAxis].extent = domain;
                }
            }
        }
    }


    enableScissorTest(plotY){
        // Set current "rendering area" so that other plots are not
        // overplotted turn on the scissor test.
        this.batchDrawer.getContext().enable(
            this.batchDrawer.getContext().SCISSOR_TEST
        );

        if(this.batchDrawerReference){
            this.batchDrawerReference.getContext().enable(
                this.batchDrawerReference.getContext().SCISSOR_TEST
            );
        }


        let amountOfPlots = this.renderSettings.yAxis.length;
        let blockSize = (
            this.height/amountOfPlots
        ) * this.resFactor;

        let revPlotY = (amountOfPlots-1)-plotY;
        let axisOffset = revPlotY * (
                (this.height/amountOfPlots)
            )  * this.resFactor;

        axisOffset+=(this.separation)+1;
        blockSize-=this.separation+1;

        // set the scissor rectangle.
        this.batchDrawer.getContext().scissor(
            0, axisOffset, this.width, blockSize
        );

        if(this.batchDrawerReference){
            this.batchDrawerReference.getContext().scissor(
                0, axisOffset, this.width, blockSize
            );
        }

    }


    /**
    * Render the data as graph
    * @param {boolean} [updateReferenceCanvas=true] Update the corresponding 
    *        color reference canvas
    */
    renderData(updateReferenceCanvas) {

        this.startTiming('renderData');

        let xAxRen = this.renderSettings.xAxis;
        
        this.batchDrawer.clear();
        if(this.batchDrawerReference && updateReferenceCanvas){
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
        for (let i = 0; i < this.renderSettings.colorAxis.length; i++) {
            for (let j = 0; j < this.renderSettings.colorAxis.length; j++) {
                this.calculateColorDomain(this.renderSettings.colorAxis[i][j]);
            }
            for (let j = 0; j < this.renderSettings.colorAxis2.length; j++) {
                this.calculateColorDomain(this.renderSettings.colorAxis2[i][j]);
            }
        }


        if(updateReferenceCanvas){
            this.createColorScales();
            this.updateInfoBoxes();
        }

        let idX = xAxRen;
        let yAxRen, y2AxRen;
        

        // Render first all y2 axis parameters
        for (let plotY = 0; plotY < this.renderSettings.yAxis.length; plotY++) {

            y2AxRen = this.renderSettings.y2Axis[plotY];

            this.enableScissorTest(plotY);

            // If y2 axis is defined start rendering it as we need to render
            // multiple times to have individial images for manipulation in
            // debounce option
            if(y2AxRen.length > 0){
                for (let parPos=0; parPos<y2AxRen.length; parPos++){
                    let idY2 = y2AxRen[parPos];
                    let idCS = this.renderSettings.colorAxis2[plotY][parPos];
                    this.renderParameter(
                        false, idX, idY2, idCS, plotY, y2AxRen, this.y2Scale,
                        parPos, this.currentData, this.currentInactiveData,
                        updateReferenceCanvas
                    );
                }
            }

            this.startTiming('batchDrawer:draw');
            this.batchDrawer.draw();
            this.endTiming('batchDrawer:draw');

            if(!this.fixedSize && updateReferenceCanvas){
                this.startTiming('batchDrawerReference:draw');
                this.batchDrawerReference.draw();
                this.endTiming('batchDrawerReference:draw');

                this.batchDrawerReference.getContext().disable(
                    this.batchDrawerReference.getContext().SCISSOR_TEST
                );
            }
            // turn off the scissor test so you can render like normal again.
            this.batchDrawer.getContext().disable(
                this.batchDrawer.getContext().SCISSOR_TEST
            );
            
        }
        // Save preview image of rendering of second y axis 
        // without data from first y axis
        this.updatePreviewImage('previewImageR');


        if(!this.fixedSize && updateReferenceCanvas && !this.debounceActive){
            this.startTiming('batchDrawerReference:draw');
            this.batchDrawerReference.draw();
            this.endTiming('batchDrawerReference:draw');
        }

        if(this.debounceActive){
            // If debounce active clear all to create second clean
            // image for left side
            this.batchDrawer.clear();
            if(this.batchDrawerReference){
                this.batchDrawerReference.clear();
            }
        }

        // Afterwards render all y axis parameters
        for (let plotY = 0; plotY < this.renderSettings.y2Axis.length; plotY++) {

            yAxRen = this.renderSettings.yAxis[plotY];
            
            this.enableScissorTest(plotY);

            for (let parPos=0; parPos<yAxRen.length; parPos++){

                let idY = yAxRen[parPos];
                let idCS = this.renderSettings.colorAxis[plotY][parPos];

                this.renderParameter(
                    true, idX, idY, idCS, plotY, yAxRen, this.yScale,
                    parPos, this.currentData, this.currentInactiveData,
                    updateReferenceCanvas
                );
            }

            this.startTiming('batchDrawer:draw');
            this.batchDrawer.draw();
            this.endTiming('batchDrawer:draw');

            if(!this.fixedSize && updateReferenceCanvas){
                this.startTiming('batchDrawerReference:draw');
                this.batchDrawerReference.draw();
                this.endTiming('batchDrawerReference:draw');

                this.batchDrawerReference.getContext().disable(
                    this.batchDrawerReference.getContext().SCISSOR_TEST
                );
            }
            // turn off the scissor test so you can render like normal again.
            this.batchDrawer.getContext().disable(
                this.batchDrawer.getContext().SCISSOR_TEST
            );
            
        }
        this.updatePreviewImage('previewImageL');



        // If debounce is active we need to re-render the right y axis
        // parameter as we had to clear it in order to create a clean left 
        // y axis parameters rendering
        if(this.debounceActive){
            for (let plotY = 0; plotY < this.renderSettings.y2Axis.length; plotY++) {

                this.enableScissorTest(plotY);

                y2AxRen = this.renderSettings.y2Axis[plotY];
                // If y2 axis is defined start rendering it as we need to render
                // multiple times to have individial images for manipulation in
                // debounce option
                if(y2AxRen.length > 0){
                    for (let parPos=0; parPos<y2AxRen.length; parPos++){
                        let idY2 = y2AxRen[parPos];
                        let idCS = this.renderSettings.colorAxis2[plotY][parPos];
                        this.renderParameter(
                            false, idX, idY2, idCS, plotY, y2AxRen, this.y2Scale,
                            parPos, this.currentData, this.currentInactiveData,
                            updateReferenceCanvas
                        );
                    }
                }

                // Save preview image of rendering of second y axis 
                // without data from first y axis
                this.startTiming('batchDrawer:draw');
                this.batchDrawer.draw();
                this.endTiming('batchDrawer:draw');

                if(!this.fixedSize && updateReferenceCanvas){
                    this.startTiming('batchDrawerReference:draw');
                    this.batchDrawerReference.draw();
                    this.endTiming('batchDrawerReference:draw');
                    this.batchDrawerReference.getContext().disable(
                        this.batchDrawerReference.getContext().SCISSOR_TEST
                    );
                }

                // turn off the scissor test so you can render like normal again.
                this.batchDrawer.getContext().disable(
                    this.batchDrawer.getContext().SCISSOR_TEST
                );
                
            }
        }

        /**
        * Event is fired when graph has finished rendering plot.
        * @event module:graphly.graphly#rendered
        */
        this.emit('rendered');
        this.endTiming('renderData');
    }




}

export {graphly};
