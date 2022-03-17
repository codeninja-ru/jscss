SHELL=/bin/bash
JEST=./node_modules/jest/bin/jest.js

clean:
	rm -rf ./build

build: clean
	./node_modules/typescript/bin/tsc

test: build
	$(JEST)

debug:
	@echo "open chrome://inspect"
	node --inspect-brk $(JEST) --runInBand
