/* function setup() {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "green";
  ctx.fillRect(10, 10, 150, 100);
} */

function pixmap(m) {
  let px_hz = 10
  let px_vt = 10
  let draw = SVG()

  for (let i = 0; i < m.length; i++) {
    for (let j = 0; j < m.length; j++) {
      draw.rect(px_hz, px_vt).move(i * px_hz, j * px_vt).fill(m[i][j])
    }
  }

  return draw
}

let draw = pixmap([['#f03', '#a03'],
['#ff', '#98']])

SVG.on(document, 'DOMContentLoaded', function () {
  draw.addTo('body')
})
