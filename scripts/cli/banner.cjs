'use strict';

const os = require('os');

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const BRIGHT_WHITE = '\x1b[97m';
const BRIGHT_CYAN = '\x1b[96m';

const BOX_WIDTH = 64;
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

const PIZZA = [
  `        _....._`,
  `    _.:\`.--|--.\`:_`,
  `  .: .'\\o ^ | o*/~'. '.`,
  ` // '.  \\ o| ^/  o* x'.\\`,
  `//'._o'. \\ |o/ o^~_.-'o*\\\\`,
  `|| o* '-.'.\\|/.-' o ^ x ||`,
  `||--o-^o-*~->|`,
];
const maxPizzaWidth = Math.max(...PIZZA.map((l) => l.length));
const pizzaLeft = Math.max(0, Math.floor((INNER - maxPizzaWidth) / 2));
const colorizePizza = (line) => line
  .replace(/o/g, `${YELLOW}o${RESET}`)
  .replace(/\^/g, `${GREEN}^${RESET}`)
  .replace(/\*/g, `${MAGENTA}*${RESET}`);
const boxLeft = (s = '', leftPadding = 0) => {
  const visible = stripAnsi(s);
  const len = visible.length;
  const left = Math.max(0, leftPadding);
  const right = Math.max(0, INNER - left - len);
  return `${BOLD}${CYAN}║${RESET}` + ' '.repeat(left) + s + ' '.repeat(right) + `${BOLD}${CYAN}║${RESET}`;
};

function printBanner(title, subtitle) {
  const nets = os.networkInterfaces();
  const lan = Object.values(nets).flatMap((ifs) => ifs || []).find((i) => i && i.family === 'IPv4' && !i.internal)?.address;
  const lines = [
    '',
    header,
    box(`${BRIGHT_CYAN}┌──────────────────┐${RESET}`),
    box(`${BRIGHT_CYAN}│  ${BOLD}${BRIGHT_WHITE}RESMATIC${RESET}  ${BRIGHT_CYAN}      │${RESET}`),
    box(`${BRIGHT_CYAN}└──────────────────┘${RESET}`),
    box(`${BOLD}${BRIGHT_WHITE}RESMATIC CLI${RESET}`),
    box(`${MAGENTA}${title}${RESET}`),
    box(`${YELLOW}${subtitle || ''}${RESET}`),
    box(),
    ...PIZZA.map((l) => boxLeft(colorizePizza(l), pizzaLeft)),
    footer,
    '',
  ];
  console.log(lines.join('\n'));
}

module.exports = {
  printBanner,
  RESET,
  BOLD,
  CYAN,
  MAGENTA,
  YELLOW,
  GREEN,
  BRIGHT_WHITE,
  BRIGHT_CYAN,
};
