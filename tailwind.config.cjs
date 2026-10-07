module.exports = {
  content: ['./*.php', './app/Support/*.php', './assets/js/*.js'],
  prefix: 'tw-',
  important: true,
  corePlugins: { preflight: false },
  theme: { extend: { colors: { ink: '#11224D', muted: '#697284', line: '#dfe3e9', paper: '#F8F9FA', amber: { ...require('tailwindcss/colors').amber, DEFAULT: '#B86B16' }, positive: '#2A603B' } } },
  plugins: [require('tailwindcss/plugin')(({ addUtilities }) => {
    // Border utilities also declare a style because the shared shell has no Tailwind reset.
    addUtilities({
      '.border': { borderStyle: 'solid' },
      '.border-t': { borderWidth: '0', borderTopWidth: '1px', borderTopStyle: 'solid' },
      '.border-b': { borderWidth: '0', borderBottomWidth: '1px', borderBottomStyle: 'solid' }
    });
  })]
};
