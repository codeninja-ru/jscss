# Test for jsslang features

## Imports

### JavaScript imports

it follows js imports
```jsslang
import $ from './jquery.js';

#id .className {
    display: block;
}
```

Output:
```css
#id .className {
    display: block;
}
```

You can call functions from js libraries

```jsslang
import {log, count, rgb} from './lib.js';

log('start');

p.className${count()} {
    color: ${rgb(100, 100,100)};
}

log('end');
```

Output:
```css
p.className1 {
    color: #fff;
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
@import 'main.css;
```

and main.css file should be created from main.jss
