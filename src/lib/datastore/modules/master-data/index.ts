import { GuideModule } from './guide-module';
import { CompanyModule } from './company-module';
import { NationalityModule } from './nationality-module';
import { ProvinceModule } from './province-module';
import { DestinationModule } from './destination-module';
import { ShoppingModule } from './shopping-module';
import { ExpenseModule } from './expense-module';
import { SharingModule } from './sharing-module';

export { GuideModule, CompanyModule, NationalityModule, ProvinceModule, DestinationModule, ShoppingModule, ExpenseModule, SharingModule };

function applyMixins(derivedCtor: any, constructors: any[]) {
  constructors.forEach((baseCtor) => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
      if (name !== 'constructor') {
        Object.defineProperty(
          derivedCtor.prototype,
          name,
          Object.getOwnPropertyDescriptor(baseCtor.prototype, name) || Object.create(null)
        );
      }
    });
  });
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class MasterDataModule {
  declare protected supabase: any;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface MasterDataModule extends GuideModule, CompanyModule, NationalityModule, ProvinceModule, DestinationModule, ShoppingModule, ExpenseModule, SharingModule {}

applyMixins(MasterDataModule, [GuideModule, CompanyModule, NationalityModule, ProvinceModule, DestinationModule, ShoppingModule, ExpenseModule, SharingModule]);
