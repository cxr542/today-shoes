/** @type {import('expo/config').ExpoConfig} */
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    // GitHub Pages 프로젝트 사이트: /저장소이름/ (CI에서 EXPO_PUBLIC_BASE_PATH 설정)
    baseUrl: process.env.EXPO_PUBLIC_BASE_PATH || '/',
  },
});
