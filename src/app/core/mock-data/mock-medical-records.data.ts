import { Allergy, Consultation, FollowUp, LabRequest, LabResult, MockDrug, Prescription, VaccinationRecord } from '../models';

export const MOCK_CONSULTATIONS: Consultation[] = [
    {
      id: 'consult-1',
      bookingId: 'bk-007',
      patientId: 'pat-1',
      doctorId: 'doc-1',
      consultationDate: new Date(Date.now() - 86400000 * 10).toISOString().slice(0, 10),
      consultationTime: '09:30',
      chiefComplaint: 'Fever and cough',
      subjective: 'Symptoms started three days before the consultation with mild body aches.',
      objective: 'Mild congestion, afebrile, stable vital signs.',
      assessment: 'Upper respiratory tract infection',
      plan: 'Rest, hydration, medication, follow-up if symptoms persist',
      vitalSigns: {
        bloodPressureSystolic: 118,
        bloodPressureDiastolic: 76,
        heartRate: 82,
        respiratoryRate: 18,
        temperatureCelsius: 37.1,
        oxygenSaturation: 98,
        weightKg: 68,
        heightCm: 170,
        bmi: 23.5
      },
      diagnoses: [
        {
          id: 'dx-1',
          code: 'J06.9',
          description: 'Acute upper respiratory infection, unspecified',
          type: 'Primary'
        }
      ],
      prescriptionIds: ['rx-1'],
      labRequestIds: ['labreq-1'],
      followUpDate: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10),
      status: 'Completed',
      isLocked: true,
      createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 10 + 900000).toISOString(),
      historyOfPresentIllness: 'Symptoms started three days before the consultation with mild body aches.',
      peGeneralFindings: 'Mild congestion, afebrile, stable vital signs.'
    },
    {
      id: 'consult-2',
      bookingId: 'bk-010',
      patientId: 'pat-1',
      doctorId: 'doc-1',
      consultationDate: new Date(Date.now() - 86400000 * 30).toISOString().slice(0, 10),
      consultationTime: '10:15',
      chiefComplaint: 'Headache',
      subjective: 'Intermittent headache associated with poor sleep and stress.',
      objective: 'No neurologic deficit, normal hydration status.',
      assessment: 'Tension headache',
      plan: 'Pain reliever as needed and sleep hygiene',
      diagnoses: [
        {
          id: 'dx-2',
          code: 'R51.9',
          description: 'Headache, unspecified',
          type: 'Secondary'
        }
      ],
      prescriptionIds: [],
      labRequestIds: [],
      status: 'Completed',
      isLocked: true,
      createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 30 + 600000).toISOString(),
      historyOfPresentIllness: 'Intermittent headache associated with poor sleep and stress.',
      peGeneralFindings: 'No neurologic deficit, normal hydration status.'
    }
  ];

  export const MOCK_PRESCRIPTIONS: Prescription[] = [
    {
      id: 'rx-1',
      consultationId: 'consult-1',
      patientId: 'pat-1',
      doctorId: 'doc-1',
      issuedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
      prescriptionDate: new Date(Date.now() - 86400000 * 10).toISOString(),
      status: 'Active',
      notes: 'Take after meals and complete the full course.',
      items: [
        {
          id: 'rx-item-1',
          medicineName: 'Paracetamol',
          genericName: 'Paracetamol',
          dosageForm: 'Tablet',
          strength: '500 mg',
          quantity: 12,
          sig: 'Take 1 tablet every 6 hours as needed for fever.',
          frequency: 'Every 6 hours PRN',
          duration: '3 days',
          instructions: 'Take after meals.',
          isControlledSubstance: false,
          brandName: 'Biogesic'
        }
      ]
    }
  ];

  export const MOCK_ALLERGIES: Allergy[] = [
    {
      id: 'allergy-1',
      patientId: 'pat-1',
      allergen: 'Penicillin',
      reaction: 'Rash and difficulty breathing',
      severity: 'Severe',
      allergenName: 'Penicillin',
      allergenType: 'Drug',
      notes: 'Documented penicillin allergy'
    }
  ];

  export const MOCK_LAB_REQUESTS: LabRequest[] = [
    {
      id: 'labreq-1',
      consultationId: 'consult-1',
      patientId: 'pat-1',
      doctorId: 'doc-1',
      testName: 'CBC',
      reason: 'Rule out infection',
      status: 'Completed',
      requestedAt: new Date(Date.now() - 86400000 * 10).toISOString()
    }
  ];

  export const MOCK_LAB_RESULTS: LabResult[] = [
    {
      id: 'labres-1',
      labRequestId: 'labreq-1',
      patientId: 'pat-1',
      fileName: 'cbc-result.pdf',
      resultDate: new Date(Date.now() - 86400000 * 9).toISOString(),
      notes: 'Within normal range',
      consultationId: 'consult-1'
    }
  ];

  export const MOCK_VACCINATIONS: VaccinationRecord[] = [
    {
      id: 'vac-1',
      patientId: 'pat-1',
      vaccineName: 'Influenza',
      brandName: 'Fluarix',
      doseNumber: 1,
      lotNumber: 'FLU-2025-01',
      dateGiven: new Date(Date.now() - 86400000 * 120).toISOString().slice(0, 10),
      administeredBy: 'Nurse Joy',
      remarks: 'Annual flu shot'
    }
  ];

  export const MOCK_FOLLOW_UPS: FollowUp[] = [
    {
      id: 'fu-1',
      consultationId: 'consult-1',
      patientId: 'pat-1',
      doctorId: 'doc-1',
      followUpDate: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10),
      reason: 'Review symptoms and test results',
      status: 'Pending',
      reminderEnabled: true
    }
  ];

  export const MOCK_DRUG_LIST: MockDrug[] = [
    { id: 'drug-1', medicineName: 'Paracetamol', genericName: 'Paracetamol' },
    { id: 'drug-2', medicineName: 'Amoxicillin', genericName: 'Amoxicillin' },
    { id: 'drug-3', medicineName: 'Penicillin V', genericName: 'Penicillin V' },
    { id: 'drug-4', medicineName: 'Cetirizine', genericName: 'Cetirizine' },
    { id: 'drug-5', medicineName: 'Salbutamol', genericName: 'Salbutamol' },
    { id: 'drug-6', medicineName: 'Metformin', genericName: 'Metformin' },
    { id: 'drug-7', medicineName: 'Losartan', genericName: 'Losartan' },
    { id: 'drug-8', medicineName: 'Omeprazole', genericName: 'Omeprazole' }
  ];
