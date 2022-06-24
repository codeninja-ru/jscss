// this is handmade example of jss output, for test purpose only

var css = [];

// css imports are not needed to be translated
css.push("@import 'main.css';");

// raw css
const bgColor = '#fff';

(function(css) {
  var subBlocks = [];

  var name = `.className`;
  var value = {};
  value["color"] = "red";
  value["background"] = `${bgColor}`;

  css.push({name: name, value: value});
  for (var item of subBlocks) {
    result.push(item);
  }

})(css);

export default css;
