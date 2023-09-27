# Test for jsslang features

Styles can be duplicated
```jsslang
.className { display: block; }
.className { display: inline; }
```

Output:
```css
.className {
    display: block;
}

.className {
    display: inline;
}
```

## Imports

### JavaScript imports

it follows js imports
```jsslang
import moment from './vendor/moment.js';

#id .className${moment(new Date('10-10-2024')).format('YYYY')} {
    display: block;
}
```

Output:
```css
#id .className2024 {
    display: block;
}
```

### CSS imports

It does nothing with css imports;
```jsslang
@import 'normalize.css';
@import 'atom.io.css';
```

Output:
```css
@import 'normalize.css';
@import 'atom.io.css';
```

but it processes *.jss files in imports
```jsslang
@import 'main.jss';
```

Output:
```css
@import 'main.css';
```

Css or Jss styles can be imported by JavaScript-style import. Content of the imported files will be included in the resulting file.

```jsslang
import './main.jss';
import './styles.css';
```

Output:
```css
#main {
    width: 960px;
    margin: 0 auto;
    color: #5a5a5a;
}

.example {
    display: block;
}
```

### ES Modules

You can export code from jss files.

```jsslang title="lib1.jss"
export const clearfix = @block {
    clear: both;
};

export function nightModeColor() { return 'black'; }

export const fontSize = new Px(14);

p {
    font-size: ${fontSize};
    padding: 10px;
}
```

and import them here

```jsslang
import { clearfix, nightModeColor, fontSize } from './lib1.jss';

.menu {
    ...clearfix;
    background-color: ${nightModeColor()};
    font-size: ${fontSize};
}
```

```css
.menu {
    clear: both;
    background-color: black;
    font-size: 14px;
}
```

It's worth to mention that inner styles are not imported here. You can import the `p` styles calling `import './lib1.jss';`

```jsslang
import './lib1.jss'
```

Output:

```css
p {
    font-size: 14px;
    padding: 10px;
}
```

Jss compiler can import EM module

```javascript title='utils.js'
function pad2(n) {
    return n.length > 1 ? n : "0" + n;
}

export function rgb(r,g,b) {
    return "#" + pad2(r.toString(16)) +
        pad2(g.toString(16)) +
        pad2(b.toString(16));
}
```

```jsslang
import { rgb } from './utils.js';

div.grayColor {
    background-color: ${rgb(125, 125, 125)};
}
```

Output:

```css
div.grayColor {
    background-color: #7d7d7d;
}
```

## JssLang features

### Variables

Jss variables must behave just like normal js variables.

```jsslang
var style;

style = @block {
    background-color: white;
}

var array = [@block { ...style; color: #111; }, @block { color: #222; }, @block { color: #333; }];

.className {
    ...array[0];
}
```

Output:

```css
.className {
    background-color: white;
    color: #111;
}
```

### Class Generators

```jsslang
let columns = [];
for (var i = 1; i < 3; i++) {
    const column = @block {
        .column_${i} {
            width: ${100% / 3};
            background: ${#333 + i};
        }
    };
    columns.push(column);
}

.column {
    float: left;
    ...columns;
}

```

Output:

``` css
.columns {
    float: left;
}

.columns .column_1 {
    width: 33%;
    background: #333;
}

.columns .column_1 {
    width: 33%;
    background: #444;
}

.columns .column_1 {
    width: 33%;
    background: #555;
}
```


## CSS features

## universal selector *

```jsslang
* {
    display: block;
}
```

Output:

```css
* {
    display: block;
}
```

## pseudo class arguments
```jsslang
:is(section, article, aside, nav) h1 {
    font-size: 25px;
}
```

Output:
```css
:is(section, article, aside, nav) h1 {
    font-size: 25px;
}
```
## @font-face, @page, @charset and etc

see https://developer.mozilla.org/en-US/docs/Web/CSS/At-rule

```jsslang
const animation = @block {
  from {
    transform: translateX(0%);
  }

  to {
    transform: translateX(100%);
  }
};

@keyframes slidein {
    ...animation;
}
```

Output:

```css
@keyframes slidein {
    from {
        transform: translateX(0%);
    }

    to {
        transform: translateX(100%);
    }
}
```

## css variables

```jsslang
:root {
    --main-bg-color: brown;
}

element {
    background-color: var(--main-bg-color);
}
```

Output:

```css
:root {
    --main-bg-color: brown;
}

element {
    background-color: var(--main-bg-color);
}
```
