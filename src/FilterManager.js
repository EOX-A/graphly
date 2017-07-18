
class FilterManager {

    constructor(params) {
        this.el = d3.select(params.el);
        this.filterSettings = params.filterSettings;
        this.visibleFilters = this.filterSettings.visibleFilters;
        this.data = defaultFor(params.data, {});
        this.filters = {};
        this.brushes = {};

        this.margin = defaultFor(
            params.margin,
            {top: 10, right: 10, bottom: 10, left: 50}
        );
        this.dim = this.el.node().getBoundingClientRect();
        this.width = this.dim.width - this.margin.left - this.margin.right;
        this.height = this.dim.height - this.margin.top - this.margin.bottom;

    }

    _brushEnd() {
        var filters = {}; 
        this.visibleFilters.forEach(d => {
            if(this.y.hasOwnProperty(d) && !this.y[d].brush.empty()){
                var ext = this.y[d].brush.extent();
                this.brushes[d] = ext;
                filters[d] = (val)=>{
                    return val <= ext[1] && val >= ext[0];
                };
            }else{
                if (this.brushes.hasOwnProperty(d)){
                    delete this.brushes[d];
                }
            }
        });

        var cEv = new CustomEvent('change', {detail: filters});
        this.el.node().dispatchEvent(cEv);
        this.filters = filters;
        this._renderFilters();
    }

    _createFilterElement(d, data) {

        var height = 252;
        var width = 100;
        var bins = 28;

        var div = this.el.append('div')
                .attr('class', 'filterContainer')
                .style('float', 'left')
                .style('width', width+'px')
                .style('height', height+'px');

        var svg = div.append('svg')
            .attr('width', (width))
            .attr('height', (height))
            .append("g")
                .attr("display", "block")
                .attr("transform", "translate(" + (this.margin.left) + "," + (this.margin.top) + ")");

        var heightRange = (height-this.margin.top-this.margin.bottom);
        this.y[d] = d3.scale.linear()
            .range([heightRange, 0])
            .domain(d3.extent(this.data[d])).nice();

        this.y[d].brush = d3.svg.brush()
            .y(this.y[d])
            .on("brushend", this._brushEnd.bind(this))
            .on("brush", function(param){});

        var tempScale = d3.scale.linear().domain([0, bins+1]).range(this.y[d].domain());
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


        for (var f in this.filters){
            var currentDataset = data[f];
            for (var p in data){
                data[p] = data[p].filter((e,i)=>{
                    return this.filters[f](currentDataset[i]);
                });
            }
        }

        this.visibleFilters.forEach(d=>{
            if(this.data.hasOwnProperty(d)){
                this._createFilterElement(d, data);
            }
        });


    }

    getNode(){
        return this.el.node();
    }

    loadData(data){
        this.data = data;
        this._renderFilters();
    }

    updateFilterSettings(settings){
        this.filterSettings = settings;
        this._renderFilters();
    }

    getFilters() {

    }

}