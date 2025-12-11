// =========
// Matter.js Setup
// =========
console.log("✅ Paper Doll script loaded successfully — latest version is running");

const { Engine, Render, Runner, World, Bodies, Body, Constraint, Mouse, MouseConstraint } = Matter;

const engine = Engine.create();
const world = engine.world;

// Disable gravity - we want zero-gravity so the ragdoll only moves by dragging
// world.gravity.x = 0;
// world.gravity.y = 0;
// world.gravity.scale = 0;

// Start with normal gravity so the ragdoll falls to the floor
world.gravity.x = 0;
world.gravity.y = 1;
world.gravity.scale = 0.001;

// Ensure canvas exists (GitHub Pages or other hosts may rewrite paths)
let canvas = document.getElementById("world");
if (!canvas) {
  console.warn("Canvas #world not found in DOM — creating a fallback canvas inside #container.");
  const container = document.getElementById("container") || document.body;
  canvas = document.createElement("canvas");
  canvas.id = "world";
  container.appendChild(canvas);
}

// Create renderer
const render = Matter.Render.create({
  canvas: canvas,
  engine: engine,
  options: {
    width: window.innerWidth,
    height: window.innerHeight,
    wireframes: false,
    background: "#ffffff"
  }
});

// Make sure canvas has initial size (some hosts give 0x0 until styled)
render.canvas.width = window.innerWidth;
render.canvas.height = window.innerHeight;

// Sanity checks and guarded start
if (typeof Matter === 'undefined') {
  console.error('Matter.js is not available. Check that the CDN script loaded successfully.');
} else {
  try {
    console.log('Starting renderer with canvas:', render.canvas, 'size:', render.canvas.width + 'x' + render.canvas.height);
    Render.run(render);
    const runner = Runner.create();
    Runner.run(runner, engine);
  } catch (err) {
    console.error('Failed to start Matter renderer/runner:', err);
  }
}

// =========
// SCREEN BOUNDARIES
// =========

// Create four static boundary bodies slightly outside the visible area so bodies cannot be dragged off-screen
let bounds = {
  top: null,
  bottom: null,
  left: null,
  right: null
};

// Flag: whether full screen bounds (top/left/right) are active. We always create the bottom initially
let boundsActivated = false;

function createBounds(full = false) {
  const w = render.canvas.width;
  const h = render.canvas.height;
  const thickness = 100; // large enough to catch fast drags

  // Remove existing bounds if present
  Object.values(bounds).forEach(b => { if (b) {
    try { World.remove(world, b); } catch (e) { /* ignore */ }
  }});

  bounds = { top: null, bottom: null, left: null, right: null };

  // Always create a bottom so the ragdoll can land
  bounds.bottom = Bodies.rectangle(w / 2, h + thickness / 2, w + thickness * 2, thickness, { isStatic: true, render: { visible: false } });

  if (full) {
    bounds.top = Bodies.rectangle(w / 2, -thickness / 2, w + thickness * 2, thickness, { isStatic: true, render: { visible: false } });
    bounds.left = Bodies.rectangle(-thickness / 2, h / 2, thickness, h + thickness * 2, { isStatic: true, render: { visible: false } });
    bounds.right = Bodies.rectangle(w + thickness / 2, h / 2, thickness, h + thickness * 2, { isStatic: true, render: { visible: false } });
    World.add(world, [bounds.top, bounds.bottom, bounds.left, bounds.right]);
    boundsActivated = true;
  } else {
    World.add(world, [bounds.bottom]);
    boundsActivated = false;
  }
}

// Create initial bounds (bottom only so doll can fall through top until it hits the floor)
createBounds(false);

// =========
// RAGDOLL BUILD
// =========

// Utility: collect ragdoll parts so we can enforce bounds on them
const ragdollParts = [];

// Utility function
function createLimb(x, y, w, h, options = {}) {
  const body = Bodies.rectangle(x, y, w, h, {
    chamfer: { radius: 10 },
    render: {
      fillStyle: "#d9b38c",
      ...options.render
    },
    ...options
  });

  // mark and track as part of the ragdoll
  body.isRagdollPart = true;
  ragdollParts.push(body);
  return body;
}

// Body part sizes
const HEAD_SIZE = 60;
const TORSO_W = 80, TORSO_H = 120;

