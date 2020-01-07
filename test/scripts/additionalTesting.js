


export var renderSettingsDefinition = {

    'L2A': {
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
            SCA_middle_bin: {
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
            },
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
    },


    'L1B': {
        xAxis: 'datetime',
        yAxis: [['mie_altitude'], ['rayleigh_altitude']],
        y2Axis: [[], []],
        groups: ['mie', 'rayleigh'],
        combinedParameters: {
            rayleigh_datetime: ['rayleigh_datetime_start', 'rayleigh_datetime_end'],
            rayleigh_altitude: ['rayleigh_altitude_bottom', 'rayleigh_altitude_top'],
            mie_datetime: ['mie_datetime_start', 'mie_datetime_end'],
            mie_altitude: ['mie_altitude_bottom', 'mie_altitude_top'],
            latitude_of_DEM_intersection: ['latitude_of_DEM_intersection_start', 'latitude_of_DEM_intersection_end'],
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
                    'geoid_separation',
                    'latitude_of_DEM_intersection',
                    'latitude_of_DEM_intersection_start',
                    'latitude_of_DEM_intersection_end',
                ],
            },
            rayleigh: {
                parameters: [
                    'rayleigh_datetime',
                    'rayleigh_altitude',
                    'rayleigh_altitude_start',
                    'rayleigh_altitude_end',
                    'rayleigh_HLOS_wind_speed',
                    'rayleigh_bin_quality_flag',
                    'rayleigh_altitude_top',
                    'rayleigh_altitude_bottom',
                    'rayleigh_datetime_start',
                    'rayleigh_datetime_end',
                    'geoid_separation',
                    'latitude_of_DEM_intersection',
                    'latitude_of_DEM_intersection_start',
                    'latitude_of_DEM_intersection_end',
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
            ],
            'latitude_of_DEM_intersection': ['latitude_of_DEM_intersection'],
        },
        additionalXTicks: [],
        additionalYTicks: [],
        availableParameters: false
    },

    'swarm': {
        xAxis: 'Timestamp',
        yAxis:     [['F'], ['F_error']],
        colorAxis: [[null], [null]],

        y2Axis:     [['F_error'], []],
        colorAxis2: [[null], []],
        dataIdentifier: {
            parameter: 'id',
            identifiers: ['Alpha', 'Upload']
        },
        additionalXTicks: [],
        additionalYTicks: [],
        availableParameters: {
            'Alpha': ['Spacecraft', 'Timestamp', 'Latitude', 'Longitude', 'Radius', 'F', 'F_error', 'B_NEC_resAC', 'B_VFM', 'B_error', 'B_N','B_E','B_C', 'Kp', 'Dst', 'F107', 'QDLat', 'QDLon', 'MLT', 'OrbitNumber', 'OrbitDirection', 'QDOrbitDirection', 'SunDeclination', 'SunRightAscension', 'SunHourAngle', 'SunAzimuthAngle', 'SunZenithAngle'],
            'Upload': ['Spacecraft', 'Timestamp', 'Latitude', 'Longitude', 'Radius', 'Kp', 'Dst', 'F107', 'QDLat', 'QDLon', 'MLT', 'Relative_STEC_RMS', 'Relative_STEC', 'Absolute_STEC', 'GPS_Position', 'LEO_Position', 'SunDeclination', 'SunRightAscension', 'SunHourAngle', 'SunAzimuthAngle', 'SunZenithAngle']
        }
    },

    'testbed14':  {
        xAxis: 'time',
        yAxis: [
            'altitude'
        ],
        combinedParameters: {
            altitude: ['altitude_end', 'altitude_start'],
            time: ['time_start', 'time_end'],
        },
        colorAxis: ['CPR_Cloud_mask']
    },

    'L2B_group': {
        xAxis: ['measurements'],
        yAxis: [
            ['rayleigh_bins']
        ],
        combinedParameters: {
            mie_bins: ['mie_bins_end', 'mie_bins_start'],
            mie_measurements: ['mie_meas_start', 'mie_meas_end'],
            rayleigh_bins: ['rayleigh_bins_end', 'rayleigh_bins_start'],
            rayleigh_measurements: ['rayleigh_meas_start', 'rayleigh_meas_end']
        },
        colorAxis: [
            ['rayleigh_meas_map']
        ],
        groups: ['rayleigh'],
        reversedYAxis: true,
        additionalXTicks: [],
        additionalYTicks: [[]],
        y2Axis: [[]],
        colorAxis2: [[]],
        renderGroups: {
            mie: {
                parameters: [
                    'mie_bins',
                    'mie_measurements',
                    'mie_bins_end',
                    'mie_bins_start',
                    'mie_meas_start',
                    'mie_meas_end',
                    'mie_meas_map'
                ],
                defaults: {
                    yAxis: 'mie_bins',
                    colorAxis: 'mie_meas_map'
                }
            },
            rayleigh: {
                parameters: [
                    'rayleigh_bins',
                    'rayleigh_measurements',
                    'rayleigh_bins_end',
                    'rayleigh_bins_start',
                    'rayleigh_meas_start',
                    'rayleigh_meas_end',
                    'rayleigh_meas_map'
                ],
                defaults: {
                    yAxis: 'rayleigh_bins',
                    colorAxis: 'rayleigh_meas_map'
                }
            }
        },
        sharedParameters: {
            'measurements': [
                'mie_measurements', 'rayleigh_measurements'
            ],
        },
        availableParameters: false
    }


};


