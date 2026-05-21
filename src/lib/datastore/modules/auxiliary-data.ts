import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import type {
  DiaryType,
  DiaryTypeInput,
  TourDiary,
  TourDiaryInput,
  Restaurant,
  RestaurantInput,
  ShopPlace,
  ShopPlaceInput,
  Hotel,
  HotelInput,
} from '@/types/master';
import type { SearchQuery } from '@/types/datastore';
import { generateSearchKeywords } from '@/lib/string-utils';
import {
  mapDiaryType,
  mapTourDiary,
  mapRestaurant,
  mapShopPlace,
  mapHotel,
} from './mappers';
import type {
  DiaryTypeUpdate,
  RestaurantUpdate,
  ShopPlaceUpdate,
  HotelUpdate,
} from './store-types';

export class AuxiliaryDataModule {
  declare protected supabase: SupabaseClient<Database>;

  // ------------------------------------------------------------------ Diary Types

  async listDiaryTypes(query?: SearchQuery): Promise<DiaryType[]> {
    let queryBuilder = this.supabase.from('diary_types').select('*').order('name');

    if (query?.status && query.status !== 'all') queryBuilder = queryBuilder.eq('status', query.status);
    if (query?.search) queryBuilder = queryBuilder.ilike('name', `%${query.search}%`);

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return (data || []).map(mapDiaryType);
  }

  async getDiaryType(id: string): Promise<DiaryType | null> {
    const { data, error } = await this.supabase.from('diary_types').select('*').eq('id', id).maybeSingle();
    if (error) return null;
    return data ? mapDiaryType(data) : null;
  }

  async createDiaryType(input: DiaryTypeInput): Promise<DiaryType> {
    const { data: existing } = await this.supabase
      .from('diary_types')
      .select('id')
      .ilike('name', input.name)
      .maybeSingle();

    if (existing) {
      throw new Error('A diary type with this name already exists');
    }

    const searchKeywords = generateSearchKeywords(input.name);
    const { data, error } = await this.supabase
      .from('diary_types')
      .insert({
        name: input.name,
        data_type: input.dataType || 'text',
        status: 'active',
        search_keywords: searchKeywords,
      })
      .select()
      .single();

    if (error) throw error;
    return mapDiaryType(data);
  }

  async updateDiaryType(id: string, patch: Partial<DiaryType>): Promise<void> {
    const updates: DiaryTypeUpdate = {};

    if (patch.name !== undefined) {
      const { data: existing } = await this.supabase
        .from('diary_types')
        .select('id')
        .ilike('name', patch.name)
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        throw new Error('A diary type with this name already exists');
      }

      updates.name = patch.name;
      updates.search_keywords = generateSearchKeywords(patch.name);
    }
    if (patch.dataType !== undefined) updates.data_type = patch.dataType;
    if (patch.status !== undefined) updates.status = patch.status;

