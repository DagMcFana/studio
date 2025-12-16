"use strict";

const debug = false

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
    ['', color, '', '', ''],
    ['', color, color, '', ''],
    [color, color, color, color, color],
    ['', color, color, '', ''],
    ['', color, '', '', '']
  ]
}

function slow_plane(color) {
  return [
    ['', color, '', ''],
    [color, color, color, color],
    ['', color, '', ''],
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

function himars_up(color) {
  return [
    [color, '', '', '', '', ''],
    [color, '', '', '', '', ''],
    [color, '', '', '', color, color],
    [color, '', '', '', color, color],
    [color, 'Brown', color, color, 'Brown', color]]
}

const color_friend = 'Black'
const color_foe = 'Blue'

const sprite_plane_friend = new Pixmap(plane(color_friend))
const sprite_plane_foe = (new Pixmap(plane(color_foe))).flip()
const sprite_slow_plane_friend = new Pixmap(slow_plane(color_friend))
const sprite_slow_plane_foe = (new Pixmap(slow_plane(color_foe))).flip()

const sprite_himars_friend = new Pixmap(himars(color_friend))
const sprite_himars_foe = (new Pixmap(himars(color_foe))).flip()
const sprite_himars_up_friend = new Pixmap(himars_up(color_friend))
const sprite_himars_up_foe = (new Pixmap(himars_up(color_foe))).flip()
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

/*******************/
// Geometry predicates

function in_river(x_min, x_max) {
  return x_max > 7 * width / 16 && x_min < 9 * width / 16
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
// Global state

// Step count
var stepCount = 0

// Himars positions
var pos_himars_friend = width / 4
var pos_himars_foe = 3 * width / 4

// Himars' cannon state
var cannon_friend = 'angle'
var cannon_foe = 'angle'

// Himars' missile stock
var missile_stock_friend = 9
var missile_stock_foe = 9

// Scores
var score_friend = 0
var score_foe = 0

// Flying objects
var missiles = []
var planes = []

var req = null

/******************/
// Object creation 

function start_plane(sprite, pos_x, dx) {
  planes.push({ sprite: sprite, x: pos_x, y: height / 2 + Math.floor(Math.random() * (height / 2)), dx, bay: true })
}

function launch_missile(pos_x, pos_y, dx, dy) {
  missiles.push({ x: pos_x, y: pos_y, dx: dx, dy: dy })
}

/******************/
// Scene rendering

function draw(ctx) {
  background(ctx)

  switch (cannon_friend) {
    case 'angle':
      sprite_himars_friend.draw(ctx, pos_himars_friend, 1)
      break;
    case 'up':
      sprite_himars_up_friend.draw(ctx, pos_himars_friend, 1)
      break;
    default:
      assert(false)
  }

  switch (cannon_foe) {
    case 'angle':
      sprite_himars_foe.draw(ctx, pos_himars_foe, 1)
      break;
    case 'up':
      sprite_himars_up_foe.draw(ctx, pos_himars_foe, 1)
      break;
    default:
      assert(false)
  }

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

  ctx.strokeStyle = color_foe;
  ctx.beginPath();
  ctx.moveTo(Pixel.scale(width - 10), Pixel.scale(10));
  ctx.lineTo(Pixel.scale(width - 10 + missile_stock_foe), Pixel.scale(10));
  ctx.closePath();
  ctx.stroke();

  ctx.strokeStyle = color_friend;
  ctx.beginPath();
  ctx.moveTo(Pixel.scale(10), Pixel.scale(10));
  ctx.lineTo(Pixel.scale(10 + missile_stock_friend), Pixel.scale(10));
  ctx.closePath();
  ctx.stroke();
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
    if (missile_stock_friend <= 0) {
      return
    }
    switch (cannon_friend) {
      case 'up':
        launch_missile(pos_himars_friend, 6, 0, 1)
        break
      case 'angle':
        launch_missile(pos_himars_friend + 4, 6, 1, 1)
        break
    }
    missile_stock_friend -= 1
  } else if (himars === "foe") {
    if (missile_stock_foe <= 0) {
      return
    }
    switch (cannon_foe) {
      case 'up':
        launch_missile(pos_himars_foe + 5, 6, 0, 1)
        break
      case 'angle':
        launch_missile(pos_himars_foe + 1, 6, -1, 1)
        break
    }
    missile_stock_foe -= 1
  } else {
    assert(False)
  }
}

function eventSwapCannon(himars) {
  if (himars === "friend") {
    switch (cannon_friend) {
      case 'angle':
        cannon_friend = 'up'
        break
      case 'up':
        cannon_friend = 'angle'
        break
    }
  } else if (himars === "foe") {
    switch (cannon_foe) {
      case 'angle':
        cannon_foe = 'up'
        break
      case 'up':
        cannon_foe = 'angle'
        break
    }
  } else {
    assert(False)
  }
}

/***********************/
// Interrupt handlers

function keyUpHandler(e) {
  switch (e.key.toLowerCase()) {
    // Foe moves
    case 'k':
      eventMoveHimars('foe', 1);
      break;
    case 'j':
      eventMoveHimars('foe', -1);
      break;
    case 'i':
      eventFire('foe')
      break
    case 'o':
      eventSwapCannon('foe')
      break
    // Friend moves
    case 'd':
      eventMoveHimars('friend', -1);
      break;
    case 'f':
      eventMoveHimars('friend', 1)
      break
    case 'r':
      eventFire('friend')
      break
    case 't':
      eventSwapCannon('friend')
      break
    // Everyone
    case 'p':
      if (req != null) {
        cancelAnimationFrame(req)
        req = null
      } else {
        req = requestAnimationFrame(stepHandler)
      }
      break
    default:
      console.log(`Ignored: ${e}`)
  }
}

function stepHandler() {
  stepCount += 1

  // events

  if (stepCount % 4 == 0 && Math.random() > 0.99) {
    const d = Math.random()
    if (d > 0.75) {
      start_plane(sprite_plane_friend, 0, 2)
    } else if (d > 0.5) {
      start_plane(sprite_slow_plane_friend, 0, 1)
    } else if (d > 0.25) {
      start_plane(sprite_plane_foe, width, -2)
    } else if (d > 0) {
      start_plane(sprite_slow_plane_foe, width, -1)
    }
  }

  planes.forEach(p => {
    if (p.bay) {
      if (p.dx > 0) {
        p.bay = fire_himars(p.x, p.y, pos_himars_foe + 3, p.dx)
      } else {
        p.bay = fire_himars(p.x, p.y, pos_himars_friend + 3, p.dx)
      }
    }
  })


  // Draw
  draw(ctx)


  // Update dynamic elements

  if (stepCount % 100 == 0) {
    missile_stock_foe = Math.min(8, missile_stock_foe + 1)
    missile_stock_friend = Math.min(8, missile_stock_friend + 1)
  }

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
  req = requestAnimationFrame(stepHandler)
}

/*********************/
// Interrupt registration

// Register keyboard events
document.addEventListener("keyup", keyUpHandler)

// Register frame events
req = requestAnimationFrame(stepHandler)
