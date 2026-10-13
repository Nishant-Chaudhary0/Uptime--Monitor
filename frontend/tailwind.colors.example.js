// Merge this `colors` block into theme.extend in your tailwind.config.js.
// Tokens are driven by the CSS variables in src/index.css.
const c = (v) => `rgb(var(--${v}) / <alpha-value>)`

export const colors = {
  paper: c('paper'),
  surface: c('surface'),
  line: { DEFAULT: c('line'), strong: c('line-strong') },
  ink: { DEFAULT: c('ink'), soft: c('ink-soft'), faint: c('ink-faint') },
  signal: { DEFAULT: c('signal'), dim: c('signal-dim'), soft: 'rgb(var(--signal) / 0.12)' },
  down: { DEFAULT: c('down'), soft: 'rgb(var(--down) / 0.12)' },
}
