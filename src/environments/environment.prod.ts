export const environment = {
  production: true,

  // Legacy .NET API target — emptied after full Supabase migration.
  // Keep the property for TypeScript shape compatibility, but do not use it.
  apiBaseUrl: '',

  // Supabase backend.
  // Use the publishable/anon key only. Never use service_role in Ionic/Angular.
  supabaseUrl: 'https://czswgpjjanllkmmwhmdh.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6c3dncGpqYW5sbGttbXdobWRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MjY3OTYsImV4cCI6MjA5NTEwMjc5Nn0.XKv-TPuASM6SZGjH9foqsRrF5GYCWyHagMdXIP4QduQ',

  // Social login is deferred for the first Supabase FE pass.
  googleClientId: '',
  facebookAppId: '',
  facebookSdkVersion: 'v25.0',

  useMockData: false
};
