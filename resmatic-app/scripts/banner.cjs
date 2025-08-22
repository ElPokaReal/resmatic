// Frontend startup banner for ResMatic
// Runs before `next dev` and `next start`

const os = require('os');

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const BRIGHT_WHITE = '\x1b[97m';
const BRIGHT_CYAN = '\x1b[96m';

const mode = process.env.NODE_ENV || 'development';
const port = Number(process.env.PORT || 3000);
const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api/v1';

const APP = 'RESMATIC FRONTEND';
const TAGLINE = 'Next.js App for ResMatic';
const title = mode === 'production' ? 'PRODUCTION FRONTEND' : 'DEVELOPMENT FRONTEND';

// ASCII pizza slice to match backend vibe
  const PIZZA = [
    `        _....._`,
    `    _.:\`.--|--.\`:_`,
    `  .: .'\\o ^ | o*/~'. '.`,
    ` // '.  \\ o| ^/  o* x'.\\`,
    `//'._o'. \\ |o/ o^~_.-'o*\\\\`,
    `|| o* '-.'.\\|/.-' o ^ x ||`,
    `||--o-^o-*~->|`,
  ];

const BOX_WIDTH = 60;
const INNER = BOX_WIDTH - 2;
const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');
const header = `${BOLD}${CYAN}╔${'═'.repeat(INNER)}╗${RESET}`;
const footer = `${BOLD}${CYAN}╚${'═'.repeat(INNER)}╝${RESET}`;
const box = (s = '') => {
  const visible = stripAnsi(s);
  const len = visible.length;
  const left = Math.max(0, Math.floor((INNER - len) / 2));
  const right = Math.max(0, INNER - len - left);
  return `${BOLD}${CYAN}║${RESET}` + ' '.repeat(left) + s + ' '.repeat(right) + `${BOLD}${CYAN}║${RESET}`;
};
const boxLeft = (s = '', leftPadding = 0) => {
  const visible = stripAnsi(s);
  const len = visible.length;
  const left = Math.max(0, leftPadding);
  const right = Math.max(0, INNER - left - len);
  return `${BOLD}${CYAN}║${RESET}` + ' '.repeat(left) + s + ' '.repeat(right) + `${BOLD}${CYAN}║${RESET}`;
};

const colorPizza = (line) => {
  const withToppings = line
    .replace(/o/g, `${RED}o${YELLOW}`)
    .replace(/\^/g, `${GREEN}^${YELLOW}`)
    .replace(/\*/g, `${MAGENTA}*${YELLOW}`)
    .replace(/x/g, `${BLUE}x${YELLOW}`)
    .replace(/~/g, `${BRIGHT_WHITE}~${YELLOW}`);
  return `${YELLOW}${withToppings}${RESET}`;
};

// Network info
const nets = os.networkInterfaces();
const lan = Object.values(nets)
  .flatMap((ifaces) => ifaces || [])
  .find((i) => i && i.family === 'IPv4' && !i.internal)?.address;
const localURL = `http://localhost:${port}`;
const lanURL = lan ? `http://${lan}:${port}` : '';

const maxPizzaWidth = Math.max(...PIZZA.map((l) => l.length));
const pizzaLeft = Math.max(0, Math.floor((INNER - maxPizzaWidth) / 2));

const lines = [
  '',
  header,
  box(`${BRIGHT_CYAN}┌──────────────────┐${RESET}`),
  box(`${BRIGHT_CYAN}│  ${BOLD}${BRIGHT_WHITE}RESMATIC${RESET}  ${BRIGHT_CYAN}     │${RESET}`),
  box(`${BRIGHT_CYAN}└──────────────────┘${RESET}`),
  box(),
  ...PIZZA.map((l) => boxLeft(colorPizza(l), pizzaLeft)),
  box(),
  box(`${BOLD}${BRIGHT_WHITE}${APP}${RESET}`),
  box(`${BRIGHT_CYAN}${TAGLINE}${RESET}`),
  box(`${BOLD}${MAGENTA}${title}${RESET}`),
  box(),
  box(`${YELLOW}Mode:${RESET} ${mode}`),
  box(`${YELLOW}Port:${RESET} ${port}`),
  box(`${YELLOW}App:${RESET}  ${GREEN}${localURL}${RESET}`),
  ...(lanURL ? [box(`${YELLOW}LAN:${RESET}   ${GREEN}${lanURL}${RESET}`)] : []),
  box(`${YELLOW}API:${RESET}  ${GREEN}${apiBase}${RESET}`),
  footer,
  '',
];

console.log(lines.join('\n'));
