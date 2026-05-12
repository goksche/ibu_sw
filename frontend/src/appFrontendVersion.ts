/** Build-Version (Vite `define` aus package.json / npm_package_version). */
export const FRONTEND_BUILD_VERSION: string =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.8.0';
