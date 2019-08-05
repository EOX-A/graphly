


const path = require('path');
const webpack = require('webpack');


module.exports = {
    mode: 'production',
    entry: ['babel-polyfill', './src/graphly.js'],
    output: {
        filename: 'graphly.min.js',
        library: 'graphly',
        libraryTarget: 'window',
    },
    externals: {
        "d3": "d3",
    },
    plugins: [
        //new webpack.optimize.UglifyJsPlugin()
    ],
    module: {
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
                         presets: ['@babel/preset-env'],
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