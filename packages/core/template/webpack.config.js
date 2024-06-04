const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  entry: "./src/index.js", //入口文件
  mode: "development",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].[hash:5].js",
  },
  resolve: {
    extensions: [".js", ".jsx"],
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
          },
        },
      },
    ],
    plugins: [
      new HtmlWebpackPlugin({
        template: "./index.html",
      }),
    ],
  },
  devServer: {
    contentBase: path.join(__dirname, "dist"), // 开发服务器访问的路径
    compress: true, // 启用 gzip 压缩
    port: 9000, // 端口号
  },
};
