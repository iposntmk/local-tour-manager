import { TourCrudModule } from './tour-crud';
import { TourItemsModule } from './tour-items';
import { TourSettlementModule } from './tour-settlement';
import { TourPaymentsModule } from './tour-payments';
import { TourImagesModule } from './tour-images';
import { TourDataModule } from './tour-data';

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
export interface TourOperationsModule extends TourCrudModule, TourItemsModule, TourSettlementModule, TourPaymentsModule, TourImagesModule, TourDataModule {}
applyMixins(TourOperationsModule, [TourCrudModule, TourItemsModule, TourSettlementModule, TourPaymentsModule, TourImagesModule, TourDataModule]);
