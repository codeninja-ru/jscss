SHELL=/bin/bash
JEST=./node_modules/jest/bin/jest.js
ROLLUP=NODE_PATH=${CURDIR}/build ./node_modules/rollup/dist/bin/rollup

clean:
	rm -rf ./build

rollup:
	$(ROLLUP) -c rollup.config.js
	chmod +x ./build/jss.js

compile:
	./node_modules/typescript/bin/tsc

build: clean compile rollup

test: build
	$(JEST)

debug: build
	@echo "open chrome://inspect"
	node --inspect-brk $(JEST) --runInBand
