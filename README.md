# JavaScript + CSS

Jss is a preprocessor for Css that allow mix css and javascript grammar. Jss generates CSS so the output is CSS.

## Why?

CSS is a greate language for declaring styles but it lucks features of programmar language like variables, inheritance, functions and etc. With Css alone you have to reapet yourself defining complex rules. There were attempts to solve this such as LESS, SASS and etc, but they still are not a not a programmer langauge and another drownback of them that they use unfamiliar syntax.

With Jss you can do everything that you can with LESS or SASS and even more. You don't need to learn a complete new language. JSS is based on CSS and JavaScript the langueages you already know (JavaScript is familiar for all frontend developers) so the learning curve should be less.

TODO

## Get started guide

### Installation
TODO

### Variables

You can use the javascript syntex for varables

``` javascript
const color = '#fff';
const baseSize = 10;

.className {
  color: ${color}
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

### Mixins

``` javascript
const bordered = new {
  border: 3px solid red;
  border-radius: 3px;
}

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

``` javascript
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

``` javascript
.menu {
  font-size: 12px;
  ${this.name}.menu__item {
      color: 10px;
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
}
```

or in case of a list of selectors
``` javascript
.menu1, .menu2 {
  font-size: 12px;
  ${this.selectors[0]}.menu__item {
      color: 10px;
  }
  ${this.selectors[2]}.menu__item {
      color: 12px;
  }
}
```


# TODO
px, em, % - variables and operations

``` javascript
const size = 3px; // converts to new CssSize(3px)
const size = 1px + 2px; // converts to CssSize.plus(new CssSize(1px) + new CssSize(3px))

const color = #777; // converts to new CssColor('#777');
```

media-queries

``` javascript
.component {
  width: 300px;
  @media (min-width: 768px) {
    width: 600px;
    @media  (min-resolution: 192dpi) {
      background-image: url(/img/retina2x.png);
    }
  }
  @media (min-width: 1280px) {
    width: 800px;
  }
}
```
