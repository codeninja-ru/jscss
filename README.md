# JavaScript + CSS = Jss

Jss is a preprocessor for Css that allow mix css and javascript grammar. Jss generates CSS so the output is CSS.

## Why?

CSS is a greate language for declaring styles but it lucks features of programmar language like variables, inheritance, functions and etc. With Css alone you have to reapet yourself defining complex rules. There were attempts to solve this such as LESS, SASS and etc, but they still are not a not a programmer langauge and another drownback of them that they use unfamiliar syntax.

With Jss you can do everything that you can with LESS or SASS and even more. You don't need to learn a complete new language. JSS is based on CSS and JavaScript the langueages you already know (JavaScript is familiar for all frontend developers) so the learning curve should be less.

TODO

## Get started guide

### Installation

``` sh
npm install -g @jsslang/jss
```

### Usage

``` sh
npx @jsslang/jss file.jss file.css
```

or if you installed it globally

``` sh
jss file.jss file.css
```

### Variables

You can use the javascript syntax for variables

``` jsslang
const color = '#fff';
const baseSize = 10;

.className {
  color: ${color};
  size: ${baseSize + 2}px;
}
```

Output:

``` css
.className {
    color: #fff;
    size: 12px;
}
```

You can use buildin classes for sizes and colors. For examples:

``` jsslang
const size = new Px(10);
const color = new HexColor('#fff');

.className {
  color: ${color};
  size: ${size};
}
```

Output:
``` css
.className {
    color: #fff;
    size: 10px;
}
```

You can put variables into style blocks. They'll be scoped inside the block.

``` jsslang
.className {
  const size = new Px(10);
  color: #fff;
  size: ${size};
}
```

Output:
``` css
.className {
    color: #fff;
    size: 10px;
}
```

#### Computed properties

You can use variables in property names

``` jsslang
const propName = 'color';
.className {
  ${propName}: #fff;
  background-${propName}: #777;
}
```

Output:
``` css
.className {
    color: #fff;
    background-color: #777;
}
```

You can even use computed properties like in javascript
``` jsslang
const propName = 'color';
.className {
  [propName]: #fff;
  ['background-' + propName]: #777;
}
```

Output:
``` css
.className {
    color: #fff;
    background-color: #777;
}
```


### Mixins

``` jsslang
const bordered = new {
  border: 3px solid red;
  border-radius: 3px;
};

.className {
  font-size: 12px;
  ...bordered;
}
```

Output:

``` css
.className {
    font-size: 12px;
    border: 3px solid red;
    border-radius: 3px;
}
```

### Functions

``` jsslang
function pad2(n) { return n.length > 1 ? n : "0" + n; }
function rgb(r,g,b) { return "#" + pad2(r.toString(16)) + pad2(g.toString(16)) + pad2(b.toString(16)); }

.className {
  background: ${rgb(123,123,123)};
}
```

Output:

``` css
.className {
    background: #7b7b7b;
}
```

### Nesting

``` jsslang
.menu {
  font-size: 12px;
  ${this.name}.menu__item {
      color: 10px;
      font-size: ${this.parent.styles.fontSize};
  }
}
```

Output:

``` css
.menu {
    font-size: 12px;
}

.menu.menu__item {
    color: 10px;
    font-size: 12px;
}
```

or in case of a list of selectors
``` jsslang
.menu1, .menu2 {
  font-size: 12px;
  ${this.selectors[0]}.menu__item {
      color: 10px;
  }
  ${this.selectors[1]}.menu__item {
      color: 12px;
  }
}
```

Output:
``` css
.menu1, .menu2 {
    font-size: 12px;
}

.menu1.menu__item {
    color: 10px;
}

.menu2.menu__item {
    color: 12px;
}
```

#### Media-Queries

You can put media-quries inside blocks


``` jsslang
.component {
  width: 300px;
  @media (min-width: 768px) {
    width: 600px;
    @media (min-resolution: 192dpi) {
      background-image: url(/img/retina2x.png);
    }
  }
  @media (min-width: 1280px) {
    width: 800px;
  }
}
```

Output
``` css
.component {
    width: 300px;
}

@media (min-width: 768px) {
    .component {
        width: 600px;
    }

    @media (min-resolution: 192dpi) {
        .component {
            background-image: url(/img/retina2x.png);
        }
    }
}

@media (min-width: 1280px) {
    .component {
        width: 800px;
    }
}
```

You can use @supports in the same way.

``` jsslang
.flex-container {
    display: block;
    @supports(display: flex) {
        display: flex;
    }
}
```

Output:

``` css
.flex-container {
    display: block;
}

@supports (display: flex) {
    .flex-container {
        display: flex;
    }
}
```

### Comments

All kind of comments a supported
``` jsslang
// a single line comment

/* a multi-line comment */

<!-- a html style comment  -->
```

## Syntax Highlighting

Syntax highlighting is in progress, but you can use same of our basic configs the following text editors.

### vim

https://github.com/codeninja-ru/vim-jsslang

### Emacs

https://github.com/codeninja-ru/jsslang-mode

### VSCode

https://github.com/codeninja-ru/vscode-jsslang

### Tree-sitter grammar

https://github.com/codeninja-ru/tree-sitter-jsslang
