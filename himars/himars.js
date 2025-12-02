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
    this.svg = Pixmap.svg(m)
  }

  static svg(m) {
    const draw = SVG()

    for (let i = 0; i < m.length; i++) {
      for (let j = 0; j < m[i].length; j++) {
        if (m[i][j] != '') {
          let px = new Pixel(j, i, m[i][j])
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
    ctx.drawImage(this.svg, Pixel.scale(x), Pixel.scale(height - this.pixmap.length - y));
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

const color_friend = 'Black'
const color_foe = 'Blue'

const sprite_plane_friend = new Pixmap(plane(color_friend))
const sprite_plane_foe = (new Pixmap(plane(color_foe))).flip()
const sprite_himars_friend = new Pixmap(himars(color_friend))
const sprite_himars_foe = (new Pixmap(himars(color_foe))).flip()
const sprite_missile = new Pixmap([['Red']])

const canvas = document.getElementById("canvas");
canvas.width = Pixel.scale(width)
canvas.height = Pixel.scale(height)
const ctx = canvas.getContext("2d");

function background(ctx) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'Brown'
  ctx.fillRect(0, Pixel.scale(height - 1), Pixel.scale(width), Pixel.scale(1))
  ctx.fillStyle = color_foe
  ctx.fillRect(Pixel.scale(7 * width / 16), Pixel.scale(height - 1), Pixel.scale(width / 8), Pixel.scale(1))
}



/******************/
// Global state

// Step count
var stepCount = 0

// Himars positions
var pos_himars_friend = width / 4
var pos_himars_foe = 3 * width / 4

// Scores
var score_friend = 0
var score_foe = 0

// Flying objects
var missiles = []
var planes = []

/******************/


function draw(ctx) {
  background(ctx)

  sprite_himars_friend.draw(ctx, pos_himars_friend, 1)
  sprite_himars_foe.draw(ctx, pos_himars_foe, 1)
  missiles.forEach(m => sprite_missile.draw(ctx, m.x, m.y))
  planes.forEach(m => m.sprite.draw(ctx, m.x, m.y))
  if (debug) {
    planes.forEach(p => {
      ctx.strokeStyle = "black";
      ctx.beginPath();
      ctx.moveTo(Pixel.scale(p.x), Pixel.scale(height - p.y));
      ctx.lineTo(Pixel.scale(p.x + p.dx * p.y), Pixel.scale(height - 1));
      ctx.closePath();
      ctx.stroke();
    })
  }

  ctx.font = "18px sans serif";
  ctx.fillStyle = color_friend
  ctx.fillText(`${score_friend}`, Pixel.scale(10), Pixel.scale(height - 20));
  ctx.fillStyle = color_foe
  ctx.fillText(`${score_foe}`, Pixel.scale(width - 10), Pixel.scale(height - 20));

}


function in_river(x_min, x_max) {
  return x_max > 7 * width / 16 && x_min < 9 * width / 16
}



function start_plane(sprite, pos_x, dx) {
  planes.push({ sprite: sprite, x: pos_x, y: height / 2 + Math.floor(Math.random() * (height / 2)), dx, bay: true })
}

function launch_missile(pos_x, pos_y, dx, dy) {
  missiles.push({ x: pos_x, y: pos_y, dx: dx, dy: dy })
}





function hits(plane_x, plane_y, missile_x, missile_y) {
  return plane_x <= missile_x && missile_x <= plane_x + 4 &&
    plane_y <= missile_y && missile_y <= plane_y + 5
}

function is_hit(x, y, missiles) {
  return missiles.some(m => (m.dy > 0) && hits(x, y, m.x, m.y))
}

function himars_hit(x, m_x, m_y) {
  return x <= m_x && m_x <= x + 6 && m_y <= 3
}

function is_colinear(v1_x, v1_y, v2_x, v2_y) {
  return Math.abs(v1_x * v2_y - v1_y * v2_x) < 1
}

function himars_in_sight(plane_x, plane_y, himars_x, delta_x) {
  const himars_y = 2
  const delta_y = -1
  return plane_x + delta_x * (plane_y - himars_y) == himars_x
}

function fire_himars(plane_x, plane_y, himars_x, delta_x) {
  if (himars_in_sight(plane_x, plane_y, himars_x, delta_x)) {
    launch_missile(plane_x, plane_y - 1, delta_x, -1)
    return false
  }

  return true
}


/******************/
// Events

function eventMoveHimars(himars, dir) {
  if (himars === "friend") {
    pos_himars_friend += dir
    if (in_river(pos_himars_friend, pos_himars_friend + 6) || pos_himars_friend < 0) {
      pos_himars_friend -= dir
    }
  } else if (himars == "foe") {
    pos_himars_foe += dir
    if (in_river(pos_himars_foe, pos_himars_foe + 6) || pos_himars_foe + 6 > width) {
      pos_himars_foe -= dir
    }
  } else {
    assert(False)
  }
}

function eventFire(himars) {
  if (himars === "friend") {
    launch_missile(pos_himars_friend + 4, 6, 1, 1)
  } else if (himars === "foe") {
    launch_missile(pos_himars_foe + 1, 6, -1, 1)
  } else {
    assert(False)
  }
}

/***********************/
// Interrupt handlers

function keyUpHandler(e) {
  switch (e.key.toLowerCase()) {
    case 'k':
      eventMoveHimars('foe', 1);
      break;
    case 'j':
      eventMoveHimars('foe', -1);
      break;
    case 'd':
      eventMoveHimars('friend', -1);
      break;
    case 'f':
      eventMoveHimars('friend', 1)
      break
    case 'r':
      eventFire('friend')
      break
    case 'i':
      eventFire('foe')
      break
    default:
      console.log(`Ignored: ${e}`)
  }
}

function stepHandler() {
  stepCount += 1

  // events

  if (stepCount % 4 == 0 && Math.random() > 0.99) {
    if (Math.random() > 0.5) {
      start_plane(sprite_plane_friend, 0, 1)
    } else {
      start_plane(sprite_plane_foe, width, -1)
    }
  }
  planes.forEach(p => {
    if (p.bay) {
      if (p.dx > 0) {
        p.bay = fire_himars(p.x, p.y, pos_himars_foe + 3, p.dx)
      } else {
        console.assert(p.dx < 0);
        p.bay = fire_himars(p.x, p.y, pos_himars_friend + 3, p.dx)
      }
    }
  })


  // Draw
  draw(ctx)


  // Update dynamic elements
  missiles.forEach(m => {
    if (m.dy < 0 && stepCount % 16 != 0) { return }
    m.x = m.x + m.dx; m.y = m.y + m.dy
  })
  missiles = missiles.filter(m => m.y > 0 && m.y < height && (m.dy < 0 || missiles.filter(n => n.dy > 0 && Math.abs(m.x - n.x) < 10 && Math.abs(m.y - n.y) < 10).length <= 1))

  if (stepCount % 8 == 0) {
    planes.forEach(m => { m.x = m.x + m.dx })
  }
  planes.forEach(p => { if (p.x < 0) { score_foe += 1 } else if (p.x > width) { score_friend += 1 } }
  )
  planes = planes.filter(p => p.x >= 0 && p.x <= width && !is_hit(p.x, p.y, missiles))

  missiles = missiles.filter(m => {
    if (himars_hit(pos_himars_friend, m.x, m.y)) {
      score_friend -= 10;
      return false
    }
    else if (himars_hit(pos_himars_foe, m.x, m.y)) {
      score_foe -= 10;
      return false
    } else {
      return true
    }
  })

  // Loop
  requestAnimationFrame(stepHandler)
}

/*********************/
// Interrupt registration

// Register keyboard events
document.addEventListener("keyup", keyUpHandler)

// Register frame events
requestAnimationFrame(stepHandler)
