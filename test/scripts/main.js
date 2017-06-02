






var graph = new graphly.graph({
    el: '#graph',
    renderSettings: {
        xAxis: [
            ['mie_datetime_start', 'mie_datetime_stop'],
            'mie_datetime_start'
        ],
        yAxis: [
            ['mie_altitude_bottom', 'mie_altitude_top'],
             'mie_dem_altitude'
        ],
        //y2Axis: [],
        colorAxis: [
            'mie_wind_velocity',
            null
        ],

    },
    dataSettings: {
        dem_height: {
            symbol: null,
            uom: 'm',
            lineConnect: true,
            color: [0.2, 0.2, 1.0, 0.8]
        },
        mie_wind_velocity: {
            uom: 'cm/s',
            colorscale: 'plasma'
            //outline: false
        }
    }
});

//graph.loadCSV('aeolus_test.csv');

var xhr = new XMLHttpRequest();
xhr.open('GET', 'data/AE_OPER_ALD_U_N_2B_20151001T001124_20151001T014212_0001.MSP', true);
xhr.responseType = 'arraybuffer';

xhr.onload = function(e) {
    var tmp = new Uint8Array(this.response)
    var data = msgpack.decode(tmp);
    graph.loadData(data);
};
xhr.send();


d3.select('#datafiles').on('change', function(e){
    var sel = document.getElementById('datafiles');
    xhr.open('GET', sel.options[sel.selectedIndex].value, true);
    xhr.send();
});


