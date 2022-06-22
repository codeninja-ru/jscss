// this is handmade example of jss output, for test purpose only

var css = [];

// css imports are not needed to be translated
css.push("@import 'main.css';");

// raw css
const bgColor = '#fff';

css.push((function(css) {
  var self = {
    name: ".className",
    value: {
      "color": "red",
      "background": `${bgColor}`,
    },
  };

  return [
    {self.name: self.value},
  ];
})(css));

export default css;
