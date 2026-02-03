(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const hapticsStatus = document.getElementById("haptics-status");


  const square = {
    size: 48,
    x: (canvas.width - 48) / 2,
    y: (canvas.height - 48) / 2,
    speed: 300
  };

  const square2 = {
    size: 48,
    x: canvas.width / 2 - 120,
    y: (canvas.height - 48) / 2,
    speed: 300
  };

  const bullets = [];
  const bullets2 = [];
  const bulletSpeed = 520;
  const bulletSize = 6;
  const explosions = [];
  const explosionDuration = 0.45;
  const deadzone = 0.18;
  let lastTime = performance.now();
  let prevButtons = [false, false, false, false];
  let prevButtons2 = [false, false, false, false];
  let pad1Current = null;
  let pad2Current = null;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function applyDeadzone(value) {
    if (Math.abs(value) < deadzone) return 0;
    return value;
  }

  function getPrimaryGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (let i = 0; i < pads.length; i += 1) {
      if (pads[i]) return pads[i];
    }
    return null;
  }

  function getGamepads() {
    return navigator.getGamepads ? navigator.getGamepads() : [];
  }

  function readDirection(pad) {
    let x = 0;
    let y = 0;

    if (pad) {
      const axisX = applyDeadzone(pad.axes[0] || 0);
      const axisY = applyDeadzone(pad.axes[1] || 0);

      x = axisX;
      y = axisY;

      const dpadLeft = pad.buttons[14] && pad.buttons[14].pressed;
      const dpadRight = pad.buttons[15] && pad.buttons[15].pressed;
      const dpadUp = pad.buttons[12] && pad.buttons[12].pressed;
      const dpadDown = pad.buttons[13] && pad.buttons[13].pressed;

      if (dpadLeft) x -= 1;
      if (dpadRight) x += 1;
      if (dpadUp) y -= 1;
      if (dpadDown) y += 1;
    }

    return { x, y };
  }

  function fireBullet(direction) {
    const centerX = square.x + square.size / 2;
    const centerY = square.y + square.size / 2;
    let vx = 0;
    let vy = 0;

    if (direction === "left") vx = -bulletSpeed;
    if (direction === "right") vx = bulletSpeed;
    if (direction === "up") vy = -bulletSpeed;
    if (direction === "down") vy = bulletSpeed;

    bullets.push({
      x: centerX - bulletSize / 2,
      y: centerY - bulletSize / 2,
      vx,
      vy
    });
  }

  function fireBullet2(direction) {
    const centerX = square2.x + square2.size / 2;
    const centerY = square2.y + square2.size / 2;
    let vx = 0;
    let vy = 0;

    if (direction === "left") vx = -bulletSpeed;
    if (direction === "right") vx = bulletSpeed;
    if (direction === "up") vy = -bulletSpeed;
    if (direction === "down") vy = bulletSpeed;

    bullets2.push({
      x: centerX - bulletSize / 2,
      y: centerY - bulletSize / 2,
      vx,
      vy
    });
  }

  function explodeAt(x, y) {
    explosions.push({
      x,
      y,
      t: 0
    });
  }

  function rumble(pad) {
    if (!pad) return;
    if (pad.vibrationActuator && pad.vibrationActuator.type === "dual-rumble") {
      pad.vibrationActuator.playEffect("dual-rumble", {
        duration: 160,
        strongMagnitude: 0.8,
        weakMagnitude: 0.4
      });
      return;
    }
    if (pad.hapticActuators && pad.hapticActuators.length > 0) {
      pad.hapticActuators[0].pulse(1.0, 160);
    }
  }

  function updateHapticsStatus(pad) {
    if (!hapticsStatus) return;
    if (!pad) {
      hapticsStatus.textContent = "Haptics: no gamepad connected.";
      return;
    }
    if (
      (pad.vibrationActuator && pad.vibrationActuator.type === "dual-rumble") ||
      (pad.hapticActuators && pad.hapticActuators.length > 0)
    ) {
      hapticsStatus.textContent = "Haptics: supported by this gamepad.";
    } else {
      hapticsStatus.textContent =
        "Haptics: not supported by this gamepad/browser.";
    }
  }

  function intersectsSquare(bullet, target) {
    return (
      bullet.x < target.x + target.size &&
      bullet.x + bulletSize > target.x &&
      bullet.y < target.y + target.size &&
      bullet.y + bulletSize > target.y
    );
  }

  function handleFiring(pad) {
    if (!pad) return;

    const currentButtons = [
      pad.buttons[0] && pad.buttons[0].pressed,
      pad.buttons[1] && pad.buttons[1].pressed,
      pad.buttons[2] && pad.buttons[2].pressed,
      pad.buttons[3] && pad.buttons[3].pressed
    ];

    if (currentButtons[3] && !prevButtons[3]) fireBullet("left"); // X
    if (currentButtons[2] && !prevButtons[2]) fireBullet("up"); // Y
    if (currentButtons[1] && !prevButtons[1]) fireBullet("right"); // B
    if (currentButtons[0] && !prevButtons[0]) fireBullet("down"); // A

    prevButtons = currentButtons;
  }

  function handleFiring2(pad) {
    if (!pad) return;

    const currentButtons = [
      pad.buttons[0] && pad.buttons[0].pressed,
      pad.buttons[1] && pad.buttons[1].pressed,
      pad.buttons[2] && pad.buttons[2].pressed,
      pad.buttons[3] && pad.buttons[3].pressed
    ];

    if (currentButtons[3] && !prevButtons2[3]) fireBullet2("left"); // X
    if (currentButtons[2] && !prevButtons2[2]) fireBullet2("up"); // Y
    if (currentButtons[1] && !prevButtons2[1]) fireBullet2("right"); // B
    if (currentButtons[0] && !prevButtons2[0]) fireBullet2("down"); // A

    prevButtons2 = currentButtons;
  }

  function updateBullets(dt) {
    for (let i = bullets.length - 1; i >= 0; i -= 1) {
      const bullet = bullets[i];
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;

      if (intersectsSquare(bullet, square2)) {
        explodeAt(
          square2.x + square2.size / 2,
          square2.y + square2.size / 2
        );
        rumble(pad2Current);
        bullets.splice(i, 1);
        continue;
      }

      const offscreen =
        bullet.x + bulletSize < 0 ||
        bullet.x > canvas.width ||
        bullet.y + bulletSize < 0 ||
        bullet.y > canvas.height;

      if (offscreen) {
        bullets.splice(i, 1);
      }
    }

    for (let i = bullets2.length - 1; i >= 0; i -= 1) {
      const bullet = bullets2[i];
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;

      if (intersectsSquare(bullet, square)) {
        explodeAt(
          square.x + square.size / 2,
          square.y + square.size / 2
        );
        rumble(pad1Current);
        bullets2.splice(i, 1);
        continue;
      }

      const offscreen =
        bullet.x + bulletSize < 0 ||
        bullet.x > canvas.width ||
        bullet.y + bulletSize < 0 ||
        bullet.y > canvas.height;

      if (offscreen) {
        bullets2.splice(i, 1);
      }
    }
  }

  function updateExplosions(dt) {
    for (let i = explosions.length - 1; i >= 0; i -= 1) {
      explosions[i].t += dt;
      if (explosions[i].t >= explosionDuration) {
        explosions.splice(i, 1);
      }
    }
  }

  function update(dt) {
    const pads = getGamepads();
    const pad1 = pads[0] || getPrimaryGamepad();
    const pad2 = pads[1] || null;
    pad1Current = pad1;
    pad2Current = pad2;
    updateHapticsStatus(pad1 || pad2);

    if (pad1) {
      const dir1 = readDirection(pad1);
      handleFiring(pad1);
      square.x += dir1.x * square.speed * dt;
      square.y += dir1.y * square.speed * dt;
      square.x = clamp(square.x, 0, canvas.width - square.size);
      square.y = clamp(square.y, 0, canvas.height - square.size);
    }

    if (pad2) {
      const dir2 = readDirection(pad2);
      handleFiring2(pad2);
      square2.x += dir2.x * square2.speed * dt;
      square2.y += dir2.y * square2.speed * dt;
      square2.x = clamp(square2.x, 0, canvas.width - square2.size);
      square2.y = clamp(square2.y, 0, canvas.height - square2.size);
    }

    updateBullets(dt);
    updateExplosions(dt);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#2a6fdb"; // "#d5212a";
    ctx.fillRect(square.x, square.y, square.size, square.size);
    ctx.fillStyle = "#2a6fdb"; // "#d5212a"; 
    ctx.fillRect(square2.x, square2.y, square2.size, square2.size);

    ctx.fillStyle = "#f4d03f";
    for (const bullet of bullets) {
      ctx.fillRect(bullet.x, bullet.y, bulletSize, bulletSize);
    }

    ctx.fillStyle = "#f39c12";
    for (const bullet of bullets2) {
      ctx.fillRect(bullet.x, bullet.y, bulletSize, bulletSize);
    }

    for (const explosion of explosions) {
      const progress = explosion.t / explosionDuration;
      const radius = 8 + progress * 28;
      const alpha = 1 - progress;
      ctx.beginPath();
      ctx.arc(explosion.x, explosion.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 180, 60, ${alpha})`;
      ctx.fill();
    }
  }

  function loop(now) {
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    update(dt);
    draw();

    requestAnimationFrame(loop);
  }

  window.addEventListener("gamepadconnected", () => {
    if (document.hidden) return;
  });

  window.addEventListener("gamepaddisconnected", () => {
    if (document.hidden) return;
  });

  requestAnimationFrame(loop);
})();
