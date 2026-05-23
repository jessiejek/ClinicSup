import { Service } from '../models';

export const MOCK_SERVICES: Service[] = [
    {
      id: 'svc-1',
      name: 'General Consultation',
      category: 'Consultation',
      price: 0,
      estimatedDurationMinutes: 30,
      doctorIds: ['doc-1', 'doc-4', 'doc-5', 'doc-6', 'doc-7', 'doc-8', 'doc-9', 'doc-10', 'doc-11', 'doc-12', 'doc-13']
    },
    {
      id: 'svc-2',
      name: 'Pediatric Checkup',
      category: 'Consultation',
      price: 0,
      estimatedDurationMinutes: 30,
      doctorIds: ['doc-2']
    },
    {
      id: 'svc-3',
      name: 'Prenatal Checkup',
      category: 'Consultation',
      price: 0,
      estimatedDurationMinutes: 30,
      doctorIds: ['doc-3']
    },
    {
      id: 'svc-4',
      name: 'Annual Physical Exam',
      category: 'Procedure',
      price: 1000,
      estimatedDurationMinutes: 60,
      doctorIds: ['doc-1', 'doc-4', 'doc-6', 'doc-9', 'doc-10']
    },
    {
      id: 'svc-5',
      name: 'Wound Dressing',
      category: 'Procedure',
      price: 200,
      estimatedDurationMinutes: 15,
      doctorIds: ['doc-1', 'doc-2']
    },
    {
      id: 'svc-6',
      name: 'CBC',
      category: 'Laboratory',
      price: 350,
      estimatedDurationMinutes: 15,
      doctorIds: ['doc-1', 'doc-2', 'doc-3', 'doc-4', 'doc-6', 'doc-9', 'doc-10']
    },
    {
      id: 'svc-7',
      name: 'Urinalysis',
      category: 'Laboratory',
      price: 150,
      estimatedDurationMinutes: 15,
      doctorIds: ['doc-1', 'doc-2', 'doc-3', 'doc-4', 'doc-6', 'doc-9', 'doc-10']
    },
    {
      id: 'svc-8',
      name: 'Fasting Blood Sugar',
      category: 'Laboratory',
      price: 200,
      estimatedDurationMinutes: 15,
      doctorIds: ['doc-1', 'doc-3', 'doc-4', 'doc-9']
    },
    {
      id: 'svc-9',
      name: 'Chest X-Ray',
      category: 'Diagnostic',
      price: 500,
      estimatedDurationMinutes: 20,
      doctorIds: ['doc-1', 'doc-10']
    },
    {
      id: 'svc-10',
      name: 'Abdominal Ultrasound',
      category: 'Diagnostic',
      price: 800,
      estimatedDurationMinutes: 30,
      doctorIds: ['doc-1', 'doc-3']
    }
  ];
