const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');

// assets.js
//const Assets = require('./assets');

// the path(s) that should be cleaned
let pathsToClean = [
  'wwwroot/*.*'
];


module.exports = {
    entry: {
        "graphly": "./src/graphly.js"
    },
    output: {
        path: __dirname + "/wwwroot/",
        //filename: "[name].[hash].min.js"
        filename: "[name].min.js"
    },
    plugins: [
      new CleanWebpackPlugin(pathsToClean),
      /*new CopyWebpackPlugin(
        Assets.map(asset => {
          return {
            from: path.resolve(__dirname, `./node_modules/${asset}`),
            to: path.resolve(__dirname, './wwwroot/assets')
          };
        })
      ),*/
      /*new webpack.optimize.UglifyJsPlugin({
        include: /\.min\.js$/,
        minimize: true,
        mangle: {
          reserved: ['_paq']
        }
      }),
      /*new HtmlWebpackPlugin({
        title: 'graphly',
        template: './client/index_template.ejs',
      })*/
    ],
    module: {
       loaders: [
             {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'babel-loader',
                query: {
                    presets: ['es2015']
                }
            },
            {
              test: /\.(png|gif|jpg|jpeg|svg)$/,
              loader: "file-loader?publicPath=&name=./assets/[hash].[ext]"
            },
            { test: /\.css$/, loader: "style-loader!css-loader" },
            {
                test: /\.scss$/,
                loaders: ['style-loader', 'css-loader', 'sass-loader']
            }
        ]
    },
    node: {
      fs: 'empty'
    }
};