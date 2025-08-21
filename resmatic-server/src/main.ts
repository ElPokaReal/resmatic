import { NestFactory } from '@nestjs/core';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AppModule } from './app.module';
import { networkInterfaces } from 'os';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT ?? 3001);
  // Register Nest-based HTTP logging for all routes
  app.useGlobalInterceptors(new LoggingInterceptor());
  await app.listen(port);

  const mode = process.env.NODE_ENV ?? 'development';
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
  const title = mode === 'production' ? 'PRODUCTION SERVER' : 'DEVELOPMENT SERVER';
  const APP = 'RESMATIC';
  const TAGLINE = 'Advanced Restaurant Management';

  // Restaurant-themed ASCII art (pizza slice) inspired by user's style
  const PIZZA = [
    `        _....._`,
    `    _.:\`.--|--.\`:_`,
    `  .: .'\\o ^ | o*/~'. '.`,
    ` // '.  \\ o| ^/  o* x'.\\`,
    `//'._o'. \\ |o/ o^~_.-'o*\\\\`,
    `|| o* '-.'.\\|/.-' o ^ x ||`,
    `||--o-^o-*~->|`,
  ];

  // Box helpers
  const BOX_WIDTH = 57; // total width including borders
  const INNER = BOX_WIDTH - 2;
  const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, '');
  const header = `${BOLD}${CYAN}╔${'═'.repeat(INNER)}╗${RESET}`;
  const footer = `${BOLD}${CYAN}╚${'═'.repeat(INNER)}╝${RESET}`;
  const box = (s = '') => {
    const visible = stripAnsi(s);
    const len = visible.length;
    const left = Math.max(0, Math.floor((INNER - len) / 2));
    const right = Math.max(0, INNER - len - left);
    return `${BOLD}${CYAN}║${RESET}` + ' '.repeat(left) + s + ' '.repeat(right) + `${BOLD}${CYAN}║${RESET}`;
  };

  // Left-fixed renderer to keep multi-line ASCII blocks intact
  const boxLeft = (s = '', leftPadding = 0) => {
    const visible = stripAnsi(s);
    const len = visible.length;
    const left = Math.max(0, leftPadding);
    const right = Math.max(0, INNER - left - len);
    return `${BOLD}${CYAN}║${RESET}` + ' '.repeat(left) + s + ' '.repeat(right) + `${BOLD}${CYAN}║${RESET}`;
  };

  // Colorize pizza: base in yellow; toppings mapping: 'o' red (pepperoni), '^' green (peppers), '*' magenta (onions), 'x' blue (olives), '~' bright white (cheese)
  const colorPizza = (line: string) => {
    const withToppings = line
      .replace(/o/g, `${RED}o${YELLOW}`)
      .replace(/\^/g, `${GREEN}^${YELLOW}`)
      .replace(/\*/g, `${MAGENTA}*${YELLOW}`)
      .replace(/x/g, `${BLUE}x${YELLOW}`)
      .replace(/~/g, `${BRIGHT_WHITE}~${YELLOW}`);
    return `${YELLOW}${withToppings}${RESET}`;
  };

  // ResMatic sign above the pizza
  const SIGN = [
    `${BRIGHT_CYAN}┌──────────────────┐${RESET}`,
    `${BRIGHT_CYAN}│     ${BOLD}${BRIGHT_WHITE}${APP}${RESET}  ${BRIGHT_CYAN}   │${RESET}`,
    `${BRIGHT_CYAN}└──────────────────┘${RESET}`,
  ];

  // Runtime and network info
  const runtime = (process as any).versions?.bun
    ? `Bun ${(process as any).versions.bun}`
    : `Node ${process.version}`;
  const nets = networkInterfaces();
  const lan = Object.values(nets)
    .flatMap((ifaces) => ifaces ?? [])
    .find((i) => i && i.family === 'IPv4' && !i.internal)?.address;
  const localURL = `http://localhost:${port}`;
  const lanURL = lan ? `http://${lan}:${port}` : '';

  // Compute fixed left margin so the pizza block is centered as a whole
  const maxPizzaWidth = Math.max(...PIZZA.map((l) => l.length));
  const pizzaLeft = Math.max(0, Math.floor((INNER - maxPizzaWidth) / 2));

  const lines = [
    '',
    header,
    ...SIGN.map((l) => box(l)),
    box(),
    ...PIZZA.map((l) => boxLeft(colorPizza(l), pizzaLeft)),
    box(),
    box(`${BOLD}${BRIGHT_WHITE}${APP}${RESET}`),
    box(`${BRIGHT_CYAN}${TAGLINE}${RESET}`),
    box(`${BOLD}${MAGENTA}${title}${RESET}`),
    box(),
    box(`${YELLOW}Mode:${RESET} ${mode}`),
    box(`${YELLOW}Port:${RESET} ${port}`),
    box(`${YELLOW}Local:${RESET}  ${GREEN}${localURL}${RESET}`),
    ...(lanURL ? [box(`${YELLOW}Network:${RESET} ${GREEN}${lanURL}${RESET}`)] : []),
    box(`${YELLOW}Runtime:${RESET} ${runtime}`),
    footer,
    '',
  ];

  console.log(lines.join('\n'));
}
bootstrap();

