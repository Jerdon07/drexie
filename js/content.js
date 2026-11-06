// All copy lives here and nowhere else. Panel HTML and 3D textures both read from it.
// TODO markers = facts I don't have yet. Replace them; nothing else needs to change.
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

  // Laptop = personal information. `fields` is [label, value]; 8 fills the 2×4 screen grid.
  laptop: {
    label: 'Laptop · Personal Info', kicker: '02 · Personal info', title: 'Personal Info',
    lead: 'Who I am, what I study and where I’m headed.',
    fields: [ // TODO: add birthday / location / anything else you want public
      ['Full name', `${PROFILE.first} ${PROFILE.last}`],
      ['Program', 'BS Information Technology'],
      ['School', 'University of the Cordilleras'],
      ['Year level', '1st Year'],
      ['Specialization', 'Enterprise Resource Planning'],
      ['Focus areas', 'ERP · SAP · Business Process Analysis'],
      ['Career goal', 'ERP & Oracle Database Engineer'],
      ['Status', 'Open to mentorship'],
    ],
    badges: [acc('ERP'), acc('SAP'), tag('Business Process Analysis'), tag('Workflows')],
    screen: { windowTitle: 'personal-info — profile.json', nav: ['Profile', 'Academics', 'Focus', 'Goals'] },
  },

  // Notebook #2 = education. `entries` newest first; `todo` entries render muted until you fill them in.
  education: {
    label: 'Notebook · Education', kicker: '03 · Education', title: 'Education',
    lead: 'Where I’m studying and what I’m building on.',
    entries: [
      { tag: 'Current', title: 'BS in Information Technology', school: 'University of the Cordilleras', meta: '1st Year · Enterprise Resource Planning track' },
      { tag: 'Previous', title: 'Senior High School', school: 'TODO: school name', meta: 'TODO: strand · years attended', todo: true },
    ],
    coursework: ['ERP fundamentals', 'SAP ecosystem', 'Business process analysis', 'Relational design', 'SQL', 'Normalization'],
  },

  // Folder = achievements. content.js BOOK_PAGES (below) flips through them, 3 per page.
  folders: {
    label: 'Folder · Achievements', kicker: '04 · Achievements', title: 'Achievements',
    lead: 'Milestones and recognitions so far.',
    intro: { eyebrow: 'Achievements', text: 'A running list of milestones, awards and recognitions. Flip through the pages.' },
    items: [ // TODO: replace with your real achievements (year / title / one line / category)
      { year: 'TODO', title: 'Achievement title', text: 'One line on what it was and why it mattered.', tag: 'Category' },
      { year: 'TODO', title: 'Achievement title', text: 'One line on what it was and why it mattered.', tag: 'Category' },
      { year: 'TODO', title: 'Achievement title', text: 'One line on what it was and why it mattered.', tag: 'Category' },
    ],
  },

  // Phone = contact. `contacts` is shown on the HTML panel and (first 4) on the phone screen.
  phone: {
    label: 'Phone · Contact', kicker: '05 · Contact', title: 'Get in Touch',
    lead: 'Open to mentorship, collaboration and conversation.',
    contacts: [ // TODO: LinkedIn / email / phone are still placeholders
      { label: 'GitHub', value: 'Jerdon07', href: 'https://github.com/Jerdon07' },
      { label: 'LinkedIn', value: 'your-profile', href: 'https://www.linkedin.com/' },
      { label: 'Email', value: 'your@email.com', href: 'mailto:your@email.com' },
    ],
  },

  // Family frames. Photo files: images/mother.png, images/father.png (generated silhouette if missing).
  mother: { label: 'Frame · Mother', kicker: '06 · Family', title: 'Mother', lead: 'My mother.', photo: 'mother' }, // TODO: name + a few words
  father: { label: 'Frame · Father', kicker: '07 · Family', title: 'Father', lead: 'My father.', photo: 'father' }, // TODO: name + a few words

  profile: {
    label: 'Profile · Me', kicker: '08 · Profile', title: `${PROFILE.first} ${PROFILE.last}`, lead: PROFILE.headline, photo: 'profile',
    badges: [acc('BSIT'), tag('University of the Cordilleras'), acc('ERP Track')],
  },

  coffee: { label: 'Coffee · Take a sip', action: 'play' },
  lamp: { label: 'Lamp · Light / Dark', action: 'theme' },
};

// Chip order. Adding a section = add it above + a file in js/scene/objects/.
export const ORDER = ['laptop', 'notebook', 'education', 'folders', 'phone', 'mother', 'father', 'profile', 'coffee', 'lamp'];

// Derived once: flip-book pages (cover + achievements, PER_PAGE each) so nothing is typed twice.
const f = SECTIONS.folders, PER_PAGE = 3, n = f.items.length;
const lists = Array.from({ length: Math.ceil(n / PER_PAGE) }, (_, i) => f.items.slice(i * PER_PAGE, (i + 1) * PER_PAGE).map((it, j) => ({ ...it, n: i * PER_PAGE + j + 1 })));
const total = lists.length + 1;
export const BOOK_PAGES = [
  { eyebrow: f.intro.eyebrow, title: f.title, text: f.intro.text, tags: [`${n} entries`, 'Click the page to flip →'] },
  ...lists.map((rows, i) => ({ eyebrow: `Achievements · ${rows[0].n}–${rows.at(-1).n} of ${n}`, rows })),
].map((p, i) => ({ ...p, folio: `${i + 1} / ${total}` }));
