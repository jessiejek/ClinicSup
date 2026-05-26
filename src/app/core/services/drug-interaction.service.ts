import { Injectable, inject } from '@angular/core';
import { Observable, catchError, from, map, of } from 'rxjs';
import { Allergy, PrescriptionItem } from '../models';
import { ApiService } from './api.service';

export interface DrugAllergyConflict {
  conflict: boolean;
  allergyName?: string;
  message?: string;
  unavailable?: boolean;
  source: 'local' | 'api' | 'cache';
}

export interface DrugInteractionWarning {
  medicineKey: string;
  medicineName: string;
  existingDrugName: string;
  severity: 'amber' | 'red';
  summary: string;
  details: string;
}

export interface DrugInteractionResult {
  unavailable: boolean;
  warnings: DrugInteractionWarning[];
  source: 'local' | 'api' | 'cache';
}

@Injectable({ providedIn: 'root' })
export class DrugInteractionService {
  private readonly api = inject(ApiService);
  private readonly allergyCache = new Map<string, DrugAllergyConflict>();
  private readonly interactionCache = new Map<string, DrugInteractionResult>();

  checkAllergyConflict(drugName: string, allergies: Allergy[]): Observable<DrugAllergyConflict> {
    const normalizedDrug = normalizeText(drugName);
    const cacheKey = `${normalizedDrug}|${allergies.map((allergy) => `${allergy.allergen}|${allergy.allergenName ?? ''}|${allergy.allergenType ?? ''}`).join('~')}`;

    const cached = this.allergyCache.get(cacheKey);
    if (cached) {
      return of({ ...cached, source: 'cache' });
    }

    const localConflict = findLocalAllergyConflict(drugName, allergies);
    if (localConflict) {
      const conflict: DrugAllergyConflict = {
        conflict: true,
        allergyName: localConflict.allergyName,
        message: `Allergy Alert - ${drugName} matches a recorded allergy: ${localConflict.allergyName}. Review before adding.`,
        source: 'local'
      };
      this.allergyCache.set(cacheKey, conflict);
      return of(conflict);
    }

    return from(
      this.api.post<UnknownAllergyCheckResponse>('/drug-interactions/allergy-check', {
        drugName,
        allergies
      })
    ).pipe(
      map((response) => {
        const normalized = normalizeAllergyResponse(response);
        this.allergyCache.set(cacheKey, normalized);
        return normalized;
      }),
      catchError(() =>
        of<DrugAllergyConflict>({
          conflict: false,
          unavailable: true,
          source: 'api',
          message: 'Drug-allergy check unavailable - verify manually before prescribing'
        })
      )
    );
  }

  checkDrugInteractions(items: PrescriptionItem[]): Observable<DrugInteractionResult> {
    const cacheKey = items
      .map((item) => [item.id, item.medicineName, item.genericName ?? '', item.route ?? '', item.frequency ?? '', item.strength ?? ''].join('|'))
      .join('~');

    const cached = this.interactionCache.get(cacheKey);
    if (cached) {
      return of({ ...cached, source: 'cache' });
    }

    const localWarnings = findLocalInteractionWarnings(items);
    if (localWarnings.length > 0) {
      const result: DrugInteractionResult = {
        unavailable: false,
        warnings: localWarnings,
        source: 'local'
      };
      this.interactionCache.set(cacheKey, result);
      return of(result);
    }

    return from(
      this.api.post<UnknownInteractionCheckResponse>('/drug-interactions/check', {
        drugs: items.map((item) => ({
          medicineName: item.medicineName,
          genericName: item.genericName ?? null,
          strength: item.strength ?? null,
          route: item.route ?? null,
          frequency: item.frequency ?? null
        }))
      })
    ).pipe(
      map((response) => {
        const result = normalizeInteractionResponse(response, items);
        this.interactionCache.set(cacheKey, result);
        return result;
      }),
      catchError(() =>
        of<DrugInteractionResult>({
          unavailable: true,
          warnings: [],
          source: 'api'
        })
      )
    );
  }
}

interface UnknownAllergyCheckResponse {
  conflict?: boolean;
  allergyName?: string;
  allergy?: string;
  message?: string;
  unavailable?: boolean;
}

interface UnknownInteractionCheckResponse {
  unavailable?: boolean;
  warnings?: Array<{
    medicineName?: string;
    existingDrugName?: string;
    existingDrug?: string;
    severity?: 'amber' | 'red' | string;
    summary?: string;
    details?: string;
    medicineKey?: string;
  }>;
}

function normalizeAllergyResponse(response: UnknownAllergyCheckResponse): DrugAllergyConflict {
  const conflict = Boolean(response.conflict);
  return {
    conflict,
    allergyName: response.allergyName ?? response.allergy ?? undefined,
    message: response.message,
    unavailable: Boolean(response.unavailable),
    source: 'api'
  };
}

