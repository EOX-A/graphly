

var renderSettings_mie = {
    xAxis: 'mie_datetime',
    yAxis: ['mie_altitude'],
    y2Axis: ['latitude_of_DEM_intersection_start'],
    combinedParameters: {
        mie_datetime: ['mie_datetime_start', 'mie_datetime_end'],
        mie_altitude: ['mie_altitude_bottom', 'mie_altitude_top']
    },
    colorAxis: [
        'mie_HLOS_wind_speed', null
    ],
    /*additionalXTicks: ['latitude_of_DEM_intersection_start'],
    additionalYTicks: ['mie_altitude_top'],*/

};


var renderSettingsL2A = {
    xAxis: 'time',
    yAxis: [['mie_altitude'], ['rayleigh_altitude']],
    y2Axis: [[], []],
    groups: ['MCA', 'SCA'],
    //reversedYAxis: true,
    combinedParameters: {
        mie_altitude: ['mie_altitude_obs_top', 'mie_altitude_obs_bottom'],
        MCA_time: ['MCA_time_obs_start', 'MCA_time_obs_stop'],
        rayleigh_altitude: ['rayleigh_altitude_obs_top', 'rayleigh_altitude_obs_bottom'],
        SCA_time: ['SCA_time_obs_start', 'SCA_time_obs_stop'],
        bins: ['ICA_bins_start', 'ICA_bins_end'],
        ICA_time: ['ICA_time_obs_start', 'ICA_time_obs_stop']
    },
    colorAxis: [['MCA_extinction'], ['SCA_extinction']],
    colorAxis2: [[], []],
    renderGroups: {
        MCA: {
            parameters: [
                'mie_altitude', 
                'mie_altitude_obs_top', 
                'mie_altitude_obs_bottom',
                'MCA_time_obs_start',
                'MCA_time_obs_stop',
                'L1B_start_time_obs',
                'L1B_centroid_time_obs',
                'MCA_time',
                'longitude_of_DEM_intersection_obs',
                'latitude_of_DEM_intersection_obs',
                'altitude_of_DEM_intersection_obs',
                'geoid_separation_obs',
                'L1B_num_of_meas_per_obs',
                'MCA_clim_BER',
                'MCA_extinction',
                'MCA_LOD',
                'albedo_off_nadir'
            ],
        },
        SCA: {
            parameters: [
                'rayleigh_altitude',
                'rayleigh_altitude_obs_top',
                'rayleigh_altitude_obs_bottom',
                'SCA_time_obs_start',
                'SCA_time_obs_stop',
                'SCA_time',
                'SCA_QC_flag',
                'SCA_extinction_variance',
                'SCA_backscatter_variance',
                'SCA_LOD_variance',
                'SCA_extinction',
                'SCA_backscatter',
                'SCA_LOD',
                'SCA_SR',
            ]
        },
        /*SCA_middle_bin: {
            parameters: [
                'SCA_middle_bin_altitude_obs',
                'SCA_middle_bin_extinction_variance',
                'SCA_middle_bin_backscatter_variance',
                'SCA_middle_bin_LOD_variance',
                'SCA_middle_bin_BER_variance',
                'SCA_middle_bin_extinction',
                'SCA_middle_bin_backscatter',
                'SCA_middle_bin_LOD',
                'SCA_middle_bin_BER'

            ]
        },*/
        ICA: {
            parameters: [
                'bins',
                'ICA_bins_start',
                'ICA_bins_end',
                'ICA_time_obs_start',
                'ICA_time_obs_stop',
                'ICA_time',
                'ICA_QC_flag',
                'ICA_filling_case',
                'ICA_extinction',
                'ICA_backscatter',
                'ICA_LOD'
            ],
            defaults: {
                yAxis: 'bins',
                xAxis: 'ICA_time',
                colorAxis: 'ICA_backscatter'
            }
        }
    },
    sharedParameters: {
        'time': [
            'MCA_time', 'SCA_time', 'ICA_time'
        ]
    },
    additionalXTicks: [],
    additionalYTicks: [],
    availableParameters: false
};


