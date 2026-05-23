import { Component, Input } from '@angular/core';
import { NgIf, NgClass, DatePipe, UpperCasePipe } from '@angular/common';
import { PesoPipe } from '../../pipes/peso.pipe';
import { ReceiptData } from '../../../core/models';

@Component({
  selector: 'app-receipt-view',
  standalone: true,
  imports: [NgIf, NgClass, PesoPipe, DatePipe, UpperCasePipe],
  templateUrl: './receipt-view.component.html',
  styleUrls: ['./receipt-view.component.scss']
})
export class ReceiptViewComponent {
  @Input({ required: true }) data!: ReceiptData;
}