    const { error } = await this.supabase.from('diary_types').update(updates).eq('id', id);
    if (error) throw error;
  }

  async toggleDiaryTypeStatus(id: string): Promise<void> {
    const current = await this.getDiaryType(id);
    if (!current) throw new Error('Diary type not found');
    const newStatus = current.status === 'active' ? 'inactive' : 'active';
    await this.updateDiaryType(id, { status: newStatus });
  }

  async duplicateDiaryType(id: string): Promise<DiaryType> {
    const original = await this.getDiaryType(id);
    if (!original) throw new Error('Diary type not found');
    return this.createDiaryType({
      name: `${original.name} (Copy)`,
      dataType: original.dataType,
    });
  }

  async deleteDiaryType(id: string): Promise<void> {
    const { error } = await this.supabase.from('diary_types').delete().eq('id', id);
    if (error) throw error;
  }

  async deleteAllDiaryTypes(): Promise<void> {
    const { error } = await this.supabase.from('diary_types').delete().gte('created_at', '1970-01-01');
    if (error) throw error;
  }

  async bulkCreateDiaryTypes(inputs: DiaryTypeInput[]): Promise<DiaryType[]> {
    const names = inputs.map(input => input.name.toLowerCase());
    const duplicatesInBatch = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicatesInBatch.length > 0) {
      throw new Error('Duplicate names found in batch');
    }

    const { data: existing } = await this.supabase
      .from('diary_types')
      .select('name');

    if (existing) {
      const existingNames = existing.map(e => e.name.toLowerCase());
      const duplicates = inputs.filter(input =>
        existingNames.includes(input.name.toLowerCase())
      );
      if (duplicates.length > 0) {
        throw new Error(`The following diary types already exist: ${duplicates.map(d => d.name).join(', ')}`);
      }
    }

    const records = inputs.map(input => ({
      name: input.name,
      data_type: input.dataType || 'text',
      status: 'active',
      search_keywords: generateSearchKeywords(input.name),
    }));

    const { data, error } = await this.supabase
      .from('diary_types')
      .insert(records)
      .select();

    if (error) throw error;
    return (data || []).map(mapDiaryType);
  }

  // ------------------------------------------------------------------ Tour Diaries

  async listTourDiaries(query?: SearchQuery): Promise<TourDiary[]> {
    let queryBuilder = this.supabase.from('tour_diaries').select('*').order('created_at', { ascending: false });

    if (query?.search) {
      queryBuilder = queryBuilder.or(`tour_code_at_booking.ilike.%${query.search}%,diary_type_name_at_booking.ilike.%${query.search}%`);
    }

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return (data || []).map(mapTourDiary);
  }

  async getTourDiary(id: string): Promise<TourDiary | null> {
    const { data, error } = await this.supabase.from('tour_diaries').select('*').eq('id', id).maybeSingle();
    if (error) return null;
    return data ? mapTourDiary(data) : null;
  }

  async createTourDiary(input: TourDiaryInput): Promise<TourDiary> {
    const { data, error } = await this.supabase
      .from('tour_diaries')
      .insert({
        tour_id: input.tourRef.id,
        tour_code_at_booking: input.tourRef.tourCodeAtBooking,
        diary_type_id: input.diaryTypeRef.id,
        diary_type_name_at_booking: input.diaryTypeRef.nameAtBooking,
        diary_type_data_type: input.diaryTypeRef.dataType,
        content_type: input.contentType,
        content_text: input.contentText || '',
        content_urls: input.contentUrls || [],
      })
      .select()
      .single();

    if (error) throw error;
    return mapTourDiary(data);
  }

  async updateTourDiary(id: string, patch: Partial<TourDiary>): Promise<void> {
    const updates: any = {};

    if (patch.tourRef !== undefined) {
      updates.tour_id = patch.tourRef.id;
      updates.tour_code_at_booking = patch.tourRef.tourCodeAtBooking;
    }
    if (patch.diaryTypeRef !== undefined) {
      updates.diary_type_id = patch.diaryTypeRef.id;
      updates.diary_type_name_at_booking = patch.diaryTypeRef.nameAtBooking;
    }
    if (patch.contentType !== undefined) updates.content_type = patch.contentType;
    if (patch.contentText !== undefined) updates.content_text = patch.contentText;
    if (patch.contentUrls !== undefined) updates.content_urls = patch.contentUrls;

    const { error } = await this.supabase.from('tour_diaries').update(updates).eq('id', id);
    if (error) throw error;
  }

  async duplicateTourDiary(id: string): Promise<TourDiary> {
    const original = await this.getTourDiary(id);
    if (!original) throw new Error('Tour diary not found');
    return this.createTourDiary({
      tourRef: original.tourRef,
      diaryTypeRef: original.diaryTypeRef,
      contentType: original.contentType,
      contentText: original.contentText,
      contentUrls: original.contentUrls,
    });
  }

  async deleteTourDiary(id: string): Promise<void> {
    const { error } = await this.supabase.from('tour_diaries').delete().eq('id', id);
    if (error) throw error;
  }

  async deleteAllTourDiaries(): Promise<void> {
    const { error } = await this.supabase.from('tour_diaries').delete().gte('created_at', '1970-01-01');
    if (error) throw error;
  }

  async bulkCreateTourDiaries(inputs: TourDiaryInput[]): Promise<TourDiary[]> {
    const records = inputs.map(input => ({
      tour_id: input.tourRef.id,
      tour_code_at_booking: input.tourRef.tourCodeAtBooking,
      diary_type_id: input.diaryTypeRef.id,
      diary_type_name_at_booking: input.diaryTypeRef.nameAtBooking,
      content_type: input.contentType,
      content_text: input.contentText || '',
      content_urls: input.contentUrls || [],
    }));

    const { data, error } = await this.supabase
      .from('tour_diaries')
      .insert(records)
      .select();

    if (error) throw error;
    return (data || []).map(mapTourDiary);
  }

  // ------------------------------------------------------------------ Restaurants

  async listRestaurants(query?: SearchQuery): Promise<Restaurant[]> {
    let queryBuilder = this.supabase.from('restaurants').select('*').order('name');

    if (query?.status) queryBuilder = queryBuilder.eq('status', query.status);
    if (query?.search) queryBuilder = queryBuilder.ilike('name', `%${query.search}%`);
    const { data, error } = await queryBuilder;
    if (error) throw error;
    return (data || []).map(mapRestaurant);
  }

  async getRestaurant(id: string): Promise<Restaurant | null> {
    const { data, error } = await this.supabase.from('restaurants').select('*').eq('id', id).single();
    if (error) return null;
    return data ? mapRestaurant(data) : null;
  }

  async createRestaurant(input: RestaurantInput): Promise<Restaurant> {
    // Check for duplicate name
    const { data: existing } = await this.supabase
      .from('restaurants')
      .select('id')
      .ilike('name', input.name)
      .maybeSingle();
    if (existing) {
      throw new Error('A restaurant with this name already exists');
    }
    const searchKeywords = generateSearchKeywords(input.name);
    const { data, error } = await this.supabase
      .from('restaurants')
      .insert({
        name: input.name,
        restaurant_type: input.restaurantType,
        phone: input.phone || '',
        address: input.address || '',
        province_id: input.provinceRef.id || null,
        province_name_at_booking: input.provinceRef.nameAtBooking || null,
        commission_for_guide: input.commissionForGuide ?? 0,
        note: input.note || '',
        status: 'active',
        search_keywords: searchKeywords,
      })
      .select()
      .single();
    if (error) throw error;
    return mapRestaurant(data);
  }

  async updateRestaurant(id: string, patch: Partial<Restaurant>): Promise<void> {
    const updates: RestaurantUpdate = {};
    if (patch.name !== undefined) {
      // Check for duplicate name (excluding current record)
      const { data: existing } = await this.supabase
        .from('restaurants')
        .select('id')
        .ilike('name', patch.name)
        .neq('id', id)
        .maybeSingle();
      if (existing) {
        throw new Error('A restaurant with this name already exists');
      }
      updates.name = patch.name;
      updates.search_keywords = generateSearchKeywords(patch.name);
    }
    if (patch.restaurantType !== undefined) updates.restaurant_type = patch.restaurantType;
    if (patch.phone !== undefined) updates.phone = patch.phone;
    if (patch.address !== undefined) updates.address = patch.address;
    if (patch.provinceRef !== undefined) {
      updates.province_id = patch.provinceRef.id || null;
      updates.province_name_at_booking = patch.provinceRef.nameAtBooking || null;
    }
    if (patch.commissionForGuide !== undefined) updates.commission_for_guide = patch.commissionForGuide;
    if (patch.note !== undefined) updates.note = patch.note;
    const { error } = await this.supabase.from('restaurants').update(updates).eq('id', id);
    if (error) throw error;
  }

  async toggleRestaurantStatus(_id: string): Promise<void> {
    throw new Error('Status toggling is disabled');
  }

  async duplicateRestaurant(id: string): Promise<Restaurant> {
    const original = await this.getRestaurant(id);
    if (!original) throw new Error('Restaurant not found');
    return this.createRestaurant({
      name: `${original.name} (Copy)`,
      restaurantType: original.restaurantType,
      phone: original.phone,
      address: original.address,
      provinceRef: original.provinceRef,
      commissionForGuide: original.commissionForGuide,
      note: original.note,
    });
  }

  async deleteRestaurant(id: string): Promise<void> {
    const { error } = await this.supabase.from('restaurants').delete().eq('id', id);
    if (error) throw error;
  }

  async deleteAllRestaurants(): Promise<void> {
    const { error } = await this.supabase.from('restaurants').delete().gte('created_at', '1970-01-01');
    if (error) throw error;
  }

  async bulkCreateRestaurants(inputs: RestaurantInput[]): Promise<Restaurant[]> {
    // Check for duplicates within the batch
    const names = inputs.map(input => input.name.toLowerCase());
    const duplicatesInBatch = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicatesInBatch.length > 0) {
      throw new Error('Duplicate names found in batch');
    }
    // Check for duplicates with existing records
    const { data: existing } = await this.supabase
      .from('restaurants')
      .select('name');
    if (existing) {
      const existingNames = existing.map(r => r.name.toLowerCase());
      const duplicates = inputs.filter(input =>
        existingNames.includes(input.name.toLowerCase())
      );
      if (duplicates.length > 0) {
        throw new Error(`The following restaurants already exist: ${duplicates.map(d => d.name).join(', ')}`);
      }
    }
    const records = inputs.map(input => ({
      name: input.name,
      restaurant_type: input.restaurantType,
      phone: input.phone || '',
      address: input.address || '',
      commission_for_guide: input.commissionForGuide ?? 0,
      note: input.note || '',
      status: 'active',
      search_keywords: generateSearchKeywords(input.name),
    }));
    const { data, error } = await this.supabase
      .from('restaurants')
      .insert(records)
      .select();
    if (error) throw error;
    return (data || []).map(mapRestaurant);
  }

  // ------------------------------------------------------------------ Shop Places

  async listShopPlaces(query?: SearchQuery): Promise<ShopPlace[]> {
    let queryBuilder = this.supabase.from('shop_places').select('*').order('name');

    if (query?.status) queryBuilder = queryBuilder.eq('status', query.status);
    if (query?.search) queryBuilder = queryBuilder.ilike('name', `%${query.search}%`);
    const { data, error } = await queryBuilder;
    if (error) throw error;
    return (data || []).map(mapShopPlace);
  }

  async getShopPlace(id: string): Promise<ShopPlace | null> {
    const { data, error } = await this.supabase.from('shop_places').select('*').eq('id', id).single();
    if (error) return null;
    return data ? mapShopPlace(data) : null;
  }

  async createShopPlace(input: ShopPlaceInput): Promise<ShopPlace> {
    // Check for duplicate name
    const { data: existing } = await this.supabase
      .from('shop_places')
      .select('id')
      .ilike('name', input.name)
      .maybeSingle();
    if (existing) {
      throw new Error('A shop place with this name already exists');
    }
    const searchKeywords = generateSearchKeywords(input.name);
    const { data, error } = await this.supabase
      .from('shop_places')
      .insert({
        name: input.name,
        shop_type: input.shopType,
        phone: input.phone || '',
        address: input.address || '',
        province_id: input.provinceRef.id || null,
        province_name_at_booking: input.provinceRef.nameAtBooking || null,
        commission_for_guide: input.commissionForGuide ?? 0,
        note: input.note || '',
        status: 'active',
        search_keywords: searchKeywords,
      })
      .select()
      .single();
    if (error) throw error;
    return mapShopPlace(data);
  }

  async updateShopPlace(id: string, patch: Partial<ShopPlace>): Promise<void> {
    const updates: ShopPlaceUpdate = {};
    if (patch.name !== undefined) {
      // Check for duplicate name (excluding current record)
      const { data: existing } = await this.supabase
        .from('shop_places')
        .select('id')
        .ilike('name', patch.name)
        .neq('id', id)
        .maybeSingle();
      if (existing) {
        throw new Error('A shop place with this name already exists');
      }
      updates.name = patch.name;
      updates.search_keywords = generateSearchKeywords(patch.name);
    }
    if (patch.shopType !== undefined) updates.shop_type = patch.shopType;
    if (patch.phone !== undefined) updates.phone = patch.phone;
    if (patch.address !== undefined) updates.address = patch.address;
    if (patch.provinceRef !== undefined) {
      updates.province_id = patch.provinceRef.id || null;
      updates.province_name_at_booking = patch.provinceRef.nameAtBooking || null;
    }
    if (patch.commissionForGuide !== undefined) updates.commission_for_guide = patch.commissionForGuide;
    if (patch.note !== undefined) updates.note = patch.note;
    const { error } = await this.supabase.from('shop_places').update(updates).eq('id', id);
    if (error) throw error;
  }

  async toggleShopPlaceStatus(_id: string): Promise<void> {
    throw new Error('Status toggling is disabled');
  }

  async duplicateShopPlace(id: string): Promise<ShopPlace> {
    const original = await this.getShopPlace(id);
    if (!original) throw new Error('Shop place not found');
    return this.createShopPlace({
      name: `${original.name} (Copy)`,
      shopType: original.shopType,
      phone: original.phone,
      address: original.address,
      provinceRef: original.provinceRef,
      commissionForGuide: original.commissionForGuide,
      note: original.note,
    });
  }

  async deleteShopPlace(id: string): Promise<void> {
    const { error } = await this.supabase.from('shop_places').delete().eq('id', id);
    if (error) throw error;
  }

  async deleteAllShopPlaces(): Promise<void> {
    const { error } = await this.supabase.from('shop_places').delete().gte('created_at', '1970-01-01');
    if (error) throw error;
  }

  async bulkCreateShopPlaces(inputs: ShopPlaceInput[]): Promise<ShopPlace[]> {
    // Check for duplicates within the batch
    const names = inputs.map(input => input.name.toLowerCase());
    const duplicatesInBatch = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicatesInBatch.length > 0) {
      throw new Error('Duplicate names found in batch');
    }
    // Check for duplicates with existing records
    const { data: existing } = await this.supabase
      .from('shop_places')
      .select('name');
    if (existing) {
      const existingNames = existing.map(s => s.name.toLowerCase());
      const duplicates = inputs.filter(input =>
        existingNames.includes(input.name.toLowerCase())
      );
      if (duplicates.length > 0) {
        throw new Error(`The following shop places already exist: ${duplicates.map(d => d.name).join(', ')}`);
      }
    }
    const records = inputs.map(input => ({
      name: input.name,
      shop_type: input.shopType,
      phone: input.phone || '',
      address: input.address || '',
      commission_for_guide: input.commissionForGuide ?? 0,
      note: input.note || '',
      status: 'active',
      search_keywords: generateSearchKeywords(input.name),
    }));
    const { data, error } = await this.supabase
      .from('shop_places')
      .insert(records)
      .select();
    if (error) throw error;
    return (data || []).map(mapShopPlace);
  }

  // ------------------------------------------------------------------ Hotels

  async listHotels(query?: SearchQuery): Promise<Hotel[]> {
    let queryBuilder = this.supabase.from('hotels').select('*').order('name');

    if (query?.status) queryBuilder = queryBuilder.eq('status', query.status);
    if (query?.search) queryBuilder = queryBuilder.ilike('name', `%${query.search}%`);
    const { data, error } = await queryBuilder;
    if (error) throw error;
    return (data || []).map(mapHotel);
  }

  async getHotel(id: string): Promise<Hotel | null> {
    const { data, error } = await this.supabase.from('hotels').select('*').eq('id', id).single();
    if (error) return null;
    return data ? mapHotel(data) : null;
  }

  async createHotel(input: HotelInput): Promise<Hotel> {
    // Check for duplicate name
    const { data: existing } = await this.supabase
      .from('hotels')
      .select('id')
      .ilike('name', input.name)
      .maybeSingle();
    if (existing) {
      throw new Error('A hotel with this name already exists');
    }
    const searchKeywords = generateSearchKeywords(input.name);
    const { data, error } = await this.supabase
      .from('hotels')
      .insert({
        name: input.name,
        owner_name: input.ownerName,
        owner_phone: input.ownerPhone,
        room_type: input.roomType,
        price_per_night: input.pricePerNight,
        address: input.address || '',
        province_id: input.provinceRef.id || null,
        province_name_at_booking: input.provinceRef.nameAtBooking || null,
        note: input.note || '',
        status: 'active',
        search_keywords: searchKeywords,
      })
      .select()
      .single();
    if (error) throw error;
    return mapHotel(data);
  }

  async updateHotel(id: string, patch: Partial<Hotel>): Promise<void> {
    const updates: HotelUpdate = {};
    if (patch.name !== undefined) {
      // Check for duplicate name (excluding current record)
      const { data: existing } = await this.supabase
        .from('hotels')
        .select('id')
        .ilike('name', patch.name)
        .neq('id', id)
        .maybeSingle();
      if (existing) {
        throw new Error('A hotel with this name already exists');
      }
      updates.name = patch.name;
      updates.search_keywords = generateSearchKeywords(patch.name);
    }
    if (patch.ownerName !== undefined) updates.owner_name = patch.ownerName;
    if (patch.ownerPhone !== undefined) updates.owner_phone = patch.ownerPhone;
    if (patch.roomType !== undefined) updates.room_type = patch.roomType;
    if (patch.pricePerNight !== undefined) updates.price_per_night = patch.pricePerNight;
    if (patch.address !== undefined) updates.address = patch.address;
    if (patch.provinceRef !== undefined) {
      updates.province_id = patch.provinceRef.id || null;
      updates.province_name_at_booking = patch.provinceRef.nameAtBooking || null;
    }
    if (patch.note !== undefined) updates.note = patch.note;
    const { error } = await this.supabase.from('hotels').update(updates).eq('id', id);
    if (error) throw error;
  }

  async toggleHotelStatus(_id: string): Promise<void> {
    throw new Error('Status toggling is disabled');
  }

  async duplicateHotel(id: string): Promise<Hotel> {
    const original = await this.getHotel(id);
    if (!original) throw new Error('Hotel not found');
    return this.createHotel({
      name: `${original.name} (Copy)`,
      ownerName: original.ownerName,
      ownerPhone: original.ownerPhone,
      roomType: original.roomType,
      pricePerNight: original.pricePerNight,
      address: original.address,
      provinceRef: original.provinceRef,
      note: original.note,
    });
  }

  async deleteHotel(id: string): Promise<void> {
    const { error } = await this.supabase.from('hotels').delete().eq('id', id);
    if (error) throw error;
  }

  async deleteAllHotels(): Promise<void> {
    const { error } = await this.supabase.from('hotels').delete().gte('created_at', '1970-01-01');
    if (error) throw error;
  }

  async bulkCreateHotels(inputs: HotelInput[]): Promise<Hotel[]> {
    // Check for duplicates within the batch
    const names = inputs.map(input => input.name.toLowerCase());
    const duplicatesInBatch = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicatesInBatch.length > 0) {
      throw new Error('Duplicate names found in batch');
    }
    // Check for duplicates with existing records
    const { data: existing } = await this.supabase
      .from('hotels')
      .select('name');
    if (existing) {
      const existingNames = existing.map(h => h.name.toLowerCase());
      const duplicates = inputs.filter(input =>
        existingNames.includes(input.name.toLowerCase())
      );
      if (duplicates.length > 0) {
        throw new Error(`The following hotels already exist: ${duplicates.map(d => d.name).join(', ')}`);
      }
    }
    const records = inputs.map(input => ({
      name: input.name,
      owner_name: input.ownerName,
      owner_phone: input.ownerPhone,
      room_type: input.roomType,
      price_per_night: input.pricePerNight,
      address: input.address || '',
      note: input.note || '',
      status: 'active',
      search_keywords: generateSearchKeywords(input.name),
    }));
    const { data, error } = await this.supabase
      .from('hotels')
      .insert(records)
      .select();
    if (error) throw error;
    return (data || []).map(mapHotel);
  }
}
