const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')

module.exports = env => {
    const { NODE_ENV } = env
    switch (NODE_ENV) {
        //直接打包
        case 'build':
            return {
                mode: 'production',
                entry: {
                    app: path.resolve(__dirname, './src/index.js')
                },
                output: {
                    path: path.resolve(__dirname, './lib'),
                    filename: 'imageVisibilityCheck.js',
                    libraryTarget: 'umd'
                },
                module: {
                    rules: [
                        {
                            test: /\.js$/,
                            exclude: /node_modules/,
                            loader: ['babel-loader']
                        }
                    ]
                },
                plugins: [new CleanWebpackPlugin()],
                resolve: {
                    extensions: ['.js']
                }
            }
        case 'test':
            return {
                mode: 'development',
                devtool: 'inline-source-map',
                entry: {
                    app: path.resolve(__dirname, './test/example.js')
                },
                output: {
                    path: path.resolve(__dirname, './dist'),
                    filename: '[name].bundle.js'
                },
                module: {
                    rules: [
                        {
                            test: /\.js$/,
                            exclude: /node_modules/,
                            loader: ['babel-loader']
                        },
                        {
                            test: /\.jpg$/,
                            use: [
                                {
                                    loader: 'url-loader',
                                    options: {
                                        limit: 4096
                                    }
                                }
                            ]
                        }
                    ]
                },
                plugins: [
                    new CleanWebpackPlugin(),
                    new HtmlWebpackPlugin({
                        title: 'ImageVisibilityCheck demo'
                    })
                ],
                resolve: {
                    extensions: ['.js']
                },
                devServer: {
                    hot: true,
                    contentBase: path.resolve(__dirname, 'dist')
                }
            }
    }
}