export var dataSettingsConfig = {
    'L2A': {
        'time': {
                    scaleFormat: 'time',
                    timeFormat: 'MJD2000_S'
                },
        'MCA_time': {
                    scaleFormat: 'time',
                    timeFormat: 'MJD2000_S'
                },
        'SCA_time': {
                    scaleFormat: 'time',
                    timeFormat: 'MJD2000_S'
                },
        'ICA_time': {
            scaleFormat: 'time',
            timeFormat: 'MJD2000_S'
        },
        'L1B_start_time_obs': {
            scaleFormat: 'time',
            timeFormat: 'MJD2000_S'
        },

        'SCA_extinction': {
            uom: '10-6 * m^-1',
            colorscale: 'viridis',
            extent: [-20, 20]
        },
        'SCA_extinction_variance': {
            uom: 'm^-2',
            nullValue: -1
        },
        'SCA_backscatter': {
            uom: '10-6 * m^-1* sr^-1',
            colorscale: 'viridis',
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
        }
    },

    'L2AGroup': {
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
        }
    },


    'L1B': {
        datetime: {
            scaleFormat: 'time',
            timeFormat: 'MJD2000_S'
        },
        rayleigh_datetime: {
            scaleFormat: 'time',
            timeFormat: 'MJD2000_S'
        },
        mie_datetime: {
            scaleFormat: 'time',
            timeFormat: 'MJD2000_S'
        },
        rayleigh_dem_altitude: {
            symbol: 'circle',
            uom: 'm',
            lineConnect: true
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
        },
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
            colorscale: 'viridis',
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
        },
        rayleigh_datetime_end: {
            scaleFormat: 'time',
            timeFormat: 'MJD2000_S'
        },
        time: {
            scaleFormat: 'time',
            timeFormat: 'MJD2000_S'
        },
        rayleigh_HLOS_wind_speed: {
            uom: 'm/s',
            colorscale: 'viridis',
           // nullValue: 642.7306076260679
            extent: [-50,50]
            //outline: false
        }

    },


    'swarm': {
        T_elec: {
            symbol: 'circle',
            uom: 'n',
            colorscale: 'viridis'
            //regression: 'polynomial',
            //lineConnect: true
        },
        F_error: {
            colorscale: 'inferno'
        },
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
        F: {
            'lineConnect': true,
            size: 5
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
    },

    'testbed14': {
        CPR_Cloud_mask: {
            uom: null,
            colorscale: 'viridis',
            extent: [-140,39]
        }
    },

    'L2B_group': {
        'mie_meas_map': {
            colorscale: 'jet',
            csDiscrete: true
        },

        'rayleigh_meas_map': {
            colorscale: 'jet',
            csDiscrete: true
        },
    }


};


