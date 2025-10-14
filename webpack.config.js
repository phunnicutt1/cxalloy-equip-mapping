// webpack.config.js - SIMPLIFIED VERSION
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  entry: './lib/codeigniter-bridge.tsx',
  
  output: {
    path: path.resolve(__dirname, 'dist/static'),
    filename: 'js/equipment-mapping.bundle.js',
    publicPath: '/public/equipment-mapping/', // FIXED: Match actual CodeIgniter path
    library: {
      type: 'window',
    },
  },
  
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  
  module: {
    rules: [
      // TypeScript/TSX Rules
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
            compilerOptions: {
              jsx: 'react-jsx', // CRITICAL: Compile JSX to React.createElement
            },
          },
        },
      },
      
      // CSS Rules (NO SASS)
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          'postcss-loader', // For Tailwind
        ],
      },
      
      // Image Rules
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'images/[name][ext]',
        },
      },
      
      // Font Rules
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name][ext]',
        },
      },
    ],
  },
  
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'css/styles.css',
    }),
  ],
};