var renderSettingsAeolus = {
    xAxis: 'datetime',
    yAxis: [['mie_altitude'], ['rayleigh_altitude']],
    y2Axis: [[], []],
    groups: ['mie', 'rayleigh'],
    combinedParameters: {
        rayleigh_datetime: ['rayleigh_datetime_start', 'rayleigh_datetime_end'],
        rayleigh_altitude: ['rayleigh_altitude_bottom', 'rayleigh_altitude_top'],
        mie_datetime: ['mie_datetime_start', 'mie_datetime_end'],
        mie_altitude: ['mie_altitude_bottom', 'mie_altitude_top']
    },
    colorAxis: [['mie_HLOS_wind_speed'], ['rayleigh_HLOS_wind_speed']],
    colorAxis2: [[], []],
    renderGroups: {
        mie: {
            parameters: [
                'mie_datetime',
                'mie_altitude',
                'mie_datetime_start',
                'mie_datetime_end',
                'mie_HLOS_wind_speed',
                'mie_quality_flag_data',
                'mie_altitude_top',
                'mie_altitude_bottom',
                'geoid_separation'
            ],
        },
        rayleigh: {
            parameters: [
                'rayleigh_datetime',
                'rayleigh_altitude',
                'rayleigh_HLOS_wind_speed',
                'rayleigh_bin_quality_flag',
                'rayleigh_altitude_top',
                'rayleigh_altitude_bottom',
                'rayleigh_datetime_start',
                'rayleigh_datetime_end',
                'geoid_separation'
            ]
        }
    },
    sharedParameters: {
        'datetime': [
            'rayleigh_datetime', 'mie_datetime'
        ],
        'altitude': [
            'rayleigh_altitude', 'mie_altitude'
        ],
        'geoid_separation': [
            'geoid_separation'
        ]
    },
    additionalXTicks: [],
    additionalYTicks: [],
    availableParameters: false

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
        //'mie_HLOS_wind_speed',
    ],

};

