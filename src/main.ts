import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  calendarOutline,
  informationCircleOutline,
  peopleOutline,
  pulseOutline,
  settingsOutline,
  warningOutline
} from 'ionicons/icons';

addIcons({
  alertCircleOutline,
  calendarOutline,
  informationCircleOutline,
  peopleOutline,
  pulseOutline,
  settingsOutline,
  warningOutline
});

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
