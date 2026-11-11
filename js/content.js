// All copy lives here and nowhere else. Panel HTML and 3D textures both read from it.
// TODO markers = facts I don't have yet. Replace them; nothing else needs to change.
export const PROFILE = {
  first: 'Drexie Jaira', last: 'Litaoen',
  headline: '1st-Year BSIT Student | Future ERP & Oracle Database Engineer',
  school: 'University of the Cordilleras', program: 'BSIT · ERP Track', // printed on the school ID
};

const acc = text => ({ text, accent: true });
const tag = text => ({ text });

// `accent` (NAV sections only) is the section's colour everywhere: chip dot, 3D glow ring, focus tint, screen/page textures.
// Palette: Vue mint on navy. Gold is free to use now that the desk is navy; keep neighbouring sections clearly different hues.
export const SECTIONS = {
  // Laptop = personal information. `groups` drive the laptop screen (sidebar + cards); `fields` is the same data flattened
  // for the HTML panel, so nothing is typed twice. `lists` render as pill rows on the screen.
  laptop: {
    label: 'Personal Info', kicker: '01 · Personal info', title: 'Personal Info', accent: '#60a5fa',
    lead: 'Who I am, what I study and where I’m headed.',
    name: 'Drexie Jaira M. Litaoen',
    groups: [
      { title: 'Personal', fields: [['Gender', 'Female'], ['Age', '18 years old'], ['Birthday', '04/14/08'], ['Status', 'Single'], ['Height', '149 cm'], ['Weight', '48 kg']] },
      { title: 'Academics', fields: [['Program', 'B.S. in Information Technology'], ['College', 'CITCS department'], ['Year level', '1st year']] },
      { title: 'Contact', fields: [['Email', 'leedrexie@gmail.com'], ['Phone number', '09850883391'], ['Address', 'Sapsing, La Trinidad, Benguet']] },
    ],
    lists: [
      { title: 'Hobbies', items: ['Journaling', 'Reading', 'Gaming'] },
      { title: 'Skills', items: ['Time management', 'Critical thinking', 'Good communication'] },
    ],
    badges: [acc('ERP'), acc('SAP'), tag('Business Process Analysis'), tag('Workflows')],
    screen: { windowTitle: 'personal-info — profile.json' },
  },

  // Notebooks shelf = education. `entries` newest first (one book each on the top shelf, `todo` ones render muted);
  // `coursework` = one book each on the bottom shelf. The HTML panel shows everything.
  notebooks: {
    label: 'Education', kicker: '03 · Education', title: 'Education', accent: '#a78bfa',
    lead: 'Where I’m studying and what I’m building on.',
    entries: [
      { tag: 'Current', title: 'BS in Information Technology', school: 'University of the Cordilleras', meta: '1st Year · Enterprise Resource Planning track' },
      { tag: 'Previous', title: 'Senior High School', school: 'TODO: school name', meta: 'TODO: strand · years attended', todo: true },
    ],
    coursework: ['ERP fundamentals', 'SAP ecosystem', 'Business process analysis', 'Relational design', 'SQL', 'Normalization'],
  },

  // Folder = achievements: ONE portrait resume sheet. The camera frames only its top, so `items` are shown PER_PAGE at a time (pager / arrow keys).
  // `image` = an id from config.js IMAGES (drop images/certN.jpg or .png); a generated placeholder shows until the file exists.
  folders: {
    label: 'Achievements', kicker: '02 · Achievements', title: 'Achievements', accent: '#fbbf24',
    lead: 'Certificates and recognitions so far.',
    items: [ // TODO: replace the titles with your real certificates
      { title: 'TODO: certificate title', image: 'cert1' },
      { title: 'TODO: certificate title', image: 'cert2' },
      { title: 'TODO: certificate title', image: 'cert3' },
      { title: 'TODO: certificate title', image: 'cert4' },
      { title: 'TODO: certificate title', image: 'cert5' },
      { title: 'TODO: certificate title', image: 'cert6' },
    ],
  },

  // Phone = contact. `contacts` is shown on the HTML panel and (first 4) on the phone screen.
  phone: {
    label: 'Contact', kicker: '05 · Contact', title: 'Get in Touch', accent: '#42b883',
    lead: 'Open to mentorship, collaboration and conversation.',
    contacts: [ // TODO: LinkedIn / email / phone are still placeholders
      { label: 'GitHub', icon: 'GH', value: 'Jerdon07', href: 'https://github.com/Jerdon07' },
      { label: 'LinkedIn', icon: 'in', value: 'your-profile', href: 'https://www.linkedin.com/' },
      { label: 'Email', icon: '@', value: 'your@email.com', href: 'mailto:your@email.com' },
    ],
  },

  // Family: ONE object, two frames side by side (so both are in view when you click). Photo files: images/mother.png, images/father.png
  // (a generated silhouette shows until they exist). One accent for the pair.
  parents: {
    label: 'Parents', kicker: '04 · Family', title: 'My Parents', accent: '#f472b6',
    lead: 'The two people behind it all.',
    people: [ // TODO: names + a few words each
      { role: 'Mother', name: 'TODO: name', note: 'My mother. TODO: a few words.', photo: 'mother' },
      { role: 'Father', name: 'TODO: name', note: 'My father. TODO: a few words.', photo: 'father' },
    ],
  },

  // 3D-only objects: not in NAV, so the label is just the hover tooltip.
  coffee: { label: 'Coffee · Take a sip', action: 'play' },
  lamp: { label: 'Lamp · Light / Dark', action: 'theme' },
};

// Panel view of the laptop: name first, then every group field, then each list as a comma-joined value.
SECTIONS.laptop.fields = [['Name', SECTIONS.laptop.name], ...SECTIONS.laptop.groups.flatMap(g => g.fields), ...SECTIONS.laptop.lists.map(l => [l.title, l.items.join(', ')])];

// Bottom nav: exactly these, in this order. Each id must match a 3D object id (js/scene/objects/*).
// Adding a section = add it above + a file in js/scene/objects/ + an id here.
export const NAV = ['laptop', 'folders', 'notebooks', 'parents', 'phone'];

// Education book pages in reading order (textures.js draws them, objects/shelf.js counts them): title, one per entry, coursework.
// Two pages per spread, so the pager has ceil(n / 2) positions. Adding an entry adds a page.
export const EDU_PAGES = [{ kind: 'title' }, ...SECTIONS.notebooks.entries.map((e, i) => ({ kind: 'entry', e, n: i + 1 })), { kind: 'courses' }];

// Derived once: sheet pages (PER_PAGE certificates each) so nothing is typed twice. No cover page: the desk-distance face is drawn from SECTIONS.folders.
const f = SECTIONS.folders, PER_PAGE = 3, n = f.items.length;
const lists = Array.from({ length: Math.ceil(n / PER_PAGE) }, (_, i) => f.items.slice(i * PER_PAGE, (i + 1) * PER_PAGE).map((it, j) => ({ ...it, n: i * PER_PAGE + j + 1 })));
export const BOOK_PAGES = lists.map((rows, i) => ({ eyebrow: `Certificates · ${rows[0].n}–${rows.at(-1).n} of ${n}`, rows, folio: `${i + 1} / ${lists.length}`, accent: f.accent }));

// id -> accent for every section that has one (consumed by main.js, ui.js and the scene).
export const ACCENTS = Object.fromEntries(Object.entries(SECTIONS).filter(([, v]) => v.accent).map(([k, v]) => [k, v.accent]));
