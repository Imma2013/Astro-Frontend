import { globSync } from 'fast-glob';
import fs from 'node:fs/promises';
import { basename } from 'node:path';
import { defineConfig, presetIcons, presetUno, transformerDirectives } from 'unocss';

const iconPaths = globSync('./icons/*.svg');

const collectionName = 'astro';

const customIconCollection = iconPaths.reduce(
  (acc, iconPath) => {
    const [iconName] = basename(iconPath).split('.');

    acc[collectionName] ??= {};
    acc[collectionName][iconName] = async () => fs.readFile(iconPath, 'utf8');

    return acc;
  },
  {} as Record<string, Record<string, () => Promise<string>>>,
);

const BASE_COLORS = {
  white: '#FFFFFF',
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0A0A0A',
  },
  accent: {
    50: '#EEF9FF',
    100: '#DBF3FF',
    200: '#BEE8FF',
    300: '#8FD9FF',
    400: '#59C2FF',
    500: '#2BA8FF',
    600: '#168AE6',
    700: '#146EB8',
    800: '#165C95',
    900: '#174C79',
    950: '#102F4B',
  },
  green: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
    950: '#052E16',
  },
  orange: {
    50: '#FFFAEB',
    100: '#FEEFC7',
    200: '#FEDF89',
    300: '#FEC84B',
    400: '#FDB022',
    500: '#F79009',
    600: '#DC6803',
    700: '#B54708',
    800: '#93370D',
    900: '#792E0D',
  },
  red: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
    950: '#450A0A',
  },
};

const COLOR_PRIMITIVES = {
  ...BASE_COLORS,
  alpha: {
    white: generateAlphaPalette(BASE_COLORS.white),
    gray: generateAlphaPalette(BASE_COLORS.gray[900]),
    red: generateAlphaPalette(BASE_COLORS.red[500]),
    accent: generateAlphaPalette(BASE_COLORS.accent[500]),
  },
};

