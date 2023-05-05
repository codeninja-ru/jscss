SHELL=/bin/bash
JEST=./node_modules/jest/bin/jest.js
ROLLUP=NODE_PATH=${CURDIR}/build ./node_modules/rollup/dist/bin/rollup
JSS=./build/jss.js

clean:
	rm -rf ./build

rollup:
	$(ROLLUP) -c rollup.config.js
	chmod +x ./build/jss.js

compile:
	./node_modules/ttypescript/bin/tsc

build: clean compile rollup

test: build
	$(JEST)

debug: build
	@echo "open chrome://inspect"
	node --inspect-brk $(JEST) --runInBand

publish-build:
	cp ./package.json ./build
	cp ./README.md ./build
	cp ./LICENSE ./build

publish: publish-build
	npm publish ./build --access=public

publish-test: publish-build
	npm publish ./build --access=public --dry-run

profile: build
	-rm isolate-*.log
	time node --prof $(JSS) ./test/atom.io.css -
	node --prof-process --preprocess -j isolate-*.log | npx flamebearer

deopt: build
#		--trace-elements-transitions \
# node --v8-option to see more v8 options
	-rm isolate-*-v8.log
	node --trace-deopt \
		--log-deopt \
		--trace-deopt-verbose \
		--trace-opt \
		--trace-opt-verbose \
		--trace-opt-stats \
--print-opt-code-filter="*spaceReader*" \
		$(JSS) test/atom.io.css /tmp/atom.css | less

opt: build
	-rm isolate-*-v8.log
	node --trace-opt \
		--trace-opt-verbose \
		--trace-opt-stats \
		$(JSS) test/atom.io.css /tmp/atom.css | less

chrome: build
	node --inspect-brk $(JSS) ./test/atom.io.css -
