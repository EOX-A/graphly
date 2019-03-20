

/**
* @typedef {Object} ChoiceObject
* @property {Array.Object} options Array containing options objects with name
*           and value keys. 
* @property {Array.String} [selected] Index of selected option.
*/

/**
* @typedef {Object} FilterSettings
* @property [filterRelation] {Array.Array} Grouping of parameter ids as arrays
         for parameters that are related and affected by the same filters.
* @property [parameterMatrix] {Object} Possibility to combine parameters into
*        merged parameter. Key of object contains new identifier for combined
*        parameter, value is array of two parameter id string of the original 
*        parameters
* @property visibleFilters {Array.String} List of 
*        parameter identifiers which shall be added as filter.
* @property boolParameter {Array.String} List of 
*        parameter identifiers of which the data is comprised of booleans.
* @property maskParameter {Object.<string, Object>} 
*        Object with parameter identifier as key and Object as value. Each
*        object contains values as key and Array of 2 value arrays.
*        First element is name, second value is description.
* @property choiceParameter {Object.<String, ChoiceObject>} Choice object
*        description for choice parameters
* @property dataSettings {DataSettings}
*        Object contains 'uom' (unit of measurement) with a string as value
*        which is added to the parameter identifier label when rendered.
*/


require('./utils.js');

function defaultFor(arg, val) { return typeof arg !== 'undefined' ? arg : val; }

const EventEmitter = require('events');


/** The FilterManager class 
* @memberof module:graphly
* @fires module:graphly.FilterManager#filterChange
* @fires module:graphly.FilterManager#removeFilter
*/
class FilterManager extends EventEmitter {

 
    /**
    * Create instance of FilterManager
    * @constructor
    * @param options {Object} Configuration of the Filter Manager.
    * @param options.el {String} d3 selector identifer string.
    * @param options.showCloseButtons {boolean} Optional, default false.
    *        Add close icon for each filter.
    * @param options.replaceUnderlines {boolean} Optional, default false.
    *        Replace underlines  with spaces when showing parameter identifier
    *        as labels.
    * @param options.filterSettings {FilterSettings} Optional additional Filter 
    *        Settings.
    * @param options.filterAxisTickFormat {String} Optional d3 format string to
    *        be used for tick styling.
    */

    constructor(params) {
        super();

        this.el = d3.select(params.el);
        this.filterSettings = params.filterSettings;
        this.visibleFilters = this.filterSettings.visibleFilters;
        this.boolParameter = defaultFor(this.filterSettings.boolParameter, []);
        this.choiceParameter = defaultFor(this.filterSettings.choiceParameter, []);
        this.maskParameter = defaultFor(this.filterSettings.maskParameter, []);
        this.data = defaultFor(params.data, {});
        this.dataSettings = defaultFor(this.filterSettings.dataSettings, {});
        this.showCloseButtons = defaultFor(params.showCloseButtons, false);
        this.replaceUnderlines = defaultFor(params.replaceUnderlines, false);
        this.filterAxisTickFormat = defaultFor(params.filterAxisTickFormat, 'g');
        
        this.initManager();
        this.extents = {};

        this.margin = defaultFor(
            params.margin,
            {top: 10, right: 10, bottom: 10, left: 70}
        );
        if(!this.el.empty()){
            this.dim = this.el.node().getBoundingClientRect();
            this.width = this.dim.width - this.margin.left - this.margin.right;
            this.height = this.dim.height - this.margin.top - this.margin.bottom;
        }
    }

    /**
    * Initialize various objects of class
    */
    initManager(){
        this.filters = {};
        this.brushes = {};
        this.boolFilters = {};
        this.maskFilters = {};
        this.boolFilStat = {};
    }

    /**
    * Reset all filters
    */
    resetManager(){
        this.initManager();
        this.emit('filterChange', {});
        this._renderFilters();
    }

