const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

// assets.js
//const Assets = require('./assets');

module.exports = {
    entry: {
        "graphly": "./src/graphly.js"
    },
    output: {
        path: __dirname + "/wwwroot/",
        filename: "[name].js"
    },
    plugins: [
      /*new CopyWebpackPlugin(
        Assets.map(asset => {
          return {
            from: path.resolve(__dirname, `./node_modules/${asset}`),
            to: path.resolve(__dirname, './wwwroot/assets')
          };
        })
      ),*/
      /*new HtmlWebpackPlugin({
        title: 'mapalupa',
        template: './client/index_template.ejs',
      })*/
    ],
    devServer: {
      contentBase: path.join(__dirname, "wwwroot"),
      compress: true,
      port: 9000,
    },
    module: {
       loaders: [
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