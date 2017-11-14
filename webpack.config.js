


const path = require('path');
const webpack = require('webpack');


module.exports = {

    entry: './src/graphly.js',
    output: {
        filename: 'dist/graphly.js',
        library: 'graphly',
        libraryTarget: 'window',
    },
    plugins: [],
    devServer: {
      compress: true,
      port: 9000,
      filename: 'graphly.js',
      inline: true,
    },
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
            }
        ]
    },
    node: {
      fs: 'empty'
    },
    cache: true
};