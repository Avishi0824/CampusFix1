
module.exports = ({ config }) => {
  return {
    ...config,
    scheme: config?.scheme || 'campusfix',
    android: {
      ...config?.android,
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON || './google-services.json',
    },
    extra: {
      ...config?.extra,
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    },
  };
};

