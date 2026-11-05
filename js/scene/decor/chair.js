import THREE from '../three.js';
import { mat, box, cyl } from '../primitives.js';

// Office chair parked behind the desk, facing it. Non-interactive decor.
// Scale reference: desk top is y=0 and its legs end at y=-5.3, so FLOOR is where casters rest.
// Real-world ratio is ~1 unit ≈ 14 cm: seat ≈ 45 cm (y -2.1), backrest top ≈ 20 cm above the desk top.
const FLOOR = -5.3, SEAT_Y = -2.1;

export default function chair() {
  const group = new THREE.Group(),
    fabric = mat(0x3f5a73, { roughness: .9, metalness: 0 }), // lighter slate blue: the old near-black vanished against the dark bg
    metal = mat(0x4a5563, { metalness: .6, roughness: .4 }),
    rubber = mat(0x0d0f12, { roughness: .8 });

  // Gas lift + 5-star base with casters
  group.add(cyl(.12, 2.7, metal, 0, FLOOR + 1.7, 0), cyl(.22, .3, metal, 0, FLOOR + .35, 0));
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * 2 / 5;
    const arm = box(1.7, .14, .22, metal, Math.cos(a) * .85, FLOOR + .3, Math.sin(a) * .85); arm.rotation.y = -a;
    const caster = new THREE.Mesh(new THREE.SphereGeometry(.16, 12, 10), rubber); caster.position.set(Math.cos(a) * 1.65, FLOOR + .16, Math.sin(a) * 1.65);
    group.add(arm, caster);
  }

  // Seat
  group.add(cyl(.6, .12, metal, 0, SEAT_Y - .2, 0), box(3.2, .35, 3.1, fabric, 0, SEAT_Y, .1));

  // Backrest (leans back toward -z, away from the desk) on a short lumbar post
  const back = new THREE.Group(); back.position.set(0, SEAT_Y + .2, -1.45); back.rotation.x = -.12;
  back.add(box(3, 3.2, .3, fabric, 0, 1.7, 0), box(.3, 1.2, .25, metal, 0, .3, .1));
  group.add(back);

  // Armrests
  for (const s of [-1, 1]) group.add(box(.12, .85, .16, metal, s * 1.7, SEAT_Y + .45, 0), box(.3, .1, 1.5, fabric, s * 1.7, SEAT_Y + .92, 0));

  // In front of the laptop, facing it (ry = π turns the chair from +z to -z). Slight offset/yaw so it looks pulled out, not placed.
  return { group, x: .3, z: 5, ry: Math.PI + .12, cast: true };
}