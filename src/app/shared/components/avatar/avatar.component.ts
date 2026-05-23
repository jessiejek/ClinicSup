import { Component, Input } from '@angular/core';
import { NgClass, NgIf } from '@angular/common';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [NgIf, NgClass],
  template: `
    <img
      *ngIf="imageUrl; else initialsTpl"
      [src]="imageUrl"
      [alt]="name"
      [ngClass]="['avatar', avatarClass]"
    />
    <ng-template #initialsTpl>
      <div [ngClass]="['avatar', avatarClass]" [attr.aria-label]="name">
        {{ initials }}
      </div>
    </ng-template>
  `,
  styleUrl: './avatar.component.scss'
})
export class AvatarComponent {
  @Input() name = '';
  @Input() imageUrl?: string;
  @Input() size: AvatarSize = 'md';

  get avatarClass(): string {
    return `avatar--${this.size}`;
  }

  get initials(): string {
    const parts = this.name
      .split(' ')
      .map((p) => p.trim())
      .filter(Boolean);
    if (!parts.length) {
      return '';
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
}
