// All copy lives here and nowhere else. Panel HTML and 3D textures both read from it.
export const PROFILE = {
  first: 'Drexie Jaira', last: 'Litaoen',
  headline: '1st-Year BSIT Student | Future ERP & Oracle Database Engineer',
};

const acc = text => ({ text, accent: true });
const tag = text => ({ text });

export const SECTIONS = {
  notebook: {
    label: 'Notebook · About', kicker: '01 · About me', title: 'About Me',
    lead: 'Curious about how complex systems work.',
    paragraphs: [
      'I’m a first-year BSIT student at the University of the Cordilleras, specializing in Enterprise Resource Planning. My curiosity runs from enterprise databases to the chemistry of a good pastry.',
      'I’m learning under the guidance of tech-minded family mentors, with one goal: bridging business operations with technology to streamline enterprise systems.',
    ],
    badges: [acc('BSIT'), tag('University of the Cordilleras'), acc('ERP Track'), tag('Aspiring SAP Specialist')],
  },
  laptop: {
    label: 'Laptop · Focus Areas', kicker: '02 · Focus areas', title: 'ERP & SAP',
    lead: 'Where business processes meet software.',
    items: [
      { title: 'Enterprise Resource Planning', text: 'Finance, supply chain, HR and sales unified in one integrated system.' },
      { title: 'SAP Ecosystem', text: 'How SAP’s modules map to real business functions.' },
      { title: 'Business Process Analysis', text: 'Mapping workflows and finding where systems can remove friction.' },
    ],
    badges: [acc('ERP'), acc('SAP'), tag('Business Process Analysis'), tag('Workflows')],
    screen: { windowTitle: 'erp-workspace — focus areas', nav: ['Overview', 'Finance', 'Supply Chain', 'HR', 'Sales'] },
  },
  db: {
    label: 'Database · Oracle', kicker: '03 · Database architecture', title: 'Oracle & SQL',
    lead: 'Good systems start with good data.',
    paragraphs: ['Building fundamentals in relational design, normalization and SQL, with the long-term goal of becoming an Oracle Database Engineer.'],
    badges: [acc('Oracle'), acc('SQL'), tag('ERD'), tag('Normalization')],
  },
  cake: {
    label: 'Cake · Pastry', kicker: '04 · Beyond the terminal', title: 'Cooking & Pastry',
    lead: 'Systems thinking you can taste.',
    paragraphs: ['Pastry demands precise measurements, ordered steps and controlled variables, with room for creativity inside the process. It’s the same discipline I want to bring to database design and enterprise systems.'],
    badges: [acc('Precision'), acc('Creativity'), tag('Process-oriented')],
  },
  folders: {
    label: 'Folders · Projects', kicker: '05 · Learning showcase', title: 'Projects',
    lead: 'Work in progress. Real entries land here.',
    status: 'Coming soon',
    intro: { eyebrow: 'Learning showcase', text: 'Academic work, lab exercises and database design studies will live here. Flip through the pages.', tags: ['Click the page to flip →'] },
    items: [
      { title: 'Academic Project', text: 'Placeholder for a course project write-up: the problem, my approach and what I learned.', tags: ['Course project', 'TBD'] },
      { title: 'Lab Work', text: 'Placeholder for hands-on lab exercises, queries and results.', tags: ['SQL', 'Lab'] },
      { title: 'Database Design Study', text: 'Placeholder for an ERD and schema case study: entities, relationships and normalization.', tags: ['Oracle', 'ERD', 'Normalization'] },
    ],
    badges: [acc('Coming soon')],
  },
  phone: {
    label: 'Phone · Contact', kicker: '06 · Contact', title: 'Get in Touch',
    lead: 'Open to mentorship, collaboration and conversation.',
    links: [ // TODO: still placeholders
      ['GitHub · your-username', 'https://github.com/'],
      ['LinkedIn · your-profile', 'https://www.linkedin.com/'],
      ['Email · your@email.com', 'mailto:your@email.com'],
    ],
  },
  lamp: { label: 'Lamp · Light / Dark', action: 'theme' },
};

// Chip order. Adding a section = add it above + a file in js/scene/objects/.
export const ORDER = ['notebook', 'laptop', 'db', 'cake', 'folders', 'phone', 'lamp'];

// Derived once: flip-book pages (intro + one per project) so nothing is typed twice.
const f = SECTIONS.folders, total = f.items.length + 1;
export const BOOK_PAGES = [
  { eyebrow: f.intro.eyebrow, title: f.title, text: f.intro.text, tags: f.intro.tags },
  ...f.items.map((p, i) => ({ eyebrow: `Project ${String(i + 1).padStart(2, '0')} · ${f.status}`, ...p })),
].map((p, i) => ({ ...p, folio: `${i + 1} / ${total}` }));
