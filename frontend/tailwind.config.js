export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#070b0a',
        'bg-dark': '#050706',
        'bg-card': '#101513',
        'bg-elevated': '#171d1b',
        'bg-muted': '#2a3330',
        accent: '#19ff75',
        'accent-cyan': '#6ee8ff',
        'text-primary': '#ecf2ef',
        'text-secondary': '#b6c9c0',
        'text-muted': 'rgba(236,242,239,0.45)',
        'border-default': 'rgba(71,106,88,0.2)',
        'border-medium': 'rgba(71,106,88,0.35)',
        'border-strong': 'rgba(71,106,88,0.55)',
        'green-dim': 'rgba(25,255,117,0.12)',
        'green-dim2': 'rgba(25,255,117,0.2)',
        'green-dim3': 'rgba(25,255,117,0.35)',
        error: '#ffb4ab',
      },
      fontFamily: {
        heading: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"Liberation Mono"', 'monospace'],
      },
      backgroundImage: {
        'btn-primary': 'linear-gradient(135deg, #a5ffca 0%, #19ff75 100%)',
      },
      boxShadow: {
        'glow-green': '0 0 24px rgba(25,255,117,0.35)',
        'glow-green-lg': '0 24px 56px rgba(25,255,117,0.35)',
      },
    },
  },
  plugins: [],
}
