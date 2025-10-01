import { store } from './datastore';
import { SEED_DATA } from './seed-data';
import type { EntityRef } from '@/types/tour';

export async function seedDatabase(): Promise<void> {
  try {
    // Check if already seeded
    const guides = await store.listGuides();
    if (guides.length > 0) {
      console.log('Database already seeded, skipping...');
      return;
    }

    console.log('Seeding database with initial data...');

    // Seed guides
    const guideMap = new Map<string, string>();
    for (const guideData of SEED_DATA.guides) {
      const guide = await store.createGuide(guideData);
      guideMap.set(guideData.name, guide.id);
    }

    // Seed companies
    const companyMap = new Map<string, string>();
    for (const companyData of SEED_DATA.companies) {
      const company = await store.createCompany(companyData);
      companyMap.set(companyData.name, company.id);
    }

    // Seed nationalities
    const nationalityMap = new Map<string, string>();
    for (const nationalityData of SEED_DATA.nationalities) {
      const nationality = await store.createNationality(nationalityData);
      nationalityMap.set(nationalityData.name, nationality.id);
    }

    // Seed tours
    for (const tourData of SEED_DATA.tours) {
      const { tour, subcollections } = tourData;
      
      const companyRef: EntityRef = {
        id: companyMap.get(tour.companyName) || '',
        nameAtBooking: tour.companyName
      };
      
      const guideRef: EntityRef = {
        id: guideMap.get(tour.guideName) || '',
        nameAtBooking: tour.guideName
      };
      
      const clientNationalityRef: EntityRef = {
        id: nationalityMap.get(tour.clientNationality) || '',
        nameAtBooking: tour.clientNationality
      };

      const createdTour = await store.createTour({
        tourCode: tour.tourCode,
        companyRef,
        guideRef,
        clientNationalityRef,
        clientName: tour.clientName,
        adults: tour.adults,
        children: tour.children,
        driverName: tour.driverName,
        clientPhone: tour.clientPhone,
        startDate: tour.startDate,
        endDate: tour.endDate
      });

      // Add subcollections
      for (const dest of subcollections.destinations) {
        await store.addDestination(createdTour.id, dest);
      }
      
      for (const expense of subcollections.expenses) {
        await store.addExpense(createdTour.id, expense);
      }
      
      for (const meal of subcollections.meals) {
        await store.addMeal(createdTour.id, meal);
      }
      
      for (const allowance of subcollections.allowances) {
        await store.addAllowance(createdTour.id, allowance);
      }
    }

    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}
