import { createApp } from 'vue';
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import { definePreset } from '@primevue/themes';
import Aura from '@primevue/themes/aura';
import App from './App.vue';
import 'primeicons/primeicons.css';
import './style.css';

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
          50: '#e9e7e2',
          100: '#c8c6c1',
          200: '#9a9ea4',
          300: '#71767c',
          400: '#3a3e44',
          500: '#2a2d32',
          600: '#23262a',
          700: '#1c1e21',
          800: '#17181a',
          900: '#131415',
          950: '#0d0e0f',
        },
        content: { background: '#1c1e21', color: '#e9e7e2' },
        highlight: { background: 'rgba(201,163,92,0.16)', color: '#c9a35c' },
      },
    },
  },
  components: {
    slider: {
      track: { background: '#3a3e44' },
      handle: {
        background: '{primary.color}',
        hoverBackground: '{primary.color}',
        content: {
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
