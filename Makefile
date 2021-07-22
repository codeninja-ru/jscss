SHELL=/bin/bash

clean:
	rm -rf ./build

build: clean
	./node_modules/typescript/bin/tsc

test: build
	./node_modules/jest/bin/jest.js