const LIMB_W = 20, LIMB_H = 60;

// Position
// const centerX = window.innerWidth / 2;
// const centerY = window.innerHeight / 2;

// Use renderer canvas size so the doll starts exactly centered in the view
const centerX = Math.round(render.canvas.width / 2);
const centerY = Math.round(render.canvas.height / 2);

// Body parts
const head = createLimb(centerX, centerY - 150, HEAD_SIZE, HEAD_SIZE, {
  render: { fillStyle: "#f5d7b6" }
});

const torso = createLimb(centerX, centerY - 60, TORSO_W, TORSO_H, {
  render: { fillStyle: "#e0a96d" }
});

// Arms
const upperArmLeft = createLimb(centerX - 60, centerY - 80, LIMB_W, LIMB_H);
const lowerArmLeft = createLimb(centerX - 60, centerY - 20, LIMB_W, LIMB_H);

const upperArmRight = createLimb(centerX + 60, centerY - 80, LIMB_W, LIMB_H);
const lowerArmRight = createLimb(centerX + 60, centerY - 20, LIMB_W, LIMB_H);

// Legs
const upperLegLeft = createLimb(centerX - 20, centerY + 40, LIMB_W, LIMB_H);
const lowerLegLeft = createLimb(centerX - 20, centerY + 100, LIMB_W, LIMB_H);

const upperLegRight = createLimb(centerX + 20, centerY + 40, LIMB_W, LIMB_H);
const lowerLegRight = createLimb(centerX + 20, centerY + 100, LIMB_W, LIMB_H);

// Add all bodies
World.add(world, [
  head, torso,
  upperArmLeft, lowerArmLeft,
  upperArmRight, lowerArmRight,
  upperLegLeft, lowerLegLeft,
  upperLegRight, lowerLegRight
]);

// =========
// JOINTS
// =========

// Head → Torso
World.add(world, Constraint.create({
  bodyA: head,
  pointA: { x: 0, y: HEAD_SIZE / 2 },
  bodyB: torso,
  pointB: { x: 0, y: -TORSO_H / 2 },
  stiffness: 0.6
}));

// Arms
function connect(a, b, options = {}) {
  return Constraint.create({
    bodyA: a,
    bodyB: b,
    ...options
  });
}

World.add(world, [
  // Left arm joints
  connect(torso, upperArmLeft, {
    pointA: { x: -TORSO_W / 2, y: -TORSO_H / 4 },
    pointB: { x: 0, y: -LIMB_H / 2 },
    stiffness: 0.6
  }),
  connect(upperArmLeft, lowerArmLeft, {
    pointA: { x: 0, y: LIMB_H / 2 },
    pointB: { x: 0, y: -LIMB_H / 2 },
    stiffness: 0.6
  }),

  // Right arm joints
  connect(torso, upperArmRight, {
    pointA: { x: TORSO_W / 2, y: -TORSO_H / 4 },
    pointB: { x: 0, y: -LIMB_H / 2 },
    stiffness: 0.6
  }),
  connect(upperArmRight, lowerArmRight, {
    pointA: { x: 0, y: LIMB_H / 2 },
    pointB: { x: 0, y: -LIMB_H / 2 },
    stiffness: 0.6
  }),

  // Left leg joints
  connect(torso, upperLegLeft, {
    pointA: { x: -20, y: TORSO_H / 2 },
    pointB: { x: 0, y: -LIMB_H / 2 },
    stiffness: 0.8
  }),
  connect(upperLegLeft, lowerLegLeft, {
    pointA: { x: 0, y: LIMB_H / 2 },
    pointB: { x: 0, y: -LIMB_H / 2 },
    stiffness: 0.6
  }),

  // Right leg joints
  connect(torso, upperLegRight, {
    pointA: { x: 20, y: TORSO_H / 2 },
    pointB: { x: 0, y: -LIMB_H / 2 },
    stiffness: 0.8
  }),
  connect(upperLegRight, lowerLegRight, {
    pointA: { x: 0, y: LIMB_H / 2 },
    pointB: { x: 0, y: -LIMB_H / 2 },
    stiffness: 0.6
  })
]);

// =========
// MOUSE DRAGGING
// =========

const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
  mouse,
  constraint: {
    stiffness: 0.3,
    render: { visible: false }
  }
});

