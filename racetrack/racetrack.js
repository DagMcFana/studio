"use strict";

const debug = true

/*
function car(color) {
  return [
    " uuuuuu ",
    " uuuuuu ",
    "   oo   ",
    "uu oo uu",
    "uuuoouuu"
  ].map(s => s.split('').map(c => { if (c == 'u') { return 'Black' } else if (c == 'o') { return color } else { return ''}}))
}
*/
function car(color) {
  return Array(10).fill(Array(10).fill(color))
}

const color_friend = 'Red'
const color_foe = 'Blue'

const sprite_car_friend = new Pixmap(car(color_friend))
const sprite_car_foe = new Pixmap(car(color_foe))

const canvas = document.getElementById("canvas");
canvas.width = Pixel.scale(width)
canvas.height = Pixel.scale(height)
const ctx = canvas.getContext("2d");
// const planeDensity = document.getElementById("plane-density");


const circuit = [
  [10, 10, width - 20, 120],
  [10, 600, width - 20, 120],
  [10, 10, 120, 600],
  [width - 130, 10, 120, 600],
  // Corners
  [10, 60, 150, 150],
  [10, 600-150, 150, 150],
  [width - 150 - 70, 60, 150, 150],
  [width - 150 - 70, 600-150, 150, 150],
]

function background(ctx) {
  ctx.fillStyle = 'Green'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = 'Gray'
  for (const r of circuit) {
    ctx.fillRect(Pixel.scale(r[0]), Pixel.scale(height - r[1] - r[3]),
      Pixel.scale(r[2]), Pixel.scale(r[3]))
  }


}

/*******************/
// Geometry predicates

function collide(car1, car2) {
  return Math.abs(car1.x - car2.x) <= 10 && Math.abs(car1.y - car2.y) <= 10
}

function in_box(rect, car) {

  return car.x >= rect[0] &&
    (car.x - rect[0]) <= rect[2] &&
    car.y >= rect[1] &&
    (car.y - rect[1]) <= rect[3]
}

function exit(car) {
  return !circuit.some(rect => in_box(rect, car))
}

/******************/
// Global state

// Step count
var stepCount = 0

// Himars positions
var car_friend = { x: 15, y: 30, speed: 1, angle: 0 }
var car_foe = { x: 15, y: 50, speed: 1, angle: 0 }

let prevButtons1 = [false, false]
let prevButtons2 = [false, false]

// Animation frame
var req = null;

/******************/
// Scene rendering

function draw(ctx) {
  background(ctx)

  sprite_car_friend.draw(ctx, car_friend.x, car_friend.y, car_friend.angle)
  sprite_car_foe.draw(ctx, car_foe.x, car_foe.y, car_foe.angle)

  if (debug) {
    for (const c of [car_friend, car_foe]) {
      ctx.strokeStyle = "black";
      ctx.beginPath();
      ctx.moveTo(Pixel.scale(c.x + 5), Pixel.scale(height - c.y + 5));
      ctx.lineTo(Pixel.scale(c.x + 60*c.speed * Math.cos(c.angle) + 5),
        Pixel.scale(height + 5 - (c.y + 60*c.speed * Math.sin(c.angle))));
      ctx.closePath();
      ctx.stroke();
    }
  }
  /*
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
    */
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


/***********************/
// Interrupt handlers

class Handler {
  constructor (car){
    this.car = car
  }

  rotate(delta){
    this.car.angle = this.car.angle + delta * 2 * Math.PI * (1 / 360)
  }

  speed(delta){
    this.car.speed = Math.max(0, this.car.speed + delta)
  }
}

const foe_handler = new Handler(car_foe)
const friend_handler = new Handler(car_friend)

function keyUpHandler(e) {
  switch (e.key.toLowerCase()) {
    // Foe moves
    case 'k':
      foe_handler.rotate(-1)
      break;
    case 'j':
      foe_handler.rotate(1)
      break;
    case 'i':
      foe_handler.speed(-1)
      break
    case 'o':
      foe_handler.speed(1)
      break
    // Friend moves
    case 'f':
      friend_handler.rotate(-1)
      break;
    case 'd':
      friend_handler.rotate(1)
      break
    case 'r':
      friend_handler.speed(-1)
      break
    case 't':
      friend_handler.speed(1)
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

  const pads = getGamepads();
  const pad1 = pads[0];
  const pad2 = pads[1];

  
  if (pad1) {
    readGamepad(pad1, prevButtons1, friend_handler);
  }
  if (pad2) {
    readGamepad(pad2, prevButtons2, foe_handler)
  }


  if (collide(car_foe, car_friend)) {
    car_foe.speed = 0
    car_friend.speed = 0
  }

  if (exit(car_foe)) {
    car_foe.speed = 0
    car_foe.angle = 0
    car_foe.x = 15
    car_foe.y = 30
  }

  if (exit(car_friend)) {
    car_friend.speed = 0
    car_friend.angle = 0
    car_friend.x = 15
    car_friend.y = 45
  }

  // Draw
  draw(ctx)

  // Update dynamic elements
  for (const c of [car_foe, car_friend]) {
    c.x = c.x + Math.cos(c.angle) * c.speed
    c.y = c.y + Math.sin(c.angle) * c.speed
    // c.speed = Math.max(0, c.speed - 0.01)
  }



  // Loop
  req = requestAnimationFrame(stepHandler)
}

/*********************/
// Interrupt registration

// Register keyboard events
document.addEventListener("keyup", keyUpHandler)

// Register frame events
req = requestAnimationFrame(stepHandler)
