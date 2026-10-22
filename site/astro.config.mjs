import {defineConfig} from 'astro/config';

export default defineConfig({
  site: 'https://zoomedart.com',
  output: 'static',
  trailingSlash: 'always',
  devToolbar: {enabled: false},
});
