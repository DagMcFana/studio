"use strict";

const deadzone = 0.18;

function getGamepads() {
  return navigator.getGamepads ? navigator.getGamepads() : [];
}

// function applyDeadzone(value) {
//  if (Math.abs(value) < deadzone) return 0;
//  return value;
// }

function readGamepad(pad, prevButtons, action) {
  let x = 0;


  if (!pad) { assert(false) }

  const dpadLeft = pad.buttons[14] && pad.buttons[14].value == 1;
  const dpadRight = pad.buttons[15] && pad.buttons[15].value == 1;

  if (dpadLeft) x = 1;
  if (dpadRight) x = -1;

  if (x != 0) {
    action.rotate(x);
  }


  const currentButtons = [
    pad.buttons[0] && pad.buttons[0].pressed,
    pad.buttons[1] && pad.buttons[1].pressed,
  ];

  if (currentButtons[0] && !prevButtons[0]) action.speed(-1);
  if (currentButtons[1] && !prevButtons[1]) action.speed(1);

  prevButtons[0] = currentButtons[0];
  prevButtons[1] = currentButtons[1]

}
