import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators, AbstractControl } from '@angular/forms';

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

    constructor() { }

    ngOnInit() {
        this.initForm();
    }

    initForm(): void {
        this.form = new FormGroup({
            pricingData: new FormControl('', {
                validators: [
                    Validators.required
                ],
            }),
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
        return this.form.get('pricingData') as AbstractControl;
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

            const { pricingData, postcode, calculatedTotal, longProductFlag } = this.form.value;

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
     * @param pricingDataRaw Base shipment cost price table
     * 
     * @return Base shipment cost based on delivery location
     */
    getShippingCostByLocation(postcode: string, pricingDataRaw?: string): number {
        const zone = <string>postcode.slice(0, 2);

        if (pricingDataRaw) {
            let priceTable = <PriceTable>this.parsePricingFromString(pricingDataRaw);

            return priceTable[zone];
        }
        return 0;
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
        if (subtotal > this.discountFromAmount) {
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
}