    _initData() {

        // Create grouped data item for related products if necessary
        for (var g in this.filterSettings.parameterMatrix){
            var items = this.filterSettings.parameterMatrix[g];
            for (var i = 0; i < items.length; i++) {
                if(this.data.hasOwnProperty(items[i])){
                    if(this.data.hasOwnProperty(g)){
                        this.data[g].push(this.data[items[i]].slice());
                    }else{
                        this.data[g] = this.data[items[i]].slice();
                    }
                }
            }
        }

        this.extents = {};
        for (var d in this.data){
            if(this.dataSettings.hasOwnProperty(d) &&
                this.dataSettings[d].hasOwnProperty('extent')){
                this.extents[d] = this.dataSettings[d].extent;
            }else{
                let domain;
                if(this.dataSettings.hasOwnProperty(d) &&
                    this.dataSettings[d].hasOwnProperty('nullValue')){
                    let nV = this.dataSettings[d].nullValue;
                    // If parameter has nullvalue defined ignore it 
                    // when calculating extent
                    domain = d3.extent(
                        this.data[d], (v)=>{
                            if(v !== nV){
                                return v;
                            } else {
                                return null;
                            }
                        }
                    );
                } else {
                    domain = d3.extent(this.data[d]);
                }
                if(domain[0] === domain[1]){
                    domain[0] = domain[0]-1;
                    domain[1] = domain[1]+1;
                }
                this.extents[d] = domain;
            }
            
            // TODO: Possibility to use quantiles for extent if there are huge 
            // jumps in the data? this approach is extremely slow....
            /*var sArr = this.data[d].slice(0).sort(d3.ascending);
            this.extents[d] = [
                d3.quantile(sArr, 0.05), d3.quantile(sArr, 0.95)
            ];*/

            // Check if min and max extent is the same, if yes pad it with 1/4
            // the size, same min and max create display issues in scales.
            // Only do this if it is not a flag filter
            if(this.boolParameter.indexOf(d) === -1 &&
               this.extents[d][0]===this.extents[d][1]){
                var offset = this.extents[d][0]/4;
                if(offset===0){
                    offset = 1;
                }
                this.extents[d][0] = this.extents[d][0] - offset;
                this.extents[d][1] = this.extents[d][1] + offset;
            }
        }
    }

    _brushEnd() {

        var filters = {}; 
        // TODO: Im wiping here the bool filters need to think how to solve this
        this.visibleFilters.forEach(d => {
            // Check if axis available for parameter and with a brush extent
            if(this.y.hasOwnProperty(d) && !this.y[d].brush.empty()){
                var ext = this.y[d].brush.extent();
                this.brushes[d] = ext;
                // Check if the current item is a grouped item, if yes
                // go through related filter items and find match
                if (this.filterSettings.parameterMatrix.hasOwnProperty(d)){
                    // Grouped item, use corresponding filters
                    var relFilters = this.filterSettings.parameterMatrix[d];
                    for (var f=0; f<relFilters.length; f++){
                        filters[relFilters[f]] = (val)=>{
                            return val <= ext[1] && val >= ext[0];
                        };
                    }
                }else{
                    filters[d] = (val)=>{
                        return val <= ext[1] && val >= ext[0];
                    };
                }
            }else{
                if (this.brushes.hasOwnProperty(d)){
                    delete this.brushes[d];
                }
            }
        });
        this.filters = filters;
        this._filtersChanged();
    }

    customScientificTickFormat(d) {
        var gFormat = d3.format('g');
        var sFormat = d3.format('s');
        d = d.toFixed(11);
        if( (d>0.001 && d<9999) || (d<-0.001 && d>-9999) ){
            return gFormat(d);
        } else {
            return sFormat(d).allReplace({
                'Y': 'ₓ10²⁴',
                'Z': 'ₓ10²¹',
                'E': 'ₓ10¹⁸',
                'P': 'ₓ10¹⁵',
                'T': 'ₓ10¹²',
                'G': 'ₓ10⁹',
                'M': 'ₓ10⁶',
                'k': 'ₓ10³',
                'h': 'ₓ10²;',
                'da':'ₓ10¹;',
                'd': 'ₓ10⁻¹',
                'c': 'ₓ10⁻²',
                'm': 'ₓ10⁻³',
                'µ': 'ₓ10⁻⁶',
                'n': 'ₓ10⁻⁹',
                'p': 'ₓ10⁻¹²',
                'f': 'ₓ10⁻¹⁵',
                'a': 'ₓ10⁻¹⁸',
                'z': 'ₓ10⁻²¹',
                'y': 'ₓ10⁻²⁴'
            });
        }
    }

