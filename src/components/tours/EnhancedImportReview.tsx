import { useEffect, useMemo, useState } from 'react';
import Fuse from 'fuse.js';
import type { Tour, EntityRef } from '@/types/tour';
import type { Company, Guide, Nationality, TouristDestination, DetailedExpense, Shopping, Province } from '@/types/master';
import { store } from '@/lib/datastore';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Search, Edit3, Check, X, Plus, Trash2, AlertCircle, ChevronDown, ChevronRight, MapPin, Receipt, Utensils, DollarSign } from 'lucide-react';
import { CompanyDialog } from '@/components/companies/CompanyDialog';
import { GuideDialog } from '@/components/guides/GuideDialog';
import { NationalityDialog } from '@/components/nationalities/NationalityDialog';
import { DestinationDialog } from '@/components/destinations/DestinationDialog';
import { DetailedExpenseDialog } from '@/components/detailed-expenses/DetailedExpenseDialog';
import { ShoppingDialog } from '@/components/shopping/ShoppingDialog';
import { TourEditForm } from '@/components/tours/TourEditForm';

export interface ReviewItem {
  tour: Partial<Tour>;
  raw: { company: string; guide: string; nationality: string };
}

interface EnhancedImportReviewProps {
  items: ReviewItem[];
  onCancel: () => void;
  onConfirm: (tours: Partial<Tour>[]) => void;
  preloadedEntities?: {
    companies: Company[];
    guides: Guide[];
    nationalities: Nationality[];
  };
}

interface SearchableEntity {
  id: string;
  name: string;
  type: 'company' | 'guide' | 'nationality';
}

// Subcollection Section Component
interface SubcollectionSectionProps {
  title: string;
  icon: React.ReactNode;
  items: any[];
  tourIndex: number;
  sectionKey: string;
  expandedSections: { [key: string]: boolean };
  onToggle: () => void;
  onUpdate: (index: number, field: string, value: any) => void;
  onRemove: (index: number) => void;
  matchFunction: ((name: string) => any) | null;
  matchType: string;
}

