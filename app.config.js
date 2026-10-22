// Build-time configuration on top of app.json, so nothing environment-specific is committed:
//   EXPO_PUBLIC_API_URL  API base URL (default: production API in app.json)
//   EAS_PROJECT_ID       EAS project id for push notifications (from `eas init`); without it push
//                        registration is skipped and the app says so (lib/push.ts).
module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...(config.extra || {}),
    apiUrl: process.env.EXPO_PUBLIC_API_URL || (config.extra && config.extra.apiUrl),
    eas: {
      ...((config.extra && config.extra.eas) || {}),
      ...(process.env.EAS_PROJECT_ID ? { projectId: process.env.EAS_PROJECT_ID } : {}),
    },
  },
});
