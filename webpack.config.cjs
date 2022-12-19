const path = require("path");

module.exports = {
    entry: './timewave.js',
    //watch: true,
    output: {
        filename: './browser/timewave.js',
        path: __dirname,
        chunkFormat: "array-push"
    },
    resolve: {
        //extensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.css', '.scss'],
        modules: ['./node_modules']
    },
    experiments: {
        topLevelAwait: true
    },
    optimization: {
       minimize: true
    }
};