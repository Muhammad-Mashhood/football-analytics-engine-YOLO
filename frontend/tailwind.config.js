export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#121413',
        'bg-dark': '#0d0f0e',
        'bg-card': '#1a1c1b',
        'bg-elevated': '#1e201f',
        'bg-muted': '#333534',
        accent: '#00ff41',
        'accent-cyan': '#00daf3',
        'text-primary': '#e2e3e0',
        'text-secondary': '#b9ccb2',
        'text-muted': 'rgba(226,227,224,0.4)',
        'border-default': 'rgba(59,75,55,0.1)',
        'border-medium': 'rgba(59,75,55,0.2)',
        'border-strong': 'rgba(59,75,55,0.4)',
        'green-dim': 'rgba(0,255,65,0.1)',
        'green-dim2': 'rgba(0,255,65,0.2)',
        'green-dim3': 'rgba(0,255,65,0.3)',
        error: '#ffb4ab',
      },
      fontFamily: {
        heading: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"Liberation Mono"', 'monospace'],
      },
      backgroundImage: {
        'btn-primary': 'linear-gradient(135deg, #ebffe2 0%, #00ff41 100%)',
      },
      boxShadow: {
        'glow-green': '0 0 20px rgba(0,255,65,0.2)',
        'glow-green-lg': '0 24px 48px rgba(0,255,65,0.3)',
      },
    },
  },
  plugins: [],
}
