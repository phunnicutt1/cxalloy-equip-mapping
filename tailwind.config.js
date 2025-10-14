module.exports = {
    content: ['./lib/**/*.{ts,tsx,js,jsx}'],
    prefix: 'tw-',                 // avoids collisions with host CSS
    corePlugins: { preflight: false }, // skip global reset in host page
  };
  