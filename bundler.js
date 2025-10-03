const createBundler = require('@airtable/blocks-webpack-bundler').default;

function createConfig(baseConfig) {
    const cssRule = baseConfig.module.rules.find(
        rule => rule.test && rule.test.toString().includes('css'),
    );

    cssRule.use = [
        'style-loader',
        'css-loader',
        {
            loader: 'postcss-loader',
            options: {
                postcssOptions: {
                    plugins: [require('tailwindcss'), require('autoprefixer')],
                },
            },
        },
    ];

    // Transpile react-map-gl only. Do NOT transpile mapbox-gl to avoid breaking its WebWorker bundle.
    baseConfig.module.rules.push({
        test: /\.m?js$/,
        include: /node_modules\/react-map-gl/,
        use: {
            loader: 'babel-loader',
            options: {
                sourceType: 'unambiguous',
                presets: [
                    [
                        '@babel/preset-env',
                        {
                            modules: false,
                        },
                    ],
                ],
                plugins: [
                    [
                        '@babel/plugin-transform-runtime',
                        {
                            helpers: true,
                            regenerator: true,
                            corejs: false,
                        },
                    ],
                ],
            },
        },
    });

    // Disable code splitting so vendor chunks (like mapbox-gl) aren't lazy-loaded
    baseConfig.optimization = baseConfig.optimization || {};
    baseConfig.optimization.splitChunks = false;
    baseConfig.optimization.runtimeChunk = false;

    return baseConfig;
}

exports.default = () => {
    return createBundler(createConfig);
};
