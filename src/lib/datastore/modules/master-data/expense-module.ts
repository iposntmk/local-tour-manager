import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import type { ExpenseCategory, ExpenseCategoryInput, DetailedExpense, DetailedExpenseInput } from '@/types/master';
import type { SearchQuery } from '@/types/datastore';
import { generateSearchKeywords } from '@/lib/string-utils';
import { mapExpenseCategory, mapDetailedExpense } from '../mappers';
import type { ExpenseCategoryUpdate, DetailedExpenseUpdate } from '../store-types';

export class ExpenseModule {
  declare protected supabase: SupabaseClient<Database>;

  async toggleExpenseCategoryStatus(_id: string): Promise<void> {
    throw new Error('Status toggling is disabled');
  }

  async listExpenseCategories(query?: SearchQuery): Promise<ExpenseCategory[]> {
    let qb = this.supabase.from('expense_categories').select('*').order('name');
    if (query?.search) qb = qb.ilike('name', `%${query.search}%`);
    const { data, error } = await qb;
    if (error) throw error;
    return (data || []).map(mapExpenseCategory);
  }

  async getExpenseCategory(id: string): Promise<ExpenseCategory | null> {
    const { data, error } = await this.supabase.from('expense_categories').select('*').eq('id', id).single();
    if (error) return null;
    return data ? mapExpenseCategory(data) : null;
  }

  async createExpenseCategory(category: ExpenseCategoryInput): Promise<ExpenseCategory> {
    const { data: existing } = await this.supabase.from('expense_categories').select('id').ilike('name', category.name).maybeSingle();
    if (existing) throw new Error('An expense category with this name already exists');

    const { data, error } = await this.supabase.from('expense_categories').insert({
      name: category.name,
      status: 'active',
      search_keywords: generateSearchKeywords(category.name),
    }).select().single();
    if (error) throw error;
    return mapExpenseCategory(data);
  }

  async updateExpenseCategory(id: string, category: Partial<ExpenseCategory>): Promise<void> {
    const updates: ExpenseCategoryUpdate = {};
    if (category.name !== undefined) {
      const { data: dup } = await this.supabase.from('expense_categories').select('id').ilike('name', category.name).neq('id', id).maybeSingle();
      if (dup) throw new Error('An expense category with this name already exists');
      updates.name = category.name;
      updates.search_keywords = generateSearchKeywords(category.name);
    }
    const { error } = await this.supabase.from('expense_categories').update(updates).eq('id', id);
    if (error) throw error;
  }

  async deleteExpenseCategory(id: string): Promise<void> {
    const { error } = await this.supabase.from('expense_categories').delete().eq('id', id);
    if (error) throw error;
  }

  async duplicateExpenseCategory(id: string): Promise<ExpenseCategory> {
    const original = await this.getExpenseCategory(id);
    if (!original) throw new Error('Expense category not found');
    return this.createExpenseCategory({ name: `${original.name} (Copy)` });
  }

  async deleteAllExpenseCategories(): Promise<void> {
    const { error } = await this.supabase.from('expense_categories').delete().gte('created_at', '1970-01-01');
    if (error) throw error;
  }

  async bulkCreateExpenseCategories(inputs: ExpenseCategoryInput[]): Promise<ExpenseCategory[]> {
    const names = inputs.map((i) => i.name.toLowerCase());
    const dups = names.filter((n, idx) => names.indexOf(n) !== idx);
    if (dups.length > 0) throw new Error('Duplicate names found in batch');

    const { data: existing } = await this.supabase.from('expense_categories').select('name');
    if (existing) {
      const existingNames = existing.map((c) => c.name.toLowerCase());
      const conflicts = inputs.filter((i) => existingNames.includes(i.name.toLowerCase()));
      if (conflicts.length > 0) throw new Error(`The following expense categories already exist: ${conflicts.map((d) => d.name).join(', ')}`);
    }

    const { data, error } = await this.supabase.from('expense_categories').insert(
      inputs.map((i) => ({ name: i.name, status: 'active', search_keywords: generateSearchKeywords(i.name) }))
    ).select();
    if (error) throw error;
    return (data || []).map(mapExpenseCategory);
  }

  async listDetailedExpenses(query?: SearchQuery): Promise<DetailedExpense[]> {
    let qb = this.supabase.from('detailed_expenses').select('*').order('name');
    if (query?.status) qb = qb.eq('status', query.status);
    if (query?.search) qb = qb.ilike('name', `%${query.search}%`);
    const { data, error } = await qb;
    if (error) throw error;
    return (data || []).map(mapDetailedExpense);
  }

