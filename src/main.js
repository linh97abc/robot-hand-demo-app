import { createApp } from 'vue';
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import { definePreset } from '@primevue/themes';
import Aura from '@primevue/themes/aura';
import App from './App.vue';
import { i18n } from './i18n/index.js';
import 'primeicons/primeicons.css';
import './style.css';

/**
 * PrimeVue 4 Single Source of Truth Preset Definition
 * Defines 100% of colors (Claude Ivory Light & Studio Dark schemes), typography, semantic states, and component rules.
 */
const HRHandPreset = definePreset(Aura, {
  primitive: {
    borderRadius: {
      none: '0',
      xs: '2px',
      sm: '6px',
      md: '8px',
      lg: '10px',
    },
  },
  semantic: {
    fontSize: {
      xs: '9px',       /* Level 1: Micro labels, table headers */
      sm: '10px',      /* Level 2: Sub-labels, hints, footer specs, timestamps */
      base: '11px',    /* Level 3: Standard UI text (sliders, buttons, inputs, list items) */
      md: '12px',      /* Level 4: Section subheadings, card titles */
      lg: '14px',      /* Level 5: Main Panel Headers */
    },
    fontWeight: {
      normal: '400',   /* Regular body text */
      medium: '500',   /* Medium buttons */
      bold: '700',     /* Headers, active labels */
    },
    primary: {
      50: '#fbf7ef',
      100: '#f3e9d4',
      200: '#e8d5ac',
      300: '#ddc184',
      400: '#d3ad63',
      500: '#c9a35c',
      600: '#b3894a',
      700: '#8f6d3c',
      800: '#6b512d',
      900: '#48371e',
      950: '#2c210f',
    },
    colorScheme: {
      light: {
        /* Claude Code Warm Ivory Light Theme Palette */
        surface: {
          0: '#ffffff',
          50: '#24211e',   /* Primary Panel FG - Warm Charcoal */
          100: '#3d3834',
          200: '#6e675f',  /* Muted Secondary Text */
          300: '#948c82',  /* Dimmed Tertiary Text */
          400: '#e0d9cd',  /* Primary Border Line */
          500: '#e8e2d7',  /* Subtle Inner Border Line */
          600: '#e2dccf',  /* Surface Active / Drag / Selected */
          700: '#f3efe6',  /* Surface Row / Item Background */
          800: '#faf7f0',  /* Sidebar Panel Background */
          900: '#f2eee5',  /* 3D Stage Background (Warm Cream Ivory) */
          950: '#ffffff',
        },
        info: {
          background: 'rgba(56, 189, 248, 0.12)',
          borderColor: 'rgba(56, 189, 248, 0.4)',
          color: '#0284c7',
        },
        warn: {
          background: 'rgba(217, 119, 6, 0.12)',
          borderColor: 'rgba(217, 119, 6, 0.4)',
          color: '#b45309',
        },
        success: {
          background: 'rgba(34, 197, 94, 0.12)',
          borderColor: 'rgba(34, 197, 94, 0.4)',
          color: '#15803d',
        },
        danger: {
          background: 'rgba(220, 38, 38, 0.12)',
          borderColor: 'rgba(220, 38, 38, 0.4)',
          color: '#b91c1c',
        },
        content: {
          background: 'rgba(250, 247, 240, 0.78)', /* Translucent Frosted Glass */
          color: '#24211e',
        },
        highlight: {
          background: 'rgba(201, 163, 92, 0.15)',
          color: '#c9a35c',
        },
        formField: {
          background: 'rgba(255, 255, 255, 0.85)',
          color: '#24211e',
          borderColor: '#d8d1c3',
          hoverBorderColor: '#b8b0a2',
          focusBorderColor: '#c9a35c',
          placeholderColor: '#948c82',
          disabledBackground: '#f3efe6',
          disabledColor: '#948c82',
        },
      },
      dark: {
        /* Studio Dark Theme Palette */
        surface: {
          0: '#ffffff',
          50: '#e9e7e2',   /* Primary Panel FG */
          100: '#c8c6c1',
          200: '#9a9ea4',  /* Muted Secondary Text */
          300: '#71767c',  /* Dimmed Tertiary Text */
          400: '#3a3e44',  /* Primary Border Line */
          500: '#32363b',  /* Subtle Inner Border Line */
          600: '#2a2d32',  /* Surface Active / Drag / Selected */
          700: '#23262a',  /* Surface Row / Item Background */
          800: '#1c1e21',  /* Sidebar Panel Background */
          900: '#141619',  /* 3D Stage Background */
          950: '#0d0e0f',
        },
        info: {
          background: 'rgba(56, 189, 248, 0.12)',
          borderColor: 'rgba(56, 189, 248, 0.5)',
          color: '#7dd3fc',
        },
        warn: {
          background: 'rgba(245, 158, 11, 0.18)',
          borderColor: 'rgba(245, 158, 11, 0.6)',
          color: '#fbbf24',
        },
        success: {
          background: 'rgba(34, 197, 94, 0.12)',
          borderColor: 'rgba(34, 197, 94, 0.5)',
          color: '#4ade80',
        },
        danger: {
          background: 'rgba(239, 68, 68, 0.15)',
          borderColor: 'rgba(239, 68, 68, 0.5)',
          color: '#f87171',
        },
        content: {
          background: 'rgba(28, 30, 33, 0.78)', /* Translucent Frosted Glass */
          color: '#e9e7e2',
        },
        highlight: {
          background: 'rgba(201, 163, 92, 0.16)',
          color: '#c9a35c',
        },
        formField: {
          background: 'rgba(31, 34, 38, 0.85)',
          color: '#e9e7e2',
          borderColor: '#383c42',
          hoverBorderColor: '#484c54',
          focusBorderColor: '#c9a35c',
          placeholderColor: '#71767c',
          disabledBackground: '#1a1c1e',
          disabledColor: '#5c5f66',
        },
      },
    },
  },
  components: {
    button: {
      borderRadius: '8px',
    },
    slider: {
      track: { background: '#3a3e44' },
      handle: {
        width: '12px',
        height: '12px',
        background: '{primary.color}',
        hoverBackground: '{primary.color}',
        content: {
          width: '12px',
          height: '12px',
          background: '{primary.color}',
          hoverBackground: '{primary.color}',
        },
      },
    },
  },
});

// Enable Dark Mode by default
document.documentElement.classList.add('app-dark');

const app = createApp(App);
app.use(i18n);
app.use(PrimeVue, {
  theme: {
    preset: HRHandPreset,
    options: { darkModeSelector: '.app-dark' },
  },
});
app.use(ToastService);
app.mount('#app');
