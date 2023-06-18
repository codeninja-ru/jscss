Object.defineProperty(exports, "__esModule", {
  value: true
});

function pad2(n) {
    return n.length > 1 ? n : "0" + n;
}

function rgb(r,g,b) {
    return "#" + pad2(r.toString(16)) +
        pad2(g.toString(16)) +
        pad2(b.toString(16));
}

exports.rgb = rgb;