export default defineConfig({
  safelist: [...Object.keys(customIconCollection[collectionName] || {}).map((x) => `i-astro:${x}`)],
  shortcuts: {
    'astro-ease-cubic-bezier': 'ease-[cubic-bezier(0.4,0,0.2,1)]',
    'transition-theme': 'transition-[background-color,border-color,color] duration-150 astro-ease-cubic-bezier',
    kdb: 'bg-Astro-elements-code-background text-Astro-elements-code-text py-1 px-1.5 rounded-md',
    'max-w-chat': 'max-w-[var(--chat-max-width)]',
  },
  rules: [
    /**
     * This shorthand doesn't exist in Tailwind and we overwrite it to avoid
     * any conflicts with minified CSS classes.
     */
    ['b', {}],
  ],
  theme: {
    colors: {
      ...COLOR_PRIMITIVES,
      Astro: {
        elements: {
          borderColor: 'var(--Astro-elements-borderColor)',
          borderColorActive: 'var(--Astro-elements-borderColorActive)',
          background: {
            depth: {
              1: 'var(--Astro-elements-bg-depth-1)',
              2: 'var(--Astro-elements-bg-depth-2)',
              3: 'var(--Astro-elements-bg-depth-3)',
              4: 'var(--Astro-elements-bg-depth-4)',
            },
          },
          textPrimary: 'var(--Astro-elements-textPrimary)',
          textSecondary: 'var(--Astro-elements-textSecondary)',
          textTertiary: 'var(--Astro-elements-textTertiary)',
          code: {
            background: 'var(--Astro-elements-code-background)',
            text: 'var(--Astro-elements-code-text)',
          },
          button: {
            primary: {
              background: 'var(--Astro-elements-button-primary-background)',
              backgroundHover: 'var(--Astro-elements-button-primary-backgroundHover)',
              text: 'var(--Astro-elements-button-primary-text)',
            },
            secondary: {
              background: 'var(--Astro-elements-button-secondary-background)',
              backgroundHover: 'var(--Astro-elements-button-secondary-backgroundHover)',
              text: 'var(--Astro-elements-button-secondary-text)',
            },
            danger: {
              background: 'var(--Astro-elements-button-danger-background)',
              backgroundHover: 'var(--Astro-elements-button-danger-backgroundHover)',
              text: 'var(--Astro-elements-button-danger-text)',
            },
          },
          item: {
            contentDefault: 'var(--Astro-elements-item-contentDefault)',
            contentActive: 'var(--Astro-elements-item-contentActive)',
            contentAccent: 'var(--Astro-elements-item-contentAccent)',
            contentDanger: 'var(--Astro-elements-item-contentDanger)',
            backgroundDefault: 'var(--Astro-elements-item-backgroundDefault)',
            backgroundActive: 'var(--Astro-elements-item-backgroundActive)',
            backgroundAccent: 'var(--Astro-elements-item-backgroundAccent)',
            backgroundDanger: 'var(--Astro-elements-item-backgroundDanger)',
          },
          actions: {
            background: 'var(--Astro-elements-actions-background)',
            code: {
              background: 'var(--Astro-elements-actions-code-background)',
            },
          },
          artifacts: {
            background: 'var(--Astro-elements-artifacts-background)',
            backgroundHover: 'var(--Astro-elements-artifacts-backgroundHover)',
            borderColor: 'var(--Astro-elements-artifacts-borderColor)',
            inlineCode: {
              background: 'var(--Astro-elements-artifacts-inlineCode-background)',
              text: 'var(--Astro-elements-artifacts-inlineCode-text)',
            },
          },
          messages: {
            background: 'var(--Astro-elements-messages-background)',
            linkColor: 'var(--Astro-elements-messages-linkColor)',
            code: {
              background: 'var(--Astro-elements-messages-code-background)',
            },
            inlineCode: {
              background: 'var(--Astro-elements-messages-inlineCode-background)',
              text: 'var(--Astro-elements-messages-inlineCode-text)',
            },
          },
          icon: {
            success: 'var(--Astro-elements-icon-success)',
            error: 'var(--Astro-elements-icon-error)',
            primary: 'var(--Astro-elements-icon-primary)',
            secondary: 'var(--Astro-elements-icon-secondary)',
            tertiary: 'var(--Astro-elements-icon-tertiary)',
          },
          preview: {
            addressBar: {
              background: 'var(--Astro-elements-preview-addressBar-background)',
              backgroundHover: 'var(--Astro-elements-preview-addressBar-backgroundHover)',
              backgroundActive: 'var(--Astro-elements-preview-addressBar-backgroundActive)',
              text: 'var(--Astro-elements-preview-addressBar-text)',
              textActive: 'var(--Astro-elements-preview-addressBar-textActive)',
            },
          },
          terminals: {
            background: 'var(--Astro-elements-terminals-background)',
            buttonBackground: 'var(--Astro-elements-terminals-buttonBackground)',
          },
          dividerColor: 'var(--Astro-elements-dividerColor)',
          loader: {
            background: 'var(--Astro-elements-loader-background)',
            progress: 'var(--Astro-elements-loader-progress)',
          },
          prompt: {
            background: 'var(--Astro-elements-prompt-background)',
          },
          sidebar: {
            dropdownShadow: 'var(--Astro-elements-sidebar-dropdownShadow)',
            buttonBackgroundDefault: 'var(--Astro-elements-sidebar-buttonBackgroundDefault)',
            buttonBackgroundHover: 'var(--Astro-elements-sidebar-buttonBackgroundHover)',
            buttonText: 'var(--Astro-elements-sidebar-buttonText)',
          },
          cta: {
            background: 'var(--Astro-elements-cta-background)',
            text: 'var(--Astro-elements-cta-text)',
          },
        },
      },
    },
  },
  transformers: [transformerDirectives()],
  presets: [
    presetUno({
      dark: {
        light: '[data-theme="light"]',
        dark: '[data-theme="dark"]',
      },
    }),
    presetIcons({
      warn: true,
      collections: {
        ...customIconCollection,
      },
      unit: 'em',
    }),
  ],
});

/**
 * Generates an alpha palette for a given hex color.
 *
 * @param hex - The hex color code (without alpha) to generate the palette from.
 * @returns An object where keys are opacity percentages and values are hex colors with alpha.
 *
 * Example:
 *
 * ```
 * {
 *   '1': '#FFFFFF03',
 *   '2': '#FFFFFF05',
 *   '3': '#FFFFFF08',
 * }
 * ```
 */
function generateAlphaPalette(hex: string) {
  return [1, 2, 3, 4, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].reduce(
    (acc, opacity) => {
      const alpha = Math.round((opacity / 100) * 255)
        .toString(16)
        .padStart(2, '0');

      acc[opacity] = `${hex}${alpha}`;

      return acc;
    },
    {} as Record<number, string>,
  );
}
