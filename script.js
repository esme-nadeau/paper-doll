// =========
// Matter.js Setup
// =========

const { Engine, Render, Runner, World, Bodies, Body, Constraint, Mouse, MouseConstraint } = Matter;

const engine = Engine.create();
const world = engine.world;

// Create renderer
const render = Matter.Render.create({
  canvas: document.getElementById("world"),
  engine: engine,
  options: {
    width: window.innerWidth,
    height: window.innerHeight,
    wireframes: false,
    background: "#ffffff"
  }
});


Render.run(render);
const runner = Runner.create();
Runner.run(runner, engine);

// =========
// RAGDOLL BUILD
// =========

// Utility function
function createLimb(x, y, w, h, options = {}) {
  return Bodies.rectangle(x, y, w, h, {
    chamfer: { radius: 10 },
    render: {
      fillStyle: "#d9b38c",
      ...options.render
    },
    ...options
  });
}

// Body part sizes
const HEAD_SIZE = 60;
const TORSO_W = 80, TORSO_H = 120;

const LIMB_W = 20, LIMB_H = 60;

// Position
const centerX = window.innerWidth / 2;
const centerY = window.innerHeight / 2;

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

// Keep canvas full screen
window.addEventListener("resize", () => {
  render.canvas.width = window.innerWidth;
  render.canvas.height = window.innerHeight;
});