function normalizeInteractionResponse(response: UnknownInteractionCheckResponse, items: PrescriptionItem[]): DrugInteractionResult {
  const warnings = (response.warnings ?? [])
    .map((warning, index): DrugInteractionWarning => ({
      medicineKey: warning.medicineKey ?? items[index]?.id ?? items[index]?.medicineName ?? `rx-${index}`,
      medicineName: warning.medicineName ?? items[index]?.medicineName ?? 'Medicine',
      existingDrugName: warning.existingDrugName ?? warning.existingDrug ?? 'Another medication',
      severity: warning.severity === 'red' ? 'red' : 'amber',
      summary: warning.summary ?? `Interaction with ${warning.existingDrugName ?? warning.existingDrug ?? 'another medication'}`,
      details: warning.details ?? 'Review severity, mechanism, and patient-specific risk before prescribing.'
    }))
    .filter((warning) => Boolean(warning.medicineName));

  return {
    unavailable: Boolean(response.unavailable),
    warnings,
    source: 'api'
  };
}

function findLocalAllergyConflict(drugName: string, allergies: Allergy[]): { allergyName: string } | null {
  const drug = normalizeText(drugName);
  if (!drug) {
    return null;
  }

  const drugClass = getDrugClass(drug);
  for (const allergy of allergies) {
    const allergenName = normalizeText([allergy.allergen, allergy.allergenName ?? ''].join(' '));
    if (!allergenName) {
      continue;
    }

    if (drug.includes(allergenName) || allergenName.includes(drug)) {
      return { allergyName: allergy.allergenName ?? allergy.allergen };
    }

    const allergenClass = normalizeText(allergy.allergenType ?? '');
    if (allergenClass && drugClass && allergenClass === drugClass) {
      return { allergyName: allergy.allergenName ?? allergy.allergen };
    }

    if (allergenClass && drugClass && allergenClass.includes(drugClass)) {
      return { allergyName: allergy.allergenName ?? allergy.allergen };
    }

    if (drugClass && allergenName.includes(drugClass)) {
      return { allergyName: allergy.allergenName ?? allergy.allergen };
    }
  }

  return null;
}

function findLocalInteractionWarnings(items: PrescriptionItem[]): DrugInteractionWarning[] {
  const warnings: DrugInteractionWarning[] = [];

  for (let i = 0; i < items.length; i++) {
    const current = items[i];
    const currentDrug = normalizeText([current.medicineName, current.genericName ?? ''].join(' '));
    const currentClass = getDrugClass(currentDrug);
    if (!currentDrug) {
      continue;
    }

    for (let j = 0; j < i; j++) {
      const existing = items[j];
      const existingDrug = normalizeText([existing.medicineName, existing.genericName ?? ''].join(' '));
      const existingClass = getDrugClass(existingDrug);
      const isKnownInteraction =
        (currentClass && existingClass && currentClass === existingClass) ||
        (currentDrug.includes(existingDrug) || existingDrug.includes(currentDrug));

      if (!isKnownInteraction) {
        continue;
      }

      warnings.push({
        medicineKey: current.id || current.medicineName,
        medicineName: current.medicineName,
        existingDrugName: existing.medicineName,
        severity: 'amber',
        summary: `Interaction with ${existing.medicineName}`,
        details: `A potential ${currentClass || 'drug'} interaction was detected between ${current.medicineName} and ${existing.medicineName}. Review dose, timing, and patient-specific risk before prescribing.`
      });
      break;
    }
  }

  return warnings;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getDrugClass(value: string): string {
  const text = normalizeText(value);
  if (!text) {
    return '';
  }

  const classMap: Array<[string[], string]> = [
    [['amoxicillin', 'ampicillin', 'penicillin', 'co amoxiclav', 'amox'], 'penicillin'],
    [['cephalexin', 'cefuroxime', 'cef', 'ceph'], 'cephalosporin'],
    [['azithromycin', 'clarithromycin', 'erythromycin'], 'macrolide'],
    [['ciprofloxacin', 'levofloxacin', 'moxifloxacin'], 'fluoroquinolone'],
    [['ibuprofen', 'mefenamic', 'naproxen', 'diclofenac', 'celecoxib', 'aspirin'], 'nsaid'],
    [['tramadol', 'codeine'], 'opioid'],
    [['prednisone', 'dexamethasone', 'hydrocortisone'], 'steroid']
  ];

  for (const [tokens, cls] of classMap) {
    if (tokens.some((token) => text.includes(token))) {
      return cls;
    }
  }

  return '';
}
