
var graph = new graphly.graph({
    el: '#graph',
    renderSettings: {
        xAxis: [],
        y1Axis: [],
        //y2Axis: [],

    },
    dataSettings: {
        dem_height: {
            visible: true,
            symbol: null,
            unit: 'm',
            lineConnect: true,
            color: [0.0, 0.1, 1.0, 0.7]
        },
        mie_wind_velocity: {
            visible: true,
            rectangle: {
                x1: 'datetime_start',
                x2: 'datetime_stop',
                y1: 'altitude_bottom',
                y2: 'altitude_top'
            }
        }
    }
});

graph.loadCSV('aeolus_test.csv');