    _createMaskFilterElement(d, data) {

        var height = 252;
        var width = 120;
        var bins = 28;

        var mP = this.maskParameter[d];
        var enabled = mP.hasOwnProperty('selection');
        var selection = 0;
        if(enabled){
           selection = mP.selection;
        }

        var that = this;

        var div = this.el.append('div')
                .attr('class', 'filterContainer maskfilter')
                .style('float', 'left')
                .style('width', width+'px')
                .style('height', height+'px');

        div.append('div')
            .attr('class', function(){
                if (!that.maskParameter[d].hasOwnProperty('selection')){
                    return 'editButton add';
                }else{
                    return 'editButton remove';
                }
            })
            .style('line-height', '10px')
            .on('click', function(){
                if(!that.maskParameter[d].hasOwnProperty('selection')){
                    // TODO: Decide on default value
                    /*var mask = '';
                    for (var i = 0; i < that.maskParameter[d].values.length; i++) {
                        mask+='1';
                    }
                    that.maskParameter[d].selection = parseInt(mask, 2);*/
                    that.maskParameter[d].selection = 0;
                    that.maskFilters[d] = (val)=>{
                        return (val === 0);
                    };
                }else{
                    delete that.maskFilters[d];
                    delete that.maskParameter[d].selection;
                }
                that._filtersChanged();

            });

        var label = d;
        if(this.dataSettings.hasOwnProperty(d) && 
            this.dataSettings[d].hasOwnProperty('uom') && 
            this.dataSettings[d].uom !== null){
            label += ' ['+this.dataSettings[d].uom + ']';
        }
        if(this.replaceUnderlines){
            label = label.replace(/_/g, " ");
        }
        div.append('div')
            .attr('class', 'parameterLabel')
            .style('transform', d=>{
                return 'translate(10px,'+
                (height-20)+
                'px) rotate(-90deg)';
            })
            .style('width', height-20+'px')
            .html(label);

        var onInputClick = function(evt){
            
            var inputArray = d3.select(this.parentNode.parentElement)
                .selectAll('input')[0];

            var bits = '';
            for (var i = 0; i < inputArray.length; i++) {
                bits += Number(d3.select(inputArray[i]).property('checked'));
            }

            var filterMask = parseInt(bits, 2);
            that.maskParameter[d].selection = filterMask;
            that.maskFilters[d] = (val)=>{
                return (val === filterMask);
            };
            that._filtersChanged();
        };

        var maskLength = mP.values.length-1;

        div.selectAll("input")
            .data(mP.values)
            .enter()
            .append('label')
                .attr('for',function(d,i){ return d[0]; })
                .attr('title',function(d,i){ return d[1]; })
                .style('color', function(d){
                    var color = '#000';
                    if(!enabled){
                        color = '#aaa';
                    }
                    return color;
                })
                .text(function(d) { return d[0]; })
            .append("input")
                .property("checked", function(d,i){
                    return (selection & (0b1 << maskLength-i))>0;
                })
                .property('disabled', function(d){
                    return !enabled;
                })
                .attr("class", "maskinput")
                .attr("type", "checkbox")
                .attr("id", function(d,i) { return d[0]; })
                .on('click',onInputClick);

    }