  async getDetailedExpense(id: string): Promise<DetailedExpense | null> {
    const { data, error } = await this.supabase.from('detailed_expenses').select('*').eq('id', id).single();
    if (error) return null;
    return data ? mapDetailedExpense(data) : null;
  }

  async createDetailedExpense(expense: DetailedExpenseInput): Promise<DetailedExpense> {
    const { data: existing } = await this.supabase.from('detailed_expenses').select('id').ilike('name', expense.name).maybeSingle();
    if (existing) throw new Error('A detailed expense with this name already exists');

    const { data, error } = await this.supabase.from('detailed_expenses').insert({
      name: expense.name,
      price: expense.price,
      category_id: expense.categoryRef.id,
      category_name_at_booking: expense.categoryRef.nameAtBooking,
      status: 'active',
      search_keywords: generateSearchKeywords(expense.name),
    }).select().single();
    if (error) throw error;
    return mapDetailedExpense(data);
  }

  async updateDetailedExpense(id: string, expense: Partial<DetailedExpense>): Promise<void> {
    const updates: DetailedExpenseUpdate = {};
    if (expense.name !== undefined) {
      const { data: dup } = await this.supabase.from('detailed_expenses').select('id').ilike('name', expense.name).neq('id', id).maybeSingle();
      if (dup) throw new Error('A detailed expense with this name already exists');
      updates.name = expense.name;
      updates.search_keywords = generateSearchKeywords(expense.name);
    }
    if (expense.price !== undefined) updates.price = expense.price;
    if (expense.categoryRef !== undefined) {
      updates.category_id = expense.categoryRef.id;
      updates.category_name_at_booking = expense.categoryRef.nameAtBooking;
    }
    if (expense.status !== undefined) updates.status = expense.status;
    const { error } = await this.supabase.from('detailed_expenses').update(updates).eq('id', id);
    if (error) throw error;
  }

  async deleteDetailedExpense(id: string): Promise<void> {
    const { error } = await this.supabase.from('detailed_expenses').update({ status: 'inactive' }).eq('id', id);
    if (error) throw error;
  }

  async toggleDetailedExpenseStatus(id: string): Promise<void> {
    const expense = await this.getDetailedExpense(id);
    if (!expense) throw new Error('Detailed expense not found');
    const newStatus = expense.status === 'active' ? 'inactive' : 'active';
    const { error } = await this.supabase.from('detailed_expenses').update({ status: newStatus }).eq('id', id);
    if (error) throw error;
  }

  async duplicateDetailedExpense(id: string): Promise<DetailedExpense> {
    const original = await this.getDetailedExpense(id);
    if (!original) throw new Error('Detailed expense not found');
    return this.createDetailedExpense({ name: `${original.name} (Copy)`, price: original.price, categoryRef: original.categoryRef });
  }

  async deleteAllDetailedExpenses(): Promise<void> {
    const { error } = await this.supabase.from('detailed_expenses').delete().gte('created_at', '1970-01-01');
    if (error) throw error;
  }

  async bulkCreateDetailedExpenses(inputs: DetailedExpenseInput[]): Promise<DetailedExpense[]> {
    const names = inputs.map((i) => i.name.toLowerCase());
    const dups = names.filter((n, idx) => names.indexOf(n) !== idx);
    if (dups.length > 0) throw new Error('Duplicate names found in batch');

    const { data: existing } = await this.supabase.from('detailed_expenses').select('name');
    if (existing) {
      const existingNames = existing.map((e) => e.name.toLowerCase());
      const conflicts = inputs.filter((i) => existingNames.includes(i.name.toLowerCase()));
      if (conflicts.length > 0) throw new Error(`The following detailed expenses already exist: ${conflicts.map((d) => d.name).join(', ')}`);
    }

    const { data, error } = await this.supabase.from('detailed_expenses').insert(
      inputs.map((i) => ({
        name: i.name,
        price: i.price,
        category_id: i.categoryRef.id,
        category_name_at_booking: i.categoryRef.nameAtBooking,
        status: 'active',
        search_keywords: generateSearchKeywords(i.name),
      }))
    ).select();
    if (error) throw error;
    return (data || []).map(mapDetailedExpense);
  }
}
