import type { Guide, GuideInput, Company, CompanyInput, Nationality, NationalityInput, Province, ProvinceInput, TouristDestination, TouristDestinationInput, Shopping as MasterShopping, ShoppingInput, ExpenseCategory, ExpenseCategoryInput, DetailedExpense, DetailedExpenseInput, DiaryType, DiaryTypeInput, TourDiary, TourDiaryInput, Restaurant, RestaurantInput, ShopPlace, ShopPlaceInput, Hotel, HotelInput } from './master';
import type {
  Tour,
  TourInput,
  TourQuery,
  Destination,
  Expense,
  Meal,
  Allowance,
  Shopping as TourShopping,
  TourSummary,
  TourListResult,
} from './tour';
import type { UserProfile, UserProfileInput } from './user';

export interface SearchQuery {
  search?: string;
  status?: 'active' | 'inactive' | 'all';
  limit?: number;
  offset?: number;
}

export interface DataStore {
  // Guides
  listGuides(query?: SearchQuery): Promise<Guide[]>;
  getGuide(id: string): Promise<Guide | undefined>;
  createGuide(input: GuideInput): Promise<Guide>;
  updateGuide(id: string, patch: Partial<Guide>): Promise<void>;
  toggleGuideStatus(id: string): Promise<void>;
  duplicateGuide(id: string): Promise<Guide>;
  deleteGuide(id: string): Promise<void>;
  deleteAllGuides(): Promise<void>;
  bulkCreateGuides(inputs: GuideInput[]): Promise<Guide[]>;

  // Companies
  listCompanies(query?: SearchQuery): Promise<Company[]>;
  getCompany(id: string): Promise<Company | undefined>;
  createCompany(input: CompanyInput): Promise<Company>;
  updateCompany(id: string, patch: Partial<Company>): Promise<void>;
  toggleCompanyStatus(id: string): Promise<void>;
  duplicateCompany(id: string): Promise<Company>;
  deleteCompany(id: string): Promise<void>;
  deleteAllCompanies(): Promise<void>;
  bulkCreateCompanies(inputs: CompanyInput[]): Promise<Company[]>;

  // Nationalities
  listNationalities(query?: SearchQuery): Promise<Nationality[]>;
  getNationality(id: string): Promise<Nationality | undefined>;
  createNationality(input: NationalityInput): Promise<Nationality>;
  updateNationality(id: string, patch: Partial<Nationality>): Promise<void>;
  toggleNationalityStatus(id: string): Promise<void>;
  duplicateNationality(id: string): Promise<Nationality>;
  deleteNationality(id: string): Promise<void>;
  deleteAllNationalities(): Promise<void>;
  bulkCreateNationalities(inputs: NationalityInput[]): Promise<Nationality[]>;

  // Provinces
  listProvinces(query?: SearchQuery): Promise<Province[]>;
  getProvince(id: string): Promise<Province | undefined>;
  createProvince(input: ProvinceInput): Promise<Province>;
  updateProvince(id: string, patch: Partial<Province>): Promise<void>;
  toggleProvinceStatus(id: string): Promise<void>;
  duplicateProvince(id: string): Promise<Province>;
  deleteProvince(id: string): Promise<void>;
  deleteAllProvinces(): Promise<void>;
  bulkCreateProvinces(inputs: ProvinceInput[]): Promise<Province[]>;
  
  // Tourist Destinations
  listTouristDestinations(query?: SearchQuery): Promise<TouristDestination[]>;
  getTouristDestination(id: string): Promise<TouristDestination | undefined>;
  createTouristDestination(input: TouristDestinationInput): Promise<TouristDestination>;
  updateTouristDestination(id: string, patch: Partial<TouristDestination>): Promise<void>;
  toggleTouristDestinationStatus(id: string): Promise<void>;
  duplicateTouristDestination(id: string): Promise<TouristDestination>;
  deleteTouristDestination(id: string): Promise<void>;
  deleteAllTouristDestinations(): Promise<void>;
  bulkCreateTouristDestinations(inputs: TouristDestinationInput[]): Promise<TouristDestination[]>;
  
