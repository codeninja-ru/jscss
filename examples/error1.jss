function error() {
    throw new Error('error');
}
const color = '#fff';
const bgColor = '#555';

.className {
    color: ${color};
    ${this.name} p {
        background: ${error()};
    }
}
