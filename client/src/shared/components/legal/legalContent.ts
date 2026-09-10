export type LegalLanguage = 'en' | 'ml';

export interface LegalClause {
  id: string;
  clauseNumber: string;
  title: {
    en: string;
    ml: string;
  };
  body: {
    en: string;
    ml: string;
  };
  highlight?: {
    en: string;
    ml: string;
  };
}

export interface LegalSection {
  id: string;
  number: string;
  title: {
    en: string;
    ml: string;
  };
  subtitle: {
    en: string;
    ml: string;
  };
  iconName: 'Scale' | 'ShieldCheck' | 'Camera' | 'Car' | 'Lock' | 'Database' | 'AlertTriangle' | 'FileText' | 'Code' | 'Server';
  statutoryBadges: string[];
  clauses: LegalClause[];
}

export const LEGAL_METADATA = {
  version: '2026.1',
  lastUpdated: 'September 2026',
  effectiveDate: 'September 10, 2026',
  jurisdiction: 'Kerala, India',
  statutes: [
    'Digital Personal Data Protection Act (DPDPA), 2023',
    'Information Technology Act, 2000 (Sections 43, 43A, 65, 66, 72A)',
    'Indian Copyright Act, 1957 (Sections 14, 51, 63)',
    'Indian Contract Act, 1872 (Sections 148–181 Bailment)',
    'CERT-In Cyber Security Directions, 2022',
    'Bharatiya Nyaya Sanhita (BNS), 2023',
  ],
};

