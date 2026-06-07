const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const polyfillPath = require.resolve('./src/polyfills/ensure-require-global');
const previousRunBeforeMain = config.serializer?.getModulesRunBeforeMainModule;

config.serializer = config.serializer || {};
config.serializer.getModulesRunBeforeMainModule = () => {
	const base =
		typeof previousRunBeforeMain === 'function'
			? previousRunBeforeMain()
			: [];

	return [...base, polyfillPath];
};

module.exports = config;
