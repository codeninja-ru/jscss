# TODOs

## universal selector *
```css
* {
    display: block;
}
```

## css variables
## css nesting
## pseudo class arguments
```css
:is(section, article, aside, nav) h1 {
  font-size: 25px;
}
```

## @font-face, @page, @charset and etc

see https://developer.mozilla.org/en-US/docs/Web/CSS/At-rule

## shebang

You can run scrips with shebang
```css
#!/usr/bin/env jss

.className {
    // ...some jss code
    color: #eee;
}
```

## Imports

Jss will fallow imports and compile code there
```javascript
@import 'main.jss'; // it's compiled
@import 'main.css; // it's not compiled

import { style } from 'styles.jss'; // don't auto import in the current scope, you need to call ...style
import 'styles.jss'; // auto-import in the current scope

...style;
```

## Primitives and Untis

px, em, % - variables and operations

``` javascript
const size = 3px; // converts to new Px(3);
const size = 1px + 2px; // converts to Px.valueOf(1).plus(Px.valueOf(2));

const color = #777; // converts to new CssColor('#777');
```


css functions

``` javascript
function rgb(r, g, b) { return '#fff'; }
.className {
    background: rgb(123, 123, 123);
}
```

output

``` css
.className {
    background: #fff;
}
```

primitives in jss templates

``` javascript
.className {
    const x = 10px;
    const color = #333;
    font-size: ${x + 10px};
    color: ${color + #111}
}
```

output

``` css
.className {
    font-size: 20px;
    color: #444;
}
```

## Html-style comments

Html-style comments are transformet into css-style

```jsslang
<!-- html style comment -->
```

Output:

```css
/* html style comment */
```

## class generators

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

output

``` css
.className {
    font-size: 20px;
    color: #444;
}
```

## css generating in loops

```jsslang
for (var i = 1; i <= 12; i++) {
    .column_${i} {
        left: ${60 * i}px;
    }
}
```

output
```css
.column_1 {
    left: 60px;
}

.column_2 {
    left: 120px;
}

...

.column_12 {
    left: 720px;
}
```

## css generating in loops 2

```jsslang
const columns = [1, 2, 3].map((idx) => @block {
    .column_${idx} {
       left: ${60 * idx}px;
    };
});

...columns;
```

output

```css
.column_1 {
    left: 60px;
}

.column_2 {
    left: 120px;
}

.column_2 {
    left: 180px;
}
```

## do not skip brackets content
The lexer currently skips content of ()[]{} for lazy parsing, but it causes some trables when there are comment with unpaired brackets.

I belive the only way to fix this properyly is to parse code properly without shortcuts.

## Optimization todos

1. use d8
https://floitsch.blogspot.com/2012/03/optimizing-for-v8-introduction.html
