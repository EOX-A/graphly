/*jshint esversion: 6 */

/**
* @typedef {Object} RenderSettings
* @property {String} xAxis Parameter id to be rendered on x axis.
* @property {String} [xAxisLabel] Label to be used for x axis instead of 
*         generated label based on selected parameter. 
* @property {Array.String} yAxis Array of parameter id strings of parameters
*         to be rendered on y axis (left). 
* @property {Array.String} [yAxisLabel] Array of labels to be used instead of
*         generated label based on selected parameters. 
* @property {Array.String} y2Axis Array of parameter id strings of parameters
*        to be rendered on second y axis (right).
* @property {Array.String} [y2AxisLabel] Array of labels to be used instead of 
*         generated label based on selected parameters.
* @property {Object} combinedParameters
* @property {Array.Array} colorAxis Array of strings for each plot passed as
*        array. For each parameter rendered on y axis one colorscale parameter
*        can be provided, use null for parameters without colorscale
* @property {Array.Array} colorAxis Array of strings for each plot passed as
*        array. For each parameter rendered on y2 (right) axis one colorscale 
*        parameter can be provided, use null for parameters without colorscale
* @property {Object} [dataIdentifier] Contains key "parameter" with identifier 
*       string of parameter used to separate data into groups and key 
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
* @property {Array.String} [yAxisExtent] Array of two value arrays for extent
*        to be set for each y axis instead of calculating from data range
* @property {Array.String} [y2AxisExtent] Array of two value arrays for extent
*        to be set for each y2 (right) axis instead of calculating from data range
* @property {Array.String} [yAxisLocked] Array of booleans indicating if range
*        calculation for y axis is locked, so range is not recalculated when 
*        reloading data
* @property {Array.String} [y2AxisLocked] Array of booleans indicating if range
*        calculation for y 2 axis is locked, so range is not recalculated when
*        reloading data
* @property {Object} [availableParameters] When using dataIdentifier an object
*        with keys for each possible identifier and an array with parameter 
*        identifiers as stringslist of can be provided so that only those
*        are shown as parameter labels that allow configuration
* @property {Array.boolean} [reversedYAxis] Array, same length as yAxis with
*        boolean values for each plot if left y axis reversed or not
*        (high values on bottom, low values on top)
* @property {Array.boolean} [reversedY2Axis] Array, same length as yAxis with
*        boolean values for each plot if right y axis reversed or not
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
* @property {String} [errorParameter] Identifier of parameter representing
*           the error value of the current parameter.
* @property {boolean} [errorDisplayed] If true then the errorParameter is
*           displayed.
* @property {Object} [periodic] Can be set when parameter has periodic pattern.
*           The object must have the 'period' value and can have a possible
*           offset. For example longitude values from -180 to 180 would have 360
*           as period and -180 as offset. Default offset value is 0.
* @property {Number} [nullValue] Value to be interpreted as null, used for 
*           colorscale extent calculation.
* @property {Array} [filterExtent] Minimum and Maximum value to be used in
*           filter visualization
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

const dotType = {
    rectangle: 0.0,
    rectangle_empty: 1.0,
    circle: 2.0,
    circle_empty: 3.0,
    plus: 4.0,
    x: 5.0,
    triangle: 6.0,
    triangle_empty: 7.0,
    diamond : 8.0,
    diamond_empty: 9.0,
};


let DOTSIZE = 6;
let ERROBAR_CAP_WIDTH = 4;

let lockicon = require('../styles/lock.svg');
let unlockicon = require('../styles/unlock.svg');

require('../styles/graphly.css');
require('../node_modules/choices.js/assets/styles/css/choices.css');
require('../node_modules/c-p/color-picker.css');

const EventEmitter = require('events');

import * as u from './utils';

let regression = require('regression');
let d3 = require('d3');

require('c-p');

let FileSaver = require('file-saver');
let Choices = require('choices.js');

let BatchDrawer = require('./BatchDraw.js');
let FilterManager = require('./FilterManager.js');
let BitwiseInt = require('./BitwiseInt.js');
let canvg = require('./vendor/canvg.js');
let colorscalesdef = require('colorscalesdef');

global.FilterManager = FilterManager;
global.BitwiseInt = BitwiseInt;


function defaultFor(arg, val) { return typeof arg !== 'undefined' ? arg : val; }
function warning(message) {
    (console ? (console.warn || console.log) : function (m) { return m; })
        (message)
    ;
}

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
@fires module:graphly.graphly#colorScaleChange
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
    * @param {boolean} [options.replaceUnderscore=false] Setting to configure 
    *        if underlines appearing in parameter labels should be replaced by
    *        spaces.
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
    * @property {boolean} [multiYAxis=true] Adds controls for managing 
    *        multiple y axis with single x axis,
    *
    * @param {String} [options.labelAllignment='right'] allignment for label box
    * @param {boolean} [options.connectFilteredPoints=false] option to render
    *        lines between points when there are filtered points in between
    * @param {Object} [options.colorscaleDefinitions] Hash of colorscale
    *        definitions. Defaults to colorscales from colorscalesdef (eox-a)
    * @param {Array} [options.colorscales] Array of strings with colorscale 
    *        identifiers offered for selection, defaults to keys from
    *        options.colorscaleDefinitions. Note that identifiers not present
    *        in options.colorscaleDefinitions are ignored.
    * @param {boolean} [options.showFilteredData=true] Option to show greyed out
    *        data points when filtering
    * @param {boolean} [options.allowLockingAxisScale=false] Option to add lock
    *        functionality to all y axis to fix the current scale event when
    *        reloading data, when set event fires when any y axis extent changes
    * @param {boolean} [options.disableAntiAlias=false] Allows disabling antialias
    *        of the rendering context
    * @param {boolean} [enableMaskParameters=false] Adds option to mask data base
    *        on boolean array in data for a parameter
    */
    constructor(options) {
        super();

        // Passed options
        this.el = d3.select(options.el);
        this.nsId = options.el;
        this.defaultAlpha = defaultFor(options.defaultAlpha, 1.0);
        this.ignoreParameters = defaultFor(options.ignoreParameters, []);
        this.resFactor = 1;
        this.debug = defaultFor(options.debug, false);
        this.enableSubXAxis = defaultFor(options.enableSubXAxis, false);
        this.enableSubYAxis = defaultFor(options.enableSubYAxis, false);
        this.multiYAxis = defaultFor(options.multiYAxis, true);
        this.labelAllignment = defaultFor(options.labelAllignment, 'right');
        this.connectFilteredPoints = defaultFor(options.connectFilteredPoints, false);
        this.zoomActivity = false;
        this.activeArrows = false;
        this.disableAntiAlias = defaultFor(options.disableAntiAlias, false);
        this.allowLockingAxisScale = defaultFor(options.allowLockingAxisScale, false);
        this.replaceUnderscore = defaultFor(options.replaceUnderscore, false);
        this.enableMaskParameters = defaultFor(options.enableMaskParameters, false);
        this.overlayData = defaultFor(options.overlayData, {});
        this.overlaySettings = defaultFor(options.overlaySettings, false);

        this.labelReplace = /a^/; // Default not matchin anything
        if(this.replaceUnderscore){
            this.labelReplace = /_/g;
        }

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

        this.dataSettings = defaultFor(options.dataSettings, {});

        // Go through dataSettings and provide default colors if not defined
        let rKeys = Object.keys(this.dataSettings);
        let cGen = d3.scale.category10();
        if(rKeys.length > 10){
            cGen = d3.scale.category20();
        }

        for (let i = 0; i < rKeys.length; i++) {
            let k = rKeys[i];
            if(!this.dataSettings[k].hasOwnProperty('color') || 
                typeof this.dataSettings[k].color === 'undefined'){
                let col = cGen(i);
                col = CP.HEX2RGB(col.slice(1));
                col = col.map(function(c){return c/255;});
                this.dataSettings[k].color = col;
            }
        }

        this.logX = defaultFor(options.logX, false);
        this.logY = defaultFor(options.logY, false);
        this.logY2 = defaultFor(options.logY2, false);

        this.setRenderSettings(options.renderSettings);


        this.defaultTickSize = 12;
        this.defaultLabelSize = 12;

        this.settingsToApply = {};
        this.settingsToDelete = [];


        this.colorAxisTickFormat = defaultFor(options.colorAxisTickFormat, 'g');
        this.defaultAxisTickFormat = defaultFor(options.defaultAxisTickFormat, 'g');

        this.timeScales = [];

        this.margin = defaultFor(
            options.margin,
            {top: 10, left: 90, bottom: 50, right: 40}
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

        let colorscaleDefinitions = defaultFor(
            options.colorscaleDefinitions, colorscalesdef.colorscales
        )

        // NOTE: undefined colorscales are rejected
        this.colorscales = defaultFor(
            options.colorscales, Object.keys(colorscaleDefinitions)
        ).filter(name => colorscaleDefinitions.hasOwnProperty(name));

        this.discreteColorScales = {};

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
            },
            colorscales: colorscaleDefinitions
        };

        if(this.disableAntiAlias){
            params.contextParams.antialias = false;
        }

        // Initialize BatchDrawer:
        this.batchDrawer = new BatchDrawer(this.renderCanvas.node(), params);

        this.batchDrawer.setNoDataValue(Number.MIN_SAFE_INTEGER);


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


            this.batchDrawerReference.setDomain([0,1]);
            this.batchDrawerReference.setColorScale('cool');
            this.batchDrawerReference.setNoDataValue(Number.MIN_SAFE_INTEGER);
            this.batchDrawerReference._initUniforms();

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
            .style('clip-path','url('+this.nsId+'hoverClipBox)')
            .attr(
                'transform',
                'translate(' + (this.margin.left+this.subAxisMarginY+1) + ',' +
                (this.margin.top+1) + ')'
            );

        // Create clip path
        this.topSvg.append('defs').append('clipPath')
            .attr('id', (this.nsId.substring(1)+'hoverClipBox'));

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
                this.topSvg.selectAll('.temporary').remove();
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
                                // Make sure coords are ordered correctly
                                let x1 = nodeId.x1.coord;
                                let x2 = nodeId.x2.coord;
                                let y1 = nodeId.y1.coord;
                                let y2 = nodeId.y2.coord;
                                if(nodeId.y1.coord > nodeId.y2.coord){
                                    y1 = nodeId.y2.coord;
                                    y2 = nodeId.y1.coord;
                                }
                                if(nodeId.x1.coord > nodeId.x2.coord){
                                    x1 = nodeId.x2.coord;
                                    x2 = nodeId.x1.coord;
                                }
                                self.topSvg.append('rect')
                                    .attr('class', 'temporary')
                                    .attr('x', x1)
                                    .attr('y', y1)
                                    .attr('width', (x2-x1))
                                    .attr('height', (y2-y1))
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
                                let x1 = nodeId.x1.coord;
                                let x2 = nodeId.x2.coord;
                                let y1 = nodeId.y1.coord;
                                let y2 = nodeId.y2.coord;
                                if(nodeId.y1.coord > nodeId.y2.coord){
                                    y1 = nodeId.y2.coord;
                                    y2 = nodeId.y1.coord;
                                }
                                if(nodeId.x1.coord > nodeId.x2.coord){
                                    x1 = nodeId.x2.coord;
                                    x2 = nodeId.x1.coord;
                                }
                                //Draw the Rectangle
                                self.topSvg.append('rect')
                                    .attr('class', 'highlightItem')
                                    .attr('x', x1)
                                    .attr('y', y1)
                                    .attr('width', (x2-x1))
                                    .attr('height', (y2-y1))
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
                    let topPos = d3.event.pageY - dim.top + 10;

                    if (topPos+ttdim.height > dim.height){
                        topPos = topPos - ttdim.height + 10;
                    }
                    let leftPos = (d3.event.pageX - dim.left + 10);
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
                            this.topSvg.selectAll('.temporary').remove();
                            this.tooltip.style('display', 'none');
                            this.emit('pointSelect', null);
                        });

                    if (typeof self.currentData !== 'undefined' && 
                        nodeId.hasOwnProperty('index')){

                        let keysSorted = Object.keys(self.currentData).sort();
                        // Check for groups and remove 
                        let tabledata = [];
                        let uomAvailable = false;
                        for (let i = 0; i < keysSorted.length; i++) {
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
                            let currEl;
                            if(this.dataSettings.hasOwnProperty(key) 
                                && self.dataSettings[key].hasOwnProperty('uom')
                                && self.dataSettings[key].uom !== null){
                                uomAvailable = true;
                                tObj.Unit = self.dataSettings[key].uom;
                            } else {
                                // Check if parameter is part of a combined
                                // parameter if yes use uom of original
                                if(this.renderSettings.hasOwnProperty('combinedParameters')){
                                    for(let cpkey in this.renderSettings.combinedParameters){
                                        if(cpkey === key){
                                            currEl = this.renderSettings.combinedParameters[cpkey][0];
                                            if(self.dataSettings.hasOwnProperty(currEl) &&
                                               self.dataSettings[currEl].hasOwnProperty('uom') &&
                                               self.dataSettings[currEl].uom !== null ){
                                                uomAvailable = true;
                                                tObj.Unit = self.dataSettings[currEl].uom;
                                            }
                                        }
                                    }
                                }
                            }
                            // Check to see if a modified UOM is set and we need to replace it
                            if(this.dataSettings.hasOwnProperty(key) 
                                && self.dataSettings[key].hasOwnProperty('modifiedUOM')
                                && self.dataSettings[key].modifiedUOM !== null){
                                uomAvailable = true;
                                tObj.Unit = self.dataSettings[key].modifiedUOM;
                            } else {
                                // Check if parameter is part of a combined
                                // parameter if yes use modifiedUOM of original
                                if(this.renderSettings.hasOwnProperty('combinedParameters')){
                                    for(let cpkey in this.renderSettings.combinedParameters){
                                        if(cpkey === key){
                                            currEl = this.renderSettings.combinedParameters[cpkey][0];
                                            if(self.dataSettings.hasOwnProperty(currEl) &&
                                               self.dataSettings[currEl].hasOwnProperty('modifiedUOM') &&
                                               self.dataSettings[currEl].modifiedUOM !== null ){
                                                uomAvailable = true;
                                                tObj.Unit = self.dataSettings[currEl].modifiedUOM;
                                            }
                                        }
                                    }
                                }
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
                            .text(function (column) { 
                                return column.replace(this.labelReplace, ' '); 
                            });

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


                        // Check to see if a global positionAlias is defined
                        // or a group based position alias is defined
                        let posAlias;
                        let rS = self.renderSettings;
                        if(rS.hasOwnProperty('positionAlias')){
                            posAlias =  rS.positionAlias;
                        }

                        if(rS.renderGroups !== false && rS.groups !== false){
                            let groupKey = rS.groups[plotY];
                            if(rS.renderGroups[groupKey].hasOwnProperty('positionAlias')){
                                posAlias = rS.renderGroups[groupKey].positionAlias;
                            }
                        }
                        // Check to see if data has set some position aliases
                        if(posAlias){
                            let lat, lon, alt;
                            let combPar = self.renderSettings.combinedParameters;

                            if(combPar.hasOwnProperty(posAlias.latitude)){
                                let key = combPar[posAlias.latitude];
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

                            if(combPar.hasOwnProperty(posAlias.longitude)){
                                let key = combPar[posAlias.longitude];
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

                            if(combPar.hasOwnProperty(posAlias.altitude)){
                                let key = combPar[posAlias.altitude];
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
        // Reset colorscale range if filter changed for parameter with 
        // colorscale
        if(this.autoColorExtent){
            let filterKeys = Object.keys(filters);
            for (let i = 0; i < filterKeys.length; i++) {
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
        this.renderData(true);
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
        // TODO: Do sanity checks for passed settings
        if (typeof settings === 'undefined') {
            warning('Settings object can\'t be undefined');
            return;
        }
        this.renderSettings = settings;
        // If provided settings are not array of arrays convert it to it
         if(!this.multiYAxis || (
                Array.isArray(this.renderSettings.yAxis) && 
                !Array.isArray(this.renderSettings.yAxis[0])
            )) {
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

        let createFilledArray = (val)=>{
            const outputArray = [];
            for (let i = 0; i < this.renderSettings.yAxis.length; i++) {
                outputArray.push(val);
            }
            return outputArray;
        }

        this.yAxisLabel = defaultFor(
            this.renderSettings.yAxisLabel, createFilledArray(null)
        );
        this.y2AxisLabel = defaultFor(
            this.renderSettings.y2AxisLabel, createFilledArray(null)
        );
        this.xAxisLabel = defaultFor(this.renderSettings.xAxisLabel, null);


        this.logY = createFilledArray(false);
        this.logY2 = createFilledArray(false);

        // Check if sub axis option set if not initialize with empty array
        if(this.enableSubXAxis){
            this.renderSettings.additionalXTicks = defaultFor(
                this.renderSettings.additionalXTicks, []
            );
        }
        
        this.renderSettings.additionalYTicks = defaultFor(
            this.renderSettings.additionalYTicks, createFilledArray([])
        );
        this.renderSettings.combinedParameters = defaultFor(
            this.renderSettings.combinedParameters, {}
        );
        this.renderSettings.reversedYAxis = defaultFor(
            this.renderSettings.reversedYAxis, createFilledArray(false)
        );
        this.renderSettings.reversedY2Axis = defaultFor(
            this.renderSettings.reversedY2Axis, createFilledArray(false)
        );
        this.renderSettings.y2Axis = defaultFor(
            this.renderSettings.y2Axis, []
        );
        this.renderSettings.yAxisExtent = defaultFor(
            this.renderSettings.yAxisExtent, createFilledArray(null)
        );
        this.renderSettings.y2AxisExtent = defaultFor(
            this.renderSettings.y2AxisExtent, createFilledArray(null)
        );
        this.renderSettings.yAxisLocked = defaultFor(
            this.renderSettings.yAxisLocked, createFilledArray(false)
        );
        this.renderSettings.y2AxisLocked = defaultFor(
            this.renderSettings.y2AxisLocked, createFilledArray(false)
        );
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

        // Hide axis edit buttons
        this.svg.selectAll('.modifyAxisIcon').style('display', 'none');
        this.svg.selectAll('.lockAxisIcon').style('display', 'none');

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
                if(this.renderSettings.reversedYAxis[yPos]){
                    this.yScale[yPos].range([
                        0, Math.floor((currHeight-this.separation)*this.resFactor)
                    ]);
                } else  {
                    this.yScale[yPos].range([
                        Math.floor((currHeight-this.separation)*this.resFactor), 0
                    ]);
                }
            }

            for (let yPos = 0; yPos < this.y2Scale.length; yPos++) {
                if(this.renderSettings.reversedY2Axis[yPos]){
                    this.y2Scale[yPos].range([
                        0, Math.floor((currHeight-this.separation)*this.resFactor)
                    ]);
                } else  {
                    this.y2Scale[yPos].range([
                        Math.floor((currHeight-this.separation)*this.resFactor), 0
                    ]);
                }
            }

            let xAxRen = this.renderSettings.xAxis;
            
            let yAxRen = this.renderSettings.yAxis;
            let y2AxRen = this.renderSettings.y2Axis;


            // Render all y axis parameters
            for (let plotY = 0; plotY < this.renderSettings.y2Axis.length; plotY++) {

                yAxRen = this.renderSettings.yAxis[plotY];
                
                this.enableScissorTest(plotY);

                for (let parPos=0; parPos<yAxRen.length; parPos++){

                    let idY = yAxRen[parPos];
                    let idCS = this.renderSettings.colorAxis[plotY][parPos];

                    this.renderParameter(
                        true, xAxRen, idY, idCS, plotY, yAxRen, this.yScale,
                        parPos, this.currentData, this.currentInactiveData,
                        false
                    );
                }
                this.batchDrawer.draw();
                // turn off the scissor test so you can render like normal again.
                this.batchDrawer.getContext().disable(
                    this.batchDrawer.getContext().SCISSOR_TEST
                );
            }

            // Render afterwards all y2 axis parameters
            for (let plotY = 0; plotY < this.renderSettings.yAxis.length; plotY++) {

                y2AxRen = this.renderSettings.y2Axis[plotY];

                this.enableScissorTest(plotY);

                if(y2AxRen.length > 0){
                    for (let parPos=0; parPos<y2AxRen.length; parPos++){
                        let idY2 = y2AxRen[parPos];
                        let idCS = this.renderSettings.colorAxis2[plotY][parPos];
                        this.renderParameter(
                            false, xAxRen, idY2, idCS, plotY, y2AxRen, this.y2Scale,
                            parPos, this.currentData, this.currentInactiveData,
                            false
                        );
                    }
                }
                this.batchDrawer.draw();
                // turn off the scissor test so you can render like normal again.
                this.batchDrawer.getContext().disable(
                    this.batchDrawer.getContext().SCISSOR_TEST
                );
            }
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

        let svg_html = this.el.select('svg')
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
                let imgData=this.IRctx.getImageData(0,0,this.IRc.width,this.IRc.height);
                let data=imgData.data;
                for(let i=0;i<data.length;i+=4){
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

            const saveToBlob = ()=>{
                this.IRc.toBlob((blob)=> {
                    FileSaver.saveAs(blob, this.fileSaveString);
                    this.resFactor = 1;
                    this.resize();
                }, outformat ,1);
            }
            // TODO: We introduce a short timeout here because it seems for some
            // reason the rendered image is not ready when saving the blob
            setTimeout(saveToBlob.bind(this), 1000);
        }


        this.svg.selectAll('.previewImage').style('display', 'none');
        this.svg.selectAll('.svgInfoContainer').style('visibility', 'hidden');
        // Unhide axis edit buttons
        this.svg.selectAll('.modifyAxisIcon').style('display', 'block');
        this.svg.selectAll('.lockAxisIcon').style('display', 'block');

        // Set first render container as it was before
        this.el.select('#renderingContainer0')
            .style('clip-path','url('+this.nsId+'clipbox)');

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
        for (let i = 0; i < uniq.length; i++) {

            // Check to see if a modified UOM is set and we need to replace it
            let key = uniq[i];
            let uomText;

            if(this.dataSettings.hasOwnProperty(key) 
                && this.dataSettings[key].hasOwnProperty('uom')
                && this.dataSettings[key].uom !== null){
                uomText = this.dataSettings[key].uom;
            } else {
                // Check if parameter is part of a combined
                // parameter if yes use uom of original
                if(this.renderSettings.hasOwnProperty('combinedParameters')){
                    for(let cpkey in this.renderSettings.combinedParameters){
                        if(cpkey === key){
                            let currEl = this.renderSettings.combinedParameters[cpkey][0];
                            if(this.dataSettings.hasOwnProperty(currEl) &&
                               this.dataSettings[currEl].hasOwnProperty('uom') &&
                               this.dataSettings[currEl].uom !== null ){
                                uomText = this.dataSettings[currEl].uom;
                            }
                        }
                    }
                }
            }
            // Check for available modified uom
            if(this.dataSettings.hasOwnProperty(key) 
                && this.dataSettings[key].hasOwnProperty('modifiedUOM')
                && this.dataSettings[key].modifiedUOM !== null){
                uomText = this.dataSettings[key].modifiedUOM;
            } else {
                // Check if parameter is part of a combined
                // parameter if yes use modifiedUOM of original
                if(this.renderSettings.hasOwnProperty('combinedParameters')){
                    for(let cpkey in this.renderSettings.combinedParameters){
                        if(cpkey === key){
                            let currEl = this.renderSettings.combinedParameters[cpkey][0];
                            if(this.dataSettings.hasOwnProperty(currEl) &&
                               this.dataSettings[currEl].hasOwnProperty('modifiedUOM') &&
                               this.dataSettings[currEl].modifiedUOM !== null ){
                                uomText = this.dataSettings[currEl].modifiedUOM;
                            }
                        }
                    }
                }
            }

            if(typeof uomText !== 'undefined') {
                listText.push(uniq[i].replace(this.labelReplace, ' ') + ' ['+uomText+'] ');
            } else {
                listText.push(uniq[i].replace(this.labelReplace, ' '));
            }
        }

        if(listText.length === 0){
            // No items selected, add "filler text"
            listText.push('Add parameter ...');
        }

        if(yAxisLabel[yPos]){
            listText = [yAxisLabel[yPos].replace(this.labelReplace, ' ')];
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
                'translate('+ -(this.margin.left/2+20) +','+
                currHeightCenter+')rotate(-90)'
            )
        }else if(orientation === 'right'){
            labelText.attr('transform', 
                'translate('+ (this.width+this.marginY2Offset+30) +','+
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
                that.emit('axisChange');
            });

        con.append('label')
            .attr('for', basename+'CustomLabel'+yPos)
            .text('Label');

        con = setDiv.append('div')
            .attr('class', 'axisOption');

        if(!this.yTimeScale){
            let divCont = con.append('div');
            divCont.append('input')
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
                    that.emit('axisChange');
                });

            divCont.append('label')
                .attr('for', 'logYoption')
                .text('Logarithmic scale');
        }
        let divCont = con.append('div');
        divCont.append('input')
            .attr('id', 'reversedYOption')
            .attr('type', 'checkbox')
            .property('checked', 
                function(){
                    if(orientation==='left'){
                        return defaultFor(that.renderSettings.reversedYAxis[yPos], false)
                    } else if (orientation === 'right'){
                        return defaultFor(that.renderSettings.reversedY2Axis[yPos], false)
                    }
                }
            )
            .on('change', function(){
                if(orientation==='left'){
                    that.renderSettings.reversedYAxis[yPos] = !that.renderSettings.reversedYAxis[yPos];
                } else if (orientation === 'right'){
                    that.renderSettings.reversedY2Axis[yPos] = !that.renderSettings.reversedY2Axis[yPos];
                }
                that.initAxis();
                that.renderData();
                that.emit('axisChange');
            });

        divCont.append('label')
            .attr('for', 'reversedYOption')
            .text('Reverse axis');


        scaleChoices.attr('multiple', true);

        let toggleView = function(divEl){
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

            let currPar = event.detail.value;

            // Look for default colorscale value only if it is a combined parameter
            let defaultColorscale = null;
            if(renSett.hasOwnProperty('combinedParameters') && 
                renSett.combinedParameters.hasOwnProperty(currPar)){
                if(renSett.hasOwnProperty('renderGroups')){
                    let currGroup = renSett.groups[yPos];
                    if(renSett.renderGroups.hasOwnProperty(currGroup) && 
                        renSett.renderGroups[currGroup].hasOwnProperty('defaults')){
                        defaultColorscale = renSett
                            .renderGroups[currGroup].defaults.colorAxis;
                    }
                }
            }

            if(orientation === 'left'){
                renSett.colorAxis[yPos].push(defaultColorscale);
            } else if(orientation === 'right'){
                curryAxArr = renSett.y2Axis;
                renSett.colorAxis2[yPos].push(defaultColorscale);
            }

            curryAxArr[yPos].push(currPar);
            // TODO: Check for adding of time parameter

            // One item was added and none where before, we resize the right margin
            if(orientation === 'right' && that.renderSettings.y2Axis[yPos].length === 1){
                that.resize(false);
            }

            that.recalculateBufferSize();
            that.initAxis();
            that.renderData();

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

                // One item was added and none where before, we resize the right margin
                if(orientation === 'right' && that.renderSettings.y2Axis[yPos].length === 0){
                    that.resize(false);
                }

                that.initAxis();
                that.renderData();
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

        let enableSA = false;
        let yS = this.renderSettings.yAxis[yPos];
        if(this.enableSubYAxis !== false){
            if(this.enableSubYAxis.indexOf(yS[0])!==-1){
                enableSA = true;
            }
        }

        if(enableSA && orientation === 'left'){

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
                that.initAxis();
                that.resize(false);
                that.renderData();
                that.createAxisLabels();
                that.emit('axisChange');
            }, false);

            subYParameters.passedElement.addEventListener('removeItem', function(event) {
                let addYT = that.renderSettings.additionalYTicks;
                let index = addYT[yPos].indexOf(event.detail.value);
                if(index!==-1){
                    addYT[yPos].splice(index, 1);
                    that.initAxis();
                    that.resize(false);
                    that.renderData();
                    that.createAxisLabels();
                    that.emit('axisChange');
                }
            },false);
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
                let res = xChoices.filter(function(ch) {
                  return ch.value === comKey;
                });
                if(res.length === 0){
                    xChoices.push({value: comKey, label: comKey});
                    if(this.renderSettings.xAxis === comKey){
                        xChoices[xChoices.length-1].selected = true;
                    }
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
                    for (let i = 0; i < xChoices.length; i++) {
                        if(sharPars.indexOf(xChoices[i].value)!==-1){
                            xChoices[i].selected = true;
                        }
                    }
                }
            } else if(this.renderSettings.yAxis.length > 1){
                xChoices = [];
                for (let key in this.renderSettings.sharedParameters){
                    // Check if related keys available in data
                    let allAvailable = true;
                    for (let sp = 0; sp < this.renderSettings.sharedParameters[key].length; sp++) {
                        let currpar = this.renderSettings.sharedParameters[key][sp];

                        // Check if shared parameter is a combined parameter
                        if(comPars.hasOwnProperty(currpar)){
                            let currComb = comPars[currpar];
                            let allComAv = true;
                            for(let ci=0; ci<currComb.length; ci++){
                                if(!this.data.hasOwnProperty(currComb[ci])){
                                    allComAv = false;
                                }
                            }
                            if(!allComAv){
                                allAvailable = false;
                            }
                        } else if(!this.data.hasOwnProperty(currpar)){
                            // If not check if parameter is in data
                            allAvailable = false;
                        }
                        
                    }
                    if(allAvailable){
                        let res = xChoices.filter(function(ch) {
                          return ch.value === key;
                        });
                        if(res.length === 0){
                            xChoices.push({value: key, label: key});
                            if(this.renderSettings.xAxis === key){
                                xChoices[xChoices.length-1].selected = true;
                            }
                        }
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

                    yChoices.push({
                        value: key,
                        label: key.replace(this.labelReplace, ' ')
                    });
                    y2Choices.push({
                        value: key,
                        label: key.replace(this.labelReplace, ' ')
                    });

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
                    let curK = comPars[comKey][par];
                    if(!this.data.hasOwnProperty(curK)){
                        includePar = false;
                    }
                    // Check for renderGroups
                    if(this.renderSettings.renderGroups && this.renderSettings.groups){
                        let rGroup = this.renderSettings.groups[yPos];
                        if(this.renderSettings.renderGroups[rGroup].parameters.indexOf(curK) === -1){
                            includePar = false;
                        }
                    }
                }

                if(includePar){
                    let res = yChoices.filter(function(ch) {
                      return ch.value === comKey;
                    });
                    if(res.length === 0){
                        yChoices.push({
                            value: comKey,
                            label: comKey.replace(this.labelReplace, ' ')
                        });
                        if(currYAxis.indexOf(comKey)!==-1){
                            yChoices[yChoices.length-1].selected = true;
                            y2Choices.pop();
                        }
                    }
                    res = y2Choices.filter(function(ch) {
                      return ch.value === comKey;
                    });
                    if(res.length === 0){
                        y2Choices.push({
                            value: comKey,
                            label: comKey.replace(this.labelReplace, ' ')
                        });
                        // Add selected attribute also to y2 axis selections
                        if(currY2Axis.indexOf(comKey)!==-1){
                            y2Choices[y2Choices.length-1].selected = true;
                            yChoices.pop();
                        }
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
        if(Array.isArray(this.renderSettings.xAxis)){
            xLabel = this.renderSettings.xAxis.join();
        }

        let currEl;
        let uom;
        if(this.dataSettings.hasOwnProperty(xLabel) 
            && this.dataSettings[xLabel].hasOwnProperty('uom')
            && this.dataSettings[xLabel].uom !== null){
            uom = this.dataSettings[xLabel].uom;
        } else {
            // Check if parameter is part of a combined
            // parameter if yes use uom of original
            if(this.renderSettings.hasOwnProperty('combinedParameters')){
                for(let cpkey in this.renderSettings.combinedParameters){
                    if(cpkey === xLabel){
                        currEl = this.renderSettings.combinedParameters[cpkey][0];
                        if(this.dataSettings.hasOwnProperty(currEl) &&
                           this.dataSettings[currEl].hasOwnProperty('uom') &&
                           this.dataSettings[currEl].uom !== null ){
                            uom = this.dataSettings[currEl].uom;
                        }
                    }
                }
            }
        }
        // Check for modified uom
        if(this.dataSettings.hasOwnProperty(xLabel) 
            && this.dataSettings[xLabel].hasOwnProperty('modifiedUOM')
            && this.dataSettings[xLabel].modifiedUOM !== null){
            uom = this.dataSettings[xLabel].modifiedUOM;
        } else {
            // Check if parameter is part of a combined
            // parameter if yes use uom of original
            if(this.renderSettings.hasOwnProperty('combinedParameters')){
                for(let cpkey in this.renderSettings.combinedParameters){
                    if(cpkey === xLabel){
                        currEl = this.renderSettings.combinedParameters[cpkey][0];
                        if(this.dataSettings.hasOwnProperty(currEl) &&
                           this.dataSettings[currEl].hasOwnProperty('modifiedUOM') &&
                           this.dataSettings[currEl].modifiedUOM !== null ){
                            uom = this.dataSettings[currEl].modifiedUOM;
                        }
                    }
                }
            }
        }

        if(this.xAxisLabel){
            xLabel = this.xAxisLabel;
        } else if(typeof uom !== 'undefined'){
            xLabel+=' ['+uom+']';
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
            .text(xLabel.replace(this.labelReplace, ' '));

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

        let xSettingParameters = new Choices(this.el.select('#xScaleChoices').node(), {
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
                that.el.select('.xAxisLabel.axisLabel')
                    .text(this.value.replace(this.labelReplace, ' '));
                that.xAxisLabel = this.value;
                that.emit('axisChange');
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
                    that.initAxis();
                    that.resize(false);
                    that.renderData();
                    that.createAxisLabels();
                    that.emit('axisChange');
                }, false);

                subXParameters.passedElement.addEventListener('removeItem', function(event) {
                    let index = that.renderSettings.additionalXTicks.indexOf(event.detail.value);
                    if(index!==-1){
                        that.renderSettings.additionalXTicks.splice(index, 1);
                        that.initAxis();
                        that.resize(false);
                        that.renderData();
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
                    .text(
                        this.renderSettings.additionalXTicks[i]
                            .replace(this.labelReplace, ' ')
                    );
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
                            .text(aYT[i][j].replace(this.labelReplace, ' '));
                    }
                }
            }
        }

        d3.selectAll('.axisLabel').attr('font-size', this.defaultLabelSize+'px');
        d3.selectAll('.svgaxisLabel').attr('font-size', this.defaultLabelSize+'px');
    }

    createColorScale(id, index, yPos){

        let innerHeight = (this.height/this.renderSettings.yAxis.length)-this.separation;
        let yOffset = (innerHeight+this.separation) * yPos;
        let width = 100;
        // Ther are some situations where the object is not initialiezed 
        // completely and size can be 0 or negative, this should prevent this
        if(innerHeight<=0){
            innerHeight = 100;
        }

        let csOffset = this.margin.right/2 + this.marginY2Offset + width/2 + width*index;

        let g = this.el.select('svg').select('g').append("g")
            .attr('id', ('colorscale_'+id))
            .attr("class", "color axis")
            .style('pointer-events', 'all')
            .attr('transform', 
                'translate(' + (this.width+csOffset) + ','+yOffset+')'
            );

        // Check to see if we create a discrete or linear colorscale
        if(this.dataSettings[id].hasOwnProperty('csDiscrete') && this.dataSettings[id].csDiscrete ){
            // Check if colors are already calculated
            let dCS = this.discreteColorScales[id];
            if(this.discreteColorScales.hasOwnProperty(id)) {
                let csIds = Object.keys(dCS); 
                let minValue = d3.min(csIds.map(Number));
                let topOffset = 35;

                if(csIds.length>0) {

                    for(let co=0;co<csIds.length; co++){
                        g.append('text')
                            .text(Number(csIds[co])-minValue)
                            .style('font-size', '0.9em')
                            .attr('transform', 'translate('+
                                (-44+(Math.floor(co*11/innerHeight))*32) +','
                                 + ( (co*11%innerHeight)+topOffset ) + ')'
                            );
                        g.append('rect')
                            .attr('fill', '#'+ CP.RGB2HEX(
                                    dCS[csIds[co]].map(function(c){
                                        return Math.round(c*255);
                                    })
                                )
                            )
                            .attr('width', '10px')
                            .attr('height', '10px')
                            .attr('transform', 'translate('+
                                (-55+(Math.floor(co*11/innerHeight))*32) +','
                                 + ( (co*11%innerHeight)-9+topOffset ) + ')'
                            );
                    }
                }
                g.append('text')
                    .attr('text-anchor', 'middle')
                    .attr('transform', 'translate(' + (0) + ' ,'+(-2)+')')
                    .text(id.replace(this.labelReplace, ' '));
                g.append('text')
                    .attr('text-anchor', 'middle')
                    .attr('transform', 'translate(' + (0) + ' ,'+(12)+')')
                    .attr('font-size', '0.9em')
                    .text('measurement offset:');
                g.append('text')
                    .attr('text-anchor', 'middle')
                    .attr('transform', 'translate(' + (0) + ' ,'+(25)+')')
                    .attr('font-size', '0.9em')
                    .text(minValue);
            }

        } else {

            let ds = this.dataSettings[id];
            let dataRange = [0,1];

            if(ds.hasOwnProperty('extent')){
                dataRange = ds.extent;
            }

            let colorAxisScale = d3.scale.linear();

            if(this.checkTimeScale(id)){
                colorAxisScale = d3.time.scale.utc();
            }

            if(this.dataSettings[id].hasOwnProperty('logarithmic')
                && this.dataSettings[id].logarithmic){
                colorAxisScale = d3.scale.log();
            }

            colorAxisScale.domain(dataRange);
            colorAxisScale.range([innerHeight, 0]);


            let colorAxis = d3.svg.axis()
                .orient("right")
                .tickSize(5)
                .scale(colorAxisScale);

            let csformat;
            if(this.dataSettings[id].hasOwnProperty('logarithmic')
                && this.dataSettings[id].logarithmic){
                colorAxis.ticks(0, '0.0e');
                //csformat = d3.format('e');
            } else if(this.colorAxisTickFormat === 'customSc'){
                csformat = u.customScientificTickFormat;
            } else if(this.colorAxisTickFormat === 'customExp'){
                csformat = u.customExponentTickFormat;
            } else {
                csformat = d3.format(this.filterAxisTickFormat);
            }
            colorAxis.tickFormat(csformat);
            
            g.call(colorAxis);

            // Check if parameter has specific colorscale configured
            let cs = 'viridis';
            let cA = this.dataSettings[id];
            if (cA && cA.hasOwnProperty('colorscale')){
                cs = cA.colorscale;
            }

            // If current cs not equal to the set in the batchdrawe update cs
            if(cs !== this.batchDrawer.csName){
                this.batchDrawer.setColorScale(cs);
            }
            let image = this.batchDrawer.getColorScaleImage().toDataURL("image/jpg");

            g.append("image")
                .attr("class", "colorscaleimage")
                .attr("width",  innerHeight)
                .attr("height", 20)
                .attr("transform", "translate(" + (-25) + " ,"+(innerHeight)+") rotate(270)")
                .attr("preserveAspectRatio", "none")
                .attr("xlink:href", image);

            let label = id;

            let currEl;
            let uom;
            if(this.dataSettings.hasOwnProperty(id) 
               && this.dataSettings[id].hasOwnProperty('uom')
               && this.dataSettings[id].uom !== null){
                uom = this.dataSettings[id].uom;
            } else {
                // Check if parameter is part of a combined
                // parameter if yes use uom of original
                if(this.renderSettings.hasOwnProperty('combinedParameters')){
                    for(let cpkey in this.renderSettings.combinedParameters){
                        if(cpkey === id){
                            currEl = this.renderSettings.combinedParameters[cpkey][0];
                            if(this.dataSettings.hasOwnProperty(currEl) &&
                               this.dataSettings[currEl].hasOwnProperty('uom') &&
                               this.dataSettings[currEl].uom !== null ){
                                uom = this.dataSettings[currEl].uom;
                            }
                        }
                    }
                }
            }
            // Check for modified UOM
            if(this.dataSettings.hasOwnProperty(id) 
               && this.dataSettings[id].hasOwnProperty('modifiedUOM')
               && this.dataSettings[id].modifiedUOM !== null){
                uom = this.dataSettings[id].modifiedUOM;
            } else {
                // Check if parameter is part of a combined
                // parameter if yes use uom of original
                if(this.renderSettings.hasOwnProperty('combinedParameters')){
                    for(let cpkey in this.renderSettings.combinedParameters){
                        if(cpkey === id){
                            currEl = this.renderSettings.combinedParameters[cpkey][0];
                            if(this.dataSettings.hasOwnProperty(currEl) &&
                               this.dataSettings[currEl].hasOwnProperty('modifiedUOM') &&
                               this.dataSettings[currEl].modifiedUOM !== null ){
                                uom = this.dataSettings[currEl].modifiedUOM;
                            }
                        }
                    }
                }
            }

            if(typeof uom !== 'undefined'){
                label += ' ['+uom+'] ';
            }

            g.append('text')
                .attr('text-anchor', 'middle')
                .attr('transform', 'translate(' + 66 + ' ,'+(innerHeight/2)+') rotate(270)')
                .text(label.replace(this.labelReplace, ' '));

            let csZoomEvent = ()=>{
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
                    .attr('class', 'modifyAxisIcon')
                    .text('✐')
                    .style('font-size', '1.7em')
                    .attr('transform', 'translate(-' + 45 + ' ,' + 0 + ') rotate(' + 90 + ')')
                    .on('click', function (){
                        let evtx = d3.event.layerX;
                        let evty = d3.event.layerY; 
                        this.createAxisForms(
                            colorAxis, id, g, evtx, evty, csZoom, 'right'
                        );
                    }.bind(this))
                    .append('title').text('Edit axis range');
            }
        }
    }
    
    createAxisForms(axis, parameterid, g, evtx, evty, zoom, openposition){
        // takes care of positioning and defining functions of axis edit forms
        // to pre-fill forms
        let extent = axis.scale().domain();
        // offset of form from the click event position
        let formYOffset = 20;
        let formXOffset = 2;

        if(openposition === 'left'){
            formXOffset = -80;
        }
        if(openposition === 'middleleft'){
            formYOffset = 0;
            formXOffset = -100;
        }

        if(!d3.selectAll('.rangeEdit').empty()){
            // If rangeedit open just close / remove it when clicking it again
            // and skip the rest
            d3.selectAll('.rangeEdit').remove();
            return;
        }

        // Cleanup
        d3.selectAll('.rangeEdit').remove();

         // range edit forms 
        this.el.append('input')
            .attr('class', 'rangeEdit')
            .attr('id', 'rangeEditMax')
            .attr('type', 'text')
            .attr('size', 7);
        this.el.append('input')
            .attr('class', 'rangeEdit')
            .attr('id', 'rangeEditMin')
            .attr('type', 'text')
            .attr('size', 7);
        this.el.append('input')
            .attr('class', 'rangeEdit')
            .attr('id', 'rangeEditCancel')
            .attr('type', 'button')
            .attr('value', '✕');
        this.el.append('input')
            .attr('class', 'rangeEdit')
            .attr('id', 'rangeEditConfirm')
            .attr('type', 'button')
            .attr('value', '✔');


        d3.selectAll('.rangeEdit')
            .classed('hidden', false);

        d3.select('#rangeEditMax')
            .property('value', extent[1].toFixed(4))
            .style('top', evty + formYOffset  + 'px')
            .style('left', evtx + formXOffset + 'px')
            .node()
            .focus();
        d3.select('#rangeEditMax')
            .node()
            .select();

        let formMaxPos = d3.select('#rangeEditMax').node().getBoundingClientRect();

        d3.select('#rangeEditMin')
            .property('value', extent[0].toFixed(4))
            .style('top', evty + formYOffset + formMaxPos.height + 5 + 'px')
            .style('left', evtx + formXOffset + 'px')

        let formMinPos = d3.select('#rangeEditMin').node().getBoundingClientRect();

        d3.selectAll('#rangeEditMax, #rangeEditMin')
            .on('keypress', function(){
                // confirm forms on enter
                if(d3.event.keyCode === 13){
                    this.updateAxis(axis, g, zoom, parameterid);
                }
            }.bind(this))

        d3.select('#rangeEditConfirm')
            .style('top', evty + formYOffset + formMaxPos.height + 5 +'px')
            .style('left', evtx + formXOffset + formMinPos.width + 'px')
            .on('click', function(){
                this.updateAxis(axis, g, zoom, parameterid);
            }.bind(this));


        d3.select('#rangeEditCancel')
            .style('top', evty +  formYOffset + 'px')
            .style('left', evtx + formXOffset + formMaxPos.width + 'px')
            .on('click', function(){
                d3.selectAll('.rangeEdit').remove();
            });
    }

    addColorScale(id, colors, ranges){
        this.batchDrawer.addColorScale(id, colors, ranges);
        if(this.colorscales.indexOf(id) === -1){
            this.colorscales.push(id);
        }
    }

    updateAxis (axis, g, zoom, parameterid) {
        let min = Number(d3.select('#rangeEditMin').property('value'));
        let max = Number(d3.select('#rangeEditMax').property('value'));
        //checks for invalid values
        if (!isNaN(min) && !isNaN(max)){
            // if user reversed order, fix it
            let newDataDomain = (min < max) ? [min, max] : [max, min];

            axis.scale().domain(newDataDomain);
            g.call(axis);
            zoom.y(axis.scale());
            if(parameterid){
                this.dataSettings[parameterid].extent = axis.scale().domain();
            }
            // Go through all axis and save the extent if they are locked
            if (this.allowLockingAxisScale) {
                for (let yPos = 0; yPos < this.renderSettings.yAxis.length; yPos++) {
                    if (this.renderSettings.hasOwnProperty('yAxisLocked')
                        && this.renderSettings.yAxisLocked.length >= yPos
                        && this.renderSettings.yAxisLocked[yPos]){
                        this.renderSettings.yAxisExtent[yPos] = this.yScale[yPos].domain();
                    }
                    if (this.renderSettings.hasOwnProperty('y2AxisLocked')
                        && this.renderSettings.y2AxisLocked.length >= yPos
                        && this.renderSettings.y2AxisLocked[yPos]){
                        this.renderSettings.y2AxisExtent[yPos] = this.y2Scale[yPos].domain();
                    }
                }
            }
            this.emit('axisExtentChanged');
            this.addTimeInformation();
            this.breakTicks();
            this.renderData(false);
            this.el.selectAll('.rangeEdit').remove();

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
            .attr('width', this.width-20)
            .attr('height', (this.margin.bottom+this.subAxisMarginX))
            .attr('transform', 'translate(' + 0 + ',' + (this.height) + ')')
            .attr('fill', 'none')
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
                        this.renderSettings.reversedYAxis.push(false);
                        this.renderSettings.reversedY2Axis.push(false);
                        this.renderSettings.yAxisLocked.push(false);
                        this.renderSettings.y2AxisLocked.push(false);
                        this.renderSettings.yAxisExtent.push([]);
                        this.renderSettings.y2AxisExtent.push([]);

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
                                for (let shK in shPars){
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

        if(this.el.select('#globalSettings').empty()){

            let con = this.el.append('div')
                .attr('id', 'globalSettingsContainer')
                .style('left', (this.width/2)+this.margin.left-75+'px')
                .style('width', '150px')
                .style('top', (this.margin.top)+1+'px');

            con.append('div')
                .attr('class', 'labelClose cross')
                .on('click', ()=>{
                    this.el.select('#globalSettingsContainer').style('display', 'none');
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
                        this.el.select("#showFilteredDataOption").property("checked");
                    this.renderData(false);
                });

            con.append('label')
                .attr('for', 'connectFilteredPoints')
                .text('Line connect filtered');

            con.append('input')
                .attr('id', 'connectFilteredPoints')
                .attr('type', 'checkbox')
                .property('checked', this.connectFilteredPoints)
                .on('input', ()=>{
                    this.connectFilteredPoints = 
                        this.el.select("#connectFilteredPoints").property("checked");
                    this.renderData(false);
                });

            con.append('label')
                .attr('for', 'labelAllignment')
                .text('Label allig.');

            var that = this;
            let labselect = con.append('select')
                .attr('id', 'labelAllignment')
                .on('change', function(){
                    that.labelAllignment = this.value;
                    that.updateInfoBoxes();
                });

            labselect.selectAll('option')
                .data(['left', 'center', 'right']).enter()
                .append('option')
                    .text(function (d) { return d; })
                    .property('selected', (d)=>{return d===this.labelAllignment;});

            this.el.append('div')
                .attr('id', 'globalSettings')
                .style('left', (this.width/2)+this.margin.left-40+'px')
                .text('Config')
                .style('top', (this.margin.top-20)+'px')
                .on('click', ()=>{
                    let vis = this.el.select('#globalSettingsContainer').style('display');
                    if (vis === 'block'){
                         this.el.select('#globalSettingsContainer').style('display', 'none');
                    } else {
                        this.el.select('#globalSettingsContainer').style('display', 'block');
                        this.el.select('#labelFontSize').node().focus();
                        this.el.select('#labelFontSize').node().select();
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
                    .style('left', '5px')
                    .style('top', (offsetY+this.margin.top)+3+'px')
                    .on('click', ()=>{

                        let renSett = this.renderSettings;
                        let index = Number(d3.select(d3.event.target).attr('data-index'));

                        renSett.yAxis.splice(index, 1);
                        renSett.y2Axis.splice(index, 1);
                        // Remove color settings from left side
                        renSett.colorAxis.splice(index, 1);
                        renSett.colorAxis2.splice(index, 1);

                        renSett.reversedYAxis.splice(index, 1);
                        renSett.reversedY2Axis.splice(index, 1);

                        renSett.yAxisLocked.splice(index, 1);
                        renSett.y2AxisLocked.splice(index, 1);
                        renSett.yAxisExtent.splice(index, 1);
                        renSett.y2AxisExtent.splice(index, 1);

                        this.logY.splice(index,1);
                        this.logY2.splice(index,1);

                        let addYT = this.renderSettings.additionalYTicks; 
                        addYT.splice(index,1);

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

                const shiftParameter = (parameter, index, direction) => {
                    let rS = this.renderSettings;
                    const tmpVar = rS[parameter][index];
                    rS[parameter][index] = rS[parameter][index+direction];
                    rS[parameter][index+direction] = tmpVar;
                }
                // Add move up arrow 
                if(plotY>0){
                    this.el.append('div')
                        .attr('class', 'arrowChangePlot up')
                        .html('&#9650;')
                        .attr('data-index', plotY)
                        .style('left', '5px')
                        .style('top', (offsetY+this.margin.top+15)+'px')
                        .on('click', ()=>{
                            let index = Number(d3.select(d3.event.target).attr('data-index'));
                            let rS = this.renderSettings;
                            shiftParameter('yAxis', index, -1);
                            shiftParameter('y2Axis', index, -1);
                            shiftParameter('colorAxis', index, -1);
                            shiftParameter('colorAxis2', index, -1);
                            shiftParameter('additionalYTicks', index, -1);
                            shiftParameter('reversedYAxis', index, -1);
                            shiftParameter('reversedY2Axis', index, -1);
                            shiftParameter('yAxisLocked', index, -1);
                            shiftParameter('y2AxisLocked', index, -1);
                            shiftParameter('yAxisExtent', index, -1);
                            shiftParameter('y2AxisExtent', index, -1);
                            const tmpLogY = this.logY[index];
                            this.logY[index] = this.logY[index-1];
                            this.logY[index-1] = tmpLogY;
                            const tmpLogY2 = this.logY2[index];
                            this.logY2[index] = this.logY2[index-1];
                            this.logY2[index-1] = tmpLogY2;

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
                    let addoff = 40;
                    if(plotY === 0){
                        addoff = 15;
                    }
                    this.el.append('div')
                        .attr('class', 'arrowChangePlot down')
                        .html('&#9660;')
                        .attr('data-index', plotY)
                        .style('left', '5px')
                        .style('top', (offsetY+this.margin.top+addoff)+'px')
                        .on('click', ()=>{

                            let index = Number(d3.select(d3.event.target).attr('data-index'));
                            let rS = this.renderSettings;

                            shiftParameter('yAxis', index, 1);
                            shiftParameter('y2Axis', index, 1);
                            shiftParameter('colorAxis', index, 1);
                            shiftParameter('colorAxis2', index, 1);
                            shiftParameter('additionalYTicks', index, 1);
                            shiftParameter('reversedYAxis', index, 1);
                            shiftParameter('reversedY2Axis', index, 1);
                            shiftParameter('yAxisLocked', index, 1);
                            shiftParameter('y2AxisLocked', index, 1);
                            shiftParameter('yAxisExtent', index, 1);
                            shiftParameter('y2AxisExtent', index, 1);
                            const tmpLogY = this.logY[index];
                            this.logY[index] = this.logY[index+1];
                            this.logY[index+1] = tmpLogY;
                            const tmpLogY2 = this.logY2[index];
                            this.logY2[index] = this.logY2[index+1];
                            this.logY2[index+1] = tmpLogY2;

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
                .attr('height', currHeight-20 )
                .attr(
                    'transform',
                    'translate(' + -(this.margin.left+this.subAxisMarginY) + 
                    ',' + ((heighChunk*plotY)+20) + ')'
                )
                .attr('fill', 'none')
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
                .attr('height', currHeight-20 )
                .attr(
                    'transform',
                    'translate(' + this.width + 
                    ',' + ((heighChunk*plotY)+20) + ')'
                )
                .attr('fill', 'none')
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
        for (let i = 0; i < keys.length; i++) {

            // If the parameter is multi-Id we initialize it differnetly
            if (this.renderSettings.hasOwnProperty('dataIdentifier')){
                let parIds = this.renderSettings.dataIdentifier.identifiers;
                if(!this.dataSettings.hasOwnProperty(keys[i]) ){
                    this.dataSettings[keys[i]] = {};
                }
                for (let j = 0; j < parIds.length; j++) {
                    if(!this.dataSettings[keys[i]].hasOwnProperty(parIds[j])) {
                        let defaultValues = {
                            symbol: 'circle',
                            color: [Math.random(), Math.random(), Math.random()],
                            alpha: this.defaultAlpha
                        }
                        // If there are already style properties defined we pass
                        // them to the created data identifier properties
                        const paramProps = [
                            'alpha', 'color', 'symbol', 'lineConnect',
                            'colorscale', 'regression', 'scaleType',
                            'errorParameter', 'errorDisplayed', 'size',
                        ];
                        // Special check for error parameter
                        if(this.dataSettings[keys[i]].hasOwnProperty('errorParameter')
                           && !this.dataSettings[keys[i]].hasOwnProperty('errorDisplayed')) {
                            this.dataSettings[keys[i]].errorDisplayed = true;
                        }
                        paramProps.forEach(prop => {
                            if(this.dataSettings[keys[i]].hasOwnProperty(prop)) {
                                defaultValues[prop] = this.dataSettings[keys[i]][prop];
                            }
                        })
                        this.dataSettings[keys[i]][parIds[j]] = defaultValues;
                    }
                }

            } else {
                if(!this.dataSettings.hasOwnProperty(keys[i])) {
                    this.dataSettings[keys[i]] = {
                        uom: null,
                        color: [Math.random(), Math.random(), Math.random()],
                        alpha: this.defaultAlpha
                    };
                } else {
                    if(!this.dataSettings[keys[i]].hasOwnProperty('color')){
                        this.dataSettings[keys[i]].color = [
                            Math.random(), Math.random(), Math.random()
                        ];
                    }
                    if(!this.dataSettings[keys[i]].hasOwnProperty('uom')){
                        this.dataSettings[keys[i]].uom = null;
                    }
                    if(!this.dataSettings[keys[i]].hasOwnProperty('alpha')){
                        this.dataSettings[keys[i]].alpha = this.defaultAlpha;
                    }
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


    addGroupArrows(values){
        this.activeArrows = true;
        this.arrowValues = values;
    }

    removeGroupArrows(){
        this.activeArrows = false;
        this.arrowValues = null;
    }

    /**
    * Load overlay data from data object
    * @param {Object} data Data object containing parameter identifier as keys and 
             arrays of values as corresponding parameter. {'parId1': [1, 2, 3], 
             'parId2': [0.6, 0.1, 3.2]}. In order to be correctly visualized 
             the overlay data needs to be described as overlaySettings object 
             part of the dataSettings
    */
    loadOverlayData(overlayData){
        this.overlayData = overlayData;
        // Check if there is no loaded data if not it does
        // not really make sense to call render here
        if (typeof this.data === 'object' && Object.keys(this.data).length !== 0) {
            this.createParameterInfo();
            this.renderData(false);
        }
    }

    /**
    * Load data from data object
    * @param {Object} data Data object containing parameter identifier as keys and 
             arrays of values as corresponding parameter. {'parId1': [1, 2, 3], 
             'parId2': [0.6, 0.1, 3.2]}
    */
    loadData(data){
        
        this.startTiming('loadData');

        // Make sure default values are loaded correctly if rendersettings were
        // changed
        if( !this.renderSettings.hasOwnProperty('reversedYAxis') || 
            !this.renderSettings.hasOwnProperty('reversedY2Axis') ||
            (this.renderSettings.yAxis.length !== this.renderSettings.reversedYAxis.length) ||
            (this.renderSettings.yAxis.length !== this.renderSettings.reversedY2Axis.length)){
            let rev = [];
            for (let cc = 0; cc < this.renderSettings.yAxis.length; cc++) {
                rev.push(false);
            }
            this.renderSettings.reversedYAxis = rev;
            this.renderSettings.reversedY2Axis = rev.slice();
        }

        this.data = {};
        for (let dk in data){
            // Ignore keys added to ignore list
            let ignoreKey = false;
            for (let i = 0; i < this.ignoreParameters.length; i++) {
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
        }

        this.timeScales = [];

        this.renderSettings.combinedParameters = defaultFor(
            this.renderSettings.combinedParameters, {}
        );

        this.recalculateBufferSize();

        function onlyUnique(value, index, self) { 
            return self.indexOf(value) === index;
        }

        // Cleanup of previous generated data
        for (let k in this.discreteColorScales){
            delete this.discreteColorScales[k];
        }

        // Check for special formatting of data
        let ds = this.dataSettings;
        for (let key in ds) {

            // Check if we need to precalculate discrete colorscale
            if(ds.hasOwnProperty(key) && 
               ds[key].hasOwnProperty('csDiscrete') &&
               ds[key].csDiscrete) {
                if(!this.discreteColorScales.hasOwnProperty(key) && 
                    this.data.hasOwnProperty(key)){
                    // Generate discrete colorscale as object key value
                    let dsC = {};

                    let uniqueValues = this.data[key].filter(onlyUnique);
                    for(let c=0;c<uniqueValues.length;c++){
                        let col = u.getdiscreteColor();
                        dsC[uniqueValues[c]] = [
                            col[0]/255, col[1]/255, col[2]/255, 1.0
                        ];
                    }
                    this.discreteColorScales[key] = dsC;
                }
            }
            
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
            this.resize_update(false);
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
        for (let i = selection.length - 1; i >= 0; i--) {
            // Check if null value has been defined
            if(this.dataSettings.hasOwnProperty(selection[i]) &&
               this.dataSettings[selection[i]].hasOwnProperty('nullValue')){
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

        let tickformat;
        if(this.defaultAxisTickFormat === 'customSc'){
            tickformat = u.customScientificTickFormat;
        } else if(this.defaultAxisTickFormat === 'customExp'){
            tickformat = u.customExponentTickFormat;
        } else {
            tickformat = d3.format(this.defaultAxisTickFormat);
        }
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
        } else if(enableSubAxis && (enableSubAxis === parameter)){
            // Find out if parameter is shared or combined parameter
            let rS = this.renderSettings;
            let usedPar = parameter;

            if(rS.renderGroups !== false && 
               rS.groups!== false && 
               rS.sharedParameters !== false && 
               rS.sharedParameters.hasOwnProperty(parameter)){
                let pars = rS.sharedParameters[parameter]
                // Take first item of shared par
                usedPar = pars[0];
            }

            // See if either shared or not shared parameter is from a group
            if(rS.combinedParameters.hasOwnProperty(usedPar)){
                usedPar = rS.combinedParameters[usedPar][0];
            }

            axisformat = this.customSubtickFormat.bind(
                this, this.data[usedPar], additionalTicks
            );
        } else if(this.checkTimeScale(parameter)){
            axisformat = u.getCustomUTCTimeTickFormat();
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

        this.el.selectAll('.parameterInfo').remove();

        let xExtent;
        let rs = this.renderSettings;

        // "Flatten selections"
        let xSelection = [];

        if(this.enableSubXAxis!==false && typeof(this.renderSettings.additionalXTicks) !== 'undefined'){
            this.subAxisMarginX = 40*this.renderSettings.additionalXTicks.length;
        }
        if(this.enableSubYAxis && typeof(this.renderSettings.additionalYTicks) !== 'undefined') {
            let addYT = this.renderSettings.additionalYTicks;
            let maxL = 0;
            for(let i=0; i<addYT.length; i++){
                maxL = Math.max(maxL, addYT[i].length);
            }
            this.subAxisMarginY = 80*maxL;
        }

        if(this.renderSettings.hasOwnProperty('renderGroups') && 
            this.renderSettings.renderGroups !== false && 
            this.renderSettings.groups!== false && 
            this.renderSettings.sharedParameters !== false && 
            this.renderSettings.sharedParameters.hasOwnProperty(this.renderSettings.xAxis)){

            if(this.fixedXDomain !== undefined){
                xExtent = this.fixedXDomain;
            } else {
                let sharedPars = this.renderSettings.sharedParameters[this.renderSettings.xAxis];
                let rs = this.renderSettings;
                // Check for group parameters inside the shared parameters
                for (let i = 0; i < sharedPars.length; i++) {
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

            let hoverInfoSeparator = this.el.select(this.nsId+'hoverClipBox');
            hoverInfoSeparator.selectAll('rect').remove();

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
                hoverInfoSeparator.append('rect')
                    .attr('fill', 'none')
                    .attr('y', 0)
                    .attr('width', this.width)
                    .attr('height', heighChunk-this.separation)
                    .attr(
                        'transform',
                        'translate(0,'+((heighChunk*yy))+')'
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

        // TODO: Allow axis scale edit for time selection
        if(!this.checkTimeScale(this.renderSettings.xAxis)){
            this.xAxisSvg.append('text')
                .attr('class', 'modifyAxisIcon xaxis')
                .text('✐')
                .style('font-size', '1.7em')
                .attr('transform', 'translate(' + this.width + ' ,' + 20 + ') rotate(' + 180 + ')')
                .on('click', function (){
                    let evtx = d3.event.layerX;
                    let evty = d3.event.layerY; 
                    this.createAxisForms(
                        this.xAxis, null, this.xAxisSvg,
                        evtx, evty, this.xzoom, 'middleleft'
                    );
                }.bind(this))
                .append('title').text('Edit axis range');
        }


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
            if(this.renderSettings.hasOwnProperty('renderGroups') &&
                this.renderSettings.renderGroups !== false && 
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

                            for (let i = 0; i < currYAxis.length; i++) {

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
                                           newGroup.defaults.hasOwnProperty('colorAxis')){
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
                                } else {
                                    // We also check here for default colorscale
                                    if(newGroup.hasOwnProperty('defaults') && 
                                       newGroup.defaults.hasOwnProperty('colorAxis')){
                                        newColAxis.push(newGroup.defaults.colorAxis);
                                    } else {
                                        newColAxis.push(null);
                                    }
                                }
                            }

                            for (let i = 0; i < currY2Axis.length; i++) {
                                // Try to find equvalent parameter
                                if(currY2Axis[i] !== null){
                                    let tmpPar = currY2Axis[i].replace(prevGroup, groupKey);
                                    if(newGroupPars.indexOf(tmpPar)!==-1){
                                        newY2Axis.push(tmpPar);
                                        // Check for corresponding color
                                        if(currCol2Axis[i] !== null){
                                            let tmpCol = currCol2Axis[i].replace(prevGroup, groupKey);
                                            if(newGroupPars.indexOf(tmpCol)!==-1){
                                                newCol2Axis.push(tmpCol)
                                            } else {
                                                // If no colorscale equivalent found set to null
                                                newCol2Axis.push(null);
                                            }
                                        } else {
                                            newCol2Axis.push(null);
                                        }
                                    } else {
                                        // TODO
                                    }
                                }
                            }

                            // Check also x axis when we only have one plot
                            let newxPar;
                            if(that.renderSettings.yAxis.length === 1){
                                let xaxPar = that.renderSettings.xAxis;
                                if(Array.isArray(xaxPar)){
                                    xaxPar = xaxPar[0];
                                }
                                // Try to find equvalent parameter
                                let tmpPar = xaxPar.replace(prevGroup, groupKey);
                                if(newGroupPars.indexOf(tmpPar)!==-1){
                                    newxPar = tmpPar;
                                } else {
                                    // If not found check for defaults
                                    if(newGroup.hasOwnProperty('defaults') && 
                                       newGroup.defaults.hasOwnProperty('xAxis')){
                                        newxPar = newGroup.defaults.xAxis;
                                    } else {
                                        // If now default try to find closest match
                                        let selected = that.findClosestParameterMatch(
                                            xaxPar, newGroupPars
                                        );
                                        if(selected){
                                            newxPar = selected;
                                        }
                                    }
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
                                if(typeof newxPar !== 'undefined'){
                                    that.renderSettings.xAxis = newxPar;
                                }
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


            for (let h = 0; h < currYAxis.length; h++) {
                if(rs.combinedParameters.hasOwnProperty(currYAxis[h])){
                    ySelection = [].concat.apply([], rs.combinedParameters[currYAxis[h]]);
                } else {
                    ySelection.push(currYAxis[h]);
                }
            }

            for (let i = 0; i < currY2Axis.length; i++) {
                if(rs.combinedParameters.hasOwnProperty(currY2Axis[i])){
                    y2Selection = [].concat.apply([], rs.combinedParameters[currY2Axis[i]]);
                } else {
                    y2Selection.push(currY2Axis[i]);
                }
            }


            if (this.renderSettings.hasOwnProperty('yAxisLocked')
                && this.renderSettings.yAxisLocked.length >= yPos
                && this.renderSettings.yAxisLocked[yPos]
                && this.renderSettings.hasOwnProperty('yAxisExtent')
                && this.renderSettings.yAxisExtent.length >= yPos
                && this.renderSettings.yAxisExtent[yPos] !== null) {
                yExtent = this.renderSettings.yAxisExtent[yPos];
            } else {
                yExtent = this.calculateExtent(ySelection);
            }

            if (this.renderSettings.hasOwnProperty('y2AxisLocked')
                && this.renderSettings.y2AxisLocked.length >= yPos
                && this.renderSettings.y2AxisLocked[yPos]
                && this.renderSettings.hasOwnProperty('y2AxisExtent')
                && this.renderSettings.y2AxisExtent.length >= yPos
                && this.renderSettings.y2AxisExtent[yPos] !== null) {
                y2Extent = this.renderSettings.y2AxisExtent[yPos];
            } else {
                y2Extent = this.calculateExtent(y2Selection);
            }
            

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

            let yScaleType, y2ScaleType;
            // TODO: how to handle multiple different scale types
            // For now just check first object of scale
            
            this.yTimeScale = this.checkTimeScale(ySelection[0]);
            this.y2TimeScale = this.checkTimeScale(y2Selection[0]);

            yScaleType = getScale(this.yTimeScale);
            y2ScaleType = getScale(this.y2TimeScale);


            // Recalculate domain so that data is not directly at border
            if(!this.fixedSize){
                if(!this.allowLockingAxisScale
                    && this.renderSettings.hasOwnProperty('yAxisLocked')
                    && !this.renderSettings.yAxisLocked[yPos]) {
                    yExtent = calcExtent(
                        yExtent, yRange, this.yTimeScale, [0.02, 0.02]
                    );
                }
                if(!this.allowLockingAxisScale 
                    && this.renderSettings.hasOwnProperty('y2AxisLocked')
                    && !this.renderSettings.y2AxisLocked[yPos]) {
                    y2Extent = calcExtent(
                        y2Extent, y2Range, this.y2TimeScale, [0.02, 0.02]
                    );
                }
            }


            let scaleRange = [heighChunk-this.separation, 0];

            if(this.renderSettings.reversedYAxis[yPos]){
                scaleRange = [0, heighChunk-this.separation];
            }

            if(this.logY[yPos]){
                // if both positive or negative all fine else
                if(yExtent[0]<=0 && yExtent[1]>0){
                    yExtent[0] = 0.005;
                }
                if(yExtent[0]>=0 && yExtent[1]<0){
                    yExtent[0] = -0.005;
                }
                this.yScale.push(
                    d3.scale.log()
                        .domain(yExtent)
                        .range(scaleRange)
                );
            } else {
                this.yScale.push(
                    yScaleType
                        .domain(yExtent)
                        .range(scaleRange)
                );
            }

            let scaleRange2 = [heighChunk-this.separation, 0];

            if(this.renderSettings.reversedY2Axis[yPos]){
                scaleRange2 = [0, heighChunk-this.separation];
            }

            if(this.logY2[yPos]){
                // if both positive or negative all fine else
                if(y2Extent[0]<=0 && y2Extent[1]>0){
                    y2Extent[0] = 0.005;
                }
                if(y2Extent[0]>=0 && y2Extent[1]<0){
                    y2Extent[0] = -0.005;
                }
                this.y2Scale.push(
                    d3.scale.log()
                        .domain(y2Extent)
                        .range(scaleRange2)
                );
            } else {
                this.y2Scale.push(
                    y2ScaleType
                        .domain(y2Extent)
                        .range(scaleRange2)
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

            let enableSA = false;
            let parameter;
            if(this.enableSubYAxis !== false){
                if(this.enableSubYAxis.indexOf(yS[0])!==-1){
                    enableSA = true;
                    parameter = this.enableSubYAxis[
                        this.enableSubYAxis.indexOf(yS[0])
                    ];
                }
            }

            let addticks = null;
            if(this.renderSettings.hasOwnProperty('additionalYTicks') && 
                this.renderSettings.additionalYTicks.length >= yPos){
                addticks = this.renderSettings.additionalYTicks[yPos];
            }
            let yAxisformat = this.getAxisFormat(
                yS[0], parameter, addticks
            );

            if(this.logY.length>=yPos && this.logY[yPos]){
                this.yAxis[yPos].ticks(0, '0.0e');
            } else {
                this.yAxis[yPos].tickFormat(yAxisformat);
            }


            if(currYAxis.length > 0){
                let currSvgyAxis = this.svg.append('g')
                    .attr('class', 'y axis')
                    .attr(
                        'transform', 'translate(0,'+yPos*heighChunk+')'
                    )
                    .call(this.yAxis[yPos]);

                this.yAxisSvg.push(currSvgyAxis);

                if(!this.checkTimeScale(this.renderSettings.yAxis[0])){
                    currSvgyAxis.append('text')
                        .attr('class', 'modifyAxisIcon')
                        .text('✐')
                        .style('font-size', '1.7em')
                        .attr('transform', 'translate(-' + 65 + ' ,' + 0 + ') rotate(' + 90 + ')')
                        .on('click', function (){
                            let evtx = d3.event.layerX;
                            let evty = d3.event.layerY; 
                            this.createAxisForms(
                                this.yAxis[yPos], null, currSvgyAxis,
                                evtx, evty, this.yzoom[yPos], 'right'
                            );
                        }.bind(this))
                        .append('title').text('Edit axis range');
                }
                if(this.allowLockingAxisScale) {
                    if (this.renderSettings.hasOwnProperty('yAxisLocked')) {
                        const icon = this.renderSettings.yAxisLocked[yPos]
                            ? lockicon : unlockicon;
                        currSvgyAxis.append('image')
                            .attr('xlink:href', icon)
                            .attr('class', 'lockAxisIcon')
                            .attr('transform', 'translate(-' + 50 + ' ,' + 0 + ')')
                            .on('click', function (){
                                this.renderSettings.yAxisExtent[yPos] =
                                    this.yScale[yPos].domain();
                                this.renderSettings.yAxisLocked[yPos] = 
                                    !this.renderSettings.yAxisLocked[yPos];
                                this.initAxis();
                                if(!this.renderSettings.yAxisLocked[yPos]){
                                    // Axis range is recalculated data need to 
                                    // be re-rendered
                                    this.renderData();
                                }
                                this.emit('axisExtentChanged');
                            }.bind(this))
                            .append('title').text('Lock axis range');
                    }
                }
            } else {
                this.yAxisSvg.push(null);
            }

            // Creating additional axis for sub parameters
            if(this.renderSettings.hasOwnProperty('additionalYTicks')){
                let addYTicks = this.renderSettings.additionalYTicks[yPos];
                if(typeof addYTicks !== 'undefined'){
                    let currAddYAxis = [];
                    let currAddYAxisSVG = [];
                    for (let i = 0; i < addYTicks.length; i++) {

                        let currAxis = d3.svg.axis()
                                .scale(this.yScale[yPos])
                                .outerTickSize(5)
                                .orient('left')
                                .tickFormat(()=>{return '';});

                        currAddYAxis.push(currAxis);

                        currAddYAxisSVG.push(
                        this.svg.append('g')
                            .attr('class', 'y_add subaxis')
                            .attr(
                                'transform', 'translate(-'+((i*80)+80)+ ','+yPos*heighChunk+')'
                            )
                            .call(currAxis)
                        );
                    }
                    this.additionalYAxis.push(currAddYAxis);
                    this.addYAxisSvg.push(currAddYAxisSVG);
                }
            }


            this.y2Axis.push(
                d3.svg.axis()
                    .scale(this.y2Scale[yPos])
                    .innerTickSize(-this.width)
                    .outerTickSize(0)
                    .orient('right')
            );

            let y2S = this.renderSettings.y2Axis[yPos];
            let y2Axisformat = this.getAxisFormat(
                y2S[0], false, false
            );

            if(this.logY2.length>=yPos && this.logY2[yPos]){
                this.y2Axis[yPos].ticks(0, '0.0e');
            } else {
                this.y2Axis[yPos].tickFormat(y2Axisformat);
            }
            

            if(currY2Axis.length > 0){
                let currSvgy2Axis = this.svg.append('g')
                    .attr('class', 'y2 axis')
                    .attr(
                        'transform', 'translate('+this.width+','+yPos*heighChunk+')'
                    )
                    .call(this.y2Axis[yPos]);

                this.y2AxisSvg.push(currSvgy2Axis);

                if(!this.checkTimeScale(this.renderSettings.y2Axis[0])){
                    currSvgy2Axis.append('text')
                        .attr('class', 'modifyAxisIcon y2')
                        .text('✐')
                        .style('font-size', '1.7em')
                        .style('float', 'right')
                        .attr('transform', 'translate(' + (60) + ' ,' + 0 + ') rotate(' + 180 + ')')
                        .on('click', function (){
                            let evtx = d3.event.layerX;
                            let evty = d3.event.layerY; 
                            this.createAxisForms(
                                this.y2Axis[yPos], null, currSvgy2Axis,
                                evtx, evty, this.y2zoom[yPos], 'left'
                            );
                        }.bind(this))
                        .append('title').text('Edit axis range');
                }
                if(this.allowLockingAxisScale) {
                    if (this.renderSettings.hasOwnProperty('y2AxisLocked')) {
                        const icon = this.renderSettings.y2AxisLocked[yPos]
                            ? lockicon : unlockicon;
                        currSvgy2Axis.append('image')
                            .attr('xlink:href', icon)
                            .attr('class', 'lockAxisIcon')
                            .attr('transform', 'translate(' + 27 + ' ,' + 0 + ')')
                            .on('click', function (){
                                this.renderSettings.y2AxisExtent[yPos] =
                                    this.y2Scale[yPos].domain();
                                this.renderSettings.y2AxisLocked[yPos] = 
                                    !this.renderSettings.y2AxisLocked[yPos];
                                this.initAxis();
                                if(!this.renderSettings.y2AxisLocked[yPos]){
                                    // Axis range is recalculated data need to 
                                    // be re-rendered
                                    this.renderData();
                                }
                                this.emit('axisExtentChanged');
                            }.bind(this))
                            .append('title').text('Lock axis range');
                    }
                }
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

        // Go through all axis and save the extent if they are locked
        if (this.allowLockingAxisScale) {
            for (let yPos = 0; yPos < this.renderSettings.yAxis.length; yPos++) {
                if (this.renderSettings.hasOwnProperty('yAxisLocked')
                    && this.renderSettings.yAxisLocked.length >= yPos
                    && this.renderSettings.yAxisLocked[yPos]){
                    this.renderSettings.yAxisExtent[yPos] = this.yScale[yPos].domain();
                }
                if (this.renderSettings.hasOwnProperty('y2AxisLocked')
                    && this.renderSettings.y2AxisLocked.length >= yPos
                    && this.renderSettings.y2AxisLocked[yPos]){
                    this.renderSettings.y2AxisExtent[yPos] = this.y2Scale[yPos].domain();
                }
            }
        }
        this.emit('zoomUpdate');
    }

    onZoom() {
        // TODO: resetting of zooms is not necessary when not using debounce
        // but it breaks the interaction between different zoom objects
        // maybe there is a better way of doing this instead of resetting it
        if(!this.zoomActivity){
            this.zoom_update();
            this.renderData(true);
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
                        .attr('dy', '-53px')
                        .attr('dx', '-60px')
                        .attr("transform", "rotate(-90)")
                        .attr('class', 'start-date')
                        .text(function(d){return dateFormat(d);});
                    d3.select(yAx).selectAll('.tick:nth-last-of-type(2)')
                        .append('text')
                        .attr('dy', '-53px')
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
                    .text(word.replace(this.labelReplace, ' '));
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
                    .text(word.replace(this.labelReplace, ' '));
            }
        });
    }

    breakTicks() {

        // Make sure all text from ticks are shown
        this.el.selectAll('.y.axis>.tick text')
            .attr('display', 'block'); 
        // Hide top most y axis tick if they are to close to upper line to 
        // make sure enough space is available for buttons
        const topTicks = this.el.selectAll('.y.axis>.tick:last-of-type');
        topTicks.each(function(){
            let item = d3.select(this);
            let components = d3.transform(item.attr('transform'));
            if(components.translate[1] < 25) {
                item.select('text').attr('display', 'none');
            }
        });

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
                this.addYAxisSvg[i][j].call(this.additionalYAxis[i][j]);
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

        this.renderArrows();
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
                    c[0], c[1], c[2], c[3],
                    Number.MIN_SAFE_INTEGER
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
                        c[0], c[1], c[2], c[3],
                        Number.MIN_SAFE_INTEGER
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

                let filteredX = data[xAxRen].filter(filterFunc.bind(this));
                let filteredY = data[yAxRen].filter(filterFunc.bind(this));
                // remove possible filtered out values
                filteredX = filteredX.filter((d)=>{return !Number.isNaN(d);});
                filteredY = filteredY.filter((d)=>{return !Number.isNaN(d);});

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
                // remove possible filtered out values
                let xdata = data[xAxRen].filter((d)=>{return !Number.isNaN(d);});
                let ydata = data[yAxRen].filter((d)=>{return !Number.isNaN(d);});
                // TODO: Check for size mismatch?
                if(this.xTimeScale){
                    resultData = xdata
                        .map(function(d){return d.getTime();})
                        .zip(ydata);
                }else{
                    
                    resultData = xdata.zip(ydata);
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

        this.resize_update(debounce);
        this.createColorScales();
        this.createAxisLabels();
        this.updateInfoBoxes();

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
        this.zoom_update();

        // Update size of labels
        d3.selectAll('.axisLabel').attr('font-size', this.defaultLabelSize+'px');
        d3.selectAll('.svgaxisLabel').attr('font-size', this.defaultLabelSize+'px');
        d3.selectAll('.labelitem').style('font-size', this.defaultLabelSize+'px');
    }


    resize_update(debounce) {

        // Check if subyaxis count has changed and offset respectively
        if(this.enableSubYAxis) {
            let addYT = this.renderSettings.additionalYTicks;
            let maxL = 0;
            for(let i=0; i<addYT.length; i++){
                maxL = Math.max(maxL, addYT[i].length);
            }
            this.subAxisMarginY = 80*maxL;
        }

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

            let scaleRange = [heighChunk-this.separation, 0];
            if(this.renderSettings.reversedYAxis[yPos]){
                scaleRange = [0, heighChunk-this.separation];
            }
            this.yScale[yPos].range(scaleRange);
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
                this.addYAxisSvg[i][j].call(this.additionalYAxis[i][j]);
            }
        }

        this.el.select(this.nsId+'clipbox').select('rect')
            .attr('height', heighChunk-this.separation)
            .attr('width', this.width);

        let hoverInfoSeparator = this.el.select(this.nsId+'hoverClipBox');
        hoverInfoSeparator.selectAll('rect').remove();

        for (let yy = 0; yy<this.renderSettings.yAxis.length; yy++) {
            hoverInfoSeparator.append('rect')
                .attr('fill', 'none')
                .attr('y', 0)
                .attr('width', this.width)
                .attr('height', heighChunk-this.separation)
                .attr(
                    'transform',
                    'translate(0,'+((heighChunk*yy))+')'
                );
        }

        heighChunk = this.height/this.renderSettings.yAxis.length;
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

        for (let yPos = 0; yPos < this.y2Scale.length; yPos++) {

            let scaleRange = [heighChunk-this.separation, 0];
            if(this.renderSettings.reversedY2Axis[yPos]){
                scaleRange = [0, heighChunk-this.separation];
            }
            this.y2Scale[yPos].range(scaleRange);
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
            .attr('width', this.width-20)
            .attr('height', (this.margin.bottom+this.subAxisMarginX))
            .attr('transform', 'translate(' + 0 + ',' + (this.height) + ')');


        var that = this;

        for (let yPos = 0; yPos < this.renderSettings.yAxis.length; yPos++) {
            this.el.select('#zoomYBox'+yPos)
                .attr('width', this.margin.left)
                .attr('height', heighChunk-this.separation-20 )
                .attr(
                    'transform',
                    'translate(' + -(this.margin.left+this.subAxisMarginY) + 
                    ',' + ((heighChunk*yPos)+20) + ')'
                )
                .attr('fill', 'none')
                .attr('pointer-events', 'all');

            this.el.select('#zoomY2Box'+yPos)
                .attr('width', this.margin.right + this.marginY2Offset)
                .attr('height', heighChunk-this.separation-20 )
                .attr(
                    'transform',
                    'translate(' + this.width + 
                    ',' + ((heighChunk*yPos)+20) + ')'
                )
                .attr('fill', 'none')
                .attr('pointer-events', 'all');
        }


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
            d3.select(this).style('top', ((heighChunk*i)+3+that.margin.top)+'px')
        });

        this.el.selectAll('.arrowChangePlot.up').each(function(d,i){
            d3.select(this).style('top', ((heighChunk*(i+1))+that.margin.top+15)+'px')
        });
        this.el.selectAll('.arrowChangePlot.down').each(function(d,i){
            d3.select(this).style('top', ((heighChunk*(i))+that.margin.top+40)+'px')
        });

        this.el.selectAll('.previewImage')
            .attr('width',  this.width)
            .attr('height', heighChunk-that.separation);

        this.addTimeInformation();
        this.breakTicks();
        this.renderArrows();

        this.el.selectAll('.modifyAxisIcon.y2')
            .attr(
                'transform',
                'translate(' + (60) + ' ,' + 0 + ') rotate(' + 180 + ')'
            );
        this.el.selectAll('.modifyAxisIcon.xaxis')
            .attr(
                'transform',
                'translate(' + this.width + ' ,' + 20 + ') rotate(' + 180 + ')'
            );

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
        let l = data[xGroup[0]].length;

        let currColCache = null;
        let discreteCSOffset;
        let discreteColorScaleEnabled = false;
        let maskParameter;

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
            for (let i = 0; i < identifiers.length; i++) {
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
                this.batchDrawer.setDomain(cA.extent);
            }
            if (cA && cA.hasOwnProperty('csDiscrete')){
                discreteColorScaleEnabled = true;
            }
            if (cA && cA.hasOwnProperty('logarithmic')){
                this.batchDrawer.setLogScale(cA.logarithmic);
            } else {
                this.batchDrawer.setLogScale(false);
            }

            this.batchDrawer.setColorScale(cs);
            this.batchDrawer._initUniforms();

            // Check if mask parameter is enabled and set
            if (this.enableMaskParameters && cA && cA.hasOwnProperty('maskParameter')){
                if(data.hasOwnProperty(cA.maskParameter)){
                    maskParameter = cA.maskParameter;
                }
            }
            

            // TODO get discrete colorscales working again
            if(discreteColorScaleEnabled){
                currColCache = this.discreteColorScales[cAxis];
                discreteCSOffset = d3.min(data[cAxis]);
            }
        }

        // Check if cyclic axis and if currently displayed axis range needs to
        // offset to be shown in "next cycle" above or below
        let xoffset;

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
            let valY2 = data[yGroup[1]][i];
            let valX = data[xGroup[0]][i];
            let valX2 = data[xGroup[1]][i];

            // Skip "empty" values
            if(Number.isNaN(valY) || Number.isNaN(valY2) ||
                Number.isNaN(valX) || Number.isNaN(valX2)){
                continue;
            }

            if(typeof maskParameter !== 'undefined') {
                if(!data[maskParameter][i]){
                    continue;
                }
            }

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

            let x1 = (this.xScale(valX));
            let x2 = (this.xScale(valX2));

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
            let renderValue = Number.MIN_SAFE_INTEGER;
            if(cAxis !== null){
                rC = [1.0, 0.0, 0.0, constAlpha];
                if(discreteColorScaleEnabled){
                    rC = currColCache[data[cAxis][i]];
                } else {
                    renderValue = data[cAxis][i];
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
            this.batchDrawer.addRect(
                x1,y1,x2,y2, rC[0], rC[1], rC[2], rC[3],
                renderValue
            );

            if(!this.fixedSize && updateReferenceCanvas){
                this.batchDrawerReference.addRect(
                    x1,y1,x2,y2, nCol[0], nCol[1], nCol[2],-1.0,
                    Number.MIN_SAFE_INTEGER
                );
            }
        } // end data for loop
    }

    shiftPeriodicValue(value, max, min, period, offset){
        let shiftpos = Math.abs(parseInt(max/period));
        let shiftneg = Math.abs(parseInt(min/period));
        if(offset===0){
            shiftneg = Math.abs(Math.floor(min/period));
        }
        let shift = Math.max(shiftpos, shiftneg);
        if(shiftneg>shiftpos){
            shift*=-1;
        }
        if(Math.abs(shift) > 0){
            value = value + shift*period;
            if(value-offset > max){
                value -= period;
            }
            if(value+offset < min){
                value += period;
            }
        }
        return value;
    }

    renderOverlayPoints(xAxis, yAxis, cAxis, plotY, yScale, leftYAxis) {

        let axisOffset = plotY * (this.height/this.renderSettings.yAxis.length)  * this.resFactor;

        let x, y, valX, valY, currDotSize, currSymbol;
        let defaultSize = 15;
        let defaultColor = [255.0,0,0, 1.0];
        const overlayData = this.overlayData;
        yScale = yScale[plotY];

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

        if(this.overlaySettings !== false) {
            for (let coll in this.overlaySettings) {
                if(overlayData.hasOwnProperty(coll)
                    && overlayData[coll].hasOwnProperty(yAxis)
                    && overlayData[coll].hasOwnProperty(xAxis)){

                    const oSetts = this.overlaySettings[coll]
                    if (oSetts.hasOwnProperty('displayParameters')) {
                        if (oSetts.displayParameters.indexOf(xAxis) === -1
                            && oSetts.displayParameters.indexOf(yAxis) === -1
                            && (cAxis === null || oSetts.displayParameters.indexOf(cAxis) === -1)) {
                            // If config has displayParameters and current
                            // parameters do not match skip this cycle
                            continue;
                        }
                    }

                    const keyPar = this.overlaySettings[coll].keyParameter;
                    const typeDef = this.overlaySettings[coll].typeDefinition;

                    const lp = overlayData[coll][yAxis].length;

                    // Collect applicable filters
                    var applicableFilters = {}
                    for (let key in overlayData[coll]) {
                        if (overlayData[coll].hasOwnProperty(key) &&
                            this.filters.hasOwnProperty(key)) {
                            applicableFilters[key] = this.filters[key];
                        }
                    }

                    for (let j=0;j<lp; j++) {

                        valY = overlayData[coll][yAxis][j];
                        valX = overlayData[coll][xAxis][j];

                        // Skip "empty" values
                        if(Number.isNaN(valY) || Number.isNaN(valX)){
                            continue;
                        }

                        // Apply filters
                        let skipRecord = false;
                        for (let key in applicableFilters) {
                            if (applicableFilters.hasOwnProperty(key)
                                && !applicableFilters[key](overlayData[coll][key][j])) {
                                skipRecord = true;
                                break;
                            }
                        }
                        if (skipRecord) {
                            continue;
                        }

                        // Manipulate value if we have a periodic parameter
                        if(yperiodic){
                            valY = this.shiftPeriodicValue(valY, yMax, yMin, yperiod, yoffset);
                        }
                        y = yScale(valY);
                        y+=axisOffset;

                        // Manipulate value if we have a periodic parameter
                        if(xperiodic){
                            valX = this.shiftPeriodicValue(valX, xMax, xMin, period, xoffset);
                        }
                        x = this.xScale(valX);

                        const currType = overlayData[coll][keyPar][j];
                        const overlayType = typeDef.find((item) => item.match(currType));
                        if(overlayType.hasOwnProperty('active') && !overlayType.active){
                          continue;
                        }

                        let rC = defaultColor;

                        if (typeof overlayType !== 'undefined' && overlayType.hasOwnProperty('style')) {
                            currDotSize = defaultFor(overlayType.style.size, defaultSize);
                            currSymbol = defaultFor(
                                dotType[overlayType.style.symbol], dotType['rectangle_empty']
                            );
                            if (overlayType.style.hasOwnProperty('color')){
                                rC = overlayType.style.color;
                            }

                            this.batchDrawer.addDot(
                                x, y, currDotSize, currSymbol,
                                rC[0], rC[1], rC[2], rC[3], Number.MIN_SAFE_INTEGER
                            );
                        } else {
                            continue;
                        }
                    }
                }
            }
         }
    }

    renderPoints(data, xAxis, yAxis, cAxis, plotY, yScale, leftYAxis, updateReferenceCanvas) {

        let lp;
        let p_x, p_y, min_error_y, max_error_y;
        yScale = yScale[plotY];

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
            for (let i = 0; i < identifiers.length; i++) {
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
            let resetUniforms = false;
            if(cA && cA.hasOwnProperty('extent')){
                this.batchDrawer.setDomain(cA.extent);
                resetUniforms = true;
            }
            if (cA && cA.hasOwnProperty('logarithmic')){
                this.batchDrawer.setLogScale(cA.logarithmic);
                resetUniforms = true;
            } else {
                this.batchDrawer.setLogScale(false);
                resetUniforms = true;
            }
            // If current cs not equal to the set in the batchsrawe update cs
            if(cs !== this.batchDrawer.csName){
                this.batchDrawer.setColorScale(cs);
                resetUniforms = true;
            }
            if(resetUniforms){
                this.batchDrawer._initUniforms();
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

            // Skip "empty" values
            if(Number.isNaN(valY) || Number.isNaN(valX)){
                if(!this.connectFilteredPoints){
                    p_x = NaN;
                    p_y = NaN;
                }
                continue;
            }

            // If render settings uses colorscale axis get color from there
            let rC;
            let renderValue = Number.MIN_SAFE_INTEGER;
            if(cAxis !== null){
                rC = [1.0, 0.0, 0.0, constAlpha];
                if(Number.isNaN(data[cAxis][j])) {
                    if(!this.connectFilteredPoints){
                        p_x = NaN;
                        p_y = NaN;
                    }
                    continue;
                }
                renderValue = data[cAxis][j];
            } else {
                if(singleSettings){
                    rC = colorObj;
                } else {
                    let val = data[identParam][j];
                    // If color value is NaN don't render it
                    if(Number.isNaN(val)){
                        if(!this.connectFilteredPoints){
                            p_x = NaN;
                            p_y = NaN;
                        }
                        continue;
                    }
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
                valY = this.shiftPeriodicValue(valY, yMax, yMin, yperiod, yoffset);
            }

            y = yScale(valY);
            y+=axisOffset;

            // Manipulate value if we have a periodic parameter
            if(xperiodic){
                valX = this.shiftPeriodicValue(valX, xMax, xMin, period, xoffset);
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
                if(parSett.hasOwnProperty('errorParameter')
                   && parSett.errorDisplayed
                   && data.hasOwnProperty(parSett.errorParameter)
                   && !Number.isNaN(min_error_y)) {

                    let yErrorVal = data[parSett.errorParameter][j];
                    let capWidth = ERROBAR_CAP_WIDTH;

                    // ignore negative error values
                    if (yErrorVal >= 0) {
                        let maxError = yScale(valY + yErrorVal) + axisOffset;
                        let minError = yScale(valY - yErrorVal) + axisOffset;

                        // "whiskers" for error
                        this.batchDrawer.addLine(
                            x, y, x, maxError, (1.5*this.resFactor),
                            rC[0], rC[1], rC[2], 0.5,
                            renderValue
                        );
                        this.batchDrawer.addLine(
                            x-capWidth, maxError, x+capWidth, maxError,
                            (1.5*this.resFactor),
                            rC[0], rC[1], rC[2], 0.5,
                            renderValue
                        );
                        this.batchDrawer.addLine(
                            x, y, x, minError,
                            (1.5*this.resFactor),
                            rC[0], rC[1], rC[2], 0.5,
                            renderValue
                        );
                        this.batchDrawer.addLine(
                            x-capWidth, minError, x+capWidth, minError,
                            (1.5*this.resFactor),
                            rC[0], rC[1], rC[2], 0.5,
                            renderValue
                        );

                        // Top and bottom line for error
                        /*
                        if (!Number.isNaN(p_x)) {
                            this.batchDrawer.addLine(
                                p_x, min_error_y, x, maxError, (1.5*this.resFactor),
                                rC[0], rC[1], rC[2], 0.5,
                                renderValue
                            );
                            this.batchDrawer.addLine(
                                p_x, max_error_y, x, minError, (1.5*this.resFactor),
                                rC[0], rC[1], rC[2], 0.5,
                                renderValue
                            );
                        }
                        min_error_y = maxError;
                        max_error_y = minError;
                        */

                        // Fill method NN
                        /*
                        if (!Number.isNaN(min_error_y) && !Number.isNaN(p_x)) {
                            // Lets check pixel distanze to previous point
                            let stepSize = x - p_x;
                            // Mid
                            this.batchDrawer.addLine(
                                (p_x+stepSize/2), maxError, (p_x+stepSize/2), minError, (stepSize*this.resFactor),
                                rC[0], rC[1], rC[2], 0.5,
                                renderValue
                            );
                        }
                        */

                        // TODO: Fill method pixel based
                        /*
                        if (!Number.isNaN(min_error_y) && typeof p_x !== 'undefined' && !Number.isNaN(p_x)) {
                            let stepX = x - p_x;
                            const xAxisRange = this.xScale.range();
                            // Only draw if inside visible canvas
                            if(x > xAxisRange[0] && x <= xAxisRange[1]+1){
                                if (stepX > 1){
                                    let lastPos = null;
                                    for (let xs=p_x; xs<x-1; xs++) {
                                        this.batchDrawer.addLine(
                                            xs+0.5, minError, xs+0.5, maxError, 1,
                                            rC[0], rC[1], rC[2], 0.5,
                                            renderValue
                                        );
                                        lastPos = xs;
                                    }
                                    const lastPosDiff = x - lastPos;
                                    if (lastPosDiff > 0) {
                                        // Add final line smaller then 1 to fill gap to current point
                                        this.batchDrawer.addLine(
                                            lastPos+(lastPosDiff/2), minError, lastPos+(lastPosDiff/2), maxError, lastPosDiff,
                                            rC[0], rC[1], rC[2], 0.5,
                                            // 0, 255, 0, 0.5,
                                            renderValue
                                        );
                                    }
                                } else {
                                    // TODO: calculate average of all values
                                }
                            }
                        }
                        */
                        min_error_y = maxError;
                        max_error_y = minError;

                    }
                }
                if(parSett.hasOwnProperty('lineConnect') &&
                    parSett.lineConnect && j>0 && !Number.isNaN(p_x)){

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
                                    rC[0], rC[1], rC[2], rC[3],
                                    renderValue
                                );
                            }
                        }
                    }else{
                        // Do not connect lines going in negative x direction
                        // as some datasets loop and it looks messy
                        if(x-p_x>-this.width/2){
                            this.batchDrawer.addLine(
                                p_x, p_y, x, y, (1.5*this.resFactor),
                                rC[0], rC[1], rC[2], rC[3],
                                renderValue
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
                    let sym = defaultFor(dotType[parSett.symbol], 2.0);
                    this.batchDrawer.addDot(
                        x, y, currDotSize, sym, 
                        rC[0], rC[1], rC[2], rC[3], renderValue
                    );
                    if(!this.fixedSize && updateReferenceCanvas){
                        this.batchDrawerReference.addDot(
                            x, y, currDotSize, sym, 
                            nCol[0], nCol[1], nCol[2], -1.0,
                            Number.MIN_SAFE_INTEGER
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

        let lp;

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
        let identParam;
        let dotsize = defaultFor(this.dataSettings[yAxis].size, DOTSIZE);
        dotsize *= this.resFactor;

        if (this.renderSettings.hasOwnProperty('dataIdentifier')){
            singleSettings = false;
            dotsize = {};
            identParam = this.renderSettings.dataIdentifier.parameter;
            // Check if alpha value is set for all parameters
            let identifiers = this.renderSettings.dataIdentifier.identifiers;
            for (let i = 0; i < identifiers.length; i++) {
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
                    } else if(symbol === 'diamond'){
                        symbol = 'diamond_empty'
                    }
                    let sym = defaultFor(dotType[symbol], 2.0);
                    this.batchDrawer.addDot(
                        x, y, currDotSize, sym, rC[0], rC[1], rC[2], 0.2, Number.MIN_SAFE_INTEGER
                    );
                }
            }
        }
    }


    addApply(dataSettings, parId) {

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
                    if(Object.keys(this.settingsToApply).length>0 || 
                        this.settingsToDelete.length>0){

                        for(let key in this.settingsToApply){
                            if(key === 'colorAxisChange'){
                                let yPos = this.settingsToApply.colorAxisChange.yPos;
                                let parPos = this.settingsToApply.colorAxisChange.parPos;
                                let colPar = this.settingsToApply.colorAxisChange.colorParameter;
                                let orientation = this.settingsToApply.colorAxisChange.orientation;
                                let colorAxis = this.renderSettings.colorAxis;
                                if(orientation === 'right'){
                                    colorAxis = this.renderSettings.colorAxis2;
                                }
                                if(parPos !== null){
                                    colorAxis[yPos][parPos] = colPar;
                                } else {
                                    colorAxis[yPos].push(colPar);
                                }
                            } else if (key === 'maskParameterChange'){
                                let colorParameter = this.settingsToApply.maskParameterChange.colorParameter;
                                let maskParameter = this.settingsToApply.maskParameterChange.maskParameter;
                                if(maskParameter !== 'None'){
                                    this.dataSettings[colorParameter].maskParameter = maskParameter;
                                } else {
                                    delete this.dataSettings[colorParameter].maskParameter;
                                }
                                /**
                                * Fires when the mask parameter is changed
                                *
                                * @event module:graphly.graphly#maskParameterChange
                                * @property {Object} containing parameter key
                                * and colorscale identifier
                                */
                                this.emit('maskParameterChange', {
                                    parameter: colorParameter,
                                    maskParameter: maskParameter
                                });
                            } else {
                                dataSettings[key] = this.settingsToApply[key];
                                if(key === 'colorscale'){
                                    /**
                                    * Fires when the colorscale for a parameter
                                    * is changed
                                    *
                                    * @event module:graphly.graphly#colorsScaleChange
                                    * @property {Object} containing parameter key
                                    * and colorscale identifier
                                    */
                                    this.emit('colorScaleChange', {
                                        parameter: parId,
                                        colorscale: this.settingsToApply[key]
                                    });
                                }
                            }
                        }
                        for (let pos=0; pos<this.settingsToDelete.length; pos++){
                            delete dataSettings[this.settingsToDelete[pos]];
                        }

                        this.createParameterInfo();
                        this.resize(false);
                        this.emit('axisChange');
                        this.renderData();
                    } else {
                        this.el.select('#parameterSettings').selectAll('*').remove();
                        this.el.select('#parameterSettings').style('display', 'none');
                    }
                });
        }
    }


    renderRegressionOptions(id, regressionTypes, dataSettings) {
        // Check if parameter shown is composed of combined parameters
        let combPars = this.renderSettings.combinedParameters;
        let idX = this.renderSettings.xAxis;
        let idY = id;

        // If a combined parameter is provided we need to render either
        // a line or a rectangle as we have two parameters per item
        // Check for renderGroups
        if(this.renderSettings.sharedParameters){
            if(this.renderSettings.sharedParameters.hasOwnProperty(idX)){
                if(this.renderSettings.sharedParameters[idX].length>0){
                    idX = this.renderSettings.sharedParameters[idX][0];
                }
            }
            if(this.renderSettings.sharedParameters.hasOwnProperty(idY)){
                if(this.renderSettings.sharedParameters[idY].length>0){
                    idY = this.renderSettings.sharedParameters[idY][0];
                }
            }
        }
        if(combPars.hasOwnProperty(idX) || combPars.hasOwnProperty(idY)){
             this.el.select('#regressionCheckbox').remove();
             this.el.select('label[for=regressionCheckbox]').remove();
             return;
        }

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
                    .text(function (d) { return d.name.replace(this.labelReplace, ' '); })
                    .attr('value', function (d) { return d.value; })
                    .property('selected', function(d){
                        return d.value === dataSettings.regression;
                    });

            addOrder();

            function onregressionChange() {
                let selectValue = 
                    that.el.select('#regressionSelect').property('value');
                that.settingsToApply.regression = selectValue;
                addOrder();
                that.addApply(dataSettings);
            }

            function addOrder(){
                that.el.select('#regressionOrderLabel').remove();
                that.el.select('#regressionOrder').remove();
                // If polynomial was just enabled but not yet saved or is opening
                // settings with already saved regression option
                if(that.settingsToApply.regression === 'polynomial' || 
                    (
                        dataSettings.regression === 'polynomial' && 
                        !that.settingsToApply.hasOwnProperty('regression')
                    )){
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
                            that.settingsToApply.regressionOrder = Number(this.value);
                            that.addApply(dataSettings);
                        });
                }
            }


        }else{
            this.el.select('#labelRegression').remove();
            this.el.select('#regressionSelect').remove();
            this.el.select('#regressionOrderLabel').remove();
            this.el.select('#regressionOrder').remove();
            this.addApply(dataSettings);
        }

    }

    calcOffset(){
        let pos;
        switch(this.labelAllignment){
            case 'left':
                pos = this.margin.left+20+'px';
            break;
            case 'right':
                pos = (this.width-this.margin.left-(270/2)+20)+'px';
            break;
            case 'center':
                pos = ((this.width/2)-(270/2)+this.margin.left) +'px';
            break;
        }
        return pos;
    }

    createInfoBoxes(){


        let currHeight = this.height / this.yScale.length;

        for (let yPos = 0; yPos < this.renderSettings.yAxis.length; yPos++) {

            if(this.el.select('#parameterInfo'+yPos).empty()){
                this.el.append('div')
                    .attr('id', 'parameterInfo'+yPos)
                    .attr('class', 'parameterInfo')
                    .style('top', ((currHeight)*yPos + 10 + this.margin.top) +'px')
                    .style('left', this.calcOffset.bind(this))
                    .style('visibility', 'hidden');
            } else {
                this.el.select('#parameterInfo'+yPos).selectAll('*').remove();
                this.el.select('#parameterInfo'+yPos)
                    .style('top', ((currHeight)*yPos +10) + this.margin.top +'px')
                    .style('left', this.calcOffset.bind(this));
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
            .style('left', this.calcOffset.bind(this))
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
                .style('left', this.calcOffset.bind(this));

            this.el.select('#svgInfoContainer'+yPos)
                .attr('transform', ()=>{
                    let xOffset;
                    switch(this.labelAllignment){
                        case 'left':
                            xOffset = 20;
                        break;
                        case 'right':
                            xOffset = (this.width-(270)-30);
                        break;
                        case 'center':
                            xOffset = ((this.width/2)-(270/2));
                        break;
                    }
                    return 'translate(' + 
                        xOffset + ',' +
                        ((currHeight)*yPos + 10) + ')';
                });
        }

        this.el.select('#parameterSettings')
            .style('left', this.calcOffset.bind(this))
            .style('display', 'none');
    }


    applyDataFilters(){

        this.startTiming('applyDataFilters');

        let data = {};
        let inactiveData = {};

        for(let p in this.data){
            if(Array.isArray(this.data[p])){
                data[p] = this.data[p].slice(0);
            } else {
                data[p] = this.data[p];
            }
            inactiveData[p] = [];
        }

        let filters = Object.assign(
            {},
            this.filterManager.filters,
            this.filterManager.boolFilters,
            this.filterManager.maskFilters
        );

        for (let f in filters){

            let currFilter = filters[f];
            // Check if parameter is actually in current data
            if(!data.hasOwnProperty(f)){
                continue;
            }
            let currentDataset = data[f].slice(0);

            let applicableFilterList = [];

            for (let p in data){

                let applicableFilter = true;
                let indepFilter = true;

                if(this.filterManager.filterSettings.hasOwnProperty('filterRelation')){
                    applicableFilter = false;
                    let filterRel = this.filterManager.filterSettings.filterRelation;

                    for (let i = 0; i < filterRel.length; i++) {
                        // If filter parameter not in any group it applies for all
                        if(filterRel[i].indexOf(f)!==-1){
                            indepFilter = false;
                        }
                        // Check if both parameters are in the same group
                        if( (filterRel[i].indexOf(p)!==-1) && 
                            (filterRel[i].indexOf(f)!==-1)){
                            applicableFilter = true;
                            break;
                        }
                    }
                    if(indepFilter){
                        applicableFilter = true;
                    }
                }

                if(applicableFilter){
                    applicableFilterList.push(p);
                }
            }

            for (let i=0; i<currentDataset.length; i++) {
                if(!currFilter(currentDataset[i])){
                    for(let af=0; af<applicableFilterList.length; af++){
                        inactiveData[applicableFilterList[af]].push(
                            this.data[applicableFilterList[af]][i]
                        );
                        data[applicableFilterList[af]][i] = NaN;
                    }
                }
            }

        }

        this.currentData = data;
        this.currentInactiveData = inactiveData;
        this.endTiming('applyDataFilters');
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
                    let xOffset;
                    switch(this.labelAllignment){
                        case 'left':
                            xOffset = 20;
                        break;
                        case 'right':
                            xOffset = (this.width-(270)-30);
                        break;
                        case 'center':
                            xOffset = ((this.width/2)-(270/2));
                        break;
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

            // color axis parameters
            let cAxRen = this.renderSettings.colorAxis[yPos];
            let cAx2Ren = this.renderSettings.colorAxis2[yPos];

            let _matchAxisParameter = function (parameters, data, allowedParameters) {
                for (let i=0; i<parameters.length; i++){
                    if (data.hasOwnProperty(parameters[i])
                        && allowedParameters.indexOf(parameters[i]) != -1){
                        return true;
                    }
                }
                return false;
            }

            // Add possible overlay labels
            if(this.overlaySettings !== false){
                for (let coll in this.overlaySettings) {
                    // See if correct axis are visible to show overlay data
                    // and if they are also defined as displayParameters
                    for (var i = 0; i < this.overlaySettings[coll].typeDefinition.length; i++) {
                        const oSetts = this.overlaySettings[coll];
                        const currDef = oSetts.typeDefinition[i];
                        const xMatch = (
                            this.overlayData.hasOwnProperty(coll)
                            && this.overlayData[coll].hasOwnProperty(this.renderSettings.xAxis)
                        );
                        let yMatch = !oSetts.hasOwnProperty('displayParameters');
                        if(xMatch && !yMatch && this.overlayData.hasOwnProperty(coll)){
                              yMatch = (
                                  _matchAxisParameter(yAxRen, this.overlayData[coll], oSetts.displayParameters)
                                  || _matchAxisParameter(y2AxRen, this.overlayData[coll], oSetts.displayParameters)
                                  || _matchAxisParameter(cAxRen, this.overlayData[coll], oSetts.displayParameters)
                                  || _matchAxisParameter(cAx2Ren, this.overlayData[coll], oSetts.displayParameters)
                                  || _matchAxisParameter([this.renderSettings.xAxis], this.overlayData[coll], oSetts.displayParameters)
                              );
                        }
                        if(xMatch && yMatch){
                            this.addOverlayLabel(currDef, infoGroup, parInfEl);
                        }
                    }
                }
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


    renderColorScaleOptions(dataSettings, yPos, orientation, yAxisId, parPos){

        let colAxis = this.renderSettings.colorAxis;

        if(orientation==='right'){
            colAxis = this.renderSettings.colorAxis2;
        }

        let parSett = this.el.select('#parameterSettings');

        parSett.append('label')
            .attr('id', 'labelColorParamSelection')
            .attr('for', 'colorParamSelection')
            .text('Parameter');

        let labelColorParamSelect = parSett.append('select')
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
                selectionChoices.push({value: key, label: key.replace(this.labelReplace, ' ')});
                if(colAxis[yPos][parPos] === key){
                    selectionChoices[selectionChoices.length-1].selected = true;
                }
                // The setting might not be yet applied and be coming from the
                // settingsToApply
                if(this.settingsToApply.hasOwnProperty('colorAxisChange') && 
                    this.settingsToApply.colorAxisChange.colorParameter === key){
                    selectionChoices[selectionChoices.length-1].selected = true;
                }
            }
        }

        selectionChoices = selectionChoices.sort((a, b) => a.value.localeCompare(b.value));

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

            that.settingsToApply.colorAxisChange = {
                orientation: orientation,
                yPos: yPos,
                parPos: parPos,
                colorParameter: selectValue
            };
            // Check if parameter already has a colorscale configured
            if(that.dataSettings.hasOwnProperty(selectValue)){
                let obj = that.dataSettings[selectValue];
                dataSettings = obj;
                if(obj.hasOwnProperty('colorscale')){
                    that.el.select('#colorScaleSelection')
                        .selectAll('option[value="'+obj.colorscale+'"]').property(
                            'selected', true
                        );
                } else {
                    that.el.select('#colorScaleSelection')
                        .selectAll('option[value="viridis"]').property(
                            'selected', true
                        );
                }
            }
            that.addApply(dataSettings);
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

        this.colorscales.sort();

        let selectionAvailable = false;
        labelColorScaleSelect.selectAll('option')
            .data(this.colorscales).enter()
            .append('option')
                .text(function (d) { return d; })
                .attr('value', function (d) { return d; })
                .property('selected', (d)=>{
                    let csId = colAxis[yPos][parPos];
                    let obj = this.dataSettings[csId];
                    if(obj && obj.hasOwnProperty('colorscale')){
                        if( d === this.dataSettings[csId].colorscale){
                            selectionAvailable = true;
                            return true;
                        } else {
                            return false;
                        }
                    } else {
                        return false;
                    }
                });

        // Check if any colorscale has been selected, if not set viridis
        // to default
        if(!selectionAvailable){
            labelColorScaleSelect.selectAll('option[value="viridis"]').property(
                'selected', true
            );
        }


        function oncolorScaleSelectionChange() {
            let csId = colAxis[yPos][parPos];
            if(csId === null){
                // the colorscale on which the configuration is being applied
                // is not yet been applied itself, so changing colorscale 
                // when at the same time adding the colorscale attribute in the 
                // settings, so we need to check for parameters to apply
                if(that.settingsToApply.hasOwnProperty('colorAxisChange')){
                    if(that.settingsToApply.colorAxisChange.yPos === yPos && 
                       that.settingsToApply.colorAxisChange.parPos === parPos){
                        csId = that.settingsToApply.colorAxisChange.colorParameter;
                    }
                }
            }
            let selectValue = that.el.select('#colorScaleSelection').property('value');
            that.settingsToApply.colorscale = selectValue;
            that.addApply(that.dataSettings[csId], csId);
        }

        let selectValue = that.el.select('#colorParamSelection').property('value');
        let obj = {};
        if(that.dataSettings.hasOwnProperty(selectValue)){
            obj = that.dataSettings[selectValue];
        }
        parSett.append('label')
            .attr('for', 'logscale')
            .text('Log. colorscale');
            

        parSett.append('input')
            .attr('id', 'logscale')
            .attr('type', 'checkbox')
            .property('checked', 
                defaultFor(obj.logarithmic, false)
            )
            .on('change', function(){
                that.settingsToApply.logarithmic = 
                    !defaultFor(obj.logarithmic, false);
                that.addApply(obj);
            });

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
                // Reset settings to apply
                that.settingsToApply = {};
                that.settingsToDelete = [];
                parSetEl.selectAll('*').remove();
                parSetEl.style('display', 'none');
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
                if(this.value === ''){
                    that.settingsToDelete.push('displayName');
                } else {
                    that.settingsToApply.displayName = this.value;
                }
                that.addApply(dataSettings);
            });

        // Check if parameter and xaxis is combined
        let xcombined = false;
        let ycombined = false;
        let combPars = this.renderSettings.combinedParameters;
        let sharedPars = this.renderSettings.sharedParameters;
        let xAxis = this.renderSettings.xAxis;

        if(combPars.hasOwnProperty(xAxis)){
            xcombined = true;
        } else if(sharedPars){
            if(sharedPars.hasOwnProperty(xAxis)){
                // Shared parameters should be equivalent, so lets just look 
                // at the first
                if(combPars.hasOwnProperty(sharedPars[xAxis][0])){
                    xcombined = true;
                }
            }
        }

        if(combPars.hasOwnProperty(id)){
            ycombined = true;
        } else if(sharedPars){
            if(sharedPars.hasOwnProperty(id)){
                if(combPars.hasOwnProperty(sharedPars[id][0])){
                    xcombined = true;
                }
            }
        }

        if(!(xcombined && ycombined)){
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
                { name:'Triangle outline', value: 'triangle_empty'},
                { name:'Diamond', value: 'diamond'},
                { name:'Diamond outline', value: 'diamond_empty'}
            ];


            let select = parSetEl
              .append('select')
                .attr('id','symbolSelect')
                .on('change',onchange);

            select.selectAll('option')
                .data(data).enter()
                .append('option')
                    .text(function (d) { return d.name; })
                    .attr('value', function (d) { return d.value; })
                    .property('selected', function(d){
                        return d.value === dataSettings.symbol;
                    });

            function onchange() {
                let selectValue = that.el.select('#symbolSelect').property('value');
                that.settingsToApply.symbol = selectValue;
                that.addApply(dataSettings);
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
                    that.settingsToApply.color = c;
                    that.addApply(dataSettings);
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
            parSetEl.append('label')
                .attr('for', 'sizeSelection')
                .text('Point size');

            parSetEl.append('input')
                .attr('id', 'sizeSelection')
                .attr('type', 'text')
                .attr('value', 
                    defaultFor(dataSettings.size, DOTSIZE)
                )
                .on('input', ()=>{
                    let val = Number(d3.event.currentTarget.value);
                    that.settingsToApply.size = val;
                    that.addApply(dataSettings);
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
                    that.settingsToApply.alpha = val;
                    that.addApply(dataSettings);
                });
        }

        // Should normally always have an index
        if(this.displayColorscaleOptions){

            let colorAxis = this.renderSettings.colorAxis;
            if(orientation==='right'){
                colorAxis = this.renderSettings.colorAxis2;
            }

            let active = false;

            if(that.settingsToApply.hasOwnProperty('colorAxisChange')){
                if(that.settingsToApply.colorAxisChange.colorParameter !== null){
                    active = true;
                }
            }
            if(typeof colorAxis[yPos][parPos] !== 'undefined' && colorAxis[yPos][parPos]!==null){
                if(!that.settingsToApply.hasOwnProperty('colorAxisChange')){
                    active = true;
                }
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
                            // We are changing an axis here and not datasettings
                            // so we save necessary info for change later on
                            that.settingsToApply.colorAxisChange = {
                                orientation: orientation,
                                yPos: yPos,
                                parPos: parPos,
                                colorParameter: selectionChoices[0]
                            };
                        } else {
                            that.settingsToApply.colorAxisChange = {
                                orientation: orientation,
                                yPos: yPos,
                                parPos: null,
                                colorParameter: selectionChoices[0]
                            };
                        }
                    } else {
                        that.settingsToApply.colorAxisChange = {
                            orientation: orientation,
                            yPos: yPos,
                            parPos: parPos,
                            colorParameter: null
                        };
                    }
                    that.renderParameterOptions(
                        dataSettings, id, yPos, orientation, true, parPos
                    );
                    that.addApply(dataSettings);
                });
            // Need to add additional necessary options
            // drop down with possible parameters and colorscale
            if(active){
                this.renderColorScaleOptions(dataSettings, yPos, orientation, id, parPos);
            }

        }

        if(this.enableMaskParameters) {
            // Go through data settings and find currently available ones
            let parSett = this.el.select('#parameterSettings');
            let colAxis = this.renderSettings.colorAxis;
            if(orientation==='right'){
                colAxis = this.renderSettings.colorAxis2;
            }

            parSett.append('label')
                .attr('for', 'maskParamSelection')
                .text('Mask');

            let maskParamSelect = parSett.append('select')
                .attr('id','maskParamSelection')
                .on('change',onmaskParamSelectionChange);

            // Go through data settings and find currently available ones
            let ds = this.dataSettings;
            let selectionChoices = [];
            let currPar = colAxis[yPos][parPos];
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
                    selectionChoices.push({value: key, label: key.replace(this.labelReplace, ' ')});
                    if(this.dataSettings.hasOwnProperty(currPar)
                        && this.dataSettings[currPar].hasOwnProperty('maskParameter')
                        && this.dataSettings[currPar].maskParameter === key) {
                        selectionChoices[selectionChoices.length-1].selected = true;
                    }
                    // The setting might not be yet applied and be coming from the
                    // settingsToApply
                    /*if(this.settingsToApply.hasOwnProperty('maskParameterChange') && 
                        this.settingsToApply.maskParameterChange === key){
                        selectionChoices[selectionChoices.length-1].selected = true;
                    }*/
                }
            }

            selectionChoices = selectionChoices.sort((a, b) => a.value.localeCompare(b.value));
            // Check if any selected
            if(selectionChoices.filter((item)=>item.selected).length>0){
                selectionChoices.unshift({value: null, label: 'None'});
            } else {
                selectionChoices.unshift({value: null, label: 'None', selected: true});
            }

            maskParamSelect.selectAll('option')
                .data(selectionChoices).enter()
                .append('option')
                    .text(function (d) { return d.label; })
                    .attr('value', function (d) { return d.value; })
                    .property('selected', function(d){
                        return d.hasOwnProperty('selected');
                    });

            let that = this;

            function onmaskParamSelectionChange() {
                let selectValue = 
                    that.el.select('#maskParamSelection').property('value');
                that.settingsToApply.maskParameterChange = {
                    colorParameter: currPar,
                    maskParameter: selectValue
                };
                // Check if parameter already has a colorscale configured
                /*if(that.dataSettings.hasOwnProperty(selectValue)){
                    let obj = that.dataSettings[selectValue];
                    dataSettings = obj;
                    if(obj.hasOwnProperty('colorscale')){
                        that.el.select('#colorScaleSelection')
                            .selectAll('option[value="'+obj.colorscale+'"]').property(
                                'selected', true
                            );
                    } else {
                        that.el.select('#colorScaleSelection')
                            .selectAll('option[value="viridis"]').property(
                                'selected', true
                            );
                    }
                }*/
                that.addApply(dataSettings);
            }

        }

        if(xcombined && ycombined) {
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
                that.settingsToApply.lineConnect = 
                    !defaultFor(dataSettings.lineConnect, false);
                that.addApply(dataSettings);
            });

        if (dataSettings.hasOwnProperty('errorDisplayed')) {
            parSetEl
                .append('label')
                .attr('for', 'errorDisplayed')
                .text('Show error');
            parSetEl
                .append('input')
                .attr('id', 'errorDisplayed')
                .attr('type', 'checkbox')
                .property('checked',
                    defaultFor(dataSettings.errorDisplayed, false)
                )
                .on('change', function(){
                    that.settingsToApply.errorDisplayed =
                        !defaultFor(dataSettings.errorDisplayed, false);
                    that.addApply(dataSettings);
                });
        }

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
                        that.settingsToApply.regression = defaultFor(
                            dataSettings.regression,
                            'linear'
                        );
                    } else {
                        // If unchecked remove regression parameters
                        that.settingsToDelete.push('regression');
                        that.settingsToDelete.push('regressionOrder');
                    }

                    that.renderRegressionOptions(id, regressionTypes, dataSettings);
                    that.addApply(dataSettings);
                });

            that.renderRegressionOptions(id, regressionTypes, dataSettings);
        }

    }

    addOverlayLabel(typedef, infoGroup, parInfEl){

        let parDiv = parInfEl.append('div')
            .attr('class', 'overlayLabelitem');

        infoGroup.style('visibility', 'hidden');

        let displayName = typedef.name;

        // Check if this label name is not already present
        const textEls = infoGroup.selectAll('text')[0];
        const equalLabel = textEls.find(
            (el) => {return d3.select(el).text() === displayName}
        );
        if (typeof equalLabel !== 'undefined'){
            return;
        }
        const textDiv = parDiv.append('div')
            .style('display', 'inline')
            .style('cursor', 'pointer')
            .html(displayName);

        textDiv.on('click', () => {
          if(typedef.hasOwnProperty('active')){
            typedef.active = !typedef.active;
          } else {
            typedef.active = false;
          }
          this.emit('axisChange');
          this.createParameterInfo();
          this.renderData();
        });

        // Update size of rect based on size of original div
        if ( parInfEl.node() !== null ) {
            let boundRect = parInfEl.node().getBoundingClientRect();
            infoGroup.select('rect').attr('height', boundRect.height);
        }

        // check amount of elements and calculate offset
        let offset = 21 + infoGroup.selectAll('text').size() *20;
        let labelText = infoGroup.append('text')
            .attr('class', 'svgaxisLabel')
            .attr('text-anchor', 'middle')
            .attr('y', offset)
            .attr('x', 153)
            .text(displayName);

        if(typedef.hasOwnProperty('active') && !typedef.active){
          textDiv.style('text-decoration', 'line-through');
          labelText.attr('text-decoration', 'line-through')
        }

        let labelBbox = labelText.node().getBBox();

        let iconSvg = parDiv.insert('div', ':first-child')
            .attr('class', 'svgIcon')
            .style('display', 'inline')
            .append('svg')
            .attr('width', 20).attr('height', 10);

        let symbolColor = '';

        let style = typedef.style;

        if(style.hasOwnProperty('color')){
            symbolColor = '#'+ CP.RGB2HEX(
                style.color
                .map(function(c){return Math.round(c*255);})
            );
        }

        style.symbol = defaultFor(
            style.symbol, 'circle'
        );

        u.addSymbol(iconSvg, style.symbol, symbolColor);

        let symbolGroup = infoGroup.append('g')
            .attr('transform', 'translate(' + (130-labelBbox.width/2) + ',' +
            (offset-10) + ')');
        u.addSymbol(symbolGroup, style.symbol, symbolColor);
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

        for (let i = 0; i < parIds.length; i++) {

            // Check if current combination is available in data as per config
            if(this.renderSettings.hasOwnProperty('availableParameters') &&
                this.renderSettings.availableParameters.hasOwnProperty(parIds[i])){
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
            if(rS.hasOwnProperty('renderGroups') && rS.renderGroups !== false && 
                rS.groups!== false && rS.sharedParameters !== false){
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
                .html(displayName.replace(this.labelReplace, ' '));

            // Update size of rect based on size of original div
            if (parInfEl.node() !== null) {
                let boundRect = parInfEl.node().getBoundingClientRect();
                infoGroup.select('rect').attr('height', boundRect.height);
            }

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
        if(rS.hasOwnProperty('renderGroups') && rS.renderGroups !== false &&
            rS.groups!== false && rS.sharedParameters !== false){

            let currGroup = rS.renderGroups[rS.groups[plotY]];
            if(rS.sharedParameters.hasOwnProperty(idX)){
                let sharedPars = rS.sharedParameters[idX];

                for (let i = 0; i < sharedPars.length; i++) {
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
                if(this.showFilteredData) {
                    this.renderFilteredOutPoints(
                        inactiveData, idX, idY, plotY, currYScale, leftYAxis
                    );
                }
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
                // Check also if overlayData needs to be rendered
                this.renderOverlayPoints(idX, idY, idCS, plotY, currYScale, leftYAxis);
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
                                (item)=>{
                                    if(Number.isNaN(item)){
                                        return NaN;
                                    } else {
                                        return item.getTime();
                                    }
                                });
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

                    // Check if parameter has log colorscale option
                    if(this.dataSettings[colorAxis].hasOwnProperty('logarithmic')
                        && this.dataSettings[colorAxis].logarithmic){
                        // Find smallest value over 0
                        if(domain[0]<=0 && domain[1]>0) {
                            let tmpDomain = d3.extent(
                                this.currentData[colorAxis].filter((val)=>val>0.0)
                            );
                            domain[0] = tmpDomain[0];
                        }
                    }
                    this.dataSettings[colorAxis].extent = domain;
                } else {
                    // Check if parameter has log colorscale option
                    let domain = this.dataSettings[colorAxis].extent;
                    if(this.dataSettings[colorAxis].hasOwnProperty('logarithmic')
                        && this.dataSettings[colorAxis].logarithmic){
                        // If yes make sure domain does not cross 0
                        if(domain[0]<=0 && domain[1]>0) {
                            // Find smallest value over 0
                            let tmpDomain = d3.extent(
                                this.currentData[colorAxis].filter((val)=>val>0.0)
                            );
                            domain[0] = tmpDomain[0];
                            this.dataSettings[colorAxis].extent = domain;
                        }
                    }
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
        blockSize-=this.separation;

        // set the scissor rectangle.
        this.batchDrawer.getContext().scissor(
            1, axisOffset-1, (this.width * this.resFactor), blockSize
        );

        if(this.batchDrawerReference){
            this.batchDrawerReference.getContext().scissor(
                1, axisOffset-1, (this.width * this.resFactor), blockSize
            );
        }

    }

    renderArrows(){
        if(!this.activeArrows){
            return;
        }
        this.el.select('#arrowContainer').remove();

        let arrCont = this.svg.append('g')
            .attr('id', 'arrowContainer')
            .attr('transform', 'translate(0,'+(this.height+16)+')')
            .style('clip-path','url('+this.nsId+'arrowclipbox)');

        // Create clip path
        arrCont.append('defs').append('clipPath')
            .attr('id', (this.nsId.substring(1)+'arrowclipbox'))
            .append('rect')
                .attr('fill', 'none')
                .attr('width', this.width)
                .attr('height', 30);

        arrCont.append("svg:defs").append("svg:marker")
            .attr("id", "arrow")
                .attr("viewBox", "0 -5 10 10")
                .attr('refX', 5)
                .attr("markerWidth", 2)
                .attr("markerHeight", 2)
                .attr("orient", "auto")
            .append("svg:path")
                .attr("d", "M0,-5L10,0L0,5")
                .attr("stroke", "green")
                .attr("fill", "green");

        let aV = this.arrowValues;
        for(let gr=0; gr<this.arrowValues.length; gr++){
            arrCont.append('line')
                .attr('marker-end', "url(#arrow)")
                .attr("x1", this.xScale(aV[gr][0])+5)
                .attr("y1", 9)
                .attr("x2", this.xScale(aV[gr][1])-5)
                .attr("y2", 9)
                .attr("stroke-width", 7)
                .attr("stroke", "green");

            arrCont.append('text')
                .text('g'+aV[gr][2])
                .attr("y", 24)
                .attr("x", this.xScale( (aV[gr][0]+aV[gr][1])/2 ))
                .attr('fill', 'green')
                .attr('text-anchor', 'middle');
        }
    }

    findAlternativeSharedXAxis(idX, plotY){
        let returnId = idX;
        // If necessary update the current x axis parameter used based on 
        // current plot group
        if(this.renderSettings.renderGroups && 
            this.renderSettings.groups && 
            this.renderSettings.sharedParameters.hasOwnProperty(idX)){
            let sharPars = this.renderSettings.sharedParameters[idX];
            let rGroup = this.renderSettings.groups[plotY];
            for (let sp = 0; sp < sharPars.length; sp++) {
                if(this.renderSettings.renderGroups[rGroup]
                    .parameters.indexOf(sharPars[sp]) !== -1){
                    returnId = sharPars[sp];
                }
            }
        }
        return returnId;
    }


    /**
    * Render the data as graph
    * @param {boolean} [updateReferenceCanvas=true] Update the corresponding 
    *        color reference canvas
    */
    renderData(updateReferenceCanvas) {

        // Reset possible non applied settings
        this.settingsToApply = {};
        this.settingsToDelete = [];

        this.startTiming('renderData');

        let xAxRen = this.renderSettings.xAxis;

        this.batchDrawer.clear();

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

            if(this.batchDrawerReference && updateReferenceCanvas){
                this.batchDrawerReference.clear();
            }

            idX = this.findAlternativeSharedXAxis(xAxRen, plotY);

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

            idX = this.findAlternativeSharedXAxis(xAxRen, plotY);
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

                idX = this.findAlternativeSharedXAxis(xAxRen, plotY);
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

        this.renderArrows();

        /**
        * Event is fired when graph has finished rendering plot.
        * @event module:graphly.graphly#rendered
        */
        this.emit('rendered');
        this.endTiming('renderData');
    }




}

export {graphly};
