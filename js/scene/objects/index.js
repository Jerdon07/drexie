// Registry. Contract for each module (default export, no args):
//   { id, group, x, z, ry?, dist?, view?, surfaces?, paper?, book?, onClick?, onBlur?, onTheme?, update? }
// Add a desk object: new file + content.js entry + one line here.
import notebook from './notebook.js';
import laptop from './laptop.js';
import database from './database.js';
import cake from './cake.js';
import folders from './folders.js';
import phone from './phone.js';
import lamp from './lamp.js';
export default [laptop, phone, notebook, database, cake, folders, lamp];
