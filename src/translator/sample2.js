// this is handmade example of jss output, for test purpose only

var css = css ? css : new JssStyleSheet();
var self = null;

// css imports are not needed to be translated
css.insertCss("@import 'main.css';");

// raw css
const bgColor = '#fff';

css.insertBlock((function() {
    var self = new JssStyleBlock('.className');
    self.push("color", "red");
    self.push("font-size", "10px");
    self.push("background", `${bgColor}`);
    self.addChild((function() {
        var self = new JssStyleBlock('.subClass');
        self.push("color", "blue");
        self.push("font-size", this.fontSize);
        self.extend(this.styles);
        return self;
    }).bind(self)());

    return block;
}).bind(self)());

export default css;