var renderSettingsSwarm = {
    xAxis: 'Timestamp',
    yAxis:     [['F'], ['F_error']],
    colorAxis: [[null], [null]],

    y2Axis:     [['F_error'], []],
    colorAxis2: [[null], []],
    dataIdentifier: {
        parameter: 'id',
        identifiers: ['Alpha', 'Upload']
    }/*,
    availableParameters: {
        'Alpha': ["Spacecraft", "Timestamp", "Latitude", "Longitude", "Radius", "F", "F_error", "B_NEC_resAC", "B_VFM", "B_error", "B_NEC", "Kp", "Dst", "F107", "QDLat", "QDLon", "MLT", "OrbitNumber", "OrbitDirection", "QDOrbitDirection", "SunDeclination", "SunRightAscension", "SunHourAngle", "SunAzimuthAngle", "SunZenithAngle"],
        'Upload': ["Spacecraft", "Timestamp", "Latitude", "Longitude", "Radius", "Kp", "Dst", "F107", "QDLat", "QDLon", "MLT", "Relative_STEC_RMS", "Relative_STEC", "Absolute_STEC", "GPS_Position", "LEO_Position", "SunDeclination", "SunRightAscension", "SunHourAngle", "SunAzimuthAngle", "SunZenithAngle"]
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
    mie_HLOS_wind_speed: {
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
        scaleFormat: 'time',
        timeFormat: 'MJD2000'
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
    Latitude: {
        periodic: {
            period: 180,
            offset: 0
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
    }


};

/*'latitude_of_DEM_intersection_start',
'latitude_of_DEM_intersection_end',
'geoid_separation',*/


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
            'mie_datetime_start',
            'mie_datetime_end',
            'mie_HLOS_wind_speed',
            'mie_quality_flag_data',
            'mie_altitude_top',
            'mie_altitude_bottom',
            'mie_bin_quality_flag'
        ],
        [
            'rayleigh_HLOS_wind_speed',
            'rayleigh_bin_quality_flag',
            'rayleigh_altitude_top',
            'rayleigh_altitude_bottom',
            'rayleigh_datetime_start',
            'rayleigh_datetime_end'
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
        'rayleigh_HLOS_wind_speed',
        'mie_HLOS_wind_speed',
        'Frequency_Offset',
        'Frequency_Valid',
        'Measurement_Response_Valid',
        'Reference_Pulse_Response_Valid',
        'Measurement_Response',
        'Measurement_Error_Mie_Response',
        'Reference_Pulse_Response',
        'Reference_Pulse_Error_Mie_Response',
        'albedo_off_nadir',
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
        'mie_bin_quality_flag',
        'rayleigh_bin_quality_flag'


    ],
    boolParameter: {
        parameters: [
            'Mie_Valid', 'Rayleigh_Valid',
            'Frequency_Valid', 'Measurement_Response_Valid',
            'Reference_Pulse_Response_Valid'
        ],
        enabled: [
            true, false,
            false, false,
            false
        ]
    },
    maskParameter: {
        'mie_bin_quality_flag': {
                  values: [
                      ['Bit 1', 'Overall validity. Data invalid 1, otherwise 0'],
                      ['Bit 2', 'Set to 1 if signal-to-noise below SNR_Threshold, default 0'],
                      ['Bit 3', 'Data saturation found 1, otherwise 0'],
                      ['Bit 4', 'Data spike found 1, otherwise 0'],
                      ['Bit 5', 'Reference pulse invalid 1, otherwise 0'],
                      ['Bit 6', 'Source packet invalid 1, otherwise 0'],
                      ['Bit 7', 'Number of corresponding valid pulses is below Meas_Cavity_Lock_Status_Thresh 1, otherwise 0'],
                      ['Bit 8', 'Spacecraft attitude not on target 1, otherwise 0'],
                      ['Bit 9', 'Peak not found 1, otherwise 0'],
                      ['Bit 10','Set to 1 if the absolute wind velocity above Wind_Velocity_Threshold, default 0 '],
                      ['Bit 11','Set to 1 if polynomial fit of error responses was used but no valid root of the polynomial was found, otherwise 0'],
                      ['Bit 12','Bin was detected as ground bin, otherwise 0. '],
                      ['Bit 13','Spare, set to 0'],
                      ['Bit 14','Spare, set to 0'],
                      ['Bit 15','Spare, set to 0'],
                      ['Bit 16','Spare, set to 0']
                  ],
                   enabled: [
                      true,
                      false,
                      false,
                      false,
                      false,
                      false,
                      false,
                      false,
                      false,
                      false,
                      false,
                      false,
                      false,
                      false,
                      false,
                      false
                  ]
              },
              'rayleigh_bin_quality_flag': {
                  values: [
                      ['Bit 1', 'Overall validity. Data invalid 1, otherwise 0 '],
                      ['Bit 2', 'Set to 1 if signal-to-noise below SNR_Threshold, default 0 '],
                      ['Bit 3', 'Data saturation found 1, otherwise 0 '],
                      ['Bit 4', 'Data spike found 1, otherwise 0 '],
                      ['Bit 5', 'Reference pulse invalid 1, otherwise 0 '],
                      ['Bit 6', 'Source packet invalid 1, otherwise 0 '],
                      ['Bit 7', 'Number of corresponding valid pulses is below Meas_Cavity_Lock_Status_Thresh 1, otherwise 0 '],
                      ['Bit 8', 'Spacecraft attitude not on target 1, otherwise 0 '],
                      ['Bit 9', 'Rayleigh response not found 1, otherwise 0'],
                      ['Bit 10','Set to 1 if the absolute wind velocity above Wind_Velocity_Threshold, default 0 '],
                      ['Bit 11','Set to 1 if polynomial fit of error responses was used but no valid root of the polynomial was found, otherwise 0. '],
                      ['Bit 12','Bin was detected as ground bin, otherwise 0. '],
                      ['Bit 13','Spare, set to 0'],
                      ['Bit 14','Spare, set to 0'],
                      ['Bit 15','Spare, set to 0'],
                      ['Bit 16','Spare, set to 0']
                  ],
                  enabled: [
                      true,
                      false,
                      false,
                      false,
                      false,
                      false,
                      false,
                      false,
                      false,
                      false,
                      false,
                      false,
                      false,
                      false,
                      false,
                      false
                  ]
              },
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
    colorAxis: ['mie_HLOS_wind_speed'],
    positionAlias: {
        'latitude': 'mie_latitude',
        'longitude': 'mie_longitude',
        'altitude': 'mie_altitude'
    }

};