export var filterSettingsConfiguration = {
    'L2A': {
        dataSettings: dataSettingsConfig['L2A'],
        visibleFilters: [
            'Frequency_Offset',
            'Frequency_Valid',
            'Measurement_Response_Valid',
            'Reference_Pulse_Response_Valid',
            'Measurement_Response',
            'Measurement_Error_Mie_Response',
            'Reference_Pulse_Response',
            'Reference_Pulse_Error_Mie_Response',
            'albedo_off_nadir',
        ],
        /*choiceParameter: {
            'mie_observation_type': {
                options: [
                    {'name': 'undefined', value:0},
                    {'name': 'cloudy', value:1},
                    {'name': 'clear', value:2}
                ],
                selected: 2
            }
        }*/
    },


    'L1B': {
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
        dataSettings: dataSettingsConfig['L1B'],
        visibleFilters: [
            'height',
            'latitude',
            'longitude',
            'rayleigh_wind_velocity',
            'mie_observation_type',
            'rayleigh_HLOS_wind_speed',
            'mie_HLOS_wind_speed',
            'albedo_off_nadir',
            'mie_bin_quality_flag',
            'rayleigh_bin_quality_flag'
        ],
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
                  true, false, false, false, false, false, false, false, false,
                  false, false, false, false, false, false, false
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
                  true, false, false, false, false, false, false, false, false,
                  false, false, false, false, false, false, false
              ]
          },
        }/*,
        choiceParameter: {
            'mie_observation_type': {
                options: [
                    {'name': 'undefined', value:0},
                    {'name': 'cloudy', value:1},
                    {'name': 'clear', value:2}
                ],
                selected: 2
            }
        }*/
    },


    'swarm': {
        //dataSettings: dataSettingsConfig['swarm'],
        visibleFilters: [
            'Latitude', 'F', 'F_error',
            'Dst', 'F107', 'QDLat', 'QDLon',
            'MLT', 'OrbitNumber',
            /*'SunDeclination', 'SunRightAscension', 'SunHourAngle',
            'SunAzimuthAngle', 'SunZenithAngle'*/
        ],
    },

    'L2B_group': {}

}




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







