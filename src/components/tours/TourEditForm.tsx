import { useState } from 'react';
import type { Tour, Destination, Expense, Meal, Allowance } from '@/types/tour';
import type { Company, Guide, Nationality } from '@/types/master';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Edit3 } from 'lucide-react';
import Fuse from 'fuse.js';

interface TourEditFormProps {
  tour: Partial<Tour>;
  companies: Company[];
  guides: Guide[];
  nationalities: Nationality[];
  onUpdate: (tour: Partial<Tour>) => void;
}

export function TourEditForm({ tour, companies, guides, nationalities, onUpdate }: TourEditFormProps) {
  const [activeTab, setActiveTab] = useState('basic');
  const [searchQuery, setSearchQuery] = useState('');

  const updateField = (field: string, value: any) => {
    onUpdate({ ...tour, [field]: value });
  };

  const updateEntityRef = (entityType: 'companyRef' | 'guideRef' | 'clientNationalityRef', entity: any) => {
    onUpdate({
      ...tour,
      [entityType]: { id: entity.id, nameAtBooking: entity.name }
    });
  };

  const addDestination = () => {
    const newDestination: Destination = {
      name: '',
      price: 0,
      date: tour.startDate || ''
    };
    updateField('destinations', [...(tour.destinations || []), newDestination]);
  };

  const updateDestination = (index: number, destination: Destination) => {
    const destinations = [...(tour.destinations || [])];
    destinations[index] = destination;
    updateField('destinations', destinations);
  };

  const removeDestination = (index: number) => {
    const destinations = [...(tour.destinations || [])];
    destinations.splice(index, 1);
    updateField('destinations', destinations);
  };

  const addExpense = () => {
    const newExpense: Expense = {
      name: '',
      price: 0,
      date: tour.startDate || ''
    };
    updateField('expenses', [...(tour.expenses || []), newExpense]);
  };

  const updateExpense = (index: number, expense: Expense) => {
    const expenses = [...(tour.expenses || [])];
    expenses[index] = expense;
    updateField('expenses', expenses);
  };

  const removeExpense = (index: number) => {
    const expenses = [...(tour.expenses || [])];
    expenses.splice(index, 1);
    updateField('expenses', expenses);
  };

  const addMeal = () => {
    const newMeal: Meal = {
      name: '',
      price: 0,
      date: tour.startDate || ''
    };
    updateField('meals', [...(tour.meals || []), newMeal]);
  };

  const updateMeal = (index: number, meal: Meal) => {
    const meals = [...(tour.meals || [])];
    meals[index] = meal;
    updateField('meals', meals);
  };

  const removeMeal = (index: number) => {
    const meals = [...(tour.meals || [])];
    meals.splice(index, 1);
    updateField('meals', meals);
  };

  const addAllowance = () => {
    const newAllowance: Allowance = {
      date: tour.startDate || '',
      province: '',
      amount: 0
    };
    updateField('allowances', [...(tour.allowances || []), newAllowance]);
  };

  const updateAllowance = (index: number, allowance: Allowance) => {
    const allowances = [...(tour.allowances || [])];
    allowances[index] = allowance;
    updateField('allowances', allowances);
  };

  const removeAllowance = (index: number) => {
    const allowances = [...(tour.allowances || [])];
    allowances.splice(index, 1);
    updateField('allowances', allowances);
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="destinations">Destinations</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="meals">Meals</TabsTrigger>
          <TabsTrigger value="allowances">Allowances</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tourCode">Tour Code</Label>
                  <Input
                    id="tourCode"
                    value={tour.tourCode || ''}
                    onChange={(e) => updateField('tourCode', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="clientName">Client Name</Label>
                  <Input
                    id="clientName"
                    value={tour.clientName || ''}
                    onChange={(e) => updateField('clientName', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="adults">Adults</Label>
                  <Input
                    id="adults"
                    type="number"
                    value={tour.adults || 0}
                    onChange={(e) => updateField('adults', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="children">Children</Label>
                  <Input
                    id="children"
                    type="number"
                    value={tour.children || 0}
                    onChange={(e) => updateField('children', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="totalGuests">Total Guests</Label>
                  <Input
                    id="totalGuests"
                    type="number"
                    value={tour.totalGuests || 0}
                    onChange={(e) => updateField('totalGuests', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={tour.startDate || ''}
                    onChange={(e) => updateField('startDate', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={tour.endDate || ''}
                    onChange={(e) => updateField('endDate', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="driverName">Driver Name</Label>
                  <Input
                    id="driverName"
                    value={tour.driverName || ''}
                    onChange={(e) => updateField('driverName', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="clientPhone">Client Phone</Label>
                  <Input
                    id="clientPhone"
                    value={tour.clientPhone || ''}
                    onChange={(e) => updateField('clientPhone', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="destinations" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Destinations</CardTitle>
                <Button onClick={addDestination} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Destination
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {(tour.destinations || []).map((destination, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <Badge variant="outline">Destination {index + 1}</Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeDestination(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label>Name</Label>
                            <Input
                              value={destination.name}
                              onChange={(e) => updateDestination(index, { ...destination, name: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>Price</Label>
                            <Input
                              type="number"
                              value={destination.price}
                              onChange={(e) => updateDestination(index, { ...destination, price: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                          <div>
                            <Label>Date</Label>
                            <Input
                              type="date"
                              value={destination.date}
                              onChange={(e) => updateDestination(index, { ...destination, date: e.target.value })}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {(!tour.destinations || tour.destinations.length === 0) && (
                    <div className="text-center text-muted-foreground py-8">
                      No destinations added yet
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Expenses</CardTitle>
                <Button onClick={addExpense} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expense
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {(tour.expenses || []).map((expense, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <Badge variant="outline">Expense {index + 1}</Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeExpense(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label>Name</Label>
                            <Input
                              value={expense.name}
                              onChange={(e) => updateExpense(index, { ...expense, name: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>Price</Label>
                            <Input
                              type="number"
                              value={expense.price}
                              onChange={(e) => updateExpense(index, { ...expense, price: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                          <div>
                            <Label>Date</Label>
                            <Input
                              type="date"
                              value={expense.date}
                              onChange={(e) => updateExpense(index, { ...expense, date: e.target.value })}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {(!tour.expenses || tour.expenses.length === 0) && (
                    <div className="text-center text-muted-foreground py-8">
                      No expenses added yet
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meals" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Meals</CardTitle>
                <Button onClick={addMeal} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Meal
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {(tour.meals || []).map((meal, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <Badge variant="outline">Meal {index + 1}</Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeMeal(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label>Name</Label>
                            <Input
                              value={meal.name}
                              onChange={(e) => updateMeal(index, { ...meal, name: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>Price</Label>
                            <Input
                              type="number"
                              value={meal.price}
                              onChange={(e) => updateMeal(index, { ...meal, price: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                          <div>
                            <Label>Date</Label>
                            <Input
                              type="date"
                              value={meal.date}
                              onChange={(e) => updateMeal(index, { ...meal, date: e.target.value })}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {(!tour.meals || tour.meals.length === 0) && (
                    <div className="text-center text-muted-foreground py-8">
                      No meals added yet
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allowances" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Allowances</CardTitle>
                <Button onClick={addAllowance} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Allowance
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {(tour.allowances || []).map((allowance, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <Badge variant="outline">Allowance {index + 1}</Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeAllowance(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label>Date</Label>
                            <Input
                              type="date"
                              value={allowance.date}
                              onChange={(e) => updateAllowance(index, { ...allowance, date: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>Province</Label>
                            <Input
                              value={allowance.province}
                              onChange={(e) => updateAllowance(index, { ...allowance, province: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>Amount</Label>
                            <Input
                              type="number"
                              value={allowance.amount}
                              onChange={(e) => updateAllowance(index, { ...allowance, amount: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {(!tour.allowances || tour.allowances.length === 0) && (
                    <div className="text-center text-muted-foreground py-8">
                      No allowances added yet
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="totalTabs">Total Tabs</Label>
                  <Input
                    id="totalTabs"
                    type="number"
                    value={tour.summary?.totalTabs || 0}
                    onChange={(e) => updateField('summary', { ...tour.summary, totalTabs: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="advancePayment">Advance Payment</Label>
                  <Input
                    id="advancePayment"
                    type="number"
                    value={tour.summary?.advancePayment || 0}
                    onChange={(e) => updateField('summary', { ...tour.summary, advancePayment: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="companyTip">Company Tip</Label>
                  <Input
                    id="companyTip"
                    type="number"
                    value={tour.summary?.companyTip || 0}
                    onChange={(e) => updateField('summary', { ...tour.summary, companyTip: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="finalTotal">Final Total</Label>
                  <Input
                    id="finalTotal"
                    type="number"
                    value={tour.summary?.finalTotal || 0}
                    onChange={(e) => updateField('summary', { ...tour.summary, finalTotal: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}