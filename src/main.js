import { createApp } from 'vue';
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import { definePreset } from '@primevue/themes';
import Aura from '@primevue/themes/aura';
import App from './App.vue';
import 'primeicons/primeicons.css';
import './style.css';

/**
 * PrimeVue 4 Single Source of Truth Preset Definition
 * Defines 100% of colors, semantic states, form fields, and component rules.
 */
const HRHandPreset = definePreset(Aura, {
  semantic: {
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
      dark: {
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
          background: '#1c1e21',
          color: '#e9e7e2',
        },
        highlight: {
          background: 'rgba(201, 163, 92, 0.16)',
          color: '#c9a35c',
        },
        formField: {
          background: '#1f2226',
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
      colorScheme: {
        dark: {
          handle: {
            content: { background: '{primary.color}' },
          },
        },
      },
    },
  },
});

const app = createApp(App);
app.use(PrimeVue, {
  theme: {
    preset: HRHandPreset,
    options: { darkModeSelector: '.app-dark' },
  },
});
app.use(ToastService);
app.mount('#app');
