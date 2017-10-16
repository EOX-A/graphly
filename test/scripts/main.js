



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
    xAxis: ['Timestamp'],
    yAxis: ['T_elec'],
    colorAxis: [ 'id' ],
    dataIdentifier: {
        parameter: 'id',
        identifiers: ['Alpha', 'Bravo']
    }
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


var renderSettingsISR = {
    xAxis: ['Laser_Freq_Offset'],
    //yAxis: ['Mie_Response'],
    yAxis: ['Rayleigh_A_Response', 'Rayleigh_B_Response'],
    colorAxis: [ null ],
};


var dataSettings = {
    rayleigh_dem_altitude: {
        symbol: null,
        uom: 'm',
        lineConnect: true,
        color: [0.2, 0.2, 1.0, 0.8]
    },
    rayleigh_wind_velocity: {
        uom: 'cm/s',
        colorscale: 'viridis',
        extent: [-5000,5000]
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
        colorscale: 'plasma',
        extent: [-5000,5000]
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





    Mie_Response: {
        symbol: 'dot',
        lineConnect: true,
        color: [0.2, 0.8, 0.2, 0.8]
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
    },




    Measurement_Response: {
        symbol: 'dot',
        uom: 'Pixel',
        lineConnect: false,
        regression: 'linear',
        color: [0.2, 0.2, 1.0, 0.8]
    },
    Laser_Freq_Offset: {
        uom: 'GHZ'
    },
    Mie_Valid: {
        flag: 'boolean'
    },

    Rayleigh_Valid: {
        flag: 'boolean'
    },
    Fizeau_Transmission: {
        symbol: 'dot',
        color: [0.2, 0.2, 1.0, 0.8]
    },
    Rayleigh_A_Response: {
        symbol: 'dot',
        lineConnect: true,
        color: [0.7, 0.2, 0.2, 0.6]
    },

    Rayleigh_B_Response: {
        symbol: 'dot',
        lineConnect: true,
        color: [0.2, 0.2, 0.7, 0.6]
    },

    Num_Mie_Used: {
        symbol: 'dot',
        color: [0.2, 0.2, 0.7, 0.8]
    },

    Num_Rayleigh_Used: {
        symbol: 'dot',
        color: [0.2, 0.2, 0.7, 0.8]
    },

    Num_Corrupt_Mie: {
        symbol: 'dot',
        color: [0.2, 0.2, 0.7, 0.8]
    },

    Num_Corrupt_Rayleigh: {
        symbol: 'dot',
        color: [0.2, 0.2, 0.7, 0.8]
    }


};


var filterSettings = {
    parameterMatrix: {
        'height': [
            'rayleigh_altitude_top', 'rayleigh_altitude_bottom', 'mie_altitude_top', 'mie_altitude_bottom'
        ],
        'latitude': [
            'mie_latitude', 'rayleigh_latitude'
        ],
        'longitude': [
           'mie_longitude', 'rayleigh_longitude'
        ]
    },
    filterRelation: [
        [
            'mie_latitude', 'mie_longitude', 'mie_altitude', 'mie_dem_altitude',
            'mie_datetime_start', 'mie_datetime_stop', 'mie_startlat',
            'mie_endlat','mie_altitude_top', 'mie_altitude_bottom', 'height',
            'mie_geo_height', 'mie_wind_velocity'
        ],
        [
            'rayleigh_latitude', 'rayleigh_longitude', 'rayleigh_altitude',
            'rayleigh_dem_altitude', 'rayleigh_datetime_start',
            'rayleigh_datetime_stop', 'rayleigh_startlat', 'rayleigh_endlat',
            'rayleigh_altitude_top', 'rayleigh_altitude_bottom', 'height',
            'rayleigh_geo_height', 'rayleigh_wind_velocity'
        ]
    ],
    dataSettings: dataSettings,
    visibleFilters: [
        'T_elec',
        'Latitude',
        'Measurement_Error_Mie_Response',
        'Reference_Pulse_Response',
        'Reference_Pulse_Error_Mie_Response',
        'height',
        'latitude',
        'longitude',
        'rayleigh_wind_velocity',
        'mie_wind_velocity',
        'Measurement_Response',
        'Laser_Freq_Offset',
        'Mie_Valid',
        'Rayleigh_Valid',
        'Fizeau_Transmission',
        'Rayleigh_A_Response',
        'Rayleigh_B_Response',
        'Num_Mie_Used',
        'Num_Rayleigh_Used',
        'Num_Corrupt_Mie',
        'Num_Corrupt_Rayleigh'
    ],
    boolParameter: ['Mie_Valid', 'Rayleigh_Valid'],
    maskParameter: {

    }
};

var filterManager = new FilterManager({
    el:'#filters',
    filterSettings: filterSettings,
});


var graph = new graphly({
    el: '#graph',
    dataSettings: dataSettings,
    renderSettings: renderSettingsISR,
    filterManager: filterManager
});



var xhr = new XMLHttpRequest();

xhr.open('GET', 'data/AE_OPER_AUX_ISR_1B_20071002T103629_20071002T110541_0002.MSP', true);
xhr.responseType = 'arraybuffer';

xhr.onload = function(e) {
    var tmp = new Uint8Array(this.response);
    var data = msgpack.decode(tmp);
    filterManager.initManager();
    graph.loadData(data);
    filterManager.loadData(data);
    
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
        }else if (sel_value.indexOf('ISR') !== -1){
            graph.renderSettings = renderSettingsISR;
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