var dataSettings = {

            'datetime': {
                scaleFormat: 'time',
                timeFormat: 'MJD2000_S'
            },

            'L1B_start_time_obs': {
                scaleFormat: 'time',
                timeFormat: 'MJD2000_S'
            },

                'SCA_extinction': {
                uom: '10-6 * m^-1',
                colorscale: 'plasma',
                extent: [-20, 20]
            },
            'SCA_extinction_variance': {
                uom: 'm^-2',
                nullValue: -1
            },
            'SCA_backscatter': {
                uom: '10-6 * m^-1* sr^-1',
                colorscale: 'plasma',
                extent: [-20, 20]
            },
            'SCA_backscatter_variance': {
                uom: 'm^-2*sr^-2',
                nullValue: -1
            },
            'SCA_LOD_variance': {
                nullValue: -1
            },
            'SCA_time_obs':{
                scaleFormat: 'time',
                timeFormat: 'MJD2000_S'
            },
            'SCA_time_obs_start':{
                scaleFormat: 'time',
                timeFormat: 'MJD2000_S'
            },
            'SCA_time_obs_stop':{
                scaleFormat: 'time',
                timeFormat: 'MJD2000_S'
            },
            'mie_altitude_obs':{

                uom: 'm'
            },
            'rayleigh_altitude_obs':{

                uom: 'm'
            },
            'longitude_of_DEM_intersection_obs':{
                uom: 'deg'
            },
            'latitude_of_DEM_intersection_obs':{
                uom: 'deg'
            },
            'altitude_of_DEM_intersection_obs':{
                uom: 'm'
            },

            'MCA_extinction': {
                uom: '10-6 * m^-1',
                colorscale: 'viridis',
                extent: [-20, 20]
            },
            'MCA_backscatter': {
                uom: '10-6 * m^-1* sr^-1',
                colorscale: 'viridis',
                extent: [-20, 20]
            },
            'MCA_time_obs_start': {
                scaleFormat: 'time',
                timeFormat: 'MJD2000_S'
            },
            'MCA_time_obs_stop': {
                scaleFormat: 'time',
                timeFormat: 'MJD2000_S'
            },
            'ICA_time_obs_start': {
                scaleFormat: 'time',
                timeFormat: 'MJD2000_S'
            },
            'ICA_time_obs_stop': {
                scaleFormat: 'time',
                timeFormat: 'MJD2000_S'
            },
            'ICA_extinction':{
                nullValue: -1000000
            },
            'ICA_backscatter':{
                nullValue: -1000000
            },

            // L2A Group
            'group_backscatter_variance':{
                uom: 'm^-2*sr^-2',
                nullValue: -1
            },
            'group_extinction_variance':{
                uom: 'm^-2',
                nullValue: -1
            },
            'group_extinction':{
                uom: '10-6 * m^-1',
                nullValue: -1
            },
            'group_backscatter':{
                uom: '10-6 * m^-1* sr^-1',
                nullValue: -1
            },
            'group_LOD_variance':{
                uom: null,
                nullValue: -1
            },
            'group_LOD':{
                uom: null,
                //nullValue: 1.7e+38
            },
            'group_SR':{
                uom: null,
                //nullValue: 1.7e+38
            },

   
    mie_datetime_start: {
        scaleFormat: 'time',
        timeFormat: 'MJD2000_S'
    },
    mie_datetime_end: {
        scaleFormat: 'time',
        timeFormat: 'MJD2000_S'
    },

    rayleigh_datetime_start: {
        scaleFormat: 'time',
        timeFormat: 'MJD2000_S'
    },
    rayleigh_datetime_end: {
        scaleFormat: 'time',
        timeFormat: 'MJD2000_S'
    },

    time: {
        scaleFormat: 'time',
        timeFormat: 'MJD2000_S'
    },

    mie_HLOS_wind_speed: {
        uom: 'm/s',
        colorscale: 'viridis',
       // nullValue: 642.7306076260679
        //extent: [-140,39]
        //outline: false
    },

    rayleigh_HLOS_wind_speed: {
        uom: 'm/s',
        colorscale: 'plasma',
       // nullValue: 642.7306076260679
        extent: [-50,50]
        //outline: false
    },

    rayleigh_altitude: {
        uom: 'm'
    },

    mie_altitude: {
        uom: 'm'
    },
    F: {
        'lineConnect': true,
        size: 5
    },
    F_error: {
        'lineConnect': true,
        size: 5
    },
    Timestamp: {
        scaleFormat: 'time'
    },

    QDLat: {
        lineConnect: true,
        symbol: null
    },
    
    Longitude: {
        periodic: {
            period: 360,
            offset: -180
        }
    },

    Latitude: {
        periodic: {
            period: 180,
            offset: -90
        }
    },
    Latitude_periodic: {
        periodic: {
            period: 360,
            offset: 0,
            specialTicks: true
        }
    },
    QDLatitude_periodic: {
        periodic: {
            period: 360,
            offset: 0,
            specialTicks: true
        }
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



var filterManager = new FilterManager({
    el:'#filters',
    filterSettings: filterSettings,
    ignoreParameters: '__info__'
});

var data;


var graph = new graphly.graphly({
    el: '#graph',
    dataSettings: dataSettings,
    renderSettings: renderSettingsAeolus,
    /*dataSettings: testbed14DS,
    renderSettings: testbed14RS,*/
    filterManager: filterManager,
    ignoreParameters: ['__info__'],
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
    multiYAxis: true,
    debug: true,
    enableSubXAxis: false,
    enableSubYAxis: false,
    colorscales: ['jet', 'viridis', 'pakito', 'plasma'],
    //showFilteredData: false
    margin: {top: 50, left: 90, bottom: 50, right: 40},
    colorAxisTickFormat: 'customExp',
    defaultAxisTickFormat: 'customExp'

});

filterManager.setRenderNode('#filters');

/*var graph2 = new graphly.graphly({
    el: '#graph2',
    dataSettings: dataSettings,
    renderSettings: renderSettings_mie2,
    filterManager: filterManager,
    //ignoreParameters: []
    debounceActive: true,
    //enableFit: false,
    //displayColorscaleOptions: false,
    //displayAlphaOptions: false
    //displayParameterLabel: false,
    //displayColorscaleOptions: false,
    //displayAlphaOptions: false,
    //autoColorExtent: true
    //fixedSize: true,
    //fixedWidth: 2000
    debug: true,
    enableSubXAxis: true,
    enableSubYAxis: true,
    connectedGraph: graph
});*/
/*var graph2 = new graphly.graphly({
    el: '#graph2',
    dataSettings: ds_mie,
    renderSettings: renderSettings_mie,
    filterManager: filterManager,
    //fixedSize: true,
    //fixedWidth: 12000
    //connectedGraph: graph
});*/

//graph.connectGraph(graph2);




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

var usesecond = false;


var xhr = new XMLHttpRequest();

xhr.open('GET', 'data/aeolus_L1.mp', true);
//xhr.open('GET', 'data/testbed14.mp', true);
//xhr.open('GET', 'data/swarmupload.mp', true);

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
    data = msgpack.decode(tmp);
    
    /*var ids = {
      'A': 'Alpha',
      'B': 'Bravo',
      'C': 'Charlie',
      '-': 'NSC',
      'U': 'Upload'
    };

    if(data.hasOwnProperty('Spacecraft')) {
      data['id'] = [];
      for (var i = 0; i < data.Timestamp.length; i++) {
        data.id.push(ids[data.Spacecraft[i]]);
      }
    }

    if(data.hasOwnProperty('B_NEC')) {
      data['B_N'] = [];
      data['B_E'] = [];
      data['B_C'] = [];
      for (var i = 0; i < data.B_NEC.length; i++) {
        data['B_N'].push(data.B_NEC[i][0]);
        data['B_E'].push(data.B_NEC[i][1]);
        data['B_C'].push(data.B_NEC[i][2]);
      }
    }
    delete data.B_NEC;

    if(data.hasOwnProperty('Latitude') && data.hasOwnProperty('OrbitDirection')) {
      data['Latitude_periodic'] = [];
      for (var i = 0; i < data.Latitude.length; i++) {
        if(data.OrbitDirection[i] === 1){
            // range 90 -270
            data.Latitude_periodic.push(data.Latitude[i]+180);
        } else if (data.OrbitDirection[i] === -1){
            if(data.Latitude[i]<0){
                // range 0 - 90
                data.Latitude_periodic.push((data.Latitude[i]*-1));
            } else {
                // range 270 - 360
                data.Latitude_periodic.push(360-data.Latitude[i]);
            }
            
        } else if (data.OrbitDirection[i] === 0){
            //TODO what to do here? Should in principle not happen
        }
      }
    }

    if(data.hasOwnProperty('QDLat') && data.hasOwnProperty('QDOrbitDirection')) {
      data['QDLatitude_periodic'] = [];
      for (var i = 0; i < data.QDLat.length; i++) {
        if(data.QDOrbitDirection[i] === 1){
            // range 90 -270
            data.QDLatitude_periodic.push(data.QDLat[i]+180);
        } else if (data.QDOrbitDirection[i] === -1){
            if(data.QDLat[i]<0){
                // range 0 - 90
                data.QDLatitude_periodic.push((data.QDLat[i]*-1));
            } else {
                // range 270 - 360
                data.QDLatitude_periodic.push(360-data.QDLat[i]);
            }
            
        } else if (data.QDOrbitDirection[i] === 0){
            //TODO what to do here? Should in principle not happen
        }
      }
    }

    if(data.hasOwnProperty('QDLatitude') && data.hasOwnProperty('QDOrbitDirection')) {
      data['QDLatitudePole'] = [];
      for (var i = 0; i < data.QDLatitude.length; i++) {
        data.QDLatitudePole.push(ids[data.Spacecraft[i]]);
      }
    }

    for (var i = 0; i < data.Timestamp.length; i++) {
      data.Timestamp[i] = new Date(data.Timestamp[i]*1000);
    }
    data['B_NEC_resAC_N'] = [];
    data['B_NEC_resAC_E'] = [];
    data['B_NEC_resAC_C'] = [];

    for (var i = 0; i < data.B_NEC_resAC.length; i++) {
        data['B_NEC_resAC_N'].push(data.B_NEC_resAC[i][0]);
        data['B_NEC_resAC_E'].push(data.B_NEC_resAC[i][1]);
        data['B_NEC_resAC_C'].push(data.B_NEC_resAC[i][2]); 
    }

    graph.loadData(data);*/

    var ds = data.ALD_U_N_1B[0];

    var time = proxyFlattenObservationArraySE(ds.time, ds.mie_altitude);
    var mie_HLOS_wind_speed = flattenObservationArray(ds.mie_HLOS_wind_speed);
    var latitude_of_DEM_intersection = proxyFlattenObservationArraySE(
      ds.latitude_of_DEM_intersection,
      ds.mie_altitude
    );
    var mie_altitude = flattenObservationArraySE(ds.mie_altitude);
    var mie_bin_quality_flag = flattenObservationArray(ds.mie_bin_quality_flag);
    var geoid_separation =proxyFlattenObservationArraySE(ds.geoid_separation, ds.mie_altitude);


    var rayleigh_HLOS_wind_speed = flattenObservationArray(ds.rayleigh_HLOS_wind_speed);
    var rayleigh_altitude = flattenObservationArraySE(ds.rayleigh_altitude);
    var rayleigh_bin_quality_flag = flattenObservationArray(ds.rayleigh_bin_quality_flag);


    data = {
      mie_datetime_start: time[0],
      mie_datetime_end: time[1],
      latitude_of_DEM_intersection_start: latitude_of_DEM_intersection[1],
      latitude_of_DEM_intersection_end: latitude_of_DEM_intersection[0],
      mie_HLOS_wind_speed: mie_HLOS_wind_speed,
      mie_bin_quality_flag: mie_bin_quality_flag,
      mie_altitude_top: mie_altitude[0],
      mie_altitude_bottom: mie_altitude[1],
      geoid_separation: geoid_separation[0],
      rayleigh_HLOS_wind_speed: rayleigh_HLOS_wind_speed,
      rayleigh_bin_quality_flag: rayleigh_bin_quality_flag,
      rayleigh_altitude_top: rayleigh_altitude[0].slice(0),
      rayleigh_altitude_bottom: rayleigh_altitude[1].slice(0),
      rayleigh_datetime_start: time[0].slice(0),
      rayleigh_datetime_end: time[1].slice(0),
    };

    filterManager.initManager();
    filterManager.loadData(data);
    filterManager._renderFilters();
    filterManager._renderFilters();

    graph.loadData(data);


    //L2A
    /*data = data['ALD_U_N_2A'];
    var keys = Object.keys(data);
    var ds = data;
    var resData = {};
    for (var k = 0; k < keys.length; k++) {
            var subK = Object.keys(ds[keys[k]]);
            for (var l = 0; l < subK.length; l++) {
              var curArr = ds[keys[k]][subK[l]];
              if( Array.isArray(curArr[0]) ){
                if(subK[l].includes('altitude')){
                  // Create bottom and top arrays
                  var tmpArrBottom = [];
                  var tmpArrTop = [];
                  for (var i = 0; i < curArr.length; i++) {
                    for (var j = 0; j < 24; j++) {
                      tmpArrBottom.push(curArr[i][j]);
                      tmpArrTop.push(curArr[i][j+1]);
                    }
                  }
                  resData[subK[l]+'_bottom'] = tmpArrBottom;
                  resData[subK[l]+'_top'] = tmpArrTop;
                } else {
                  resData[subK[l]] = [].concat.apply([], ds[keys[k]][subK[l]]);
                }
              }else{
                if(subK[l].indexOf('ICA_bins')===-1){
                  var tmpArr = [];
                  for (var i = 0; i < curArr.length; i++) {
                    for (var j = 0; j < 24; j++) {
                      tmpArr.push(curArr[i]);
                    }
                  }
                  resData[subK[l]+'_orig'] = curArr;
                  resData[subK[l]] = tmpArr;
                } else {
                  resData[subK[l]] = curArr;
                }
                
              }
            }
          }

          // Check if data is actually available
          if((resData.hasOwnProperty('SCA_time_obs') && resData['SCA_time_obs'].length > 0) && 
             (resData.hasOwnProperty('MCA_time_obs') && resData['MCA_time_obs'].length > 0) && 
             (resData.hasOwnProperty('ICA_time_obs') && resData['ICA_time_obs'].length > 0)) {


            // Create new start and stop time to allow rendering
            resData['SCA_time_obs_start'] = resData['SCA_time_obs'].slice();
            resData['SCA_time_obs_stop'] = resData['SCA_time_obs'].slice(24, resData['SCA_time_obs'].length);
            resData['MCA_time_obs_start'] = resData['MCA_time_obs'].slice();
            resData['MCA_time_obs_stop'] = resData['MCA_time_obs'].slice(24, resData['MCA_time_obs'].length);
            resData['ICA_time_obs_start'] = resData['ICA_time_obs'].slice();
            resData['ICA_time_obs_stop'] = resData['ICA_time_obs'].slice(24, resData['ICA_time_obs'].length);

            resData['SCA_time_obs_orig_start'] = resData['SCA_time_obs_orig'].slice();
            resData['SCA_time_obs_orig_stop'] = resData['SCA_time_obs_orig'].slice(1, resData['SCA_time_obs_orig'].length);
            resData['MCA_time_obs_orig_start'] = resData['MCA_time_obs_orig'].slice();
            resData['MCA_time_obs_orig_stop'] = resData['MCA_time_obs_orig'].slice(1, resData['MCA_time_obs_orig'].length);
            resData['ICA_time_obs_orig_start'] = resData['ICA_time_obs_orig'].slice();
            resData['ICA_time_obs_orig_stop'] = resData['ICA_time_obs_orig'].slice(1, resData['ICA_time_obs_orig'].length);
            // Add element with additional 12ms as it should be the default
            // time interval between observations
            // TODO: make sure this is acceptable! As there seems to be some 
            // minor deviations at start and end of observations
            var lastValSCA =  resData['SCA_time_obs_orig'].slice(-1)[0]+12;
            var lastValMCA =  resData['MCA_time_obs_orig'].slice(-1)[0]+12;
            var lastValICA =  resData['MCA_time_obs_orig'].slice(-1)[0]+12;
            for (var i = 0; i < 24; i++) {
              resData['SCA_time_obs_stop'].push(lastValSCA);
              resData['MCA_time_obs_stop'].push(lastValMCA);
              resData['ICA_time_obs_stop'].push(lastValICA);
            }
            resData['SCA_time_obs_orig_stop'].push(lastValSCA);
            resData['MCA_time_obs_orig_stop'].push(lastValMCA);
            resData['ICA_time_obs_orig_stop'].push(lastValICA);

            var lonStep = 15;
            var latStep = 15;


            var jumpPos = [];
            var signCross = [];
            for (var i = 1; i < resData.latitude_of_DEM_intersection_obs_orig.length; i++) {
              var latdiff = Math.abs(
                resData.latitude_of_DEM_intersection_obs_orig[i-1]-
                resData.latitude_of_DEM_intersection_obs_orig[i]
              );
              var londiff = Math.abs(
                resData.longitude_of_DEM_intersection_obs_orig[i-1]-
                resData.longitude_of_DEM_intersection_obs_orig[i]
              ); 
              // TODO: slicing not working correctly for L2a
              if (latdiff >= latStep) {
                signCross.push(latdiff>160);
                jumpPos.push(i);
              }else if (londiff >= lonStep) {
                signCross.push(londiff>340);
                jumpPos.push(i);
              }
            }

            var jumpPos2 = [];
            var signCross2 = [];
            for (var i = 1; i < resData.latitude_of_DEM_intersection_obs.length; i++) {
              var latdiff = Math.abs(
                resData.latitude_of_DEM_intersection_obs[i-1]-
                resData.latitude_of_DEM_intersection_obs[i]
              );
              var londiff = Math.abs(
                resData.longitude_of_DEM_intersection_obs[i-1]-
                resData.longitude_of_DEM_intersection_obs[i]
              ); 

              if (latdiff >= latStep) {
                signCross2.push(latdiff>160);
                jumpPos2.push(i);
              }else if (londiff >= lonStep) {
                signCross2.push(londiff>340);
                jumpPos2.push(i);
              }
            }

            // Remove elements where there is a jump
            for (var j = 0; j < jumpPos2.length; j++) {
              if(!signCross2[j]){
                for (var key in resData){
                  resData[key].splice(jumpPos2[j]-24,24);
                }
              }
            }
            resData.jumps = jumpPos;
            resData.signCross = signCross;
          }
          data = resData;
          graph.loadData(data);*/


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


/*function rotate() {
    var elem = document.getElementById("animation"); 
    var angle = 0;
    var id = setInterval(frame, 5);

    function frame() {
        if (angle == 360) {
            //clearInterval(id);
            angle = 0;
        } else {
            angle++; 
            elem.style.transform = 'rotate('+angle + 'deg)';
        }
    }
}*/