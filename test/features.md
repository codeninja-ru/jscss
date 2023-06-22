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

an
d import them here

```jsslang
import { clreafix, nightModeColor, fontSize } from './lib1.jss';

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