    _createFilterElement(d, data) {

        var height = 252;
        var width = 120;
        var bins = 28;

        var div = this.el.append('div')
                .attr('class', 'filterContainer')
                .style('float', 'left')
                .style('width', width+'px')
                .style('height', height+'px');

        div.append('div')
            .attr('class', 'labelClose cross')
            .on('click', ()=>{
                /**
                * When close buttons are shown event is fired with 
                * parameter identifier when close button is clicked.
                *
                * @event module:graphly.FilterManager#removeFilter
                * @property {String} id - Provides identifier of parameter
                */
                this.emit('removeFilter', d);
            });

        var label = d;
        if(this.dataSettings.hasOwnProperty(d) && 
            this.dataSettings[d].hasOwnProperty('uom') && 
            this.dataSettings[d].uom !== null){
            label += ' ['+this.dataSettings[d].uom + ']';
        }
        if(this.replaceUnderlines){
            label = label.replace(/_/g, " ");
        }

        if(this.brushes.hasOwnProperty(d)){
            div.append('div')
                .attr('class', 'eraserIcon editButton')
                .style('right', ()=>{
                    if(this.showCloseButtons){
                        return '9px';
                    } else {
                        return '0px';
                    }
                })
                .on('click', ()=>{
                    this.y[d].brush.clear();
                    this._brushEnd();
                    }
                );
        }

        div.append('div')
            .attr('class', 'parameterLabel')
            .style('transform', d=>{
                return 'translate(10px,'+
                (height-20)+
                'px) rotate(-90deg)';
            })
            .style('width', height-20+'px')
            .html(label);

        var svg = div.append('svg')
            .attr('width', (width))
            .attr('height', (height))
            .style('position', 'absolute')
            .append("g")
                .attr("display", "block")
                .attr("transform", "translate(" + 
                    (this.margin.left) + "," + 
                    (this.margin.top) + ")"
                );

        var extents = this.extents;
        var heightRange = (height-this.margin.top-this.margin.bottom);
        this.y[d] = d3.scale.linear()
            .range([heightRange, 0])
            .domain(extents[d]).nice();


        this.y[d].brush = d3.svg.brush()
            .y(this.y[d])
            .on("brushend", this._brushEnd.bind(this))
            .on("brush", function(param){
                // Add extent information for selection
                let brush_top = d3.select(this).selectAll('.resize.n');
                let brush_bottom = d3.select(this).selectAll('.resize.s');
                let extent = d3.event.target.extent()
                let format = d3.format('.2s');

                brush_top.select('text').remove();
                brush_bottom.select('text').remove();
                brush_top.select('rect').remove();
                brush_bottom.select('rect').remove();

                let toprect = brush_top.append('rect')
                   .attr('fill', 'white')
                   .attr('height', '16');
                let toptext = brush_top.append('text')
                   .text(format(extent[1]))
                let width = toptext.node().getBBox().width+4;
                toprect.attr('width', width).style('transform', 'translate('+(-width/2)+'px,-26px)');
                toptext.style('transform', 'translate('+(-width/2+3)+'px,-14px)');

                let botrect = brush_bottom.append('rect')
                   .attr('fill', 'white')
                   .attr('height', '16');
                let bottext = brush_bottom.append('text')
                   .text(format(extent[0]));
                width = bottext.node().getBBox().width+4;
                botrect.attr('width', width).style('transform', 'translate('+(-width/2)+'px,10px)');
                bottext.style('transform', 'translate('+(-width/2+3)+'px,22px)');
            });

 
        var tempScale = d3.scale.linear()
            .domain([0, bins+1])
            .range(this.y[d].domain());

        var tickArray = d3.range(bins+1).map(tempScale);

        this.hist_data[d] = d3.layout.histogram()
            .bins(tickArray)
            (data[d]);


        this.x_hist[d] = d3.scale.linear()
            .domain([0, d3.max(this.hist_data[d], function(data) { 
                return data.length;
            })])
            .range([0, 40]);

        var bar = svg.selectAll('.' + d)
            .data(this.hist_data[d])
            .enter().append('g')
            .attr('class', 'bar '+d)
            .attr('transform', dat => { 
                var height_modifier = this.y[d](dat.x) - heightRange/bins;
                if(!height_modifier){
                    height_modifier = 0;
                }
                return 'translate(0,' + (height_modifier) + ')';
            });

        var x_hist = this.x_hist;

        bar.append('rect')
            .attr('height', 
                Math.floor(heightRange/bins)-1
            )
            .attr('width', function(dat) {
                // Make sure that non-zero height is shown to know where data
                // is available (even if it is so small it would not show)
                var size = x_hist[d](dat.y);
                if(size !== 0){
                    size = Math.max(size, 3);
                }
                return size;
            })
            .style('fill', '#1F77B4');

        // Add an axis
        var self = this;
        var g = svg.append("svg:g")
            .attr("class", "axis")
            .each(function() { 
                d3.select(this).call(self.axis.scale(self.y[d]));
            });

        //  Update brushes with previous extents if available
        if(this.brushes.hasOwnProperty(d)){
            this.y[d].brush.extent(this.brushes[d]);
            //this.el.select('.brush').call(this.y[b].brush);
        }

        g.append("svg:g")
            .attr("class", "brush")
            .each(function() { d3.select(this).call(self.y[d].brush); })
            .selectAll("rect")
            .attr("x", -8)
            .attr("width", 16);
    }

    _filtersChanged(){
        var filters = Object.assign(
            {}, this.filters, this.boolFilters, this.maskFilters
        );
        /**
        * Event fired When any filter is changed.

        * @event module:graphly.FilterManager#filterChange
        * @property {Object} filters - object containing parameter identifier as key
        * and filter function as value. 
        */
        this.emit('filterChange', filters);
        this._renderFilters();
        /*var cEv = new CustomEvent('change', {detail: filters});
        this.el.node().dispatchEvent(cEv);*/

    }

