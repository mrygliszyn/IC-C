import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators, AbstractControl } from '@angular/forms';

import { MatSnackBar } from '@angular/material/snack-bar';

interface PriceTable {
    [key: string]: number
}

@Component({
    selector: 'app-calc-form',
    templateUrl: './calc-form.component.html',
    styleUrls: ['./calc-form.component.scss'],
})
export class CalcFormComponent implements OnInit {

    // Discount options
    private discountValue = 0.05;
    private discountFromAmount = 12500;
    // Long product delivery extra cost
    private longProductExtraCost = 1995;

    // Calculated total cost of shipping
    public grandTotal = 0;

    // Form
    public form!: FormGroup;
    public formSubmittedFlag: boolean = false;

    // Pricing upload
    public pricingUploadPendingFlag: boolean = false;
    // Pricing data storage
    private pricingDataStorageKey = 'IC_CALC_PRICES';
    public pricingDataFromStorage: PriceTable | null = null;
    public usePricingDataFromStorageFlag: boolean = false;

    constructor(
        private _snackBar: MatSnackBar
    ) { }

    ngOnInit() {
        this.loadPricingDataFromStorage();
        this.initForm();
    }

    initForm(): void {
        this.form = new FormGroup({
            pricingDataRaw: new FormControl('', {
                validators: [
                    Validators.required
                ],
            }),
            pricingDataSaveFlag: new FormControl(false),
            postcode: new FormControl('', Validators.compose([
                Validators.required,
                Validators.minLength(5),
                Validators.maxLength(5),
                Validators.pattern('[0-9]*'),
            ])),
            calculatedTotal: new FormControl('', [
                Validators.required
            ]),
            longProductFlag: new FormControl(false)
        }, {
            updateOn: 'blur'
        });
    }

    // Form controls shorthand
    get formPricing(): AbstractControl {
        return this.form.get('pricingDataRaw') as AbstractControl;
    }
    get formPostcode(): AbstractControl {
        return this.form.get('postcode') as AbstractControl;
    }
    get formTotal(): AbstractControl {
        return this.form.get('calculatedTotal') as AbstractControl;
    }
    get formLongFlag(): AbstractControl {
        return this.form.get('longProductFlag') as AbstractControl;
    }

    onFormSubmit(): void {
        if (this.form.valid) {
            this.formSubmittedFlag = true;
            this.form.markAsPristine();

            const { pricingDataRaw, pricingDataSaveFlag, postcode, calculatedTotal, longProductFlag } = this.form.value;

            let pricingData: PriceTable;

            if (this.usePricingDataFromStorageFlag && this.pricingDataFromStorage) {
                pricingData = this.pricingDataFromStorage;
            } else if (!this.usePricingDataFromStorageFlag && pricingDataRaw) {
                pricingData = <PriceTable>this.parsePricingFromString(pricingDataRaw);
                if (pricingDataSaveFlag) {
                    this.savePricingData(<PriceTable>pricingData);
                }
            } else {
                // No suitable data source, reset form
                this.usePricingDataFromStorageFlag = false;
                this.pricingDataFromStorage = null;

                this._snackBar.open('Error! No valid pricing data source found, upload valid data source')
                return;
            }

            // Base shipping cost
            const baseShippingCost = this.getShippingCostByLocation(postcode, pricingData);

            // Get extra cost if product long checked
            const extraShippingCosts = this.getLongProductExtraCost(longProductFlag);

            // Sum all end price components
            const subtotal = +calculatedTotal + +baseShippingCost + +extraShippingCosts;

            // Add discount if applies
            this.grandTotal = this.applyDiscount(subtotal);
        }
    }

    // Calculation functions
    /**
     * Returns base shipment cost, based on delivery location post code
     * 
     * @param postcode Delivery location post code
     * @param priceTable Base shipment cost price table
     * 
     * @return Base shipment cost based on delivery location
     */
    getShippingCostByLocation(postcode: string, priceTable: PriceTable): number {
        const zone = <string>postcode.slice(0, 2);

        return priceTable[zone];
    }

