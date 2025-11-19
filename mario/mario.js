const debug = true

function of_px(i) {
  return i * 8
}

function pixmap(m) {
  const draw = SVG()

  for (let i = 0; i < m.length; i++) {
    for (let j = 0; j < m[i].length; j++) {
      if (m[i][j] != '') {
        draw.rect(of_px(1), of_px(1)).move(of_px(j), of_px(i)).fill(m[i][j])
      }
    }
  }

  const img = new Image()
  img.src = "data:image/svg+xml;base64," + btoa(draw.svg())

  return img
}

const sprite_mario = pixmap([
  ['', '', 'Red', '', ''],
  ['', 'Red', 'Black', 'Red', ''],
  ['', 'Red', 'Pink', 'Red', ''],
  ['', '', 'Red', '', 'Red'],
  ['', 'Red', 'Red', 'Red', ''],
  ['Red', '', 'Red', '', ''],
  ['', 'Red', 'Red', 'Red', 'Red'],
  ['Red', '', '', '', '']
])
const sprite_mario_jump = pixmap([
  ['Red', 'Black'],
  ['', 'Red']
])
const sprite_plateform = pixmap([Array(9).fill('Brown')])

const platforms = [{ x: 0, y: 50 }]

function platform_collide(x, y, p) {
  return p.x <= x && x < p.x + 9 && p.y <= y + 8 && y <= p.y + 1
}

// console.log(platform_collide(3, 50, platforms[0]))

function platforms_collide(x, y) {
  return platforms.find(p => platform_collide(x, y, p)) != undefined
}

var x = 0
var y = 0

var dx = 0
var dy = 1

const canvas = document.getElementById("canvas");
canvas.width = of_px(150)
canvas.height = of_px(75)
const ctx = canvas.getContext("2d");

function drawMario() {
  ctx.drawImage(sprite_mario, of_px(x), of_px(y));
  if (debug) {
    ctx.beginPath();
    ctx.moveTo(of_px(x), of_px(y));
    ctx.lineTo(of_px(x) + of_px(dx), of_px(y) + of_px(dy));
    ctx.stroke();
  }
}

function drawPlatforms() {
  platforms.forEach(p =>
    ctx.drawImage(sprite_plateform, of_px(p.x), of_px(p.y)))
}

function step() {
  if (of_px(x) >= canvas.width || of_px(y - 8) >= canvas.height) {
    return
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawMario();
  drawPlatforms();

  if (dx > 0) {
    dx -= 1
    x += 1
  } else if (dx < 0) {
    dx += 1
    x -= 1
  }

  if (!platforms_collide(x, y)) {
    if (dy < 0) {
      dy += 1;
      y -= 1
    }
    else if (dy > 0) {
      y += 1
    } else {
      dy = 1
    }
  } else {
    dy = 0
  }

  requestAnimationFrame(step);
}


function keyUpHandler(e) {
  if (e.key === "Right" || e.key === "ArrowRight") {
    dx += 1;
  } else if (e.key === "Left" || e.key === "ArrowLeft") {
    dx -= 1;
  } else if ((e.key === " " || e.key === "SpaceBar") && platforms_collide(x, y)) {
    dx = 32;
    y -= 1;
    dy -= 8;
  } else if ((e.key === "Up" || e.key === "ArrowUp") && platforms_collide(x, y)) {
    y -= 1;
    dy -= 8;
  }
}

document.addEventListener("keyup", keyUpHandler);
// document.addEventListener("keydown", keyDownHandler);

// Event loop
requestAnimationFrame(step);
