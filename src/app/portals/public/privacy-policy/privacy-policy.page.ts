import { NgClass, NgFor, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface PolicySection {
  id: string;
  title: string;
  icon: string;
  lines: string[];
}

@Component({
  selector: 'app-privacy-policy-page',
  standalone: true,
  imports: [NgClass, NgFor, NgIf, RouterLink],
  template: `
    <div class="page-wrap">
      <div class="content-container">
        <header class="page-header">
          <a routerLink="/public" class="back-link">&larr; Back to Home</a>
          <h1 class="page-title">Privacy Policy</h1>
          <p class="page-subtitle">How we collect, use, and protect your information.</p>
          <p class="page-updated">Last updated: May 23, 2026</p>
        </header>

        <div class="policy-section" *ngFor="let section of sections; let i = index">
          <div class="policy-section__header">
            <span class="policy-section__index">{{ i + 1 }}</span>
            <h2 class="policy-section__title">{{ section.title }}</h2>
          </div>
          <div class="policy-section__body">
            <p *ngFor="let line of section.lines" class="policy-line">{{ line }}</p>
          </div>
        </div>

        <div class="policy-footer">
          <hr class="policy-hr" />
          <p>
            If you have questions about this Privacy Policy, contact us at
            <a href="mailto:support@yourclinicdomain.com">support&#64;yourclinicdomain.com</a>.
          </p>
          <p class="policy-note">
            <strong>Note:</strong> This privacy policy is a draft template. Review by a qualified legal professional
            is strongly recommended before production use.
          </p>
          <a routerLink="/public" class="back-link">&larr; Return to Home</a>
        </div>
      </div>
    </div>
  `,
  styleUrl: './privacy-policy.page.scss',
})
export class PrivacyPolicyPage {
  readonly sections: PolicySection[] = [
    {
      id: 'information-we-collect',
      title: 'Information We Collect',
      icon: 'information-circle-outline',
      lines: [
        'We collect information you provide directly when using the Clinic Booking System. This includes your name, email address, phone number, and other personal details you enter when creating an account or booking an appointment.',
        'If you log in using Google or Facebook, we receive basic profile information from the provider — specifically your name and email address — for authentication purposes.',
        'When you book an appointment, we collect appointment details such as the date, time, doctor selected, services requested, and any notes you provide.',
        'If you upload documents or lab results through your patient portal, those files and their descriptions are stored securely.',
        'We may collect technical information automatically, such as browser type, device type, and usage patterns, to improve the application experience.',
      ],
    },
    {
      id: 'how-we-use-information',
      title: 'How We Use Information',
      icon: 'cog-outline',
      lines: [
        'Your personal information is used to create and manage your account, process appointment bookings, and communicate appointment-related updates.',
        'We use your contact information to send appointment confirmations, reminders, and status updates. With your consent, we may send health reminders and follow-up notifications.',
        'Uploaded documents and lab results are made available to you and your designated healthcare provider for clinical purposes.',
        'Aggregated, anonymized data may be used to improve clinic services, but no personally identifiable information is shared in such analysis.',
      ],
    },
    {
      id: 'social-login',
      title: 'Social Login',
      icon: 'log-in-outline',
      lines: [
        'The Clinic Booking System offers optional login through Google and Facebook. These social login options are provided solely for authentication convenience.',
        'When you choose to log in with Facebook: (a) we request access to your public profile and email address; (b) Facebook confirms your identity to us; (c) we do not post anything to your Facebook timeline, send Facebook notifications, or access your friend list.',
        'When you choose to log in with Google: (a) we request access to your name and email address; (b) Google confirms your identity to us; (c) no further Google account data is accessed.',
        'We do not share any clinic data with Google or Facebook. Your appointment details, medical documents, and other clinic information remain within our system.',
        'You may revoke social login access at any time through your account settings or directly through the respective provider\'s security settings.',
      ],
    },
    {
      id: 'uploaded-documents-and-lab-results',
      title: 'Uploaded Documents and Lab Results',
      icon: 'document-outline',
      lines: [
        'Documents and lab results you upload through the patient portal are stored using Supabase Storage, a secure cloud storage service.',
        'All uploaded files are accessed through private, time-limited signed URLs. These URLs expire after a set period and are not stored permanently in the database.',
        'Only you (the patient) and authorized clinic staff (your doctor, clinic administrators) can access your uploaded files. No third party has direct access.',
        'File access is logged for audit purposes. You can view which documents you have uploaded and when they were accessed through your patient portal.',
      ],
    },
    {
      id: 'data-storage-and-security',
      title: 'Data Storage and Security',
      icon: 'shield-checkmark-outline',
      lines: [
        'Your data is stored in Supabase, a HIPAA-compliant cloud infrastructure provider using PostgreSQL databases and secure object storage.',
        'All data transmitted between your browser and our servers is encrypted using TLS/SSL. Data at rest is encrypted.',
        'Authentication is handled through Supabase Auth, which uses secure password hashing and supports multi-factor authentication.',
        'Access to your data is controlled through Row-Level Security (RLS) policies, ensuring that you can only access your own patient data, and staff can only access data relevant to their role.',
        'We retain your personal information only as long as necessary to provide clinic services or as required by applicable law. You may request deletion of your account and associated data.',
      ],
    },
    {
      id: 'data-sharing',
      title: 'Data Sharing',
      icon: 'share-outline',
      lines: [
        'We do not sell your personal information to third parties.',
        'Your information is shared only with: (a) your designated healthcare providers for treatment purposes; (b) clinic administrative staff for operational purposes; (c) Supabase as our infrastructure provider (data processor), under strict data processing agreements.',
        'We may disclose information if required by law, such as in response to a valid court order or legal process.',
        'We do not share your information with advertisers or marketing platforms.',
      ],
    },
    {
      id: 'user-rights',
      title: 'Your Rights',
      icon: 'person-outline',
      lines: [
        'You have the right to access, update, or correct your personal information through your patient portal at any time.',
        'You may request a copy of the personal data we hold about you by contacting our support team.',
        'You may request deletion of your account and associated personal data. Note that some data may need to be retained for legal or record-keeping purposes as required by applicable healthcare regulations.',
        'You may withdraw consent for certain data processing activities (such as marketing notifications) at any time through your account settings.',
        'If you believe your data has been mishandled, you have the right to file a complaint with the applicable data protection authority.',
      ],
    },
    {
      id: 'contact',
      title: 'Contact',
      icon: 'mail-outline',
      lines: [
        'For questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact us at the email address below.',
        'We will respond to your inquiry within a reasonable timeframe.',
      ],
    },
  ];
}
