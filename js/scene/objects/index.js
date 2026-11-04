// Registry of INTERACTIVE objects. Contract for each module (default export, no args):
//   { id, group, x, z, ry?, dist?, lookY?, view?, surfaces?, paper?, book?, play?, onClick?, onBlur?, onTheme?, update? }
// Add one: new file + content.js entry + one line here. Non-interactive decor lives in ../decor and ../props.js.
import notebook from './notebook.js';
import laptop from './laptop.js';
import database from './database.js';
import cake from './cake.js';
import folders from './folders.js';
import phone from './phone.js';
import coffee from './coffee.js';
import lamp from './lamp.js';
export default [laptop, phone, notebook, database, cake, folders, coffee, lamp];
