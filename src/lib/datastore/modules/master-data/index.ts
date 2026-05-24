import { GuideModule } from './guide-module';
import { CompanyModule } from './company-module';
import { NationalityModule } from './nationality-module';
import { ProvinceModule } from './province-module';
import { DestinationModule } from './destination-module';
import { ShoppingModule } from './shopping-module';
import { ExpenseModule } from './expense-module';

export { GuideModule, CompanyModule, NationalityModule, ProvinceModule, DestinationModule, ShoppingModule, ExpenseModule };

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

export class MasterDataModule {
  declare protected supabase: any;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface MasterDataModule extends GuideModule, CompanyModule, NationalityModule, ProvinceModule, DestinationModule, ShoppingModule, ExpenseModule {}

applyMixins(MasterDataModule, [GuideModule, CompanyModule, NationalityModule, ProvinceModule, DestinationModule, ShoppingModule, ExpenseModule]);
