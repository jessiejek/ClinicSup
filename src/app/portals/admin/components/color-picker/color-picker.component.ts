import { CommonModule, NgIf } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-color-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIf],
  template: `
    <div class="color-picker">
      <label class="color-picker__label">{{ label }}</label>
      <div class="color-picker__controls">
        <input
          class="color-picker__text"
          type="text"
          [ngModel]="draftValue"
          (ngModelChange)="onTextChange($event)"
          placeholder="#1A6B4A"
        />
        <input type="color" [ngModel]="resolvedValue" (ngModelChange)="onColorChange($event)" />
      </div>
      <div class="color-picker__preview" [style.background]="resolvedValue"></div>
      <p class="color-picker__error" *ngIf="draftValue && !isValidHex(draftValue)">
        Enter a valid hex color.
      </p>
    </div>
  `,
  styleUrl: './color-picker.component.scss'
})
export class ColorPickerComponent implements OnChanges {
  @Input() label = '';
  @Input() value = '#1A6B4A';
  @Output() valueChange = new EventEmitter<string>();

  draftValue = this.value;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      this.draftValue = this.value;
    }
  }

  get resolvedValue(): string {
    return this.isValidHex(this.draftValue) ? this.normalizeHex(this.draftValue) : this.normalizeHex(this.value);
  }

  onTextChange(value: string): void {
    this.draftValue = value;
    if (this.isValidHex(value)) {
      const normalized = this.normalizeHex(value);
      this.value = normalized;
      this.valueChange.emit(normalized);
    }
  }

  onColorChange(value: string): void {
    this.draftValue = value;
    this.value = value;
    this.valueChange.emit(value);
  }

  isValidHex(value: string): boolean {
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
  }

  private normalizeHex(value: string): string {
    const trimmed = value.trim();
    if (trimmed.length === 4) {
      const [hash, r, g, b] = trimmed;
      return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
    }
    return trimmed.toUpperCase();
  }
}
