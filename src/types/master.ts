export type EntityStatus = 'active' | 'inactive';

export interface Guide {
  id: string;
  name: string;
  phone: string;
  note: string;
  status: EntityStatus;
  searchKeywords: string[];
  createdAt: string;
  updatedAt: string;
}

export interface GuideInput {
  name: string;
  phone?: string;
  note?: string;
}

export interface Company {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  note: string;
  status: EntityStatus;
  searchKeywords: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CompanyInput {
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  note?: string;
}

export interface Nationality {
  id: string;
  name: string;
  iso2?: string;
  emoji?: string;
  status: EntityStatus;
  searchKeywords: string[];
  createdAt: string;
  updatedAt: string;
}

export interface NationalityInput {
  name: string;
  iso2?: string;
  emoji?: string;
}

export interface Province {
  id: string;
  name: string;
  status: EntityStatus;
  searchKeywords: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProvinceInput {
  name: string;
}

export interface TouristDestination {
  id: string;
  name: string;
  price: number;
  provinceRef: {
    id: string;
    nameAtBooking: string;
  };
  status: EntityStatus;
  searchKeywords: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TouristDestinationInput {
  name: string;
  price: number;
  provinceRef: {
    id: string;
    nameAtBooking: string;
  };
}

export interface Shopping {
  id: string;
  name: string;
  price: number;
  status: EntityStatus;
  searchKeywords: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingInput {
  name: string;
  price?: number;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  status: EntityStatus;
  searchKeywords: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseCategoryInput {
  name: string;
}

export interface DetailedExpense {
  id: string;
  name: string;
  price: number;
  categoryRef: {
    id: string;
    nameAtBooking: string;
  };
  status: EntityStatus;
  searchKeywords: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DetailedExpenseInput {
  name: string;
  price: number;
  categoryRef: {
    id: string;
    nameAtBooking: string;
  };
}

export type DiaryDataType = 'text' | 'date' | 'time' | 'datetime' | 'number' | 'boolean' | 'image' | 'video' | 'audio' | 'location';

export interface DiaryType {
  id: string;
  name: string;
  dataType: DiaryDataType;
  status: EntityStatus;
  searchKeywords: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DiaryTypeInput {
  name: string;
  dataType?: DiaryDataType;
}

export interface TourDiary {
  id: string;
  tourRef: {
    id: string;
    tourCodeAtBooking: string;
  };
  diaryTypeRef: {
    id: string;
    nameAtBooking: string;
    dataType: DiaryDataType;
  };
  contentType: 'text' | 'image' | 'video';
  contentText?: string;
  contentUrls: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TourDiaryInput {
  tourRef: {
    id: string;
    tourCodeAtBooking: string;
  };
  diaryTypeRef: {
    id: string;
    nameAtBooking: string;
    dataType: DiaryDataType;
  };
  contentType: 'text' | 'image' | 'video';
  contentText?: string;
  contentUrls?: string[];
}

// Restaurant types for managing restaurant master data
export type RestaurantType = 'asian' | 'indian' | 'western' | 'local' | 'other';

export interface Restaurant {
  id: string;
  name: string;
  restaurantType: RestaurantType;
  phone: string;
  address: string;
  provinceRef: {
    id: string;
    nameAtBooking: string;
  };
  commissionForGuide: number;
  note: string;
  status: EntityStatus;
  searchKeywords: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RestaurantInput {
  name: string;
  restaurantType: RestaurantType;
  phone?: string;
  address?: string;
  provinceRef: {
    id: string;
    nameAtBooking: string;
  };
  commissionForGuide?: number;
  note?: string;
}

// Shop Place types for managing shopping locations
export type ShopPlaceType = 'clothing' | 'food_and_beverage' | 'souvenirs' | 'handicrafts' | 'electronics' | 'other';

export interface ShopPlace {
  id: string;
  name: string;
  shopType: ShopPlaceType;
  phone: string;
  address: string;
  provinceRef: {
    id: string;
    nameAtBooking: string;
  };
  commissionForGuide: number;
  note: string;
  status: EntityStatus;
  searchKeywords: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ShopPlaceInput {
  name: string;
  shopType: ShopPlaceType;
  phone?: string;
  address?: string;
  provinceRef: {
    id: string;
    nameAtBooking: string;
  };
  commissionForGuide?: number;
  note?: string;
}

// Hotel types for managing hotel master data
export type RoomType = 'single' | 'double' | 'group' | 'suite';

export interface Hotel {
  id: string;
  name: string;
  ownerName: string;
  ownerPhone: string;
  roomType: RoomType;
  pricePerNight: number;
  address: string;
  provinceRef: {
    id: string;
    nameAtBooking: string;
  };
  note: string;
  status: EntityStatus;
  searchKeywords: string[];
  createdAt: string;
  updatedAt: string;
}

export interface HotelInput {
  name: string;
  ownerName: string;
  ownerPhone: string;
  roomType: RoomType;
  pricePerNight: number;
  address?: string;
  provinceRef: {
    id: string;
    nameAtBooking: string;
  };
  note?: string;
}