export function handleSwarmData(data, graph, filterManager){

    graph.debounceActive = true;

    var ids = {
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

    filterManager.loadData(data);
    graph.loadData(data);

}


export function handleL1BData(data, graph, filterManager){

    graph.debounceActive = true;

    var ds = data.ALD_U_N_1B.observation_data;

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

    filterManager.loadData(data);
    graph.loadData(data);
}

export function handleL2AData(data, graph, filterManager){

    graph.debounceActive = true;

    data = data['ALD_U_N_2A'];
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
              } else {
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
          latdiff = Math.abs(
            resData.latitude_of_DEM_intersection_obs[i-1]-
            resData.latitude_of_DEM_intersection_obs[i]
          );
          londiff = Math.abs(
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

      filterManager.loadData(data);
      graph.loadData(data);
}


export function handleL2BGroupData(data, graph, filterManager){

    data = data['ALD_U_N_2B'];
    var keys = Object.keys(data);
    var ds = data;
    var resData = {};

    var observationMeasSize = 30;

    var mie_bins_start = [];
    var mie_bins_end = [];
    var mie_meas_start = [];
    var mie_meas_end = [];
    var mie_measurement_map = [];
    var mie_obs_start = [];

    var mGS = ds.mie_grouping_data.mie_grouping_start_obs;
    var mGE = ds.mie_grouping_data.mie_grouping_end_obs;

    var mMS, mME;
    if(ds.mie_grouping_data.hasOwnProperty('mie_grouping_start_meas_per_obs')){
    mMS = ds.mie_grouping_data.mie_grouping_start_meas_per_obs;
    } else if(ds.mie_grouping_data.hasOwnProperty('mie_grouping_start_meas_obs')){
    mMS = ds.mie_grouping_data.mie_grouping_start_meas_obs;
    }
    if(ds.mie_grouping_data.hasOwnProperty('mie_grouping_end_meas_per_obs')){
    mME = ds.mie_grouping_data.mie_grouping_end_meas_per_obs;
    } else if(ds.mie_grouping_data.hasOwnProperty('mie_grouping_end_meas_obs')){
    mME = ds.mie_grouping_data.mie_grouping_end_meas_obs;
    }


    var mie_groupArrows = [];

    if(typeof mGS === 'undefined'){
    // empty dataset just retunr
    return;
    }

    for (var i = 0; i < mGS.length; i++) {

      var mMeasStart = (((mGS[i]-1)*observationMeasSize) + mMS[i])-1;
      var mMeasEnd = ((mGE[i]-1)*observationMeasSize) + mME[i];
      var mMeasDelta = (mMeasEnd - mMeasStart)-1;

      mie_groupArrows.push([
        mMeasStart,
        mMeasEnd,
        i
      ]);

      var obs_mie_bins_start = [];
      var obs_mie_bins_end = [];
      var obs_mie_meas_start = [];
      var obs_mie_meas_end = [];
      var obs_mie_measurement_map = [];
      mie_obs_start.push(mGS[i]);

      if(mMeasStart>=ds.measurement_data.mie_measurement_map.length){
        continue;
      }

      for (var j=0; j<ds.measurement_data.mie_measurement_map[mMeasStart].length; j++){

        for (var m=0; m<=mMeasDelta; m++) {
          if((mMeasStart+m)>ds.measurement_data.mie_measurement_map.length){
            console.log(mMeasStart);
          }
          if(ds.measurement_data.mie_measurement_map[mMeasStart+m][j] !== 0){
              obs_mie_bins_start.push(j);
              obs_mie_bins_end.push(j+1);
              obs_mie_meas_start.push(mMeasStart+m);
              obs_mie_meas_end.push((mMeasStart+m+1));
              obs_mie_measurement_map.push(
                ds.measurement_data.mie_measurement_map[mMeasStart+m][j]
              );
          }
        }
      }
      mie_bins_start.push(obs_mie_bins_start);
      mie_bins_end.push(obs_mie_bins_end);
      mie_meas_start.push(obs_mie_meas_start);
      mie_meas_end.push(obs_mie_meas_end);
      mie_measurement_map.push(obs_mie_measurement_map);
    }

    resData.mie_bins_start = mie_bins_start;
    resData.mie_bins_end = mie_bins_end;
    resData.mie_meas_start = mie_meas_start;
    resData.mie_meas_end = mie_meas_end;
    resData.mie_meas_map = mie_measurement_map;
    resData.mie_obs_start = mie_obs_start;
    resData.mie_groupArrows = mie_groupArrows;


    var rayleigh_bins_start = [];
    var rayleigh_bins_end = [];
    var rayleigh_meas_start = [];
    var rayleigh_meas_end = [];
    var rayleigh_measurement_map = [];
    var rayleigh_obs_start = [];

    var rGS = ds.rayleigh_grouping_data.rayleigh_grouping_start_obs;
    var rGE = ds.rayleigh_grouping_data.rayleigh_grouping_end_obs;

    var rMS, rME;
    if(ds.rayleigh_grouping_data.hasOwnProperty('rayleigh_grouping_start_meas_per_obs')){
    rMS = ds.rayleigh_grouping_data.rayleigh_grouping_start_meas_per_obs;
    } else if(ds.rayleigh_grouping_data.hasOwnProperty('rayleigh_grouping_start_meas_obs')){
    rMS = ds.rayleigh_grouping_data.rayleigh_grouping_start_meas_obs;
    }
    if(ds.rayleigh_grouping_data.hasOwnProperty('rayleigh_grouping_end_meas_per_obs')){
    rME = ds.rayleigh_grouping_data.rayleigh_grouping_end_meas_per_obs;
    } else if(ds.rayleigh_grouping_data.hasOwnProperty('rayleigh_grouping_end_meas_obs')){
    rME = ds.rayleigh_grouping_data.rayleigh_grouping_end_meas_obs;
    }

    var rayleigh_groupArrows = [];

    for (var i = 0; i < rGS.length; i++) {

      var rMeasStart = (((rGS[i]-1)*observationMeasSize) + rMS[i])-1;
      var rMeasEnd = ((rGE[i]-1)*observationMeasSize) + rME[i];
      var rMeasDelta = (rMeasEnd - rMeasStart)-1;

      rayleigh_groupArrows.push([
        rMeasStart,
        rMeasEnd,
        i
      ]);

      var obs_rayleigh_bins_start = [];
      var obs_rayleigh_bins_end = [];
      var obs_rayleigh_meas_start = [];
      var obs_rayleigh_meas_end = [];
      var obs_rayleigh_measurement_map = [];
      rayleigh_obs_start.push(rGS[i]);

      if(rMeasStart>=ds.measurement_data.rayleigh_measurement_map.length){
        continue;
      }

      for (var j=0; j<ds.measurement_data.rayleigh_measurement_map[rMeasStart].length; j++){

        for (var m=0; m<=rMeasDelta; m++) {
          if((rMeasStart+m)>ds.measurement_data.rayleigh_measurement_map.length){
            console.log(rMeasStart);
          }
          if(ds.measurement_data.rayleigh_measurement_map[rMeasStart+m][j] !== 0){
              obs_rayleigh_bins_start.push(j);
              obs_rayleigh_bins_end.push(j+1);
              obs_rayleigh_meas_start.push(rMeasStart+m);
              obs_rayleigh_meas_end.push((rMeasStart+m+1));
              obs_rayleigh_measurement_map.push(
                ds.measurement_data.rayleigh_measurement_map[rMeasStart+m][j]
              );
          }
        }
      }
      rayleigh_bins_start.push(obs_rayleigh_bins_start);
      rayleigh_bins_end.push(obs_rayleigh_bins_end);
      rayleigh_meas_start.push(obs_rayleigh_meas_start);
      rayleigh_meas_end.push(obs_rayleigh_meas_end);
      rayleigh_measurement_map.push(obs_rayleigh_measurement_map);
    }

    resData.rayleigh_bins_start = rayleigh_bins_start;
    resData.rayleigh_bins_end = rayleigh_bins_end;
    resData.rayleigh_meas_start = rayleigh_meas_start;
    resData.rayleigh_meas_end = rayleigh_meas_end;
    resData.rayleigh_meas_map = rayleigh_measurement_map;
    resData.rayleigh_obs_start = rayleigh_obs_start;
    resData.rayleigh_groupArrows = rayleigh_groupArrows;


    var pageSize = 3;
    var pos = 0;
    var group = 'rayleigh';

    var meas_start = 'var_meas_start'.replace('var', group);
    var meas_end = 'var_meas_end'.replace('var', group);
    var groupArrows = 'var_groupArrows'.replace('var', group);

    var slicedData = {};

    for (var key in resData){
        slicedData[key] = resData[key].slice(
            pos, ((pos+pageSize))
        ).flat();
    }


    graph.addGroupArrows(
        resData[groupArrows].slice(pos, ((pos+pageSize)))
    );
    graph.setXDomain([
        d3.extent(slicedData[meas_start])[0],
        d3.extent(slicedData[meas_end])[1]
    ]);

    graph.loadData(slicedData);


    //filterManager.loadData(resData);
    //graph.loadData(resData);

}



/*function rotate() {
    var elem = document.getElementById('animation'); 
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