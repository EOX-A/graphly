



var renderSettings_mie = {
    xAxis: [
        'mie_datetime',
        //'mie_datetime'
    ],
    yAxis: [
         'mie_altitude',
         //'mie_dem_altitude'
    ],
    //y2Axis: [],
    combinedParameters: {
        mie_datetime: ['mie_datetime_start', 'mie_datetime_stop'],
        mie_altitude: ['mie_altitude_bottom', 'mie_altitude_top']
    },
    colorAxis: [
        'mie_wind_velocity',
        //null
    ],

};

var renderSettings_ray = {
    xAxis: [
        'rayleigh_datetime',
        //'rayleigh_datetime',
    ],
    yAxis: [
        'rayleigh_altitude',
        //'rayleigh_dem_altitude'
    ],
    //y2Axis: [],
    combinedParameters: {
        rayleigh_datetime: ['rayleigh_datetime_start', 'rayleigh_datetime_stop'],
        rayleigh_altitude: ['rayleigh_altitude_bottom', 'rayleigh_altitude_top'],
        mie_datetime: ['mie_datetime_start', 'mie_datetime_stop'],
        mie_altitude: ['mie_altitude_bottom', 'mie_altitude_top']
    },
    colorAxis: [
        'rayleigh_wind_velocity',
        //'mie_wind_velocity',
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
    xAxis: ['Laser_Freq_Offset', 'Laser_Freq_Offset'],
    //yAxis: ['Mie_Response'],
    yAxis: ['Rayleigh_A_Response', 'Rayleigh_B_Response'],
    colorAxis: [ null, null ],
};


var ds_rayleigh = {
    rayleigh_dem_altitude: {
        symbol: 'circle',
        uom: 'm',
        lineConnect: true
    },
    rayleigh_wind_velocity: {
        uom: 'cm/s',
        colorscale: 'viridis',
        extent: [-3000,3000]
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
    rayleigh_altitude: {
    }
};

var ds_mie = {
    mie_dem_altitude: {
        symbol: null,
        uom: 'm',
        lineConnect: true
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
    mie_altitude:{
    }
};


var otherds = {
    
    T_elec: {
        symbol: 'circle',
        uom: 'n',
        //regression: 'polynomial',
        lineConnect: true
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
        symbol: 'circle',
        lineConnect: true,
        regression: 'polynomial'
    },
    Measurement_Error_Mie_Response: {
        symbol: 'circle',
        uom: 'Pixel',
        lineConnect: false,
        regression: 'polynomial'
    },
    Reference_Pulse_Response: {
        symbol: 'circle',
        uom: 'Pixel',
        lineConnect: false,
    },
    Reference_Pulse_Error_Mie_Response: {
        symbol: 'circle',
        uom: 'Pixel',
        lineConnect: false,
        regression: 'polynomial'
    },
    Frequency_Offset: {
        uom: 'GHZ'
    },

    Measurement_Error_Rayleigh_Response: {
        symbol: 'circle',
        uom: 'Pixel',
        lineConnect: false,
        regression: 'polynomial'
    },




    Measurement_Response: {
        symbol: 'circle',
        uom: 'Pixel',
        lineConnect: false,
        regression: 'polynomial'
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
        symbol: 'circle'
    },
    Rayleigh_A_Response: {
        displayName: 'Channel A',
        symbol: 'circle_empty',
        lineConnect: true
    },

    Rayleigh_B_Response: {
        displayName: 'Channel B',
        symbol: 'rectangle_empty',
        lineConnect: true
    },

    Num_Mie_Used: {
        symbol: 'circle'
    },

    Num_Rayleigh_Used: {
        symbol: 'circle'
    },

    Num_Corrupt_Mie: {
        symbol: 'circle'
    },

    Num_Corrupt_Rayleigh: {
        symbol: 'circle'
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
            'mie_geo_height', 'mie_wind_velocity', 'mie_observation_type'
        ],
        [
            'rayleigh_latitude', 'rayleigh_longitude', 'rayleigh_altitude',
            'rayleigh_dem_altitude', 'rayleigh_datetime_start',
            'rayleigh_datetime_stop', 'rayleigh_startlat', 'rayleigh_endlat',
            'rayleigh_altitude_top', 'rayleigh_altitude_bottom', 'height',
            'rayleigh_geo_height', 'rayleigh_wind_velocity'
        ]
    ],
    dataSettings: otherds,
    visibleFilters: [
        'T_elec',
        'Latitude',
        'height',
        'latitude',
        'longitude',
        'rayleigh_wind_velocity',
        'mie_wind_velocity',
        'mie_observation_type',
        'Laser_Freq_Offset',
        'Mie_Valid',
        'Rayleigh_Valid',
        'Fizeau_Transmission',
        'Rayleigh_A_Response',
        'Rayleigh_B_Response',
        'Num_Mie_Used',
        'Num_Rayleigh_Used',
        'Num_Corrupt_Mie',
        'Num_Corrupt_Rayleigh',

        'Frequency_Offset',
        'Frequency_Valid',
        'Measurement_Response_Valid',
        'Reference_Pulse_Response_Valid',
        'Measurement_Response',
        'Measurement_Error_Mie_Response',
        'Reference_Pulse_Response',
        'Reference_Pulse_Error_Mie_Response',
        /*'Num_Valid_Measurements',
        'Num_Measurements_Usable',
        'Num_Reference_Pulses_Usable',
        'Num_Measurement_Invalid',
        'Num_Pulse_Validity_Status_Flag_False',
        'Num_Sat_Not_on_Target_Measurements',*/
        'Num_Corrupt_Measurement_Bins',
        'Num_Corrupt_Reference_Pulses',
        'Num_Mie_Core_Algo_Fails_Measurements',
        //'Num_Ground_Echo_Not_Detected_Measurements'


    ],
    boolParameter: [
        'Mie_Valid', 'Rayleigh_Valid',
        'Frequency_Valid', 'Measurement_Response_Valid','Reference_Pulse_Response_Valid'
    ],
    maskParameter: {

    },
    choiceParameter: {
        'mie_observation_type': {
            options: [
                {'name': 'undefined', value:0},
                {'name': 'cloudy', value:1},
                {'name': 'clear', value:2}
            ],
            selected: 2
        }
    }
};



var filterManager = new FilterManager({
    //el:'#filters',
    filterSettings: filterSettings,
});


var graph = new graphly.graphly({
    el: '#graph',
    dataSettings: ds_rayleigh,
    renderSettings: renderSettings_ray,
    filterManager: filterManager,
    //fixedSize: true,
    //fixedWidth: 12000
});

filterManager.setRenderNode('#filters');

/*var graph2 = new graphly.graphly({
    el: '#graph2',
    dataSettings: ds_mie,
    renderSettings: renderSettings_mie,
    filterManager: filterManager,
    //fixedSize: true,
    //fixedWidth: 12000
    connectedGraph: graph
});

graph.connectGraph(graph2);*/




graph.on('rendered', function() {
    //console.log('rendered');
});

filterManager.on('filterChange', function(filters){
    //console.log(filters);
});

var usesecond = false;


var xhr = new XMLHttpRequest();

xhr.open('GET', 'data/AE_OPER_ALD_U_N_2B_20151001T001124_20151001T014212_0001.MSP', true);
//xhr.open('GET', 'data/AE_OPER_AUX_ISR_1B_20071002T103629_20071002T110541_0002.MSP', true);

xhr.responseType = 'arraybuffer';

xhr.onload = function(e) {
    var tmp = new Uint8Array(this.response);
    var data = msgpack.decode(tmp);
    filterManager.initManager();
    graph.loadData(data);
    if(usesecond){
        graph2.loadData(data);
    }
    filterManager.loadData(data);
};

//filterManager.setRenderNode('#filters');

xhr.send();


d3.select('#datafiles').on('change', function(e){

    var sel = document.getElementById('datafiles');
    var sel_value = sel.options[sel.selectedIndex].value;

    
    graph.setDataSettings(otherds);
    usesecond = false;
    if (sel_value.indexOf('testdata') === -1){
        if (sel_value.indexOf('MRC') !== -1){
            graph.setRenderSettings(renderSettingsMRC);
        }else if (sel_value.indexOf('RRC') !== -1){
            graph.setRenderSettings(renderSettingsRRC);
        }else if (sel_value.indexOf('ISR') !== -1){
            graph.setRenderSettings(renderSettingsISR);
        }else {
            usesecond = true;
            graph2.setDataSettings(ds_mie);
            graph2.setRenderSettings(renderSettings_mie);

            graph.setDataSettings(ds_rayleigh);
            graph.setRenderSettings(renderSettings_ray);
        }
        xhr.open('GET', sel_value, true);
        xhr.send();
    }else{
        graph.renderSettings = renderSettingsSwarm;
        graph.loadCSV(sel_value);
    }

});


