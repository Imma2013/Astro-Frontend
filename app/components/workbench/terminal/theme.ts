import type { ITheme } from '@xterm/xterm';

const style = getComputedStyle(document.documentElement);
const cssVar = (token: string) => style.getPropertyValue(token) || undefined;

export function getTerminalTheme(overrides?: ITheme): ITheme {
  return {
    cursor: cssVar('--Astro-elements-terminal-cursorColor'),
    cursorAccent: cssVar('--Astro-elements-terminal-cursorColorAccent'),
    foreground: cssVar('--Astro-elements-terminal-textColor'),
    background: cssVar('--Astro-elements-terminal-backgroundColor'),
    selectionBackground: cssVar('--Astro-elements-terminal-selection-backgroundColor'),
    selectionForeground: cssVar('--Astro-elements-terminal-selection-textColor'),
    selectionInactiveBackground: cssVar('--Astro-elements-terminal-selection-backgroundColorInactive'),

    // ansi escape code colors
    black: cssVar('--Astro-elements-terminal-color-black'),
    red: cssVar('--Astro-elements-terminal-color-red'),
    green: cssVar('--Astro-elements-terminal-color-green'),
    yellow: cssVar('--Astro-elements-terminal-color-yellow'),
    blue: cssVar('--Astro-elements-terminal-color-blue'),
    magenta: cssVar('--Astro-elements-terminal-color-magenta'),
    cyan: cssVar('--Astro-elements-terminal-color-cyan'),
    white: cssVar('--Astro-elements-terminal-color-white'),
    brightBlack: cssVar('--Astro-elements-terminal-color-brightBlack'),
    brightRed: cssVar('--Astro-elements-terminal-color-brightRed'),
    brightGreen: cssVar('--Astro-elements-terminal-color-brightGreen'),
    brightYellow: cssVar('--Astro-elements-terminal-color-brightYellow'),
    brightBlue: cssVar('--Astro-elements-terminal-color-brightBlue'),
    brightMagenta: cssVar('--Astro-elements-terminal-color-brightMagenta'),
    brightCyan: cssVar('--Astro-elements-terminal-color-brightCyan'),
    brightWhite: cssVar('--Astro-elements-terminal-color-brightWhite'),

    ...overrides,
  };
}