    _createChoiceFilterElements(el){

        let keys = Object.keys(this.choiceParameter);
        var that = this;

        for (var i = 0; i < keys.length; i++) {

            var id = keys[i];
            var data = this.choiceParameter[id];

            if(!this.boolFilStat.hasOwnProperty(id)){
                this.boolFilStat[id] = {
                    enabled: false
                };
            }


            var selected = data.selected;
            // If parameter is actually available in the dataset render it
            if(this.data.hasOwnProperty(id)){

                var container = el.append('div')
                    .attr('class', 'choiceParameterContainer');

                var label = container.append('label')
                        .attr('for', id)
                        .text(id);

                let choiceSelect = container
                    .append('select')
                        .attr('id',id)
                        .on('change', onChoiceChange.bind(null, id, data));

                let options = choiceSelect
                    .selectAll('option')
                        .data(data.options).enter()
                            .append('option')
                            .text(function (d) { return d.name; })
                            .attr('value', function (d) { return d.value; })
                            .property('selected', function(d){
                                return d.value === selected;
                            });

                let disabled = choiceSelect.insert('option',':first-child')
                            .text('no filter')
                            .attr('value', -1);

                if(selected === -1){
                    disabled.property('selected', true);
                }

                function onChoiceChange(id, data) {

                    let selectValue = d3.select('#'+id).property('value');
                    // Check if it is a number, if yes, convert it
                    if(!isNaN(selectValue)){
                        selectValue = Number(selectValue);
                    }

                    data.selected = selectValue;

                    if(selectValue === -1){
                        if(that.boolFilters.hasOwnProperty(id)){
                            delete that.boolFilters[id];
                        }
                    }else{
                        that.boolFilters[id] = (val)=>{
                            return val === selectValue;
                        };
                    }
                    that._filtersChanged();
                }

                // TODO: This should probably be done once during initialization
                // making sure all configured filters are used initially
                // for now i will check here if the filter applys and will
                // call a filterchange event
                if(selected!==-1 && !this.boolFilters.hasOwnProperty(id)){
                    this.boolFilters[id] = (val)=>{
                        return val === selected;
                    };
                    this._filtersChanged();
                }
            }
        }
    }

    _createBoolFilterElements() {
        var height = 252;
        var width = 244;
        var that = this;

        var div = this.el.append('div')
                .attr('class', 'filterContainer')
                .style('float', 'left')
                .style('width', width+'px')
                .style('height', height+'px');

        for (var i = 0; i < this.boolParameter.length; i++) {
            var d = this.boolParameter[i];
            // If parameter is actually available in the dataset render it
            if(this.data.hasOwnProperty(d)){

                if(!this.boolFilStat.hasOwnProperty(d)){
                    this.boolFilStat[d] = {
                        enabled: false,
                        checked: true
                    };
                }
                var container = div.append('div')
                    .attr('class', 'boolParameterContainer');

                var label = container.append('label')
                        .attr('for', d)
                        .style('color', '#555')
                        .text(d);

                container.append('div')
                        .attr('class', function(){
                            if (!that.boolFilStat[d].enabled){
                                return 'editButton add';
                            }else{
                                return 'editButton remove';
                            }
                        })
                        .style('line-height', '10px')
                        .on('click', function(){
                            var id = d3.select(this.parentNode)
                                .select('input')
                                .attr('id');

                            if(!that.boolFilStat[id].enabled){
                                that.boolFilStat[id].enabled = true;
                                d3.select(this.parentNode).select('input')
                                    .attr('disabled', null);
                                d3.select(this.parentNode).select('label')
                                    .style('color', null);
                                d3.select(this)
                                    .attr('class', 'editButton remove');
                                var checked = that.boolFilStat[id].checked;
                                that.boolFilters[id] = (val)=>{
                                    // Add !! to convert 0,1 ints to bool for comparison
                                    return !!val ===  checked;
                                };
                                that._filtersChanged();
                            }else{
                                that.boolFilStat[id].enabled = false;
                                d3.select(this.parentNode).select('input')
                                    .attr('disabled', true);
                                d3.select(this.parentNode).select('label')
                                    .style('color', '#555');
                                d3.select(this)
                                    .attr('class', 'editButton add');
                                delete that.boolFilters[id];
                                that._filtersChanged();
                            }
                        });

                var input = container.append("input")
                        .property('checked', that.boolFilStat[d].checked)
                        .attr("type", "checkbox")
                        .attr("id", d);

                if(that.boolFilStat[d].enabled){
                    label.style('color', null);
                }else{
                    input.attr('disabled', true);
                }
      
                input.on('click', function(){
                    var checked = this.checked;
                    var id = this.id;
                    that.boolFilStat[id].checked = checked;
                    that.boolFilters[id] = (val)=>{
                        return !!val === checked;
                    };
                    that._filtersChanged();
                });
            }
        }

        // Check if there are choice filter parameters if yes create them 
        // also here
        if(Object.keys(this.choiceParameter).length>0){
            this._createChoiceFilterElements(div);
        }

        // If element is empty because the provided parameters are not in the 
        // current dataset, remove the div
        if(div.selectAll('*')[0].length === 0){
            div.remove();
        }
    }


