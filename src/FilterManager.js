
class FilterManager {

    constructor(params) {
        this.el = d3.select(params.el);
        this.filterSettings = params.filterSettings;
        this.visibleFilters = this.filterSettings.visibleFilters;
        this.boolParameter = defaultFor(this.filterSettings.boolParameter, []);
        this.data = defaultFor(params.data, {});
        
        this.initManager();

        this.margin = defaultFor(
            params.margin,
            {top: 10, right: 10, bottom: 10, left: 70}
        );
        this.dim = this.el.node().getBoundingClientRect();
        this.width = this.dim.width - this.margin.left - this.margin.right;
        this.height = this.dim.height - this.margin.top - this.margin.bottom;

    }

    initManager(){
        this.filters = {};
        this.brushes = {};
        this.boolFilters = {};
        this.boolFilStat = {};
        this.extents = {};
    }

    _initData() {

        // Create grouped data item for related products if necessary
        for (var g in this.filterSettings.parameterMatrix){
            var items = this.filterSettings.parameterMatrix[g];
            for (var i = 0; i < items.length; i++) {
                if(this.data.hasOwnProperty(items[i])){
                    if(this.data.hasOwnProperty(g)){
                        this.data[g].push(this.data[items[i]]);
                    }else{
                        this.data[g] = this.data[items[i]];
                    }
                }
            }
        }

        this.extents = {};
        for (var d in this.data){
            this.extents[d] = d3.extent(this.data[d]);
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
            
            .attr('class', 'parameterLabel')
            .style('transform', d=>{
                return 'translate(10px,'+
                (height-20)+
                'px) rotate(-90deg)';
            })
            .html(d);

        var svg = div.append('svg')
            .attr('width', (width))
            .attr('height', (height))
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
            .on("brush", function(param){});

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

        var bar = svg.selectAll("." + d)
            .data(this.hist_data[d])
            .enter().append("g")
            .attr("class", "bar "+d)
            .attr("transform", dat => { 
                var height_modifier = this.y[d](dat.x) - heightRange/bins;
                if(!height_modifier){
                    height_modifier = 0;
                }
                return "translate(0," + (height_modifier) + ")";
            });

        var x_hist = this.x_hist;

        bar.append("rect")
            .attr("height", 
                Math.floor(heightRange/bins)-1
            )
            .attr("width", function(dat) {
                return x_hist[d](dat.y);
            })
            .style("fill", "#1F77B4");

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
        var filters = Object.assign({}, this.filters, this.boolFilters);
        this._renderFilters();
        var cEv = new CustomEvent('change', {detail: filters});
        this.el.node().dispatchEvent(cEv);
    }


    _createBoolFilterElements() {
        var height = 252;
        var width = 120;
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
                                    return val === checked;
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
                        return val === checked;
                    };
                    that._filtersChanged();
                });
            }
        }

        // If element is empty because the provided parameters are not in the 
        // current dataset, remove the div
        if(div.selectAll('*')[0].length === 0){
            div.remove();
        }
    }


    _renderFilters() {

        this.el.selectAll('*').remove();

        this.y = {};
        this.hist_data = {};
        this.x_hist = {};
        this.axis = d3.svg.axis().orient("left");
        
        var data = {};

        for(var p in this.data){
            data[p] = this.data[p];
        }

        var currentFilters = Object.assign({}, this.filters, this.boolFilters);
        for (var f in currentFilters){
            var filter = currentFilters[f];
            var currentDataset = data[f];
            for (var p in data){
                var applicableFilter = true;
                if(this.filterSettings.hasOwnProperty('filterRelation')){
                    applicableFilter = false;
                    var filterRel = this.filterSettings.filterRelation;

                    for (var i = 0; i < filterRel.length; i++) {
                        // If one of the items is in the defined set and the
                        //  other is not (e.g. filter id is in collection but 
                        // current data id is not)
                        if( (filterRel[i].indexOf(p)!==-1) === 
                            (filterRel[i].indexOf(f)!==-1)){

                            applicableFilter = true;
                            break;
                        }
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

        this.visibleFilters.forEach(d=>{
            if(this.data.hasOwnProperty(d) && 
               this.boolParameter.indexOf(d) === -1){
                this._createFilterElement(d, data);
            }
        });

        // Render bool filter elements
        this._createBoolFilterElements();


    }

    getNode(){
        return this.el.node();
    }

    loadData(data){
        this.data = data;
        this._initData();
        this._renderFilters();
    }

    updateFilterSettings(settings){
        this.filterSettings = settings;
        this._renderFilters();
    }

}

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined')
    module.exports = FilterManager;
else
    window.FilterManager = FilterManager;