World.add(world, mouseConstraint);
render.mouse = mouse;

// Replace previous "disable gravity on first click" behavior with disabling gravity when ragdoll lands
let gravityDisabledOnGround = false;

// Listen for collisions and enable full screen bounds once the ragdoll touches the bottom
if (Matter && Matter.Events) {
  Matter.Events.on(engine, 'collisionStart', (event) => {
    // if we've already activated full bounds AND disabled gravity, nothing to do
    if (boundsActivated && gravityDisabledOnGround) return;

    for (let pair of event.pairs) {
      // detect collision with the bottom bound
      if (pair.bodyA === bounds.bottom || pair.bodyB === bounds.bottom) {
        const other = (pair.bodyA === bounds.bottom) ? pair.bodyB : pair.bodyA;
        if (!other.isStatic) {
          console.log('Bottom collision detected — activating full screen bounds.');

          // disable gravity once when the ragdoll hits the bottom
          if (!gravityDisabledOnGround) {
            world.gravity.x = 0;
            world.gravity.y = 0;
            world.gravity.scale = 0;
            gravityDisabledOnGround = true;
            console.log('Gravity disabled after landing on bottom.');

            // zero out velocities so bodies settle instead of briefly penetrating or sliding
            try {
              (world.bodies || []).forEach(b => {
                if (!b.isStatic) {
                  Body.setVelocity(b, { x: 0, y: 0 });
                  Body.setAngularVelocity(b, 0);
                }
              });
            } catch (e) { /* ignore */ }
          }

          // enable full-screen bounds (top/left/right + bottom)
          createBounds(true);
          break;
        }
      }
    }
  });
}

// =========
// GENTLE REPOSITIONING (keep ragdoll parts inside screen)
// =========

// Apply a gentle restoring force when any ragdoll part is detected outside the visible canvas.
// Only active once full bounds are turned on (so the doll can fall through the top initially).
const RESTORE_FORCE_BASE = 0.0002; // tweak for strength of nudge
const RESTORE_VELOCITY_DAMP = 0.6;  // damp velocity when nudging to avoid oscillation
const EDGE_MARGIN = 6; // pixels inside the visible edge where we try to keep parts

Matter.Events.on(engine, 'beforeUpdate', () => {
  if (!boundsActivated) return; // do nothing until full-screen bounds are active

  const w = render.canvas.width;
  const h = render.canvas.height;

  for (const b of ragdollParts) {
    if (!b || b.isStatic) continue;

    let force = { x: 0, y: 0 };
    let outside = false;

    // left
    if (b.position.x < EDGE_MARGIN) {
      outside = true;
      const dx = EDGE_MARGIN - b.position.x;
      force.x += RESTORE_FORCE_BASE * dx;
    }

    // right
    if (b.position.x > w - EDGE_MARGIN) {
      outside = true;
      const dx = (w - EDGE_MARGIN) - b.position.x;
      force.x += RESTORE_FORCE_BASE * dx;
    }

    // top
    if (b.position.y < EDGE_MARGIN) {
      outside = true;
      const dy = EDGE_MARGIN - b.position.y;
      force.y += RESTORE_FORCE_BASE * dy;
    }

    // bottom
    if (b.position.y > h - EDGE_MARGIN) {
      outside = true;
      const dy = (h - EDGE_MARGIN) - b.position.y;
      force.y += RESTORE_FORCE_BASE * dy;
    }

    if (outside) {
      try {
        // scale by mass so bigger bodies get proportional force
        const mass = (b.mass || 1);
        Body.applyForce(b, b.position, { x: force.x * mass, y: force.y * mass });

        // gently reduce velocity to avoid ping-pong
        Body.setVelocity(b, { x: b.velocity.x * RESTORE_VELOCITY_DAMP, y: b.velocity.y * RESTORE_VELOCITY_DAMP });
      } catch (e) {
        // ignore occasional race conditions
      }
    }
  }
});

// Keep canvas full screen
window.addEventListener("resize", () => {
  render.canvas.width = window.innerWidth;
  render.canvas.height = window.innerHeight;
  // recreate only the same set of bounds that are currently active
  try {
    createBounds(boundsActivated);
  } catch (err) {
    console.warn('Failed to recreate bounds on resize:', err);
  }
});
