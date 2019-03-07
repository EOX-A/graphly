



var renderSettings_mie = {
    xAxis: 'mie_altitude',
    yAxis: ['mie_datetime'],
    y2Axis: [],
    combinedParameters: {
        mie_datetime: ['mie_datetime_start', 'mie_datetime_end'],
        mie_altitude: ['mie_altitude_bottom', 'mie_altitude_top']
    },
    colorAxis: [
        'mie_wind_velocity'
    ],

};

var renderSettings_ray = {
    xAxis: 'rayleigh_datetime',
    yAxis: [
        'rayleigh_altitude',
        //'rayleigh_dem_altitude'
    ],
    //y2Axis: [],
    combinedParameters: {
        rayleigh_datetime: ['rayleigh_datetime_start', 'rayleigh_datetime_stop'],
        rayleigh_altitude: ['rayleigh_altitude_bottom', 'rayleigh_altitude_top'],
        mie_datetime: ['mie_datetime_start', 'mie_datetime_end'],
        mie_altitude: ['mie_altitude_bottom', 'mie_altitude_top']
    },
    colorAxis: [
        'rayleigh_wind_velocity',
        //'mie_wind_velocity',
    ],

};

var aeolusl2b = {
    xAxis: 'measurements',
    yAxis: [
        'bins',
        //'rayleigh_dem_altitude'
    ],
    //y2Axis: [],
    combinedParameters: {
        bins: ['bins_end', 'bins_start'],
        measurements: ['meas_start', 'meas_end']
    },
    colorAxis: [
        'mie_meas_map',
        //'mie_wind_velocity',
    ],
    reversedYAxis: true

};

var aeolusl2a = {
    xAxis: 'measurements',
    yAxis: [
        'altitude',
        //'rayleigh_dem_altitude'
    ],
    //y2Axis: [],
    combinedParameters: {
        altitude: ['alt_start', 'alt_end'],
        measurements: ['meas_start', 'meas_end']
    },
    colorAxis: [
        'group_backscatter_variance'
        //'mie_wind_velocity',
    ],

};


var renderSettingsSwarm = {
    xAxis: 'Longitude',
    yAxis: ['Latitude'],
    //y2Axis: ['F_res_IGRF12'],
    colorAxis: [null],
    /*dataIdentifier: {
        parameter: 'id',
        identifiers: ['Alpha', 'Bravo']
    }*/
};

var renderSettingsMRC = {
    xAxis: 'Frequency_Offset',
    yAxis: ['Measurement_Error_Mie_Response'],
    colorAxis: [ null ],
};

var renderSettingsRRC = {
    xAxis: 'Frequency_Offset',
    yAxis: ['Measurement_Error_Rayleigh_Response'],
    colorAxis: [ null ],
};


var renderSettingsISR = {
    xAxis: 'Laser_Freq_Offset',
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
        uom: 'm/s',
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
        uom: 'm'
    }
};

var ds_mie = {
    geoid_separation: {
        lineConnect: true,
        symbol: 'rectangle',
        //color: [1.0,0.0,0.0]
    },
    mie_dem_altitude: {
        symbol: null,
        uom: 'm',
        lineConnect: true
    },
    mie_wind_velocity: {
        uom: 'm/s',
        colorscale: 'plasma',
        //extent: [-5000,5000]
        //outline: false
    },
    mie_datetime_start: {
        scaleFormat: 'time',
        timeFormat: 'MJD2000_S'
    },
    mie_datetime_end: {
        scaleFormat: 'time',
        timeFormat: 'MJD2000_S'
    },
    mie_altitude:{
        uom: 'm'
    }
};


var otherds = {

    group_backscatter_variance:{
        nullValue: -1
    },
    
    T_elec: {
        symbol: 'circle',
        uom: 'n',
        colorscale: 'plasma'
        //regression: 'polynomial',
        //lineConnect: true
    },
    F_error: {
        colorscale: 'inferno'
    },
    /*F: {
        symbol: 'circle',
        uom: 'nT'
        //regression: 'polynomial',
        //lineConnect: true
    },*/
    Timestamp: {
        scaleFormat: 'time'
    },
    id: {
        scaleType: 'ordinal',
        categories: ['Alpha', 'Bravo']
    },
    MLT: {
        periodic: {
            period: 24,
            offset: 0
        }
    },
    Longitude: {
        periodic: {
            period: 360,
            offset: -180
        }
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
    },

    mie_meas_map: {
        colorscale: 'jet',
        csDiscrete: true
    }


};