export const LEGAL_SECTIONS: LegalSection[] = [
  {
    id: 'terms-of-service',
    number: '01',
    title: {
      en: 'Platform Terms of Service & Workshop Operations',
      ml: 'പ്ലാറ്റ്‌ഫോം സേവന നിബന്ധനകളും വർക്ക്‌ഷോപ്പ് പ്രവർത്തനങ്ങളും',
    },
    subtitle: {
      en: 'Authorized garage operations, digital job cards & technician accountability',
      ml: 'അംഗീകൃത ഗാരേജ് പ്രവർത്തനങ്ങൾ, ഡിജിറ്റൽ ജോബ് കാർഡുകൾ, ടെക്നീഷ്യൻ ഉത്തരവാദിത്തം',
    },
    iconName: 'FileText',
    statutoryBadges: [
      'Indian Contract Act, 1872',
      'Information Technology Act, 2000',
      'Consumer Protection Act, 2019',
    ],
    clauses: [
      {
        id: 'tos-acceptance',
        clauseNumber: '1.1',
        title: {
          en: 'Binding Agreement & Scope of Operations',
          ml: 'കരാർ സ്വീകാര്യതയും പ്രവർത്തന പരിധിയും',
        },
        body: {
          en: 'By accessing, registering on, or utilizing the MOMZ\'Z Garage Operating Platform ("MOMZ\'Z", "the System", or "the Platform"), all workshop administrators, mechanics, service advisors, garage proprietors, and vehicle tracking users agree to be legally bound by these Terms and Conditions. This agreement forms a binding contract governed by the Indian Contract Act, 1872 and the Information Technology Act, 2000.',
          ml: 'MOMZ\'Z ഗാരേജ് ഓപ്പറേറ്റിംഗ് പ്ലാറ്റ്‌ഫോം ("MOMZ\'Z", "ഞങ്ങൾ" അല്ലെങ്കിൽ "സിസ്റ്റം") ഉപയോഗിക്കുന്നതിലൂടെയോ രജിസ്റ്റർ ചെയ്യുന്നതിലൂടെയോ, വർക്ക്‌ഷോപ്പ് ജീവനക്കാർ, മെക്കാനിക്കുകൾ, സർവീസ് ഉപദേശകർ, വാഹന ഉടമകൾ എന്നിവർ ഈ നിബന്ധനകൾ അംഗീകരിക്കുന്നു. ഈ കരാർ 1872-ലെ ഇന്ത്യൻ കരാർ നിയമത്തിനും 2000-ലെ വിവരസാങ്കേതികവിദ്യാ നിയമത്തിനും വിധേയമാണ്.',
        },
      },
      {
        id: 'tos-jobcards',
        clauseNumber: '1.2',
        title: {
          en: 'Digital Job Cards & Legal Attribution',
          ml: 'ഡിജിറ്റൽ ജോബ് കാർഡുകളും നിയമപരമായ സാധുതയും',
        },
        body: {
          en: 'All job cards, task authorizations, spare parts requisitions, vehicle condition checklists, and delivery sign-offs authored within the Platform constitute authentic electronic records under Section 65B of the Indian Evidence Act, 1872 and Section 4 of the Information Technology Act, 2000. Actions executed under an authenticated account shall be legally attributed to that user.',
          ml: 'പ്ലാറ്റ്‌ഫോമിൽ തയ്യാറാക്കുന്ന എല്ലാ ജോബ് കാർഡുകളും, സ്പെയർ പാർട്സ് ആവശ്യങ്ങളും, വാഹന പരിശോധനാ ചെക്ക്‌ലിസ്റ്റുകളും 1872-ലെ ഇന്ത്യൻ തെളിവ് നിയമം സെക്ഷൻ 65B, 2000-ലെ ഐടി നിയമം സെക്ഷൻ 4 എന്നിവ പ്രകാരം ആധികാരിക ഇലക്ട്രോണിക് രേഖകളായി പരിഗണിക്കപ്പെടുന്നു.',
        },
      },
      {
        id: 'tos-conduct',
        clauseNumber: '1.3',
        title: {
          en: 'Fair Workshop Usage & Security Protections',
          ml: 'സുരക്ഷിതമായ പ്ലാറ്റ്‌ഫോം ഉപയോഗവും സുരക്ഷയും',
        },
        body: {
          en: 'MOMZ\'Z is deployed exclusively for legitimate automotive workshop service workflows. Users are strictly prohibited from attempting unauthorized code injection, automated scraping, reverse engineering, credential sharing, or exploiting the multi-device garage sync infrastructure.',
          ml: 'MOMZ\'Z ഓട്ടോമോട്ടീവ് വർക്ക്‌ഷോപ്പ് സേവനങ്ങൾക്ക് വേണ്ടി മാത്രം രൂപകൽപ്പന ചെയ്തിട്ടുള്ളതാണ്. അംഗീകാരമില്ലാത്ത ഡാറ്റ ശേഖരണം, സിസ്റ്റം മാറ്റങ്ങൾ വരുത്തൽ, പാസ്‌വേഡ് പങ്കിടൽ അല്ലെങ്കിൽ സുരക്ഷാ ലംഘനങ്ങൾ എന്നിവ കർശനമായി നിരോധിച്ചിരിക്കുന്നു.',
        },
      },
    ],
  },
  {
    id: 'data-privacy-theft',
    number: '02',
    title: {
      en: 'Data Privacy & Strict Protection Against Data Theft',
      ml: 'ഡാറ്റാ സ്വകാര്യതയും വിവര ചോർച്ചാ വിരുദ്ധ കർശന നയവും',
    },
    subtitle: {
      en: 'DPDPA 2023 compliance, zero data resale, cryptographic security & anti-theft shield',
      ml: 'DPDPA 2023 അനുസൃതത, വിവരങ്ങൾ വിൽക്കാതിരിക്കൽ, വിവര മോഷണ സംരക്ഷണം',
    },
    iconName: 'Lock',
    statutoryBadges: [
      'Digital Personal Data Protection Act (DPDPA), 2023',
      'IT Act 2000 (Sec 43, 43A, 66, 72A)',
      'Reasonable Security Practices Rules, 2011',
    ],
    clauses: [
      {
        id: 'dpdpa-compliance',
        clauseNumber: '2.1',
        title: {
          en: 'Digital Personal Data Protection (DPDPA 2023) Compliance',
          ml: 'ഡിജിറ്റൽ വ്യക്തിഗത ഡാറ്റാ സംരക്ഷണ നിയമം (DPDPA 2023)',
        },
        body: {
          en: 'In strict conformity with the Digital Personal Data Protection Act, 2023 (DPDPA 2023), MOMZ\'Z operates as a secured Data Fiduciary / Data Processor. We collect and process personal data (including customer full name, mobile phone number, vehicle registration number, and service records) strictly on the lawful basis of contractual necessity and service fulfillment.',
          ml: '2023-ലെ ഡിജിറ്റൽ വ്യക്തിഗത ഡാറ്റാ സംരക്ഷണ നിയമം (DPDPA 2023) പൂർണ്ണമായും പാലിച്ചുകൊണ്ട് MOMZ\'Z പ്രവർത്തിക്കുന്നു. ഉപഭോക്താവിന്റെ പേര്, ഫോൺ നമ്പർ, വാഹന നമ്പർ, സർവീസ് രേഖകൾ എന്നിവ സർവീസ് ആവശ്യങ്ങൾക്കായി മാത്രം ശേഖരിക്കുകയും സംരക്ഷിക്കുകയും ചെയ്യുന്നു.',
        },
      },
      {
        id: 'anti-theft-shield',
        clauseNumber: '2.2',
        title: {
          en: 'Zero Data Resale & Strict Anti-Theft Protection',
          ml: 'ഡാറ്റ വിൽക്കില്ലെന്ന ഉറപ്പും വിവര മോഷണ വിരുദ്ധ സംരക്ഷണവും',
        },
        body: {
          en: 'MOMZ\'Z maintains an absolute Zero Data Resale and Zero Commercial Monetization policy. Customer contact records, mobile numbers, vehicle histories, and diagnostic observations are NEVER sold, rented, leased, monetized, or shared with third-party marketing brokers, advertisers, insurers, or data harvesters. Unauthorized extraction, theft, duplication, or misappropriation of workshop customer data by any employee, competitor, or external entity is strictly prohibited and constitutes a cognizable offense under Sections 43, 43A, 66, and 72A of the Information Technology Act, 2000 and the Bharatiya Nyaya Sanhita (BNS), carrying civil damages and criminal prosecution.',
          ml: 'MOMZ\'Z ഉപഭോക്താക്കളുടെ വിവരങ്ങൾ യാതൊരു കാരണവശാലും ബാഹ്യ ഏജൻസികൾക്കോ പരസ്യ കമ്പനികൾക്കോ ഇൻഷുറൻസ് സ്ഥാപനങ്ങൾക്കോ വിൽക്കുകയോ കൈമാറുകയോ ഇല്ല. ഏതെങ്കിലും ജീവനക്കാരനോ ബാഹ്യ വ്യക്തിയോ ഈ ഡാറ്റ ചോർത്തുകയോ മോഷ്ടിക്കുകയോ ചെയ്യുന്നത് 2000-ലെ ഐടി നിയമം സെക്ഷൻ 43, 66, 72A പ്രകാരവും ഇന്ത്യൻ ക്രിമിനൽ നിയമപ്രകാരവും കഠിനമായ ശിക്ഷ അർഹിക്കുന്ന കുറ്റകൃത്യമാണ്.',
        },
        highlight: {
          en: 'ZERO DATA SALE GUARANTEE: Your phone number, vehicle records, and personal identity are protected under enterprise-grade encryption and will never be commodified.',
          ml: 'ഡാറ്റാ സുരക്ഷാ ഉറപ്പ്: നിങ്ങളുടെ ഫോൺ നമ്പർ, വാഹന വിവരങ്ങൾ എന്നിവ ആർക്കും കൈമാറില്ല, പൂർണ്ണമായും എൻക്രിപ്റ്റ് ചെയ്ത് സുരക്ഷിതമായി സൂക്ഷിക്കുന്നു.',
        },
      },
      {
        id: 'security-infrastructure',
        clauseNumber: '2.3',
        title: {
          en: 'Technical Security & Cryptographic Safeguards',
          ml: 'സാങ്കേതിക സുരക്ഷയും എൻക്രിപ്ഷൻ മാനദണ്ഡങ്ങളും',
        },
        body: {
          en: 'All data transmitted across MOMZ\'Z is protected using Transport Layer Security (TLS 1.3) with cryptographic cipher suites. Stored data is hosted in high-availability, ISO 27001 and SOC 2 Type II certified cloud datacenters with automated daily database backups, distributed role-based access control (RBAC), and tamper-evident audit trails.',
          ml: 'എല്ലാ ഡാറ്റാ കൈമാറ്റങ്ങളും TLS 1.3 എൻക്രിപ്ഷൻ ഉപയോഗിച്ചാണ് നടത്തുന്നത്. ക്ലൗഡ് സ്റ്റോറേജ് ഡാറ്റാബേസ് പൂർണ്ണമായും സുരക്ഷിതവും നിശ്ചിത ജീവനക്കാർക്ക് മാത്രം പ്രവേശനം നൽകുന്ന വിധത്തിൽ ക്രമീകരിച്ചതുമാണ്.',
        },
      },
      {
        id: 'customer-rights',
        clauseNumber: '2.4',
        title: {
          en: 'Customer Data Rights & Grievance Redressal',
          ml: 'ഉപഭോക്തൃ അവകാശങ്ങളും പരാതി പരിഹാരവും',
        },
        body: {
          en: 'Under DPDPA 2023, vehicle owners and registered users hold the right to review their service history, request correction of inaccurate registration data, and seek grievance redressal. Any inquiries regarding data handling or privacy may be directed to our designated Data Protection Officer at privacy@momzz.com or by contacting the workshop administration.',
          ml: 'DPDPA 2023 നിയമപ്രകാരം ഉപഭോക്താക്കൾക്ക് തങ്ങളുടെ സർവീസ് വിവരങ്ങൾ പരിശോധിക്കാനും തെറ്റുകൾ തിരുത്താനും അവകാശമുണ്ട്. സംശയങ്ങൾക്കോ പരാതികൾക്കോ privacy@momzz.com എന്ന ഇമെയിലിൽ ബന്ധപ്പെടാവുന്നതാണ്.',
        },
      },
    ],
  },
  {
    id: 'vehicle-photos-inspection',
    number: '03',
    title: {
      en: 'Vehicle Intake & Visual Inspection Proof Policy',
      ml: 'വാഹന പരിശോധനയും ഫോട്ടോ തെളിവ് നയവും',
    },
    subtitle: {
      en: 'Tamper-evident in-image timestamps, arrival state documentation & evidentiary records',
      ml: 'മാറ്റാൻ സാധിക്കാത്ത തത്സമയ ടൈംസ്റ്റാമ്പ് ഉള്ള ഫോട്ടോകളും പരിശോധനാ രേഖകളും',
    },
    iconName: 'Camera',
    statutoryBadges: [
      'Indian Evidence Act, 1872 (Sec 65B)',
      'Bailment Protections',
      'Automotive Quality Assurance',
    ],
    clauses: [
      {
        id: 'photo-intake-purpose',
        clauseNumber: '3.1',
        title: {
          en: 'Mandatory Photographic Intake & Mutual Protection',
          ml: 'വാഹനം ഏൽപ്പിക്കുമ്പോഴുള്ള ഫോട്ടോ പരിശോധന',
        },
        body: {
          en: 'Upon arrival of any motor vehicle at the workshop, certified garage personnel conduct a multi-angle inspection using the MOMZ\'Z Camera Studio. These photographs document the cosmetic and physical state of the vehicle at intake to ensure complete transparency, establish accountability, and safeguard both vehicle owner and workshop technicians against false or pre-existing damage claims.',
          ml: 'വാഹനം വർക്ക്‌ഷോപ്പിൽ എത്തിക്കുമ്പോൾ തന്നെ വിവിധ കോണുകളിൽ നിന്നുള്ള ഫോട്ടോകൾ എടുക്കുന്നു. ഇത് വാഹനം ഏൽപ്പിക്കുമ്പോൾ നിലവിലുണ്ടായിരുന്ന പോറലുകളും തകരാറുകളും രേഖപ്പെടുത്താനും, ഉടമയ്ക്കും വർക്ക്‌ഷോപ്പിനും ഒരുപോലെ സുരക്ഷിതത്വം ഉറപ്പാക്കാനും സഹായിക്കുന്നു.',
        },
      },
      {
        id: 'tamper-evident-timestamp',
        clauseNumber: '3.2',
        title: {
          en: 'Indelible In-Image Timestamp Verification',
          ml: 'ഫോട്ടോയിൽ രേഖപ്പെടുത്തിയ മാറ്റാനാവാത്ത ടൈംസ്റ്റാമ്പ്',
        },
        body: {
          en: 'Photographs captured through the MOMZ\'Z Live Camera Inspection Studio are permanently rendered with an indelible operational watermark burned directly into the raw image pixels containing: Vehicle Registration Number, Vehicle Name/Model, Exact Local Date & Time (IST) down to the second, Inspection Tag / Remarks, and MOMZ\'Z Verification Stamp. These visual proofs cannot be modified, stripped, or tampered with after capture, ensuring unimpeachable integrity.',
          ml: 'MOMZ\'Z ലൈവ് ക്യാമറ വഴി എടുക്കുന്ന ഫോട്ടോകളിൽ വാഹന നമ്പർ, തീയതി, കൃത്യമായ സമയം (സെക്കൻഡ് ഉൾപ്പെടെ), പരിശോധനാ കുറിപ്പുകൾ എന്നിവ മാറ്റം വരുത്താൻ സാധിക്കാത്ത വിധത്തിൽ ഫോട്ടോയിൽ തന്നെ രേഖപ്പെടുത്തുന്നു. ഇത് തെറ്റായ വാദങ്ങൾ ഒഴിവാക്കാൻ തെളിവായി വർത്തിക്കുന്നു.',
        },
        highlight: {
          en: 'AUDIT PROOF INTEGRITY: Every inspection snapshot carries pixel-level burnt verification metadata that remains permanently affixed to the image file.',
          ml: 'കൃത്യമായ തെളിവ്: ഓരോ ഫോട്ടോയിലും സമയം, വാഹന നമ്പർ എന്നിവ മായ്ക്കാനാവാത്ത വിധം ചേർക്കപ്പെടുന്നു.',
        },
      },
      {
        id: 'storage-retention',
        clauseNumber: '3.3',
        title: {
          en: 'Media Retention & Cloud Storage Lifecycle',
          ml: 'ഫോട്ടോകളുടെ സൂക്ഷിപ്പും ക്ലൗഡ് സ്റ്റോറേജും',
        },
        body: {
          en: 'Inspection photographs are stored in high-security cloud storage (Cloudinary and encrypted S3 storage). Images are retained for a statutory period required for tax, warranty, insurance appraisal, and operational verification, following which obsolete temporary files are pruned in compliance with data minimization principles.',
          ml: 'പരിശോധനാ ഫോട്ടോകൾ അതീവ സുരക്ഷിതമായ ക്ലൗഡ് സംഭരണികളിൽ സൂക്ഷിക്കുന്നു. വാറന്റി, ഇൻഷുറൻസ്, നിയമപരമായ ആവശ്യങ്ങൾ എന്നിവയ്ക്കായി നിശ്ചിത കാലയളവ് വരെ ഇവ സൂക്ഷിക്കുന്നതാണ്.',
        },
      },
    ],
  },
  {
    id: 'vehicle-tracking-policy',
    number: '04',
    title: {
      en: 'Live Vehicle Service Tracking & Customer Disclosures',
      ml: 'തത്സമയ വാഹന സർവീസ് ട്രാക്കിംഗും ഉപഭോക്തൃ വിവരങ്ങളും',
    },
    subtitle: {
      en: 'Real-time job progress, stage transparency, checklist visibility & notifications',
      ml: 'ജോലി പുരോഗതി, ഘട്ടങ്ങൾ, ചെക്ക്‌ലിസ്റ്റ്, അറിയിപ്പുകൾ എന്നിവയുടെ തത്സമയ ട്രാക്കിംഗ്',
    },
    iconName: 'Car',
    statutoryBadges: [
      'Consumer Transparency',
      'Quality Service Standards',
      'Real-Time WebSocket Protocol',
    ],
    clauses: [
      {
        id: 'tracking-transparency',
        clauseNumber: '4.1',
        title: {
          en: 'Public Service Tracking System & Access Controls',
          ml: 'വാഹന ട്രാക്കിംഗ് സംവിധാനവും വിവര സുരക്ഷിതത്വവും',
        },
        body: {
          en: 'Vehicle owners may track live repair progress via our public tracking portal (/track) by entering their verified Vehicle Registration Number and authorized contact number (mobile/email). Tracking shows real-time progress across 3 stages: Pending Assessment, Work In Progress, and Ready for Delivery, alongside the completed checklist items.',
          ml: 'വാഹന ഉടമകൾക്ക് തങ്ങളുടെ രജിസ്ട്രേഷൻ നമ്പറും ഫോൺ നമ്പറും നൽകി /track എന്ന പേജിലൂടെ സർവീസ് പുരോഗതി തത്സമയം അറിയാൻ സാധിക്കും. ജോലിയുടെ ഘട്ടങ്ങളും ചെക്ക്‌ലിസ്റ്റും ഇതിലൂടെ സുതാര്യമായി കാണാം.',
        },
      },
      {
        id: 'tracking-updates',
        clauseNumber: '4.2',
        title: {
          en: 'Real-Time Status & Estimated Completion Dates',
          ml: 'തത്സമയ വിവരങ്ങളും പ്രതീക്ഷിക്കുന്ന ഡെലിവറി സമയവും',
        },
        body: {
          en: 'Estimated delivery dates displayed on the tracking screen are reasonable operational estimates subject to parts availability, unexpected internal mechanical complications discovered during dismantling, and testing protocols. Workshop staff endeavor to provide updated estimates whenever revisions are necessary.',
          ml: 'ട്രാക്കിംഗിൽ കാണിക്കുന്ന ഡെലിവറി സമയം സ്പെയർ പാർട്സുകളുടെ ലഭ്യതയ്ക്കും അറ്റകുറ്റപ്പണിയുടെ സങ്കീർണ്ണതയ്ക്കും വിധേയമായി മാറാവുന്നതാണ്. മാറ്റങ്ങൾ തത്സമയം ഉപഭോക്താവിനെ അറിയിക്കുന്നതാണ്.',
        },
      },
      {
        id: 'tracking-disclaimer',
        clauseNumber: '4.3',
        title: {
          en: 'Confidentiality of Tracking Links & Data',
          ml: 'ട്രാക്കിംഗ് ലിങ്കുകളുടെ സ്വകാര്യത',
        },
        body: {
          en: 'Vehicle owners are responsible for maintaining the confidentiality of their tracking access parameters. MOMZ\'Z will not disclose sensitive financial balances or internal workshop markup rates on the public tracking interface.',
          ml: 'ഉപഭോക്താക്കൾ തങ്ങളുടെ ട്രാക്കിംഗ് വിവരങ്ങൾ മറ്റുള്ളവരുമായി പങ്കുവെക്കാതിരിക്കാൻ ശ്രദ്ധിക്കുക. സ്വകാര്യ സാമ്പത്തിക വിവരങ്ങൾ പൊതു ട്രാക്കിംഗ് പേജിൽ പ്രദർശിപ്പിക്കുന്നതല്ല.',
        },
      },
    ],
  },
  {
    id: 'liability-bailment',
    number: '05',
    title: {
      en: 'Bailment, Pre-Existing Damage Disclaimer & Liability Shield',
      ml: 'വാഹന സൂക്ഷിപ്പ് (Bailment), മുൻകാല തകരാറുകൾ, ബാധ്യതാ പരിധി',
    },
    subtitle: {
      en: 'Indian Contract Act bailment terms, exclusion of prior defects & valuable items',
      ml: 'പഴയ പോറലുകൾക്കുള്ള ബാധ്യതാ ഒഴിവാക്കലും വിലപിടിപ്പുള്ള വസ്തുക്കളുടെ സംരക്ഷണവും',
    },
    iconName: 'ShieldCheck',
    statutoryBadges: [
      'Indian Contract Act, 1872 (Sec 148-181)',
      'Specific Relief Act, 1963',
      'Motor Vehicles Act, 1988',
    ],
    clauses: [
      {
        id: 'bailment-principles',
        clauseNumber: '5.1',
        title: {
          en: 'Legal Bailment Relationship',
          ml: 'വാഹന സൂക്ഷിപ്പ് നിയമപരമായ ബാധ്യത (Bailment)',
        },
        body: {
          en: 'Handing over a motor vehicle to the garage establishes a contract of bailment for the specific purpose of service, repair, or inspection under Section 148 of the Indian Contract Act, 1872. The workshop acts as bailee, exercising standard care as a prudent person would over their own property under Section 151, but is not an insurer of the vehicle.',
          ml: 'അറ്റകുറ്റപ്പണികൾക്കായി വാഹനം ഗാരേജിൽ ഏൽപ്പിക്കുന്നത് 1872-ലെ ഇന്ത്യൻ കരാർ നിയമം സെക്ഷൻ 148 പ്രകാരമുള്ള \'Bailment\' ആയി കണക്കാക്കപ്പെടുന്നു. ഗാരേജ് വാഹനത്തെ ന്യായമായ ശ്രദ്ധയോടെ പരിപാലിക്കുന്നതാണ്, എന്നാൽ ഇൻഷുറൻസ് കമ്പനിയായി പ്രവർത്തിക്കുന്നതല്ല.',
        },
      },
      {
        id: 'pre-existing-disclaimer',
        clauseNumber: '5.2',
        title: {
          en: 'Absolute Exclusion for Pre-Existing Scratches, Dents & Wear',
          ml: 'നേരത്തെയുള്ള പോറലുകൾക്കും കേടുപാടുകൾക്കുമുള്ള ബാധ്യതാ ഒഴിവാക്കൽ',
        },
        body: {
          en: 'Neither MOMZ\'Z nor the servicing workshop shall be held legally liable or financially responsible for any pre-existing scratches, paint swirls, stone chips, body panel dents, bumper scuffs, windshield cracks, worn suspension bushes, defective electronic sensors, or latent mechanical failures present on the vehicle prior to job card creation, as evidenced by intake photographs and inspection checklists.',
          ml: 'വാഹനം വർക്ക്‌ഷോപ്പിൽ എത്തിക്കുമ്പോൾ തന്നെയുണ്ടായിരുന്ന പോറലുകൾ, ഡെന്റുകൾ, ഗ്ലാസിലെ വിള്ളലുകൾ, മുൻകൂട്ടിയുള്ള മെക്കാനിക്കൽ അല്ലെങ്കിൽ ഇലക്ട്രിക്കൽ തകരാറുകൾ എന്നിവയ്ക്ക് വർക്ക്‌ഷോപ്പോ MOMZ\'Z പ്ലാറ്റ്‌ഫോമോ ഉത്തരവാദിയായിരിക്കില്ല. ഫോട്ടോകളിലെ തെളിവുകൾ ഇതിൽ അന്തിമമായിരിക്കും.',
        },
      },
      {
        id: 'valuables-disclaimer',
        clauseNumber: '5.3',
        title: {
          en: 'Mandatory Removal of Personal Belongings & Valuables',
          ml: 'വിലപിടിപ്പുള്ള സാധനങ്ങൾ വാഹനത്തിൽ നിന്ന് മാറ്റൽ',
        },
        body: {
          en: 'Vehicle owners are strictly instructed to remove all cash, jewelry, electronic gadgets, mobile phones, laptops, tools, dashcams, fastags, and valuable personal articles prior to admitting the vehicle to the service bay. The garage and MOMZ\'Z accept NO liability whatsoever for lost, missing, or damaged personal items left inside the vehicle.',
          ml: 'പണം, ആഭരണങ്ങൾ, മൊബൈൽ ഫോൺ, ലാപ്ടോപ്പ്, മറ്റ് വിലപിടിപ്പുള്ള സാധനങ്ങൾ എന്നിവ വാഹനം ഏൽപ്പിക്കുന്നതിന് മുൻപായി വാഹനത്തിൽ നിന്നും മാറ്റേണ്ടതാണ്. വാഹനത്തിൽ സൂക്ഷിക്കുന്ന സാധനങ്ങൾ നഷ്ടപ്പെട്ടാൽ വർക്ക്‌ഷോപ്പ് ഉത്തരവാദിയായിരിക്കില്ല.',
        },
      },
      {
        id: 'liability-cap',
        clauseNumber: '5.4',
        title: {
          en: 'Limitation of Liability & Jurisdiction',
          ml: 'ബാധ്യതാ പരിധിയും നിയമപരിധിയും',
        },
        body: {
          en: 'To the maximum extent permitted by applicable Indian laws, the cumulative aggregate liability of the workshop enterprise and MOMZ\'Z software for any claims arising under or related to vehicle servicing or platform usage shall be strictly capped at the direct labor invoice amount paid for that specific service job card. All disputes shall be subject to the exclusive jurisdiction of the competent courts in Kerala, India.',
          ml: 'നിയമാനുസൃതമായ പരമാവധി പരിധിയിൽ, ഏതെങ്കിലും തർക്കങ്ങളിലെ ബാധ്യത ആ പ്രത്യേക സർവീസിന് നൽകിയ ലേബർ നിരക്കിൽ മാത്രമായി പരിമിതപ്പെടുത്തിയിരിക്കുന്നു. എല്ലാ നിയമപരമായ തർക്കങ്ങളും കേരളത്തിലെ കോടതികളുടെ അധികാരപരിധിക്ക് വിധേയമായിരിക്കും.',
        },
      },
    ],
  },
  {
    id: 'anti-reverse-engineering',
    number: '06',
    title: {
      en: 'Software Intellectual Property & Anti-Reverse Engineering Shield',
      ml: 'സോഫ്റ്റ്‌വെയർ ബൗദ്ധിക സ്വത്തവകാശവും റിവേഴ്സ് എഞ്ചിനീയറിംഗ് വിരുദ്ധ സംരക്ഷണവും',
    },
    subtitle: {
      en: 'Absolute prohibition of source code extraction, decompilation, scraping, cloning & trade-secret misappropriation',
      ml: 'സോഴ്സ് കോഡ് ചോർത്തൽ, ഡീകംപൈലേഷൻ, അനധികൃത പകർത്തൽ എന്നിവയ്‌ക്കെതിരെയുള്ള കർശന നിയമ സംരക്ഷണം',
    },
    iconName: 'Code',
    statutoryBadges: [
      'Indian Copyright Act, 1957 (Sec 14, 51, 63)',
      'IT Act 2000 (Sec 43, 65, 66)',
      'Bharatiya Nyaya Sanhita (Trade Secrets)',
    ],
    clauses: [
      {
        id: 'proprietary-ownership',
        clauseNumber: '6.1',
        title: {
          en: 'Exclusive Proprietary Ownership & Trade Secrets',
          ml: 'പൂർണ്ണ ഉടമസ്ഥാവകാശവും വ്യാപാര രഹസ്യങ്ങളും',
        },
        body: {
          en: 'The MOMZ\'Z garage operating platform, including its source code, object code, API architecture, frontend layouts, database schemas, camera watermarking algorithms, real-time sync systems, workflows, graphics, and trade dress, is the exclusive proprietary intellectual property of MOMZ\'Z Auto Garage and its licensors. All rights not expressly granted herein are strictly reserved under the Indian Copyright Act, 1957.',
          ml: 'MOMZ\'Z സോഫ്റ്റ്‌വെയറിന്റെ സോഴ്സ് കോഡ്, ആപ്ലിക്കേഷൻ രൂപകൽപ്പന, ഡാറ്റാബേസ് ഘടന, ക്യാമറ വാട്ടർമാർക്കിംഗ് സംവിധാനങ്ങൾ എന്നിവ MOMZ\'Z-ന്റെ പൂർണ്ണ ബൗദ്ധിക സ്വത്തവകാശമാണ്. ഇതിന്റെ പകർപ്പവകാശം 1957-ലെ ഇന്ത്യൻ പകർപ്പവകാശ നിയമപ്രകാരം പൂർണ്ണമായും സംരക്ഷിക്കപ്പെട്ടിരിക്കുന്നു.',
        },
      },
      {
        id: 'no-reverse-engineering',
        clauseNumber: '6.2',
        title: {
          en: 'Strict Prohibition Against Reverse Engineering & Decompilation',
          ml: 'റിവേഴ്സ് എഞ്ചിനീയറിംഗും കോഡ് ചോർത്തലും കർശനമായി നിരോധിച്ചിരിക്കുന്നു',
        },
        body: {
          en: 'Users, technicians, administrators, competitors, and third parties are strictly prohibited from: (a) reverse engineering, decompiling, disassembling, or attempting to derive the source code or underlying architecture of the Platform; (b) inspecting, dumping, or extracting production client bundles, JavaScript bytecode, or internal API contracts; (c) duplicating, cloning, or creating derivative works of the garage management logic; or (d) bypassing, neutralizing, or tampering with digital rights management, security tokens, or authentication controls.',
          ml: 'ആപ്ലിക്കേഷൻ റിവേഴ്സ് എഞ്ചിനീയറിംഗ് ചെയ്യുക, ഡീകംപൈൽ ചെയ്ത് സോഴ്സ് കോഡ് വേർതിരിച്ചെടുക്കാൻ ശ്രമിക്കുക, സെക്യൂരിറ്റി ടോക്കണുകൾ മറികടക്കുക, അല്ലെങ്കിൽ ഈ സിസ്റ്റം അനുകരിച്ച് മറ്റൊരു സംവിധാനം നിർമ്മിക്കുക എന്നിവ കർശനമായി നിരോധിച്ചിരിക്കുന്നു.',
        },
        highlight: {
          en: 'NON-DISASSEMBLY SHIELD: Any attempt to decompile, probe, scrape, or extract source code constitutes a direct violation of Section 65 of the IT Act, 2000 and the Indian Copyright Act.',
          ml: 'സോഴ്സ് കോഡ് സംരക്ഷണം: കോഡ് വേർതിരിച്ചെടുക്കാനോ മോഷ്ടിക്കാനോ ഉള്ള ശ്രമങ്ങൾ ഗുരുതരമായ ക്രിമിനൽ കുറ്റമായി കണക്കാക്കും.',
        },
      },
      {
        id: 'no-scraping-automation',
        clauseNumber: '6.3',
        title: {
          en: 'Prohibition of Automated Scraping & Unauthorized Access',
          ml: 'ഓട്ടോമേറ്റഡ് സ്ക്രാപ്പിംഗും അനധികൃത പ്രവേശനവും തടയൽ',
        },
        body: {
          en: 'No bot, spider, scraper, crawler, deep-link, or automated scripting tool may be utilized to access, monitor, query, harvest, or replicate any content, vehicle data, client lists, or spare parts catalogues hosted on the Platform. Automated rate-limiting, IP blocking, and firewall countermeasures are deployed to neutralize unauthorized access attempts.',
          ml: 'ഓട്ടോമേറ്റഡ് ബോട്ടുകൾ അല്ലെങ്കിൽ സ്ക്രാപ്പർ ടൂളുകൾ ഉപയോഗിച്ച് പ്ലാറ്റ്‌ഫോമിലെ ഡാറ്റ, ഫോട്ടോകൾ, വില വിവരങ്ങൾ എന്നിവ ശേഖരിക്കുന്നത് പൂർണ്ണമായും വിലക്കിയിരിക്കുന്നു.',
        },
      },
      {
        id: 'remedies-prosecution',
        clauseNumber: '6.4',
        title: {
          en: 'Civil Injunctions, Criminal Prosecution & Liquidated Damages',
          ml: 'സിവിൽ നഷ്ടപരിഹാരവും ക്രിമിനൽ നിയമനടപടികളും',
        },
        body: {
          en: 'Any violation of this Section 06 causes irreparable harm for which monetary damages alone would be inadequate. MOMZ\'Z reserves the right to seek emergency ex-parte injunctive relief from competent courts, initiate criminal complaints under Sections 43 and 66 of the IT Act, 2000 and Section 63 of the Copyright Act, 1957 (punishable with imprisonment up to 3 years and substantial fines), and claim comprehensive liquidated damages, including recovery of forensic investigation expenses and legal costs.',
          ml: 'ഈ ബൗദ്ധിക സ്വത്തവകാശ ലംഘനങ്ങൾ ഉണ്ടായാൽ കോടതി വഴി ഉടനടി വിലക്ക് (Injunction) വാങ്ങുന്നതിനും, ഐടി നിയമം സെക്ഷൻ 66, പകർപ്പവകാശ നിയമം സെക്ഷൻ 63 എന്നിവ പ്രകാരം തടവുശിക്ഷയും പിഴയും ഉൾപ്പെടെയുള്ള ക്രിമിനൽ കേസുകൾ ഫയൽ ചെയ്യുന്നതിനും കമ്പനിക്ക് പൂർണ്ണ അവകാശമുണ്ടായിരിക്കും.',
        },
      },
    ],
  },
  {
    id: 'technical-security-compromise',
    number: '07',
    title: {
      en: 'Technical Security Protocols & Security Compromise Liability Shield',
      ml: 'സാങ്കേതിക സുരക്ഷാ മാനദണ്ഡങ്ങളും സുരക്ഷാ വീഴ്ചാ ബാധ്യതാ സംരക്ഷണവും',
    },
    subtitle: {
      en: 'Reasonable security practices, zero-day & upstream infrastructure shield, incident reporting under CERT-In',
      ml: 'ഐടി സുരക്ഷാ രീതികൾ, ക്ലൗഡ് തകരാറുകൾക്കുള്ള ബാധ്യതാ പരിധി, സൈബർ സുരക്ഷാ മാനദണ്ഡങ്ങൾ',
    },
    iconName: 'Server',
    statutoryBadges: [
      'IT Act 2000 (Sec 43A - Reasonable Security)',
      'SPDI Rules, 2011',
      'CERT-In Cybersecurity Directions, 2022',
      'DPDPA 2023 Security Norms',
    ],
    clauses: [
      {
        id: 'security-standards',
        clauseNumber: '7.1',
        title: {
          en: 'Reasonable Security Practices & Cryptographic Protocols',
          ml: 'ന്യായമായ സുരക്ഷാ സംവിധാനങ്ങളും എൻക്രിപ്ഷനും',
        },
        body: {
          en: 'MOMZ\'Z maintains reasonable security practices and procedures in strict accordance with Section 43A of the Information Technology Act, 2000 and the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011. Measures include end-to-end HTTPS/TLS 1.3 encryption, salted bcrypt password hashing, encrypted JWT tokens with short expiry, Redis token revocation blacklists, rate-limiting, and sanitized SQL/NoSQL querying to prevent injection attacks.',
          ml: '2000-ലെ ഐടി നിയമം സെക്ഷൻ 43A നിർദ്ദേശിക്കുന്ന എല്ലാ സുരക്ഷാ മാനദണ്ഡങ്ങളും പ്ലാറ്റ്‌ഫോം കർശനമായി പാലിക്കുന്നു. പാസ്‌വേഡുകൾ എൻക്രിപ്റ്റ് ചെയ്തും, സുരക്ഷിതമായ ടോക്കണുകൾ ഉപയോഗിച്ചും ഉപയോക്താക്കളുടെ വിവരങ്ങൾ സംരക്ഷിക്കുന്നു.',
        },
      },
      {
        id: 'compromise-shield',
        clauseNumber: '7.2',
        title: {
          en: 'Zero-Day, Upstream Outages & Security Compromise Liability Shield',
          ml: 'സീറോ-ഡേ ആക്രമണങ്ങൾ, ക്ലൗഡ് തകരാറുകൾ എന്നിവയ്ക്കുള്ള സംരക്ഷണം',
        },
        body: {
          en: 'While MOMZ\'Z implements industry-standard security safeguards, no digital system, internet transmission, or cloud environment is completely impenetrable. MOMZ\'Z, its directors, developers, and partners shall NOT be held liable for: (a) zero-day vulnerabilities in third-party software, libraries, operating systems, or hardware chips; (b) upstream outages or catastrophic failures of third-party cloud hosting providers (e.g., AWS, MongoDB Atlas, Cloudinary, telecom carriers); (c) state-sponsored cyber warfare, distributed denial-of-service (DDoS) assaults, or sophisticated Advanced Persistent Threats (APTs) exceeding reasonable commercial defensive standards; or (d) unauthorized access resulting from compromised end-user devices, malware on user phones, or unpatched user operating systems.',
          ml: 'വ്യവസായ മാനദണ്ഡങ്ങൾ അനുസരിച്ചുള്ള പരമാവധി സുരക്ഷ ഏർപ്പെടുത്തിയിട്ടുണ്ടെങ്കിലും, ആഗോള ക്ലൗഡ് സെർവർ തകരാറുകൾ (AWS, MongoDB Atlas മുതലായവ), പുതിയ ഇന്റർനെറ്റ് വൈറസ്/മാൽവെയർ ആക്രമണങ്ങൾ (Zero-Day), അല്ലെങ്കിൽ ഉപയോക്താവിന്റെ ഫോണിലെ വൈറസുകൾ കാരണം സംഭവിക്കുന്ന സുരക്ഷാ വീഴ്ചകൾക്ക് MOMZ\'Z ബാധ്യസ്ഥമായിരിക്കില്ല.',
        },
        highlight: {
          en: 'UPSTREAM & FORCE MAJEURE DISCLAIMER: In the event of unforeseen cyber intrusions where commercially reasonable security standards were in place, our liability is strictly limited as permitted under Section 43A of the IT Act.',
          ml: 'സുരക്ഷാ പരിധി: ന്യായമായ സുരക്ഷ മുൻകരുതലുകൾ എടുത്തിട്ടുള്ള സാഹചര്യത്തിൽ, അപ്രതീക്ഷിത ബാഹ്യ സൈബർ ആക്രമണങ്ങൾക്ക് നിയമപരമായ ബാധ്യതാ പരിരക്ഷ ഉണ്ടായിരിക്കുന്നതാണ്.',
        },
      },
      {
        id: 'certin-disclosure',
        clauseNumber: '7.3',
        title: {
          en: 'Incident Notification & CERT-In Protocol Compliance',
          ml: 'സൈബർ സുരക്ഷാ സംഭവങ്ങളുടെ റിപ്പോർട്ടിംഗും അറിയിപ്പുകളും',
        },
        body: {
          en: 'In the event of a verified cybersecurity breach or unauthorized data exfiltration affecting user data, MOMZ\'Z will promptly take remedial measures to contain the vulnerability, notify competent statutory authorities (including the Indian Computer Emergency Response Team - CERT-In under Cyber Security Directions 2022), and provide transparent guidance and mitigation advisories to affected stakeholders.',
          ml: 'എപ്പോഴെങ്കിലും ഏതെങ്കിലും തരത്തിലുള്ള സൈബർ സുരക്ഷാ വീഴ്ച ഉണ്ടായാൽ, ഉടനടി അത് തടയാനുള്ള നടപടികൾ സ്വീകരിക്കുകയും, കേന്ദ്ര സർക്കാർ ഏജൻസിയായ CERT-In ന് നിർദ്ദിഷ്ട സമയത്തിനുള്ളിൽ റിപ്പോർട്ട് ചെയ്യുകയും ചെയ്യുന്നതാണ്.',
        },
      },
      {
        id: 'user-security-duty',
        clauseNumber: '7.4',
        title: {
          en: 'User Duty of Credential Hygiene & Session Management',
          ml: 'ഉപയോക്താവിന്റെ പാസ്‌വേഡ് സുരക്ഷാ ഉത്തരവാദിത്തം',
        },
        body: {
          en: 'Each user is solely responsible for maintaining the absolute confidentiality of their login credentials, safeguarding their physical mobile device, ensuring secure lock-screens, and immediately executing a session sign-out upon leaving a workshop terminal unattended. Users must report any suspected credential compromise or unauthorized access to workshop management immediately at security@momzz.com.',
          ml: 'ഉപയോക്താക്കൾ തങ്ങളുടെ പാസ്‌വേഡ് രഹസ്യമായി സൂക്ഷിക്കേണ്ടതും വർക്ക്‌ഷോപ്പ് കമ്പ്യൂട്ടറുകൾ വിടുമ്പോൾ ലോഗൗട്ട് ചെയ്യേണ്ടതുമാണ്. പാസ്‌വേഡ് മറ്റുള്ളവർക്ക് നൽകുന്നത് കാരണം ഉണ്ടാകുന്ന നഷ്ടങ്ങൾക്ക് ഉപയോക്താവ് തന്നെ ഉത്തരവാദിയായിരിക്കും.',
        },
      },
    ],
  },
];
