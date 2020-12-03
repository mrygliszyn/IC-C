import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalcFormComponent } from './calc-form/calc-form.component';

import { SharedModule } from '../shared/shared.module';

@NgModule({
    declarations: [CalcFormComponent],
    imports: [
        CommonModule,
        SharedModule,
    ],
    exports: [
        CalcFormComponent,
    ]
})
export class CalcFormModule { }