var filterSettings2 = {
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
            'mie_datetime_start', 'mie_datetime_end', 'mie_startlat',
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
        //'Num_Ground_Echo_Not_Detected_Measurements',
        'group_backscatter_variance',
        'group_extinction_variance'


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

var renderSettings = {
    xAxis: 'time',
    yAxis: [
        'mie_altitude'
    ],
    //y2Axis: [],
    combinedParameters: {
        mie_latitude: ['latitude_of_DEM_intersection_start', 'latitude_of_DEM_intersection_end'],
        mie_longitude: ['mie_longitude_start', 'mie_longitude_end'],
        mie_altitude: ['mie_altitude_bottom', 'mie_altitude_top'],
        latitude_of_DEM_intersection: [
            'latitude_of_DEM_intersection_start',
            'latitude_of_DEM_intersection_end'
        ],
        time: ['mie_datetime_start', 'mie_datetime_end'],
    },
    colorAxis: ['mie_wind_velocity'],
    positionAlias: {
        'latitude': 'mie_latitude',
        'longitude': 'mie_longitude',
        'altitude': 'mie_altitude'
    }

};

var dataSettings = {

    'group_backscatter_variance':{
        nullValue: -1
    },
    
    'group_extinction_variance':{
        nullValue: -1
    },
    mie_datetime_start: {
        scaleFormat: 'time',
        timeFormat: 'MJD2000_S'
    },
    mie_datetime_end: {
        scaleFormat: 'time',
        timeFormat: 'MJD2000_S'
    },

    time: {
        scaleFormat: 'time',
        timeFormat: 'MJD2000_S'
    },

    mie_wind_velocity: {
        uom: 'm/s',
        colorscale: 'viridis',
        //extent: [-140,39]
        //outline: false
    },

    rayleigh_altitude: {
        uom: 'm'
    },

    mie_altitude: {
        uom: 'm'
    }

};

var testbed14RS = {
    xAxis: 'time',
    yAxis: [
        'altitude'
    ],
    combinedParameters: {
        altitude: ['altitude_end', 'altitude_start'],
        time: ['time_start', 'time_end'],
    },
    colorAxis: ['CPR_Cloud_mask']

};

var testbed14DS = {

    CPR_Cloud_mask: {
        uom: null,
        colorscale: 'viridis',
        //extent: [-140,39]
        //outline: false
    }
};

var filterSettings = {
    parameterMatrix: {
        'height': [
            'mie_altitude_bottom', 'mie_altitude_top'
        ],
        'latitude': [
            'mie_latitude'
        ],
        'longitude': [
           'mie_longitude'
        ]
    },
    filterRelation: [
        [
            'mie_quality_flag_data', 'mie_wind_velocity', 'mie_latitude', 'mie_altitude',
            'mie_latitude_start', 'mie_latitude_end', 'mie_altitude_top', 'mie_altitude_bottom',
            'time', 'mie_datetime_start', 'mie_datetime_end', 'latitude_of_DEM_intersection_start',
            'latitude_of_DEM_intersection_end', 'latitude_of_DEM_intersection'
        ]
    ],
    dataSettings: dataSettings,
    visibleFilters: [
        'mie_quality_flag_data', 'mie_wind_velocity', 'F', 'n', 'F_error','group_backscatter_variance','group_extinction_variance'
      
    ],
    //boolParameter: [],
    maskParameter: {
        'mie_quality_flag_data': {
            values: [
                ['Bit 1', 'Overall validity. Data invalid 1, otherwise 0 '],
                ['Bit 2', 'Set to 1 if signal-to-noise below SNR_Threshold, default 0 '],
                ['Bit 3', 'Data saturation found 1, otherwise 0 '],
                ['Bit 4', 'Data spike found 1, otherwise 0 '],
                ['Bit 5', 'Reference pulse invalid 1, otherwise 0 '],
                ['Bit 6', 'Source packet invalid 1, otherwise 0 '],
                ['Bit 7', 'Number of corresponding valid pulses is below Meas_Cavity_Lock_Status_Thresh 1, otherwise 0 '],
                ['Bit 8', 'Spacecraft attitude not on target 1, otherwise 0 '],
                ['Bit 9', 'For Mie, peak not found 1, otherwise 0. For Rayleigh, rayleigh response not found 1, otherwise 0 '],
                ['Bit 10','Set to 1 if the absolute wind velocity above Wind_Velocity_Threshold, default 0 '],
                ['Bit 11','Set to 1 if polynomial fit of error responses was used but no valid root of the polynomial was found, otherwise 0. '],
                ['Bit 12','Bin was detected as ground bin, otherwise 0. '],
                ['Bit 13','Spare, set to 0'],
                ['Bit 14','Spare, set to 0'],
                ['Bit 15','Spare, set to 0'],
                ['Bit 16','Spare, set to 0']
            ]
        }
    },
    //choiceParameter: {}
};



var filterManager = new FilterManager({
    el:'#filters',
    filterSettings: filterSettings,
    filterAxisTickFormat: '.2s'
});


var graph = new graphly.graphly({
    el: '#graph',
    dataSettings: otherds,
    renderSettings: aeolusl2b,
    filterManager: filterManager,
    //ignoreParameters: [/mie_quality_fl.*/]
    debounceActive: true,
    //enableFit: false,
    //displayColorscaleOptions: false,
    //displayAlphaOptions: false
    displayParameterLabel: false,
    //displayColorscaleOptions: false,
    //displayAlphaOptions: false,
    //autoColorExtent: true
    //fixedSize: true,
    //fixedWidth: 2000
    margin: {top: 10, left: 90, bottom: 80, right: 30}
});

filterManager.setRenderNode('#filters');

/*var graph2 = new graphly.graphly({
    el: '#graph2',
    dataSettings: ds_mie,
    renderSettings: renderSettings_mie,
    filterManager: filterManager,
    //fixedSize: true,
    //fixedWidth: 12000
    //connectedGraph: graph
});

graph.connectGraph(graph2);*/




graph.on('rendered', function() {
    //console.log('rendered');
});

filterManager.on('filterChange', function(filters){
    //console.log(filters);
});

d3.select('#save').on('click', function(){
    graph.saveImage();
});


graph.on('pointSelect', function(values){
    console.log(values);
});

var usesecond = false;


var xhr = new XMLHttpRequest();

xhr.open('GET', 'data/aeolusl2b_newest.mp', true);
//xhr.open('GET', 'data/aeolusl2a.mp', true);
//xhr.open('GET', 'data/testbed14.mp', true);
//xhr.open('GET', 'data/swarm.mp', true);

xhr.responseType = 'arraybuffer';








function proxyFlattenObservationArraySE(input, proxy){
    var start = [];
    var end = [];
    for (var i = 0; i < proxy.length-1; i++) {
      for (var j = 0; j < proxy[i].length-1; j++) {
        if (j===proxy[i].length-1){
          start.push(input[i]);
          end.push(input[i+1]);
        }else{
          start.push(input[i]);
          end.push(input[i+1]);
        }
      }
    }
    return [start, end];
}

function flattenObservationArraySE(input){
    var start = [];
    var end = [];
    for (var i = 0; i < input.length-1; i++) {
      for (var j = 0; j < input[i].length-1; j++) {
        if(j===input[i].length-1){
          start.push(input[i][j]);
          end.push(input[i+1][0]);
        }else{
          start.push(input[i][j]);
          end.push(input[i][j+1]);
        }
      }
    }
    return [start, end];
}

function flattenObservationArray(input){
    var output = [];
    for (var i = 0; i < input.length-1; i++) {
      for (var j = 0; j < input[i].length; j++) {
        output.push(input[i][j]);
      }
    }
    return output;
}










xhr.onload = function(e) {
    var tmp = new Uint8Array(this.response);
    var data = msgpack.decode(tmp);
    //console.log(data);

    filterManager.initManager();
    

    // L2A
    /*var meas_start = [];
    var meas_end = [];
    var alt_start = [];
    var alt_end = [];
    var gD = data.ALD_U_N_2A.group_data;
    //var mD = data.ALD_U_N_2A.measurement_data;
    var oD = data.ALD_U_N_2A.observation_data;
    var backscatter = [];
    //var group_backscatter_variance=[];



    for (var i = 0; i < gD.group_start_obs.length; i++) {
        var currObsStart = gD.group_start_obs[i]-1;
        var currObsEnd = gD.group_end_obs[i]-1; // Not needed yet as start and end is equal
        var currMeasStart = (currObsStart*30) + gD.group_start_meas_obs[i];
        var currMeasEnd = (currObsStart*30) + gD.group_end_meas_obs[i];
        var heighBinIndex = gD.group_height_bin_index[i]-1;
        var currAltStart = oD.mie_altitude_obs[currObsStart][heighBinIndex];
        var currAltEnd = oD.mie_altitude_obs[currObsStart][heighBinIndex+1];
        meas_start.push(currMeasStart);
        meas_end.push(currMeasEnd);
        alt_start.push(currAltEnd);
        alt_end.push(currAltStart);
        backscatter.push(gD.group_backscatter[i]);
     }



    var ds = {};
    ds.alt_start = alt_start;
    ds.alt_end = alt_end;
    ds.meas_start = meas_start;
    ds.meas_end = meas_end;
    ds.backscatter = backscatter;
    ds.group_backscatter_variance = gD.group_backscatter_variance;
    ds.group_extinction_variance = gD.group_extinction_variance;

    graph.loadData(ds);*/

    // L2B

    //var maxLength = data.ALD_U_N_2B.measurement_data.mie_measurement_map.length;
    var bins_start = [];
    var bins_end = [];
    var meas_start = [];
    var meas_end = [];
    var measurement_map = [];


    /*for (var i = minLength; i < maxLength; i++) {
         for (var j=0; j<data.ALD_U_N_2B.measurement_data.mie_measurement_map[i].length; j++){
            if(data.ALD_U_N_2B.measurement_data.mie_measurement_map[i][j] !== 0){
                bins_start.push(j);
                bins_end.push(j+1);

                meas_start.push(i);
                meas_end.push(i+1);

                mie_meas_map.push(data.ALD_U_N_2B.measurement_data.mie_measurement_map[i][j])
            }
         }
     }*/
    var ds = data.ALD_U_N_2B;
    var mGD = ds.mie_grouping_data.mie_grouping_start_obs;
     //for (var i = 0; i < mGD.length; i++) {
    for (var i = 20; i < 23; i++) {

        var measStart = mGD[i]*30;
        var obs_mie_bins_start = [];
        var obs_mie_bins_end = [];
        var obs_mie_meas_start = [];
        var obs_mie_meas_end = [];
        var obs_mie_measurement_map = [];

        for (var j=0; j<ds.measurement_data.mie_measurement_map[measStart].length; j++){

        // Iterate over the 30 measurements of the observation
        for (var m=0; m<30; m++) {

          if(ds.measurement_data.mie_measurement_map[measStart+m][j] !== 0){
              obs_mie_bins_start.push(j);
              obs_mie_bins_end.push(j+1);
              obs_mie_meas_start.push(measStart+m);
              obs_mie_meas_end.push((measStart+m+1));
              obs_mie_measurement_map.push(
                ds.measurement_data.mie_measurement_map[measStart+m][j]
              );
          }
        }
        }
        bins_start.push(obs_mie_bins_start);
        bins_end.push(obs_mie_bins_end);
        meas_start.push(obs_mie_meas_start);
        meas_end.push(obs_mie_meas_end);
        measurement_map.push(obs_mie_measurement_map);

      }


    var ds = {};
    ds.bins_start = bins_start.flat();
    ds.bins_end = bins_end.flat();
    ds.meas_start = meas_start.flat();
    ds.meas_end = meas_end.flat();
    ds.mie_meas_map = measurement_map.flat();//data.ALD_U_N_2B.measurement_data.mie_measurement_map.flat()

    graph.addGroupArrows([[630,660,21],[660,690,22],[690,720,23]]);

    graph.loadData(ds);


    /*var ids = {
      'A': 'Alpha',
      'B': 'Bravo',
      'C': 'Charlie',
      'NSC': 'NSC'
    };

    if(data.hasOwnProperty('Spacecraft')) {
      data['id'] = [];
      for (var i = 0; i < data.Timestamp.length; i++) {
        data.id.push(ids[data.Spacecraft[i]]);
      }
    }
    data['B_NEC_resAC_N'] = [];
    data['B_NEC_resAC_E'] = [];
    data['B_NEC_resAC_C'] = [];

    for (var i = 0; i < data.B_NEC_resAC.length; i++) {
        data['B_NEC_resAC_N'].push(data.B_NEC_resAC[i][0]);
        data['B_NEC_resAC_E'].push(data.B_NEC_resAC[i][1]);
        data['B_NEC_resAC_C'].push(data.B_NEC_resAC[i][2]); 
    }*/

    //graph.loadData(data);

    /*var ds = data.ALD_U_N_1B[0];

    var time = proxyFlattenObservationArraySE(ds.time, ds.mie_altitude);
    var mie_HLOS_wind_speed = flattenObservationArray(ds.mie_HLOS_wind_speed);
    var latitude_of_DEM_intersection = proxyFlattenObservationArraySE(
      ds.latitude_of_DEM_intersection,
      ds.mie_altitude
    );
    var mie_altitude = flattenObservationArraySE(ds.mie_altitude);
    var mie_bin_quality_flag = flattenObservationArray(ds.mie_bin_quality_flag);
    var geoid_separation =proxyFlattenObservationArraySE(ds.geoid_separation, ds.mie_altitude);

    data = {
      mie_datetime_start: time[0],
      mie_datetime_end: time[1],
      latitude_of_DEM_intersection_start: latitude_of_DEM_intersection[1],
      latitude_of_DEM_intersection_end: latitude_of_DEM_intersection[0],
      mie_wind_velocity: mie_HLOS_wind_speed,
      mie_quality_flag_data: mie_bin_quality_flag,
      mie_altitude_top: mie_altitude[0],
      mie_altitude_bottom: mie_altitude[1],
      geoid_separation: geoid_separation[0]
    };*/


    //graph.loadData(data);
    /*if(usesecond){
        graph2.loadData(data);
    }*/

    filterManager.loadData(ds);
};

//filterManager.setRenderNode('#filters');

xhr.send();


d3.select('#datafiles').on('change', function(e){

    var sel = document.getElementById('datafiles');
    var sel_value = sel.options[sel.selectedIndex].value;

    
    graph.setDataSettings(testbed14);
    usesecond = false;
    graph.connectGraph(false);
   // graph2.connectGraph(false);
    if (sel_value.indexOf('testdata') === -1){
        if (sel_value.indexOf('MRC') !== -1){
            graph.setRenderSettings(renderSettingsMRC);
        }else if (sel_value.indexOf('RRC') !== -1){
            graph.setRenderSettings(renderSettingsRRC);
        }else if (sel_value.indexOf('ISR') !== -1){
            graph.setRenderSettings(renderSettingsISR);
        }else {
            /*usesecond = true;
            graph.connectGraph(graph2);
            graph2.connectGraph(graph);
            graph2.setDataSettings(ds_mie);
            graph2.setRenderSettings(renderSettings_mie);

            graph.setDataSettings(ds_rayleigh);
            graph.setRenderSettings(renderSettings_ray);*/
        }
        xhr.open('GET', sel_value, true);
        xhr.send();
    }else{
        graph.renderSettings = renderSettingsSwarm;
        graph.loadCSV(sel_value);
    }

});