  // Shopping
  listShoppings(query?: SearchQuery): Promise<MasterShopping[]>;
  getShopping(id: string): Promise<MasterShopping | undefined>;
  createShopping(input: ShoppingInput): Promise<MasterShopping>;
  updateShopping(id: string, patch: Partial<MasterShopping>): Promise<void>;
  toggleShoppingStatus(id: string): Promise<void>;
  duplicateShopping(id: string): Promise<MasterShopping>;
  deleteShopping(id: string): Promise<void>;
  deleteAllShoppings(): Promise<void>;
  bulkCreateShoppings(inputs: ShoppingInput[]): Promise<MasterShopping[]>;

  // Expense Categories
  listExpenseCategories(query?: SearchQuery): Promise<ExpenseCategory[]>;
  getExpenseCategory(id: string): Promise<ExpenseCategory | undefined>;
  createExpenseCategory(input: ExpenseCategoryInput): Promise<ExpenseCategory>;
  updateExpenseCategory(id: string, patch: Partial<ExpenseCategory>): Promise<void>;
  toggleExpenseCategoryStatus(id: string): Promise<void>;
  duplicateExpenseCategory(id: string): Promise<ExpenseCategory>;
  deleteExpenseCategory(id: string): Promise<void>;
  deleteAllExpenseCategories(): Promise<void>;
  bulkCreateExpenseCategories(inputs: ExpenseCategoryInput[]): Promise<ExpenseCategory[]>;
  
  // Detailed Expenses
  listDetailedExpenses(query?: SearchQuery): Promise<DetailedExpense[]>;
  getDetailedExpense(id: string): Promise<DetailedExpense | undefined>;
  createDetailedExpense(input: DetailedExpenseInput): Promise<DetailedExpense>;
  updateDetailedExpense(id: string, patch: Partial<DetailedExpense>): Promise<void>;
  duplicateDetailedExpense(id: string): Promise<DetailedExpense>;
  deleteDetailedExpense(id: string): Promise<void>;
  toggleDetailedExpenseStatus(id: string): Promise<void>;
  deleteAllDetailedExpenses(): Promise<void>;
  bulkCreateDetailedExpenses(inputs: DetailedExpenseInput[]): Promise<DetailedExpense[]>;
  
  // Diary Types
  listDiaryTypes(query?: SearchQuery): Promise<DiaryType[]>;
  getDiaryType(id: string): Promise<DiaryType | undefined>;
  createDiaryType(input: DiaryTypeInput): Promise<DiaryType>;
  updateDiaryType(id: string, patch: Partial<DiaryType>): Promise<void>;
  toggleDiaryTypeStatus(id: string): Promise<void>;
  duplicateDiaryType(id: string): Promise<DiaryType>;
  deleteDiaryType(id: string): Promise<void>;
  deleteAllDiaryTypes(): Promise<void>;
  bulkCreateDiaryTypes(inputs: DiaryTypeInput[]): Promise<DiaryType[]>;
  
  // Tour Diaries
  listTourDiaries(query?: SearchQuery): Promise<TourDiary[]>;
  getTourDiary(id: string): Promise<TourDiary | undefined>;
  createTourDiary(input: TourDiaryInput): Promise<TourDiary>;
  updateTourDiary(id: string, patch: Partial<TourDiary>): Promise<void>;
  duplicateTourDiary(id: string): Promise<TourDiary>;
  deleteTourDiary(id: string): Promise<void>;
  deleteAllTourDiaries(): Promise<void>;
  bulkCreateTourDiaries(inputs: TourDiaryInput[]): Promise<TourDiary[]>;

  // Restaurants
  listRestaurants(query?: SearchQuery): Promise<Restaurant[]>;
  getRestaurant(id: string): Promise<Restaurant | undefined>;
  createRestaurant(input: RestaurantInput): Promise<Restaurant>;
  updateRestaurant(id: string, patch: Partial<Restaurant>): Promise<void>;
  toggleRestaurantStatus(id: string): Promise<void>;
  duplicateRestaurant(id: string): Promise<Restaurant>;
  deleteRestaurant(id: string): Promise<void>;
  deleteAllRestaurants(): Promise<void>;
  bulkCreateRestaurants(inputs: RestaurantInput[]): Promise<Restaurant[]>;

