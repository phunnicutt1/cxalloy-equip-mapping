const path = require('path');
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  mode: 'production',
  entry: './lib/codeigniter-bridge.tsx',
  
  output: {
    path: path.resolve(__dirname, 'dist/standalone'),
    filename: 'equipment-mapping-bundle.js',
    library: 'EquipmentMapping',
    libraryTarget: 'umd',
    globalObject: 'this',
    publicPath: 'auto', // critical for asset URLs in Apache
  },

  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs'],
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },

  externals: {
    // Bundle React and ReactDOM into the bundle (React 19 has no UMD builds)
    // No externals needed - everything bundled together
  },

  module: {
    rules: [
      {
        test: /\.(css|scss)$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          'sass-loader',
        ],
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'images/[name][ext]', // No hash
        },
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name][ext]', // No hash
        },
      },
    ],
  },

  plugins: [
    new MiniCssExtractPlugin({
      filename: 'css/styles.css', // Simple filename
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
  ],

  optimization: { minimize: true},
};
