// Registry of INTERACTIVE objects. Contract for each module (default export, no args):
//   { id, group, x, z, ry?, dist?, lookY?, view?, surfaces?, paper?, book?, play?, onClick?, onBlur?, onTheme?, update? }
// Add one: new file + content.js entry + one line here. Non-interactive decor lives in ../decor and ../props.js.
import shelf from './shelf.js';
import laptop from './laptop.js';
import folders from './folders.js';
import phone from './phone.js';
import parents from './frames.js';
import coffee from './coffee.js';
import lamp from './lamp.js';
export default [laptop, phone, shelf, folders, parents, coffee, lamp];