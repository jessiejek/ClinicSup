export const environment = {
  production: false,

  // Legacy .NET API target. Keep temporarily until all pages are migrated.
  apiBaseUrl: 'https://localhost:44384/api',

  // Supabase backend.
  // Use the publishable/anon key only. Never use service_role in Ionic/Angular.
  supabaseUrl: 'https://czswgpjjanllkmmwhmdh.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6c3dncGpqYW5sbGttbXdobWRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MjY3OTYsImV4cCI6MjA5NTEwMjc5Nn0.XKv-TPuASM6SZGjH9foqsRrF5GYCWyHagMdXIP4QduQ',

  // Social login is deferred for the first Supabase FE pass.
  // Leave blank so the old Google/Facebook backend-token buttons stay hidden.
  googleClientId: '',
  facebookAppId: '',
  facebookSdkVersion: 'v25.0',

  useMockData: false,

  // Explicit site URL for OAuth redirects.
  // For local dev, fall back to window.location.origin.
  siteUrl: ''
};
