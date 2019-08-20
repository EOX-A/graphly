


import * as addT from './additionalTesting.js';


var dataSettings = {};
var renderSettings = {
    xAxis: 'parameter1',
    yAxis: [ 'parameter2'],
    colorAxis: ['parameter3'],
}

// create random data

// Standard Normal variate using Box-Muller transform.
function randn_bm() {
    var u = 0, v = 0;
    while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
}


var data = {};
var parameters = [
    'parameter1', 'parameter2',
    'parameter3', 'parameter4'
];
var amount = 1000;
for (var i = 0; i < parameters.length; i++) {
    data[parameters[i]] = [];
    for (var j = 0; j < amount; j++) {
        data[parameters[i]].push(randn_bm());
    }
}


var filterSettings = {
    visibleFilters: ['parameter1', 'parameter2']
};

var filterManager = new FilterManager({
    el:'#filters',
    filterSettings: filterSettings,
    ignoreParameters: '__info__'
});



var graph = new graphly.graphly({
    el: '#graph',
    dataSettings: dataSettings,
    renderSettings: renderSettings,
    filterManager: filterManager,
    debounceActive: false,
    debug: true,
    //labelAllignment: 'center',
    //enableFit: false,
    //displayColorscaleOptions: false,
    //displayAlphaOptions: false
    //displayParameterLabel: false,
    //displayColorscaleOptions: false,
    //displayAlphaOptions: false,
    //autoColorExtent: true
    //fixedSize: true,
    //fixedWidth: 2000
    //multiYAxis: false,
    //enableSubXAxis: false,
    //enableSubYAxis: false,
    //colorscales: ['jet', 'viridis', 'pakito', 'plasma'],
    //showFilteredData: false
    //ignoreParameters: ['__info__'],
    //margin: {top: 50, left: 90, bottom: 50, right: 40},
    //colorAxisTickFormat: 'customExp',
    //defaultAxisTickFormat: 'customExp'

});

graph.addColorScale(
    'redwhiteblue',['#ff0000', '#ffffff', '#0000ff'], [0, 0.5, 1]
);

filterManager.loadData(data);
graph.loadData(data);

//filterManager.setRenderNode('#filters');


graph.on('rendered', function() {
    //console.log('rendered');
});

filterManager.on('filterChange', function(filters){
    //console.log(filters);
});

d3.select('#save').on('click', function(){
    graph.saveImage('png' , 2);
});


d3.select('#reload').on('click', function(){
    graph.loadData(data);
});


graph.on('pointSelect', function(values){
    console.log(values);
});



var xhr = new XMLHttpRequest();
xhr.responseType = 'arraybuffer';


xhr.onload = function(e) {
    var tmp = new Uint8Array(this.response);
    var data = msgpack.decode(tmp);
    
    switch(selValue){
        case 'swarm':
            addT.handleSwarmData(data, graph, filterManager);
        break;
        case 'L1B':
            addT.handleL1BData(data, graph, filterManager);
        break;
        case 'L2A':
            addT.handleL2AData(data, graph, filterManager);
        break;
        case 'L2B_group':
            addT.handleL2BGroupData(data, graph, filterManager);
        break;
    }


};


window.onload = function () {

    var that = this;

   d3.select('#datafiles').on('change', function(e){

        var sel = document.getElementById('datafiles');
        that.selValue = sel.options[sel.selectedIndex].value;

        graph.renderSettings = addT.renderSettingsDefinition[that.selValue];
        graph.dataSettings = addT.dataSettingsConfig[that.selValue];
        filterManager.updateFilterSettings(addT.filterSettingsConfiguration[that.selValue]);

        xhr.open('GET', ('data/'+that.selValue+'.mp'), true);
        xhr.send();


    });

}