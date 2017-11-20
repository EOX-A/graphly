


const path = require('path');
const webpack = require('webpack');


module.exports = {

    entry: ['babel-polyfill', './src/graphly.js'],
    output: {
        filename: 'dist/graphly.min.js',
        library: 'graphly',
        libraryTarget: 'window',
    },
    externals: {
        // TODO: Do not include dependencies in release?
        "d3": "d3",
        "papaparse": "papaparse",
        "plotty": "plotty",
        "msgpack": "msgpack-lite"
    },
    plugins: [
        new webpack.optimize.UglifyJsPlugin()
    ],
    module: {
       loaders: [
            { test: /\.css$/, loader: "style-loader!css-loader" },
        ],
        rules: [
            {
                test: /\.css$/,
                use: [ 'style-loader', 'css-loader' ]
            },
            {
                test: /\.(png|jpg|gif|svg|eot|ttf|woff|woff2)$/,
                loader: 'url-loader',
                options: {
                    limit: 10000
                }
            },
            {
                test: /\.js$/,
                exclude: /(node_modules|bower_components)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                         presets: ['es2015'],
                    }
                }
            }
        ]
    },
    node: {
      fs: 'empty'
    },
    cache: true
};