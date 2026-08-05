import { configWithoutCloudSupport } from '@n8n/node-cli/eslint';

export default [
	...configWithoutCloudSupport,
	{
		files: ['package.json'],
		rules: {
			'@n8n/community-nodes/no-runtime-dependencies': 'off',
			'@n8n/community-nodes/valid-author': 'off',
		},
	},
];
