SHELL=/bin/bash

build:
	rm -rf ./build
	./node_modules/typescript/bin/tsc

test: build
	./node_modules/jest/bin/jest.js

