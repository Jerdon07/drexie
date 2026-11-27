import { hex } from './colors.js';
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
    label: 'Personal Info', kicker: '01 · Personal info', title: 'Personal Info', get accent() { return hex('--acc-laptop'); },
    lead: 'Who I am, what I study and where I’m headed.',
    name: 'Drexie Jaira M. Litaoen',
    groups: [
      { title: 'Personal', fields: [ // [label, value, columns spanned of 4 on the laptop screen (default 1)]; each row should add up to 4
        ['Gender', 'Female'], ['Age', '18 years old'], ['Birthday', '04/14/08'], ['Status', 'Single'],
        ['Height', '149 cm'], ['Weight', '48 kg'], ['Blood type', 'AB'], ['Zodiac sign', 'Aries'],
        ['Nationality', 'Filipino'], ['Personality type', 'INFP'], ['Religion', 'Jehovah’s Witnesses', 2],
        ['Ethnicity', 'Ibaloi, Kalanguya', 2], ['Languages spoken', 'Ilokano, Tagalog, English, Ibaloi', 2],
        ['Favorite color', 'Sage Green & Midnight Purple', 2], ['Favorite drink', 'Matcha & Coffee', 2],
        ['Favorite food', 'Spaghetti, Grapes, Tonkatsu', 4],
      ] },
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

  // Bookshelf = family & friends: ONE open spread with every photo visible. `photos` order: first 3 = left page, last 3 = right page.
  // `text` = individual caption; `alt` = description when there isn't one. `sharedCaption` covers the right page.
  // `image` = an id from config.js IMAGES; a placeholder shows until the file exists. The page layout (textures.js) expects these shapes in this order.
  album: {
    label: 'Family & Friends', kicker: '03 · Family & friends', title: 'Family & Friends', get accent() { return hex('--acc-album'); },
    lead: 'The people who matter most.',
    shelfBooks: { top: ['Memories', 'Moments'], bottom: ['Family', 'Friends', 'Home', 'Trips', 'Birthdays', 'Holidays'] }, // decorative spines
    photos: [
      { image: 'mother', shape: 'portrait', text: 'No matter how old I grow or how far I go, her arms will always be my safest home.' },
      { image: 'father', shape: 'portrait', text: 'Our quiet protector, our unshakable foundation, and the reason we always feel safe coming home.' },
      { image: 'siblings', shape: 'landscape', text: 'What they gave in silence, I will honor for a lifetime—my brothers.' },
      { image: 'friends1', shape: 'landscape', alt: 'Friends, photo 1' },
      { image: 'friends2', shape: 'portrait', alt: 'Friends, photo 2' },
      { image: 'friends3', shape: 'landscape', alt: 'Friends, photo 3' },
    ],
    sharedCaption: 'We belong to different timelines, speak from different temperaments, and hold memories from completely different worlds—yet every moment they chose to share with me became the exact grace that made my days brighter.',
  },

  // Folder = achievements: ONE landscape page, one column per item (certificate image + highlights), all visible at once. `title` is not drawn on the sheet (alt text only).
  // `image` = an id from config.js IMAGES (PNG in public/images/); a generated placeholder shows until the file exists.
  folders: {
    label: 'Achievements', kicker: '02 · Achievements', title: 'Achievements', get accent() { return hex('--acc-folders'); },
    lead: 'Honors, awards and recognitions earned in school.',
    items: [ // one block on the sheet each; `image` = an id from config.js IMAGES; `highlights` auto-fit their block, so keep them short
      { title: 'Graduation Recognition', image: 'graduation', highlights: [
        'With honors', 'Best in Research Defense', 'Best in Work Immersion', 'Best TVL student',
        'Outstanding performance in Communication Arts - Filipino',
        'Outstanding Performance in Technical-Vocational Education (Tech-Voc)',
        'Outstanding Campus Journalist (Feature Writer)'] },
      { title: 'Moving-Up Recognition', image: 'movingup', highlights: [
        'With honors', 'Campus Journalism Excellence Award', 'Best in Research Innovation'] },
      { title: 'Junior High Completion', image: 'junior', highlights: [
        'With honors', 'Certificate of completion (JHS)'] },
      { title: 'Buwan ng Wika', image: 'wika', highlights: [
        'Champion — Scrabble (Women’s Division)', '1st Place — Filipino Quiz Bee'] },
      { title: 'Sci Damath', image: 'scimath', highlights: [
        '1st place — Sci Damath Women’s Division (Intramurals)'] },
      { title: 'Drum and Lyre', image: 'drumlyre', highlights: [
        '1st Runner-up — Drum and Lyre (2015)'] },
      { title: 'Elementary Recognitions', image: 'elementary', highlights: [
        'Elementary recognitions'] },
    ],
  },

  // Phone = contact. `contacts` is shown on the HTML panel and (first 4) on the phone screen.
  phone: {
    label: 'Contact', kicker: '04 · Contact', title: 'Get in Touch', get accent() { return hex('--acc-phone'); },
    lead: 'Open to mentorship, collaboration and conversation.',
    contacts: [
      { label: 'Phone', icon: 'Ph', value: '09850883391', href: 'tel:09850883391' },
      { label: 'Email', icon: '@', value: 'leedrexie@gmail.com', href: 'mailto:leedrexie@gmail.com' },
      { label: 'Messenger', icon: 'Ms', value: 'Drexie Jaira Litaoen', href: 'https://m.me/jairalitaoen' },
    ],
  },

  // 3D-only objects: not in NAV, so the label is just the hover tooltip.
  coffee: { label: 'Coffee · Take a sip', action: 'play' },
  lamp: { label: 'Lamp · Light / Dark', action: 'theme' },
};

// Panel view of the laptop: name first, then every group field, then each list as a comma-joined value.
SECTIONS.laptop.fields = [['Name', SECTIONS.laptop.name], ...SECTIONS.laptop.groups.flatMap(g => g.fields.map(([k, v]) => [k, v])), ...SECTIONS.laptop.lists.map(l => [l.title, l.items.join(', ')])];

// Bottom nav: exactly these, in this order. Each id must match a 3D object id (js/scene/objects/*).
// Adding a section = add it above + a file in js/scene/objects/ + an id here.
export const NAV = ['laptop', 'folders', 'album', 'phone']; // also the previous/next order

// id -> accent for every section that has one (consumed by main.js, ui.js and the scene).
export const ACCENTS = {};
for (const [k, v] of Object.entries(SECTIONS)) if ('accent' in v) Object.defineProperty(ACCENTS, k, { get: () => v.accent, enumerable: true }); // lazy: tokens are read on first use, not at import
