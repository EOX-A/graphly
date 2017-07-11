




var renderSettings_mie = {
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

};

var renderSettings_ray = {
    xAxis: [
        ['rayleigh_datetime_start', 'rayleigh_datetime_stop'],
        'rayleigh_datetime_start'
    ],
    yAxis: [
        ['rayleigh_altitude_bottom', 'rayleigh_altitude_top'],
         'rayleigh_dem_altitude'
    ],
    //y2Axis: [],
    colorAxis: [
        'rayleigh_wind_velocity',
        null
    ],

};

var renderSettingsSwarm = {
    xAxis: ['Latitude'],
    yAxis: ['T_elec'],
    colorAxis: [ 'id' ],
};

var renderSettingsMRC = {
    xAxis: ['Frequency_Offset'],
    yAxis: ['Measurement_Error_Mie_Response'],
    colorAxis: [ null ],
};

var renderSettingsRRC = {
    xAxis: ['Frequency_Offset'],
    yAxis: ['Measurement_Error_Rayleigh_Response'],
    colorAxis: [ null ],
};


var dataSettings = {
    rayleigh_dem_altitude: {
        symbol: 'dot',
        uom: 'm',
        lineConnect: true,
        color: [0.2, 0.2, 1.0, 0.8]
    },
    rayleigh_wind_velocity: {
        uom: 'cm/s',
        colorscale: 'viridis'
        //outline: false
    },
    rayleigh_datetime_start: {
        scaleFormat: 'time',
        timeFormat: 'MJD2000_S'
    },
    rayleigh_datetime_stop: {
        scaleFormat: 'time',
        timeFormat: 'MJD2000_S'
    },


    mie_dem_altitude: {
        symbol: null,
        uom: 'm',
        lineConnect: true,
        color: [0.2, 0.2, 1.0, 0.8]
    },
    mie_wind_velocity: {
        uom: 'cm/s',
        colorscale: 'plasma'
        //outline: false
    },
    mie_datetime_start: {
        scaleFormat: 'time',
        timeFormat: 'MJD2000_S'
    },
    mie_datetime_stop: {
        scaleFormat: 'time',
        timeFormat: 'MJD2000_S'
    },


    T_elec: {
        symbol: 'dot',
        uom: 'n',
        regression: 'polynomial',
        //lineConnect: true,
        color: [0.2, 0.2, 1.0, 0.8]
    },
    Timestamp: {
        scaleFormat: 'time'
    },
    id: {
        scaleType: 'ordinal',
        categories: ['Alpha', 'Bravo']
    },
    Latitude: {

    },


    Measurement_Response: {
        symbol: 'dot',
        uom: 'Pixel',
        lineConnect: false,
        regression: 'linear',
        color: [0.2, 0.2, 1.0, 0.8]
    },
    Measurement_Error_Mie_Response: {
        symbol: 'dot',
        uom: 'Pixel',
        lineConnect: false,
        regression: 'polynomial',
        color: [0.2, 0.2, 1.0, 0.8]
    },
    Reference_Pulse_Response: {
        symbol: 'dot',
        uom: 'Pixel',
        lineConnect: false,
        color: [0.2, 0.2, 1.0, 0.8]
    },
    Reference_Pulse_Error_Mie_Response: {
        symbol: 'dot',
        uom: 'Pixel',
        lineConnect: false,
        color: [0.2, 0.2, 1.0, 0.8]
    },
    Frequency_Offset: {
        uom: 'GHZ'
    },

    Measurement_Error_Rayleigh_Response: {
        symbol: 'dot',
        uom: 'Pixel',
        lineConnect: false,
        regression: 'polynomial',
        color: [0.2, 0.2, 1.0, 0.8]
    }
};


var graph = new graphly.graph({
    el: '#graph',
    dataSettings: dataSettings,
    renderSettings: renderSettingsMRC
});



var xhr = new XMLHttpRequest();

xhr.open('GET', 'data/AE_OPER_AUX_MRC_1B_20071031T021229_20071031T022829_0002.MSP', true);
xhr.responseType = 'arraybuffer';

xhr.onload = function(e) {
    var tmp = new Uint8Array(this.response);
    var data = msgpack.decode(tmp);
    graph.loadData(data);
};

xhr.send();


d3.select('#datafiles').on('change', function(e){

    var sel = document.getElementById('datafiles');
    var sel_value = sel.options[sel.selectedIndex].value;

    if (sel_value.indexOf('testdata') === -1){
        if (sel_value.indexOf('MRC') !== -1){
            graph.renderSettings = renderSettingsMRC;
        }else if (sel_value.indexOf('RRC') !== -1){
            graph.renderSettings = renderSettingsRRC;
        }else {
            graph.renderSettings = renderSettings_ray;
        }
        xhr.open('GET', sel_value, true);
        xhr.send();
    }else{
        graph.renderSettings = renderSettingsSwarm;
        graph.loadCSV(sel_value);
    }
    
});


