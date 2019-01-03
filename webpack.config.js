const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const dist = path.resolve(__dirname, "dist");
const WasmPackPlugin = require("@wasm-tool/wasm-pack-plugin");

module.exports = {
    entry: "./js/index.js",
    output: {
        path: dist,
        filename: "bundle.js"
    },
    devServer: {
        contentBase: dist,
    },
    module: {
        rules: [
            {
                test: /\.m?js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env'],
                        plugins: [
                            ["transform-react-jsx", { "pragma": "h" }],
                            ["syntax-dynamic-import"],
                            ["@babel/plugin-proposal-class-properties"],
                            ["@babel/syntax-class-properties"],
                        ]
                    }
                }
            }
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: 'index.html'
        }),

        new WasmPackPlugin({
            crateDirectory: path.resolve(__dirname, "crate")
        }),
    ],
    devtool: 'eval-source-map',
};
