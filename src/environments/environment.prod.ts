export const environment = {
  production: true,

  // .NET backend API URL (production)
  apiUrl: 'https://api.yourclinicdomain.com/api',

  // Legacy alias
  apiBaseUrl: 'https://api.yourclinicdomain.com/api',

  // Supabase backend.
  // Use the publishable/anon key only. Never use service_role in Ionic/Angular.
  supabaseUrl: 'https://czswgpjjanllkmmwhmdh.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6c3dncGpqYW5sbGttbXdobWRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MjY3OTYsImV4cCI6MjA5NTEwMjc5Nn0.XKv-TPuASM6SZGjH9foqsRrF5GYCWyHagMdXIP4QduQ',

  // Social login is deferred for the first Supabase FE pass.
  googleClientId: '',
  facebookAppId: '',
  facebookSdkVersion: 'v25.0',

  useMockData: false,

  // Explicit site URL for OAuth redirects.
  // On Vercel this must be the production domain, not localhost.
  siteUrl: 'https://clinic-sup.vercel.app',

  // Firebase web app config. These values come from the Firebase console.
  firebaseApiKey: 'AIzaSyCVm5aOHRMHAdtMmz832xc0z0hhI-Liwzk',
  firebaseAuthDomain: 'clinic-sup.firebaseapp.com',
  firebaseProjectId: 'clinic-sup',
  firebaseStorageBucket: 'clinic-sup.firebasestorage.app',
  firebaseMessagingSenderId: '506032600761',
  firebaseAppId: '1:506032600761:web:98c9a57fe34b4b48f14d68',
  firebaseMeasurementId: '',

  // Firebase Web Push certificate public key.
  firebaseVapidKey: 'BExXCzlTCn-xp4NBupxcCIpWUroylfgE_Yb3os2MkeZEl2phVDo8HDyx4xQ9pgkxOgGwAsnzVU2c70YiBwkPcqM',
  vapidKey: 'BMJf90oxjKHvMY9J7pRHfpprVCaqoL0few-R-7nWaB6MvUKSFcfqN2e-27U9DHU5LBCeF-EtOMpjZtBT6eEdlwo'
};
