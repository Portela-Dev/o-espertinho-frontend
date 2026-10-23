import { Directive, computed, input, signal } from '@angular/core';

export const PRODUCT_IMAGE_FALLBACK = '/images/product-unavailable.svg';

@Directive({
  selector: 'img[productImage]',
  host: { '[src]': 'source()', '(error)': 'failed()' },
})
export class ProductImage {
  productImage = input<string | null | undefined>('');
  private failedUrl = signal<string | null | undefined>(undefined);
  source = computed(() =>
    this.productImage() && this.productImage() !== this.failedUrl()
      ? this.productImage()
      : PRODUCT_IMAGE_FALLBACK,
  );
  failed() {
    if (this.source() !== PRODUCT_IMAGE_FALLBACK)
      this.failedUrl.set(this.productImage());
  }
}