    _renderFilters() {

        if(this.el.empty()){
            // If no element is defined to render the filters into do not 
            // render the filter elements
            return;
        }

        this.el.selectAll('*').remove();

        this.y = {};
        this.hist_data = {};
        this.x_hist = {};
        this.axis = d3.svg.axis().orient("left");

        let fformat;
        if(this.filterAxisTickFormat === 'customSc'){
            fformat = this.customScientificTickFormat;
        }else {
            fformat = d3.format(this.filterAxisTickFormat);
        }
        this.axis.tickFormat(fformat);
        
        var data = {};

        for(var p in this.data){
            data[p] = this.data[p];
        }

        var currentFilters = Object.assign(
            {}, this.filters, this.boolFilters, this.maskFilters
        );
        for (var f in currentFilters){
            var filter = currentFilters[f];
            // Check if data actually has filter paramter
            if(!data.hasOwnProperty(f)){
                continue;
            }
            var currentDataset = data[f];
            for (var p in data){
                var applicableFilter = true;
                if(this.filterSettings.hasOwnProperty('filterRelation')){
                    applicableFilter = false;
                    let insideGroup = false;
                    var filterRel = this.filterSettings.filterRelation;

                    for (var i = 0; i < filterRel.length; i++) {
                        // If one of the items is in the defined set and the
                        //  other is not (e.g. filter id is in collection but 
                        // current data id is not)
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
                // Check if filter is a grouped filter
                if (this.filterSettings.parameterMatrix.hasOwnProperty(p)){
                    applicableFilter = false;
                }

                if(applicableFilter){
                    data[p] = data[p].filter((e,i)=>{
                        return filter(currentDataset[i]);
                    });
                }
            }
        }

        // Recreate grouped data from filtered data
        for (var g in this.filterSettings.parameterMatrix){
            var items = this.filterSettings.parameterMatrix[g];
            data[g] = [];
            for (var i = 0; i < items.length; i++) {
                if(this.data.hasOwnProperty(items[i])){
                    data[g].pushArray(data[items[i]]);
                }
            }
        }

        let choiceKeys = Object.keys(this.choiceParameter);
        
        this.visibleFilters.forEach(d=>{
            if(this.data.hasOwnProperty(d) && 
               this.boolParameter.indexOf(d) === -1 &&
               choiceKeys.indexOf(d) === -1){
                if(this.maskParameter.hasOwnProperty(d)){
                    this._createMaskFilterElement(d, data);
                }else{
                    this._createFilterElement(d, data);
                }
            }
        });

        // Render bool filter elements
        this._createBoolFilterElements();

        // Resize brush background element to make selection of brush easier
        this.el.select('.brush .background').attr('x',-16).attr('width', 32);


    }

    /**
    * Set the node where the manager shall be rendered to after instanziation.
    * @param {String} el d3 selector identifer string.
    */
    setRenderNode(el){
        this.el = d3.select(el);
        this._renderFilters();
    }

    /**
    * Set the node where the manager shall be rendered to after instanziation.
    * @return {Object} html node where FilterManager is being rendered to.
    */
    getNode(){
        return this.el.node();
    }

    /**
    * Load data to be used for creation of filter panels
    * @param {Object} data Object containing parameter id as key and array of values 
    *        as value. 
    */
    loadData(data){
        this.data = data;
        this._initData();
        this._renderFilters();
    }

    /**
    * Update used filter settings and re-render
    * @param {Object} settings See filterSettings description of Filter Manager 
    *        constructor.
    */
    updateFilterSettings(settings){
        this.filterSettings = settings;
        this._renderFilters();
    }

    /**
    * Update used data settings and re-render
    * @param {Object} settings See dataSettings description of Filter Manager 
    *        constructor.
    */
    updateDataSettings(settings){
        this.dataSettings = settings;
        this._renderFilters();
    }

}

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined')
    module.exports = FilterManager;
else
    window.FilterManager = FilterManager;

