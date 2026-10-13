import type {Locale,Messages} from './i18n/config';

// Typed translation keys and parameters: a missing or misspelled key fails `tsc`.
declare module 'next-intl' {
  interface AppConfig {
    Locale: Locale;
    Messages: Messages;
  }
}
