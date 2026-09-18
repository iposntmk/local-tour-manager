/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging */
import { TourCrudModule } from './tour-crud';
import { TourSummaryModule } from './tour-summary';
import { TourReadsModule } from './tour-reads';
import { TourItemsModule } from './tour-items';
import { TourSettlementModule } from './tour-settlement';
import { TourPaymentsModule } from './tour-payments';
import { TourImagesModule } from './tour-images';
import { TourDataModule } from './tour-data';
import { TourAttachmentsModule } from './tour-attachments';

function applyMixins(derivedCtor: any, constructors: any[]) {
  constructors.forEach((baseCtor) => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
      if (name !== 'constructor') {
        Object.defineProperty(derivedCtor.prototype, name, Object.getOwnPropertyDescriptor(baseCtor.prototype, name)!);
      }
    });
  });
}

export class TourOperationsModule {}
export interface TourOperationsModule extends TourCrudModule, TourSummaryModule, TourReadsModule, TourItemsModule, TourSettlementModule, TourPaymentsModule, TourImagesModule, TourDataModule, TourAttachmentsModule {}
applyMixins(TourOperationsModule, [TourCrudModule, TourSummaryModule, TourReadsModule, TourItemsModule, TourSettlementModule, TourPaymentsModule, TourImagesModule, TourDataModule, TourAttachmentsModule]);