  // Shop Places
  listShopPlaces(query?: SearchQuery): Promise<ShopPlace[]>;
  getShopPlace(id: string): Promise<ShopPlace | undefined>;
  createShopPlace(input: ShopPlaceInput): Promise<ShopPlace>;
  updateShopPlace(id: string, patch: Partial<ShopPlace>): Promise<void>;
  toggleShopPlaceStatus(id: string): Promise<void>;
  duplicateShopPlace(id: string): Promise<ShopPlace>;
  deleteShopPlace(id: string): Promise<void>;
  deleteAllShopPlaces(): Promise<void>;
  bulkCreateShopPlaces(inputs: ShopPlaceInput[]): Promise<ShopPlace[]>;

  // Hotels
  listHotels(query?: SearchQuery): Promise<Hotel[]>;
  getHotel(id: string): Promise<Hotel | undefined>;
  createHotel(input: HotelInput): Promise<Hotel>;
  updateHotel(id: string, patch: Partial<Hotel>): Promise<void>;
  toggleHotelStatus(id: string): Promise<void>;
  duplicateHotel(id: string): Promise<Hotel>;
  deleteHotel(id: string): Promise<void>;
  deleteAllHotels(): Promise<void>;
  bulkCreateHotels(inputs: HotelInput[]): Promise<Hotel[]>;

  // Tours
  listTours(query?: TourQuery, options?: { includeDetails?: boolean }): Promise<TourListResult>;
  getTour(id: string): Promise<Tour | undefined>;
  createTour(input: TourInput & { destinations?: Destination[]; expenses?: Expense[]; meals?: Meal[]; allowances?: Allowance[]; shoppings?: TourShopping[]; summary?: TourSummary }): Promise<Tour>;
  updateTour(id: string, patch: Partial<Tour>): Promise<void>;
  deleteTour(id: string): Promise<void>;
  duplicateTour(id: string): Promise<Tour>;
  
  // Tour subcollections
  addDestination(tourId: string, destination: Destination): Promise<void>;
  updateDestination(tourId: string, index: number, destination: Destination): Promise<void>;
  removeDestination(tourId: string, index: number): Promise<void>;
  
  addExpense(tourId: string, expense: Expense): Promise<void>;
  updateExpense(tourId: string, index: number, expense: Expense): Promise<void>;
  removeExpense(tourId: string, index: number): Promise<void>;
  
  addMeal(tourId: string, meal: Meal): Promise<void>;
  updateMeal(tourId: string, index: number, meal: Meal): Promise<void>;
  removeMeal(tourId: string, index: number): Promise<void>;
  
  addAllowance(tourId: string, allowance: Allowance): Promise<void>;
  updateAllowance(tourId: string, index: number, allowance: Allowance): Promise<void>;
  removeAllowance(tourId: string, index: number): Promise<void>;
  
  addTourShopping(tourId: string, shopping: TourShopping): Promise<void>;
  updateTourShopping(tourId: string, index: number, shopping: TourShopping): Promise<void>;
  removeTourShopping(tourId: string, index: number): Promise<void>;
  
  // Data management
  exportData(): Promise<any>;
  importData(data: any): Promise<void>;
  clearAllData(): Promise<void>;

  // User Profiles
  listUserProfiles(query?: SearchQuery): Promise<UserProfile[]>;
  getUserProfile(id: string): Promise<UserProfile | undefined>;
  getUserProfileByEmail(email: string): Promise<UserProfile | undefined>;
  createUserProfile(userId: string, input: UserProfileInput, createdBy?: string): Promise<UserProfile>;
  updateUserProfile(id: string, patch: Partial<UserProfileInput>): Promise<void>;
  deleteUserProfile(id: string): Promise<void>;
  getCurrentUserProfile(): Promise<UserProfile | undefined>;
}
