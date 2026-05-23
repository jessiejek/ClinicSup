import { NgFor, NgIf } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, Input, inject } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonSearchbar,
  IonTitle,
  IonToolbar,
  ModalController
} from '@ionic/angular/standalone';

export interface MedicationPickerOption {
  value: string;
  label: string;
  searchText: string;
}

@Component({
  standalone: true,
  selector: 'app-medication-picker-modal',
  imports: [NgFor, NgIf, IonButton, IonButtons, IonContent, IonHeader, IonSearchbar, IonTitle, IonToolbar],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ title }}</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" (click)="close()">Close</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="picker-modal ion-padding">
      <ion-searchbar
        placeholder="Search options"
        [value]="query"
        (ionInput)="updateQuery($event.detail.value)"
        (ionClear)="updateQuery('')"
      ></ion-searchbar>

      <div *ngIf="filteredOptions.length > 0; else emptyState" class="picker-options">
        <button type="button" class="picker-option" *ngFor="let option of filteredOptions" (click)="select(option)">
          {{ option.label }}
        </button>
      </div>

      <ng-template #emptyState>
        <div *ngIf="query.trim().length > 0" class="picker-empty">No matching options.</div>
      </ng-template>
    </ion-content>
  `,
  styles: [
    `
      .picker-options {
        display: grid;
      }

      .picker-option {
        width: 100%;
        text-align: left;
        border: 0;
        border-bottom: 1px solid var(--clinic-border);
        background: transparent;
        padding: 0.9rem 0;
        color: var(--clinic-text-primary);
      }

      .picker-option:last-child {
        border-bottom: 0;
      }

      .picker-empty {
        padding: var(--space-5) 0;
        color: var(--clinic-text-secondary);
        text-align: center;
      }
    `
  ]
})
export class MedicationPickerModalComponent implements AfterViewInit {
  @Input() title = 'Select Option';
  @Input()
  set options(value: MedicationPickerOption[] | null | undefined) {
    this._options = Array.isArray(value) ? [...value] : [];
    this.syncFilteredOptions();
  }
  get options(): MedicationPickerOption[] {
    return this._options;
  }

  private readonly modalCtrl = inject(ModalController);
  private readonly cdr = inject(ChangeDetectorRef);
  private _options: MedicationPickerOption[] = [];
  private viewInitialized = false;

  query = '';
  filteredOptions: MedicationPickerOption[] = [];

  updateQuery(value: string | null | undefined): void {
    this.query = value ?? '';
    this.syncFilteredOptions();
  }

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    this.syncFilteredOptions();
  }

  private syncFilteredOptions(): void {
    const needle = this.query.trim().toLowerCase();
    this.filteredOptions = needle
      ? this.options.filter((option) => this.matchesOption(option, needle))
      : [...this.options];

    if (this.viewInitialized) {
      this.cdr.detectChanges();
    }
  }

  private matchesOption(option: MedicationPickerOption, needle: string): boolean {
    return [option.label, option.value, option.searchText]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .some((value) => value.trim().toLowerCase().includes(needle));
  }

  private resetSearch(): void {
    this.query = '';
    this.filteredOptions = [...this._options];

    if (this.viewInitialized) {
      this.cdr.detectChanges();
    }
  }

  async select(option: MedicationPickerOption): Promise<void> {
    this.resetSearch();
    await this.modalCtrl.dismiss({ option }, 'select');
  }

  async close(): Promise<void> {
    this.resetSearch();
    await this.modalCtrl.dismiss(null, 'cancel');
  }
}
