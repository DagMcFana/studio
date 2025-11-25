"use strict";

const debug = true

const width = 128
const height = 72


class Pixel {
  constructor(x, y, color) {
    this.x = x
    this.y = y
    this.color = color
  }

  static scale(x) {
    return x * 8
  }

  draw(o) {
    o.rect(Pixel.scale(1), Pixel.scale(1)).move(Pixel.scale(this.x), Pixel.scale(this.y)).fill(this.color)
  }

}

class Pixmap {
  constructor(m) {
    this.pixmap = m
  }

  svg() {
    const draw = SVG()

    for (let i = 0; i < this.pixmap.length; i++) {
      for (let j = 0; j < this.pixmap[i].length; j++) {
        if (this.pixmap[i][j] != '') {
          let px = new Pixel(j, i, this.pixmap[i][j])
          px.draw(draw)
        }
      }
    }

    const img = new Image()
    img.src = "data:image/svg+xml;base64," + btoa(draw.svg())

    return img
  }

  flip() {
    return new Pixmap(this.pixmap.map(element => element.reverse()))
  }

  draw(ctx, x, y) {
    ctx.drawImage(this.svg(), Pixel.scale(x), Pixel.scale(height - this.pixmap.length - y));
  }
}

function plane(color) {
  return [
    [color, '', '', ''],
    [color, color, '', ''],
    [color, color, color, color],
    [color, color, '', ''],
    [color, '', '', '']
  ]
}

function himars(color) {
  return [
    ['', '', '', color, '', ''],
    ['', '', color, '', '', ''],
    ['', color, '', '', color, color],
    [color, '', '', '', color, color],
    [color, 'Brown', color, color, 'Brown', color]]
}

const sprite_plane_friend = new Pixmap(plane('Red'))
const sprite_plane_foe = (new Pixmap(plane('Blue'))).flip()
const sprite_himars_friend = new Pixmap(himars('Red'))
const sprite_himars_foe = (new Pixmap(himars('Blue'))).flip()
const sprite_missile = new Pixmap([['Orange']])

const canvas = document.getElementById("canvas");
canvas.width = Pixel.scale(width)
canvas.height = Pixel.scale(height)
const ctx = canvas.getContext("2d");

function background(ctx) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'Brown'
  ctx.fillRect(0, Pixel.scale(height - 1), Pixel.scale(width), Pixel.scale(1))
  ctx.fillStyle = 'Blue'
  ctx.fillRect(Pixel.scale(7 * width / 16), Pixel.scale(height - 1), Pixel.scale(width / 8), Pixel.scale(1))
}


var pos_himars_friend = width / 4
var pos_himars_foe = 3 * width / 4

var missiles = []
var planes = []

function draw(ctx) {
  background(ctx)

  sprite_himars_friend.draw(ctx, pos_himars_friend, 1)
  sprite_himars_foe.draw(ctx, pos_himars_foe, 1)
  missiles.forEach(m => sprite_missile.draw(ctx, m.x, m.y))
  planes.forEach(m => m.sprite.draw(ctx, m.x, m.y))
}

const eventQueue = []

function in_river(x_min, x_max) {
  return x_max > 7 * width / 16 && x_min < 9 * width / 16
}

class MoveHimars {
  constructor(himars, dir) {
    this.himars = himars
    this.dir = dir
  }

  doit() {
    if (this.himars === "friend") {
      pos_himars_friend += this.dir
      if (in_river(pos_himars_friend, pos_himars_friend + 6) || pos_himars_friend < 0) {
        pos_himars_friend -= this.dir
      }
    } else if (this.himars == "foe") {
      pos_himars_foe += this.dir
      if (in_river(pos_himars_foe, pos_himars_foe + 6) || pos_himars_foe + 6 > width) {
        pos_himars_foe -= this.dir
      }
    } else {
      assert(False)
    }
  }
}

function start_plane(sprite, pos_x, dx) {
  planes.push({ sprite: sprite, x: pos_x, y: height / 2 + Math.floor(Math.random() * (height / 2)), dx })
}

function launch_missile(pos_x, dx, dy) {
  missiles.push({ x: pos_x, y: 6, dx, dy })
}

class Fire {
  constructor(himars) {
    this.himars = himars
  }

  doit() {
    if (this.himars === "friend") {
      launch_missile(pos_himars_friend + 4, 1, 1)
    } else if (this.himars === "foe") {
      launch_missile(pos_himars_foe + 1, -1, 1)
    } else {
      assert(False)
    }
  }
}

function keyUpHandler(e) {
  if (e.key.toLowerCase() === "k") {
    eventQueue.push(new MoveHimars('foe', 1))
  } else if (e.key.toLowerCase() === "j") {
    eventQueue.push(new MoveHimars('foe', -1))
  } else if (e.key.toLowerCase() === "f") {
    eventQueue.push(new MoveHimars('friend', -1))
  } else if (e.key.toLowerCase() === "d") {
    eventQueue.push(new MoveHimars('friend', 1))
  } else if (e.key.toLowerCase() === "r") {
    eventQueue.push(new Fire('friend'))
  } else if (e.key.toLowerCase() === "i") {
    eventQueue.push(new Fire('foe'))
  } else {
    console.log(`Ignored: ${e}`)
  }
}

document.addEventListener("keyup", keyUpHandler);
// document.addEventListener("keydown", keyDownHandler);

function hits(plane_x, plane_y, missile_x, missile_y){
  return plane_x <= missile_x && missile_x <= plane_x + 4 &&
          plane_y <= missile_y && missile_y <= plane_y +5
}

function is_hit(x, y, missiles){
  return missiles.some(m => hits(x, y, m.x, m.y))
}

var stepCount = 0

function step() {
  stepCount += 1

  var ev
  while (ev = eventQueue.pop()) {
    ev.doit()
  }
  if (stepCount % 4 == 0 && Math.random() > 0.8) {
    if (Math.random() > 0.5) {
      start_plane(sprite_plane_friend, 0, 1)
    } else {
      start_plane(sprite_plane_foe, width, -1)
    }
  }

  draw(ctx)

  missiles.forEach(m => { m.x = m.x + m.dx; m.y = m.y + m.dy })
  missiles = missiles.filter(m => m.y < height && missiles.filter(n => Math.abs(m.x - n.x) < 10 && Math.abs(m.y - n.y) < 10).length <= 1)

  if (stepCount % 8 == 0) {
    planes.forEach(m => { m.x = m.x + m.dx })
  }
  planes = planes.filter(p => ! is_hit(p.x, p.y, missiles))


  requestAnimationFrame(step)
}

// Event loop
requestAnimationFrame(step)