function SubcollectionSection({ 
  title, 
  icon, 
  items, 
  tourIndex, 
  sectionKey, 
  expandedSections, 
  onToggle, 
  onUpdate, 
  onRemove, 
  matchFunction, 
  matchType 
}: SubcollectionSectionProps) {
  const key = `${tourIndex}-${sectionKey}`;
  const isExpanded = expandedSections[key] || false;

  const renderItem = (item: any, index: number) => {
    if (matchType === 'summary') {
      return (
        <div key={index} className="p-3 bg-gray-50 rounded-md">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Total Tabs</Label>
              <Input
                type="number"
                value={item.totalTabs || 0}
                onChange={(e) => onUpdate(index, 'totalTabs', parseInt(e.target.value) || 0)}
                className="h-7 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Advance Payment</Label>
              <Input
                type="number"
                value={item.advancePayment || 0}
                onChange={(e) => onUpdate(index, 'advancePayment', parseFloat(e.target.value) || 0)}
                className="h-7 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Company Tip</Label>
              <Input
                type="number"
                value={item.companyTip || 0}
                onChange={(e) => onUpdate(index, 'companyTip', parseFloat(e.target.value) || 0)}
                className="h-7 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Final Total</Label>
              <Input
                type="number"
                value={item.finalTotal || 0}
                onChange={(e) => onUpdate(index, 'finalTotal', parseFloat(e.target.value) || 0)}
                className="h-7 text-xs"
              />
            </div>
          </div>
        </div>
      );
    }

    const matchedItem = matchFunction && item.name ? matchFunction(item.name) : null;
    const hasMatch = matchedItem !== null;

    return (
      <div key={index} className="p-3 bg-gray-50 rounded-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {matchType} {index + 1}
            </Badge>
            {hasMatch && (
              <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                <Check className="h-3 w-3 mr-1" />
                Matched
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRemove(index)}
            className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Name</Label>
            <Input
              value={item.name || ''}
              onChange={(e) => onUpdate(index, 'name', e.target.value)}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-xs">Price</Label>
            <Input
              type="number"
              value={item.price || 0}
              onChange={(e) => onUpdate(index, 'price', parseFloat(e.target.value) || 0)}
              className="h-7 text-xs"
            />
          </div>
          {matchType !== 'allowance' && (
            <div className="col-span-2">
              <Label className="text-xs">Date</Label>
              <Input
                type="date"
                value={item.date || ''}
                onChange={(e) => onUpdate(index, 'date', e.target.value)}
                className="h-7 text-xs"
              />
            </div>
          )}
        </div>
        
        {hasMatch && (
          <div className="mt-2 p-2 bg-green-50 rounded text-xs text-green-700">
            <div className="flex items-center justify-between">
              <div>
                <strong>Matched:</strong> {matchedItem.name} (Price: {matchedItem.price})
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Apply matched data to the item
                  onUpdate(index, 'price', matchedItem.price);
                  if (matchedItem.id) {
                    onUpdate(index, 'id', matchedItem.id);
                  }
                }}
                className="h-5 px-2 text-xs bg-green-100 hover:bg-green-200"
              >
                Apply Match
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="border rounded-lg">
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          {icon}
          <span className="font-medium">{title}</span>
          <Badge variant="secondary" className="text-xs">
            {items.length}
          </Badge>
        </div>
      </div>
      
      {isExpanded && (
        <div className="p-3 pt-0 space-y-2">
          {items.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-4">
              No {title.toLowerCase()} found
            </div>
          ) : (
            items.map((item, index) => renderItem(item, index))
          )}
        </div>
      )}
    </div>
  );
}

export function EnhancedImportReview({ items, onCancel, onConfirm, preloadedEntities }: EnhancedImportReviewProps) {
  const [companies, setCompanies] = useState<Company[]>(preloadedEntities?.companies ?? []);
  const [guides, setGuides] = useState<Guide[]>(preloadedEntities?.guides ?? []);
  const [nationalities, setNationalities] = useState<Nationality[]>(preloadedEntities?.nationalities ?? []);
  const [destinations, setDestinations] = useState<TouristDestination[]>([]);
  const [expenses, setExpenses] = useState<DetailedExpense[]>([]);
  const [shoppings, setShoppings] = useState<Shopping[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [draft, setDraft] = useState<ReviewItem[]>(items);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [showDetailedEdit, setShowDetailedEdit] = useState<number | null>(null);
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});

  // Dialog states
  const [openCompanyDialog, setOpenCompanyDialog] = useState(false);
  const [openGuideDialog, setOpenGuideDialog] = useState(false);
  const [openNationalityDialog, setOpenNationalityDialog] = useState(false);
  const [openDestinationDialog, setOpenDestinationDialog] = useState(false);
  const [openExpenseDialog, setOpenExpenseDialog] = useState(false);
  const [openShoppingDialog, setOpenShoppingDialog] = useState(false);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const [targetItemIndex, setTargetItemIndex] = useState<number | null>(null);

  // Load all entities
  useEffect(() => {
    const load = async () => {
      try {
        const [c, g, n, d, e, s, p] = await Promise.all([
          preloadedEntities?.companies ? Promise.resolve(preloadedEntities.companies) : store.listCompanies({}),
          preloadedEntities?.guides ? Promise.resolve(preloadedEntities.guides) : store.listGuides({}),
          preloadedEntities?.nationalities ? Promise.resolve(preloadedEntities.nationalities) : store.listNationalities({}),
          store.listTouristDestinations({}),
          store.listDetailedExpenses({}),
          store.listShoppings({}),
          store.listProvinces({}),
        ]);
        setCompanies(c);
        setGuides(g);
        setNationalities(n);
        setDestinations(d);
        setExpenses(e);
        setShoppings(s);
        setProvinces(p);

        // Auto-match using fuzzy search
        const updatedDraft = items.map(item => {
          const tour = { ...item.tour };
          
          // Fuzzy match company
          if (item.raw.company && !tour.companyRef?.id) {
            const companyFuse = new Fuse(c, { 
              keys: ['name'], 
              threshold: 0.4,
              includeScore: true,
              ignoreLocation: true,
            });
            const companyMatch = companyFuse.search(item.raw.company);
            if (companyMatch.length > 0 && companyMatch[0].score && companyMatch[0].score < 0.4) {
              const matched = companyMatch[0].item;
              tour.companyRef = { id: matched.id, nameAtBooking: matched.name };
            }
          }

          // Fuzzy match guide
          if (item.raw.guide && !tour.guideRef?.id) {
            const guideFuse = new Fuse(g, { 
              keys: ['name'], 
              threshold: 0.4,
              includeScore: true,
              ignoreLocation: true,
            });
            const guideMatch = guideFuse.search(item.raw.guide);
            if (guideMatch.length > 0 && guideMatch[0].score && guideMatch[0].score < 0.4) {
              const matched = guideMatch[0].item;
              tour.guideRef = { id: matched.id, nameAtBooking: matched.name };
            }
          }

          // Fuzzy match nationality
          if (item.raw.nationality && !tour.clientNationalityRef?.id) {
            const nationalityFuse = new Fuse(n, { 
              keys: ['name', 'iso2'], 
              threshold: 0.3,
              includeScore: true,
              ignoreLocation: true,
            });
            const nationalityMatch = nationalityFuse.search(item.raw.nationality);
            if (nationalityMatch.length > 0 && nationalityMatch[0].score && nationalityMatch[0].score < 0.3) {
              const matched = nationalityMatch[0].item;
              tour.clientNationalityRef = { id: matched.id, nameAtBooking: matched.name };
            }
          }

          // Fuzzy match destinations - auto-apply matched values
          if (tour.destinations && tour.destinations.length > 0) {
            tour.destinations = tour.destinations.map(dest => {
              if (!dest.name) return dest;
              const matched = matchDestination(dest.name);
              if (matched) {
                return { 
                  ...dest, 
                  name: matched.name,
                  price: matched.price,
                  matchedId: matched.id, 
                  matchedPrice: matched.price 
                };
              }
              return dest;
            });
          }

          // Fuzzy match expenses - auto-apply matched values
          if (tour.expenses && tour.expenses.length > 0) {
            tour.expenses = tour.expenses.map(exp => {
              if (!exp.name) return exp;
              const matched = matchExpense(exp.name);
              if (matched) {
                return { 
                  ...exp, 
                  name: matched.name,
                  price: matched.price,
                  matchedId: matched.id, 
                  matchedPrice: matched.price 
                };
              }
              return exp;
            });
          }

          // Fuzzy match meals - auto-apply matched values (using shopping data)
          if (tour.meals && tour.meals.length > 0) {
            tour.meals = tour.meals.map(meal => {
              if (!meal.name) return meal;
              const matched = matchShopping(meal.name);
              if (matched) {
                return { 
                  ...meal, 
                  name: matched.name,
                  price: matched.price,
                  matchedId: matched.id, 
                  matchedPrice: matched.price 
                };
              }
              return meal;
            });
          }

          return { ...item, tour };
        });

        setDraft(updatedDraft);
      } catch (error) {
        console.error('Failed to load entities:', error);
        toast.error('Failed to load master data');
      }
    };

    load();
  }, [items, preloadedEntities]);

  // Filter tours based on search query
  const filteredTours = useMemo(() => {
    if (!searchQuery.trim()) return draft;
    
    const fuse = new Fuse(draft, {
      keys: [
        'tour.tourCode',
        'tour.clientName',
        'tour.companyRef.nameAtBooking',
        'tour.guideRef.nameAtBooking',
        'tour.clientNationalityRef.nameAtBooking',
        'raw.company',
        'raw.guide',
        'raw.nationality',
        'tour.destinations.name',
        'tour.expenses.name',
        'tour.meals.name'
      ],
      threshold: 0.4,
      includeScore: true,
    });
    
    return fuse.search(searchQuery).map(result => result.item);
  }, [draft, searchQuery]);

  // Validation - only show warnings, not block import
  const validationWarnings = useMemo(() => {
    const warnings: { [key: number]: string[] } = {};
    
    draft.forEach((item, index) => {
      const tourWarnings: string[] = [];
      const tour = item.tour;
      
      if (!tour.tourCode) tourWarnings.push('Tour code is missing');
      if (!tour.clientName) tourWarnings.push('Client name is missing');
      if (!tour.startDate) tourWarnings.push('Start date is missing');
      if (!tour.endDate) tourWarnings.push('End date is missing');
      if (!tour.companyRef?.id) tourWarnings.push('Company is not selected');
      if (!tour.guideRef?.id) tourWarnings.push('Guide is not selected');
      if (!tour.clientNationalityRef?.id) tourWarnings.push('Nationality is not selected');
      
      if (tourWarnings.length > 0) {
        warnings[index] = tourWarnings;
      }
    });
    
    return warnings;
  }, [draft]);

  // Final validation for import
  const validateForImport = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    draft.forEach((item, index) => {
      const tour = item.tour;
      const tourName = tour.tourCode || `Tour ${index + 1}`;
      
      if (!tour.tourCode) errors.push(`${tourName}: Tour code is required`);
      if (!tour.clientName) errors.push(`${tourName}: Client name is required`);
      if (!tour.startDate) errors.push(`${tourName}: Start date is required`);
      if (!tour.endDate) errors.push(`${tourName}: End date is required`);
      if (!tour.companyRef?.id) errors.push(`${tourName}: Company is required`);
      if (!tour.guideRef?.id) errors.push(`${tourName}: Guide is required`);
      if (!tour.clientNationalityRef?.id) errors.push(`${tourName}: Nationality is required`);
    });
    
    return { valid: errors.length === 0, errors };
  };

  // Entity search functions
  const searchEntities = (query: string, type: 'company' | 'guide' | 'nationality') => {
    if (!query.trim()) return [];
    
    let entities: SearchableEntity[] = [];
    if (type === 'company') {
      entities = companies.map(c => ({ id: c.id, name: c.name, type: 'company' as const }));
    } else if (type === 'guide') {
      entities = guides.map(g => ({ id: g.id, name: g.name, type: 'guide' as const }));
    } else {
      entities = nationalities.map(n => ({ id: n.id, name: n.name, type: 'nationality' as const }));
    }
    
    const fuse = new Fuse(entities, {
      keys: ['name'],
      threshold: 0.4,
      includeScore: true,
    });
    
    return fuse.search(query).map(result => result.item);
  };

  // Fuse.js matching for subcollections
  const matchDestination = (destinationName: string) => {
    if (!destinationName.trim()) return null;
    
    const fuse = new Fuse(destinations, {
      keys: ['name'],
      threshold: 0.4,
      includeScore: true,
      ignoreLocation: true,
    });
    
    const matches = fuse.search(destinationName);
    return matches.length > 0 && matches[0].score && matches[0].score < 0.4 ? matches[0].item : null;
  };

  const matchExpense = (expenseName: string) => {
    if (!expenseName.trim()) return null;
    
    const fuse = new Fuse(expenses, {
      keys: ['name'],
      threshold: 0.4,
      includeScore: true,
      ignoreLocation: true,
    });
    
    const matches = fuse.search(expenseName);
    return matches.length > 0 && matches[0].score && matches[0].score < 0.4 ? matches[0].item : null;
  };

  const matchShopping = (shoppingName: string) => {
    if (!shoppingName.trim()) return null;
    
    const fuse = new Fuse(shoppings, {
      keys: ['name'],
      threshold: 0.4,
      includeScore: true,
      ignoreLocation: true,
    });
    
    const matches = fuse.search(shoppingName);
    return matches.length > 0 && matches[0].score && matches[0].score < 0.4 ? matches[0].item : null;
  };

  // Toggle expanded sections
  const toggleSection = (tourIndex: number, section: string) => {
    const key = `${tourIndex}-${section}`;
    setExpandedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Update subcollection items
  const updateDestination = (tourIndex: number, destIndex: number, field: string, value: any) => {
    setDraft(prev => prev.map((item, i) => {
      if (i === tourIndex) {
        const destinations = [...(item.tour.destinations || [])];
        destinations[destIndex] = { ...destinations[destIndex], [field]: value };
        return { ...item, tour: { ...item.tour, destinations } };
      }
      return item;
    }));
  };

  const updateExpense = (tourIndex: number, expIndex: number, field: string, value: any) => {
    setDraft(prev => prev.map((item, i) => {
      if (i === tourIndex) {
        const expenses = [...(item.tour.expenses || [])];
        expenses[expIndex] = { ...expenses[expIndex], [field]: value };
        return { ...item, tour: { ...item.tour, expenses } };
      }
      return item;
    }));
  };

  const updateMeal = (tourIndex: number, mealIndex: number, field: string, value: any) => {
    setDraft(prev => prev.map((item, i) => {
      if (i === tourIndex) {
        const meals = [...(item.tour.meals || [])];
        meals[mealIndex] = { ...meals[mealIndex], [field]: value };
        return { ...item, tour: { ...item.tour, meals } };
      }
      return item;
    }));
  };

  const updateAllowance = (tourIndex: number, allowIndex: number, field: string, value: any) => {
    setDraft(prev => prev.map((item, i) => {
      if (i === tourIndex) {
        const allowances = [...(item.tour.allowances || [])];
        allowances[allowIndex] = { ...allowances[allowIndex], [field]: value };
        return { ...item, tour: { ...item.tour, allowances } };
      }
      return item;
    }));
  };

  const removeDestination = (tourIndex: number, destIndex: number) => {
    setDraft(prev => prev.map((item, i) => {
      if (i === tourIndex) {
        const destinations = [...(item.tour.destinations || [])];
        destinations.splice(destIndex, 1);
        return { ...item, tour: { ...item.tour, destinations } };
      }
      return item;
    }));
  };

  const removeExpense = (tourIndex: number, expIndex: number) => {
    setDraft(prev => prev.map((item, i) => {
      if (i === tourIndex) {
        const expenses = [...(item.tour.expenses || [])];
        expenses.splice(expIndex, 1);
        return { ...item, tour: { ...item.tour, expenses } };
      }
      return item;
    }));
  };

  const removeMeal = (tourIndex: number, mealIndex: number) => {
    setDraft(prev => prev.map((item, i) => {
      if (i === tourIndex) {
        const meals = [...(item.tour.meals || [])];
        meals.splice(mealIndex, 1);
        return { ...item, tour: { ...item.tour, meals } };
      }
      return item;
    }));
  };

  const removeAllowance = (tourIndex: number, allowIndex: number) => {
    setDraft(prev => prev.map((item, i) => {
      if (i === tourIndex) {
        const allowances = [...(item.tour.allowances || [])];
        allowances.splice(allowIndex, 1);
        return { ...item, tour: { ...item.tour, allowances } };
      }
      return item;
    }));
  };

  // Update tour field
  const updateTourField = (index: number, field: string, value: any) => {
    setDraft(prev => prev.map((item, i) => 
      i === index 
        ? { ...item, tour: { ...item.tour, [field]: value } }
        : item
    ));
  };

  // Update entity reference
  const updateEntityRef = (index: number, entityType: 'companyRef' | 'guideRef' | 'clientNationalityRef', entity: any) => {
    setDraft(prev => prev.map((item, i) => 
      i === index 
        ? { 
            ...item, 
            tour: { 
              ...item.tour, 
              [entityType]: { id: entity.id, nameAtBooking: entity.name }
            }
          }
        : item
    ));
  };

  // Remove tour
  const removeTour = (index: number) => {
    setDraft(prev => prev.filter((_, i) => i !== index));
  };

  // Create new entity handlers
  const handleCreateCompany = async (data: any) => {
    try {
      const newCompany = await store.createCompany(data);
      setCompanies(prev => [...prev, newCompany]);
      toast.success('Company created successfully');
      setOpenCompanyDialog(false);
    } catch (error) {
      toast.error('Failed to create company');
    }
  };

  const handleCreateGuide = async (data: any) => {
    try {
      const newGuide = await store.createGuide(data);
      setGuides(prev => [...prev, newGuide]);
      toast.success('Guide created successfully');
      setOpenGuideDialog(false);
    } catch (error) {
      toast.error('Failed to create guide');
    }
  };

  const handleCreateNationality = async (data: any) => {
    try {
      const newNationality = await store.createNationality(data);
      setNationalities(prev => [...prev, newNationality]);
      toast.success('Nationality created successfully');
      setOpenNationalityDialog(false);
    } catch (error) {
      toast.error('Failed to create nationality');
    }
  };

  const handleCreateDestination = async (data: any) => {
    try {
      const newDestination = await store.createTouristDestination(data);
      setDestinations(prev => [...prev, newDestination]);
      toast.success('Destination created successfully');
      setOpenDestinationDialog(false);
    } catch (error) {
      toast.error('Failed to create destination');
    }
  };

  const handleCreateExpense = async (data: any) => {
    try {
      const newExpense = await store.createDetailedExpense(data);
      setExpenses(prev => [...prev, newExpense]);
      toast.success('Expense created successfully');
      setOpenExpenseDialog(false);
    } catch (error) {
      toast.error('Failed to create expense');
    }
  };

  const handleCreateShopping = async (data: any) => {
    try {
      const newShopping = await store.createShopping(data);
      setShoppings(prev => [...prev, newShopping]);
      toast.success('Shopping created successfully');
      setOpenShoppingDialog(false);
    } catch (error) {
      toast.error('Failed to create shopping');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Import Review</h2>
          <p className="text-muted-foreground">
            Review and edit {draft.length} tour(s) before importing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={Object.keys(validationWarnings).length === 0 ? "default" : "secondary"}>
            {Object.keys(validationWarnings).length === 0 ? "Ready to import" : `${Object.keys(validationWarnings).length} warnings`}
          </Badge>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search tours by tour code, client name, company, guide, or nationality..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="validation">Validation</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <ScrollArea className="h-[500px]">
            <div className="space-y-4">
              {filteredTours.map((item, index) => {
                const originalIndex = draft.findIndex(d => d === item);
                const tour = item.tour;
                const warnings = validationWarnings[originalIndex] || [];
                
                return (
                  <Card key={originalIndex} className={warnings.length > 0 ? "border-yellow-500" : ""}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{tour.tourCode || `Tour ${originalIndex + 1}`}</CardTitle>
                        <div className="flex items-center gap-2">
                          {warnings.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {warnings.length} warning{warnings.length > 1 ? 's' : ''}
                            </Badge>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowDetailedEdit(originalIndex)}
                          >
                            <Edit3 className="h-4 w-4 mr-1" />
                            Edit Details
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeTour(originalIndex)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Client Name</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              value={tour.clientName || ''}
                              onChange={(e) => updateTourField(originalIndex, 'clientName', e.target.value)}
                              className="h-8"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Tour Code</Label>
                          <Input
                            value={tour.tourCode || ''}
                            onChange={(e) => updateTourField(originalIndex, 'tourCode', e.target.value)}
                            className="h-8"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Company</Label>
                          <EntitySelector
                            entities={companies}
                            selected={tour.companyRef}
                            onSelect={(entity) => updateEntityRef(originalIndex, 'companyRef', entity)}
                            onCreateNew={() => {
                              setTargetIndex(originalIndex);
                              setOpenCompanyDialog(true);
                            }}
                            placeholder="Select company"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Guide</Label>
                          <EntitySelector
                            entities={guides}
                            selected={tour.guideRef}
                            onSelect={(entity) => updateEntityRef(originalIndex, 'guideRef', entity)}
                            onCreateNew={() => {
                              setTargetIndex(originalIndex);
                              setOpenGuideDialog(true);
                            }}
                            placeholder="Select guide"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Nationality</Label>
                          <EntitySelector
                            entities={nationalities}
                            selected={tour.clientNationalityRef}
                            onSelect={(entity) => updateEntityRef(originalIndex, 'clientNationalityRef', entity)}
                            onCreateNew={() => {
                              setTargetIndex(originalIndex);
                              setOpenNationalityDialog(true);
                            }}
                            placeholder="Select nationality"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Start Date</Label>
                          <Input
                            type="date"
                            value={tour.startDate || ''}
                            onChange={(e) => updateTourField(originalIndex, 'startDate', e.target.value)}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">End Date</Label>
                          <Input
                            type="date"
                            value={tour.endDate || ''}
                            onChange={(e) => updateTourField(originalIndex, 'endDate', e.target.value)}
                            className="h-8"
                          />
                        </div>
                      </div>

                      {/* Subcollections */}
                      <div className="space-y-3">
                        {/* Destinations */}
                        <SubcollectionSection
                          title="Destinations"
                          icon={<MapPin className="h-4 w-4" />}
                          items={tour.destinations || []}
                          tourIndex={originalIndex}
                          sectionKey="destinations"
                          expandedSections={expandedSections}
                          onToggle={() => toggleSection(originalIndex, 'destinations')}
                          onUpdate={(index, field, value) => updateDestination(originalIndex, index, field, value)}
                          onRemove={(index) => removeDestination(originalIndex, index)}
                          matchFunction={matchDestination}
                          matchType="destination"
                        />

                        {/* Expenses */}
                        <SubcollectionSection
                          title="Expenses"
                          icon={<Receipt className="h-4 w-4" />}
                          items={tour.expenses || []}
                          tourIndex={originalIndex}
                          sectionKey="expenses"
                          expandedSections={expandedSections}
                          onToggle={() => toggleSection(originalIndex, 'expenses')}
                          onUpdate={(index, field, value) => updateExpense(originalIndex, index, field, value)}
                          onRemove={(index) => removeExpense(originalIndex, index)}
                          matchFunction={matchExpense}
                          matchType="expense"
                        />

                        {/* Meals */}
                        <SubcollectionSection
                          title="Meals"
                          icon={<Utensils className="h-4 w-4" />}
                          items={tour.meals || []}
                          tourIndex={originalIndex}
                          sectionKey="meals"
                          expandedSections={expandedSections}
                          onToggle={() => toggleSection(originalIndex, 'meals')}
                          onUpdate={(index, field, value) => updateMeal(originalIndex, index, field, value)}
                          onRemove={(index) => removeMeal(originalIndex, index)}
                          matchFunction={matchShopping}
                          matchType="meal"
                        />

                        {/* Allowances */}
                        <SubcollectionSection
                          title="Allowances"
                          icon={<DollarSign className="h-4 w-4" />}
                          items={tour.allowances || []}
                          tourIndex={originalIndex}
                          sectionKey="allowances"
                          expandedSections={expandedSections}
                          onToggle={() => toggleSection(originalIndex, 'allowances')}
                          onUpdate={(index, field, value) => updateAllowance(originalIndex, index, field, value)}
                          onRemove={(index) => removeAllowance(originalIndex, index)}
                          matchFunction={null}
                          matchType="allowance"
                        />

                        {/* Summary */}
                        <SubcollectionSection
                          title="Summary"
                          icon={<DollarSign className="h-4 w-4" />}
                          items={tour.summary ? [tour.summary] : []}
                          tourIndex={originalIndex}
                          sectionKey="summary"
                          expandedSections={expandedSections}
                          onToggle={() => toggleSection(originalIndex, 'summary')}
                          onUpdate={(index, field, value) => updateTourField(originalIndex, 'summary', { ...tour.summary, [field]: value })}
                          onRemove={() => {}}
                          matchFunction={null}
                          matchType="summary"
                        />
                      </div>

                      {warnings.length > 0 && (
                        <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-md border border-yellow-200">
                          <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                          <div className="text-sm text-yellow-800">
                            <div className="font-medium">Missing Information:</div>
                            <ul className="list-disc list-inside mt-1">
                              {warnings.map((warning, i) => (
                                <li key={i}>{warning}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="validation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Review Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(validationWarnings).length === 0 ? (
                <div className="flex items-center gap-2 text-green-600">
                  <Check className="h-4 w-4" />
                  <span>All tours are complete and ready to import</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-yellow-800 font-medium">
                    {Object.keys(validationWarnings).length} tour(s) have missing information:
                  </div>
                  {Object.entries(validationWarnings).map(([index, warnings]) => {
                    const tour = draft[parseInt(index)];
                    return (
                      <div key={index} className="p-3 bg-yellow-50 rounded-md border border-yellow-200">
                        <div className="font-medium text-yellow-800">
                          {tour.tour.tourCode || `Tour ${parseInt(index) + 1}`}
                        </div>
                        <ul className="list-disc list-inside mt-1 text-sm text-yellow-700">
                          {warnings.map((warning, i) => (
                            <li key={i}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                  <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
                    <div className="text-blue-800 text-sm">
                      <strong>Note:</strong> You can still import tours with missing information. 
                      Missing fields can be filled in after import or left empty if not needed.
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={() => {
            try {
              const validation = validateForImport();
              if (!validation.valid) {
                toast.error(`Cannot import: ${validation.errors.join(', ')}`, { duration: 8000 });
                return;
              }
              // Process matched data before confirming import
              const finalTours = draft.map(d => {
                const tour = { ...d.tour };
                
                // Remove matched metadata fields before saving
                if (tour.destinations) {
                  tour.destinations = tour.destinations.map(({ matchedId, matchedPrice, ...dest }) => dest);
                }
                
                if (tour.expenses) {
                  tour.expenses = tour.expenses.map(({ matchedId, matchedPrice, ...exp }) => exp);
                }
                
                if (tour.meals) {
                  tour.meals = tour.meals.map(({ matchedId, matchedPrice, ...meal }) => meal);
                }
                
                return tour;
              });
              
              onConfirm(finalTours);
            } catch (error) {
              console.error('Import confirmation error:', error);
              const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
              toast.error(`Import failed: ${errorMsg}`, { duration: 8000 });
            }
          }}
        >
          Import {draft.length} tour(s)
        </Button>
      </div>

      {/* Entity Creation Dialogs */}
      <CompanyDialog open={openCompanyDialog} onOpenChange={setOpenCompanyDialog} onSubmit={handleCreateCompany} />
      <GuideDialog open={openGuideDialog} onOpenChange={setOpenGuideDialog} onSubmit={handleCreateGuide} />
      <NationalityDialog open={openNationalityDialog} onOpenChange={setOpenNationalityDialog} onSubmit={handleCreateNationality} />
      <DestinationDialog open={openDestinationDialog} onOpenChange={setOpenDestinationDialog} onSubmit={handleCreateDestination} />
      <DetailedExpenseDialog open={openExpenseDialog} onOpenChange={setOpenExpenseDialog} onSubmit={handleCreateExpense} />
      <ShoppingDialog open={openShoppingDialog} onOpenChange={setOpenShoppingDialog} onSubmit={handleCreateShopping} />

      {/* Detailed Edit Dialog */}
      <Dialog open={showDetailedEdit !== null} onOpenChange={() => setShowDetailedEdit(null)}>
        <DialogContent className="w-[95vw] sm:max-w-6xl max-h-[95vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              Edit Tour: {showDetailedEdit !== null ? draft[showDetailedEdit]?.tour.tourCode || `Tour ${showDetailedEdit + 1}` : ''}
            </DialogTitle>
          </DialogHeader>
          {showDetailedEdit !== null && (
            <div className="flex-1 overflow-hidden">
              <TourEditForm
                tour={draft[showDetailedEdit].tour}
                companies={companies}
                guides={guides}
                nationalities={nationalities}
                onUpdate={(updatedTour) => {
                  setDraft(prev => prev.map((item, i) => 
                    i === showDetailedEdit 
                      ? { ...item, tour: updatedTour }
                      : item
                  ));
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


// Entity Selector Component
interface EntitySelectorProps {
  entities: any[];
  selected: EntityRef | undefined;
  onSelect: (entity: any) => void;
  onCreateNew: () => void;
  placeholder: string;
}

function EntitySelector({ entities, selected, onSelect, onCreateNew, placeholder }: EntitySelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredEntities = useMemo(() => {
    if (!searchQuery.trim()) return entities;
    
    const fuse = new Fuse(entities, {
      keys: ['name'],
      threshold: 0.4,
      includeScore: true,
    });
    
    return fuse.search(searchQuery).map(result => result.item);
  }, [entities, searchQuery]);

  return (
    <div className="relative">
      <Select
        value={selected?.id || ''}
        onValueChange={(value) => {
          const entity = entities.find(e => e.id === value);
          if (entity) onSelect(entity);
        }}
        onOpenChange={setIsOpen}
      >
        <SelectTrigger className="h-8">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <div className="p-2">
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8"
            />
          </div>
          <Separator />
          {filteredEntities.map((entity) => (
            <SelectItem key={entity.id} value={entity.id}>
              {entity.name}
            </SelectItem>
          ))}
          <Separator />
          <SelectItem value="create-new" onSelect={onCreateNew}>
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create new
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}