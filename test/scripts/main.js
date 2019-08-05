


//global.d3 = d3;
/*let msgpack = require('msgpack-lite');
global.msgpack = msgpack;*/


var dataSettings = {};
var renderSettings = {
    xAxis: 'parameter1',
    yAxis: [ 'parameter2'],
    colorAxis: ['parameter3'],
}

// create random data
var data = {};
var parameters = [
    'parameter1', 'parameter2',
    'parameter3', 'parameter4'
];
var amount = 1000;
for (var i = 0; i < parameters.length; i++) {
    data[parameters[i]] = [];
    for (var j = 0; j < amount; j++) {
        data[parameters[i]].push(Math.random());
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
    //debug: true,
    //enableFit: false,
    //displayColorscaleOptions: false,
    //displayAlphaOptions: false
    //displayParameterLabel: false,
    //displayColorscaleOptions: false,
    //displayAlphaOptions: false,
    //autoColorExtent: true
    //fixedSize: true,
    //fixedWidth: 2000
    //multiYAxis: true,
    //enableSubXAxis: false,
    //enableSubYAxis: false,
    //colorscales: ['jet', 'viridis', 'pakito', 'plasma'],
    //showFilteredData: false
    //ignoreParameters: ['__info__'],
    //margin: {top: 50, left: 90, bottom: 50, right: 40},
    //colorAxisTickFormat: 'customExp',
    //defaultAxisTickFormat: 'customExp'

});

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




d3.select('#datafiles').on('change', function(e){

    var sel = document.getElementById('datafiles');
    var sel_value = sel.options[sel.selectedIndex].value;

    
   /* graph.setDataSettings(testbed14);
    if (sel_value.indexOf('testdata') === -1){
        if (sel_value.indexOf('MRC') !== -1){
            graph.setRenderSettings(renderSettingsMRC);
        }else if (sel_value.indexOf('RRC') !== -1){
            graph.setRenderSettings(renderSettingsRRC);
        }else if (sel_value.indexOf('ISR') !== -1){
            graph.setRenderSettings(renderSettingsISR);
        }else {
        }
        xhr.open('GET', sel_value, true);
        xhr.send();
    }else{
        graph.renderSettings = renderSettingsSwarm;
        graph.loadCSV(sel_value);
    }*/

});
