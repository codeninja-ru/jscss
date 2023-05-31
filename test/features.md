# Test for jsslang features

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

and main.css file should be created from main.jss
