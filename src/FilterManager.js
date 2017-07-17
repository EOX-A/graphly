
class FilterManager {

    constructor(params) {
        this.el = d3.select(params.el);
        this.filterSettings = params.filterSettings;
        this.visibleFilters = this.filterSettings.visibleFilters;
        this.data = defaultFor(params.data, {});

        this.margin = defaultFor(
            params.margin,
            {top: 10, right: 10, bottom: 10, left: 50}
        );
        this.dim = this.el.node().getBoundingClientRect();
        this.width = this.dim.width - this.margin.left - this.margin.right;
        this.height = this.dim.height - this.margin.top - this.margin.bottom;

        /*this.svg = this.el.append('svg')
                .attr('id', 'filterSVG')
                .attr('width', this.width)
                .attr('height', this.height)
                .append('g')
                .attr('display', 'block')
                .attr('transform', 'translate(' + (this.margin.left) + ',' + (this.margin.top) + ')');*/
    }

    _renderFilter(){
        d3.select(this.el).empty();

    }

    _updateFilters() {

        this.y = {};
        this.hist_data = {};
        this.x_hist = {};
        this.axis = d3.svg.axis().orient("left");
        var height = 270;
        var width = 100;
        var bins = 40;

        this.visibleFilters.forEach(function(d) {

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

                
            this.y[d] = d3.scale.linear()
                .range([(height-this.margin.top-this.margin.bottom), 0])
                .domain(d3.extent(this.data[d]));

            this.y[d].brush = d3.svg.brush()
                .y(this.y[d])
                /*.on("brushend", brushend)
                .on("brush", function(param){})*/;

            var tempScale = d3.scale.linear().domain([0, bins]).range(this.y[d].domain());
            var tickArray = d3.range(bins + 1).map(tempScale);

            this.hist_data[d] = d3.layout.histogram()
                .bins(tickArray)
                (this.data[d]);


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
                    var height_modifier = this.y[d](dat.x) - height/bins;
                    if(!height_modifier){
                        height_modifier = 0;
                    }
                    return "translate(0," + (height_modifier) + ")";
                });

            var x_hist = this.x_hist;

            bar.append("rect")
                .attr("height", 
                    (height/bins-2)
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

            g.append("svg:g")
                .attr("class", "brush")
                .each(function() { d3.select(this).call(self.y[d].brush); })
                .selectAll("rect")
                .attr("x", -8)
                .attr("width", 16);


        }, this);


        //_renderFilters();
    }

    loadData(data){
        this.data = data;
        this._updateFilters();
    }

    updateFilterSettings(settings){
        this.filterSettings = settings;
        this._updateFilters();
    }

    getFilters() {

    }

}