    /**
     * Returns extra costs if product is oversized
     * 
     * @param productLongFlag Flag marking product as oversized
     * 
     * @returns Additional costs if product oveersized
     */
    getLongProductExtraCost(productLongFlag: boolean): number {
        if (productLongFlag) {
            return this.longProductExtraCost;
        }
        return 0;
    }

    /**
     * Applies discount to subtotal if applies
     * 
     * @param subtotal Subtotal
     * 
     * @returns Subtotal after discount
     */
    applyDiscount(subtotal: number): number {
        if (subtotal >= this.discountFromAmount) {
            return subtotal - (subtotal * +this.discountValue);
        }
        return subtotal;
    }

    // Utils
    /**
     * Parses CSV file content into object with shipping prices
     * 
     * @param rawCSVData CSV file raw content
     * 
     * @returns Object of shipping prices
     */
    parsePricingFromString(rawCSVData: string): PriceTable {
        const priceTable: PriceTable = {};
        for (let row of rawCSVData.split('\r\n')) {
            const [zone, cost] = row.split(',');
            priceTable[zone] = +cost;
        }

        return priceTable;
    }

    // File upload
    /**
     * Rewrites file content into text input
     * 
     * @param $event HTML file input change event
     */
    onPricingDataChange($event: Event): void {
        this.pricingUploadPendingFlag = true;
        this.form.disable();

        const fileList = (<HTMLInputElement>$event.target).files;
        const file = fileList?.[0];
        if (file) {
            let reader = new FileReader();

            reader.readAsText(file);
            reader.onload = () => {
                if (reader.result) {
                    const pricingData = String(reader.result);

                    this.formPricing.patchValue(pricingData);
                    this.pricingUploadPendingFlag = false;
                    this.form.enable();
                }
            }
        } else {
            this.formPricing.patchValue('');
            this.pricingUploadPendingFlag = false;
            this.form.enable();
        }
    }

    // Pricing data storage
    /**
     * Saves raw pricing data in localStorage
     * 
     * @param pricingData CSV raw content
     */
    savePricingData(pricingData: PriceTable): void {
        this.pricingDataFromStorage = pricingData;

        const priceDataJSON = JSON.stringify(pricingData);
        localStorage.setItem(this.pricingDataStorageKey, priceDataJSON);
    }

    /**
     * 
     */
    loadPricingDataFromStorage(): void {
        const pricingDataJSON = localStorage.getItem(this.pricingDataStorageKey);

        if (pricingDataJSON) {
            try {
                const pricingData = JSON.parse(pricingDataJSON);

                this.pricingDataFromStorage = pricingData;
            } catch ($e) { }
        }
    }

    // UI
    usePricingDataFromStorage(): void {
        // if saved pricing data available
        if (<PriceTable>this.pricingDataFromStorage) {
            this.usePricingDataFromStorageFlag = true;
            // hide file input and checkbox
            this.removePricingUploadFormFields();
        }
        // If data corrupted or removed
        else {
            this.pricingDataFromStorage = null;
            this.usePricingDataFromStorageFlag = false;
            this.addPricingUploadFormFields();
        }
    }
    removePricingSavedData(): void {
        // Remove saved data
        localStorage.removeItem(this.pricingDataStorageKey);
        this.pricingDataFromStorage = null;
        this.usePricingDataFromStorageFlag = false;
        // Append file input to the form
        this.addPricingUploadFormFields();
    }
    usePricingDataFromFile() {
        this.usePricingDataFromStorageFlag = false;
        this.addPricingUploadFormFields();
    }

    /**
     * Appends file upload controls to form
     */
    addPricingUploadFormFields(): void {
        this.form.addControl('pricingDataRaw', new FormControl('', {
            validators: [
                Validators.required
            ],
            updateOn: 'change',
        }));
        this.form.addControl('usePricingSavedDataFlag', new FormControl(false));
    }

    /**
     * Removes file upload controls from form
     */
    removePricingUploadFormFields(): void {
        this.form.removeControl('pricingDataRaw');
        this.form.removeControl('usePricingSavedDataFlag');
    }
}
