


const path = require('path');
const webpack = require('webpack');


module.exports = {
    mode: 'development',
    entry: ['babel-polyfill', './src/graphly.js'],
    output: {
        filename: 'dist/graphly.js',
        library: 'graphly',
        libraryTarget: 'window',
    },
    plugins: [],
    devServer: {
      host:'0.0.0.0',
      compress: true,
      port: 9000,
      filename: 'graphly.js',
      inline: true,
    },
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