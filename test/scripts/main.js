


import * as addT from './additionalTesting.js';


var dataSettings = {
    parameter3: {
        colorscale: 'plasma',
        uom: 'uom',
        logarithmic: true,
    }
};
var renderSettings = {
    xAxis: 'parameter1',
    yAxis: [ 'parameter2'],
    colorAxis: ['parameter3'],
    y2Axis: [],
    colorAxis2: [],
    yAxisExtent: [null],
    y2AxisExtent: [],
    /*yAxisLocked: [true],
    y2AxisLocked: [false],*/
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
generateRandomData();

function generateRandomData() {
    var parameters = [
        'parameter1', 'parameter2',
        'parameter3', 'parameter4'
    ];
    /*var amount = 1000;
    for (var i = 0; i < parameters.length; i++) {
        data[parameters[i]] = [];
        for (var j = 0; j < amount; j++) {
            var extent = Math.random() * 100;
            data[parameters[i]].push(randn_bm() * extent);
        }
    }*/
    data['parameter1'] = [0, 0, 0, 0, 0, 0, 0, 0];
    data['parameter2'] = [1, 2, 3, 4, 5, 6, 7, 8];
    data['parameter3'] = [0.1, 1, 10, 100, 1000, 10000, 1000000, 10000000];
}




var filterSettings = {
    visibleFilters: ['parameter1', 'parameter2']
};

var filterManager = new FilterManager({
    el:'#filters',
    filterSettings: filterSettings,
    ignoreParameters: '__info__',
    replaceUnderscore: true,
});



var graph = new graphly.graphly({
    el: '#graph',
    dataSettings: dataSettings,
    renderSettings: renderSettings,
    filterManager: filterManager,
    debounceActive: false,
    debug: false,
    replaceUnderscore: true,
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
    //defaultAxisTickFormat: 'customExp',
    enableSubXAxis: 'datetime',
    allowLockingAxisScale: true,
    enableMaskParameters: true,
    //disableAntiAlias: true,

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

graph.on('colorScaleChange', function(parameter) {
    console.log(parameter);
});

filterManager.on('filterChange', function(filters){
    //console.log(filters);
});

d3.select('#save').on('click', function(){
    graph.saveImage('png' , 2);
});

d3.select('#resetfilter').on('click', function(){
    graph.filterManager.resetManager();
});


d3.select('#reload').on('click', function(){
    generateRandomData();
    graph.loadData(data);
    graph.filterManager.resetManager();
});


graph.on('pointSelect', function(values){
    console.log(values);
});

graph.on('axisExtentChanged', function(){
    console.log(this.renderSettings.yAxisExtent);
    console.log(this.renderSettings.y2AxisExtent);
    console.log(this.renderSettings.yAxisLocked);
    console.log(this.renderSettings.y2AxisLocked);
})



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
        case 'L2B':
            addT.handleL2BData(data, graph, filterManager);
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

    var startloaded = 'L2B';
    if(startloaded){
        this.selValue = startloaded;
        graph.setRenderSettings(addT.renderSettingsDefinition[startloaded]);
        graph.dataSettings = addT.dataSettingsConfig[startloaded];
        filterManager.updateFilterSettings(addT.filterSettingsConfiguration[startloaded]);
        filterManager.dataSettings = addT.dataSettingsConfig[startloaded];

        xhr.open('GET', ('data/'+startloaded+'.mp'), true);
        xhr.send();
    }

   d3.select('#datafiles').on('change', function(e){

        var sel = document.getElementById('datafiles');
        that.selValue = sel.options[sel.selectedIndex].value;

        graph.setRenderSettings(addT.renderSettingsDefinition[that.selValue]);
        graph.dataSettings = addT.dataSettingsConfig[that.selValue];
        filterManager.updateFilterSettings(addT.filterSettingsConfiguration[that.selValue]);
        filterManager.dataSettings = addT.dataSettingsConfig[that.selValue];

        xhr.open('GET', ('data/'+that.selValue+'.mp'), true);
        xhr.send();


    });

}