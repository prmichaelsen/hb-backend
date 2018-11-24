module.exports = {
	rootDir: '.',
	transform: {
		"^.+\\.tsx?$": "ts-jest",
	},
	testMatch: ['<rootDir>/**/?(*.)+(spec|test).ts?(x)'],
	moduleFileExtensions: ['ts', 'js'],
	testEnvironment: 'node',
	verbose: true,
}