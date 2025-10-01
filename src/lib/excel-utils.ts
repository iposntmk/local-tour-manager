import type { Tour } from '@/types/tour';

export const exportTourToExcel = async (tour: Tour) => {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  // Tour Info Sheet
  const tourInfo = [
    ['Tour Information'],
    ['Tour Code', tour.tourCode],
    ['Client Name', tour.clientName],
    ['Nationality', tour.clientNationalityRef.nameAtBooking],
    ['Company', tour.companyRef.nameAtBooking],
    ['Guide', tour.guideRef.nameAtBooking],
    ['Adults', tour.adults],
    ['Children', tour.children],
    ['Total Guests', tour.adults + tour.children],
    ['Driver', tour.driverName || ''],
    ['Client Phone', tour.clientPhone || ''],
    ['Start Date', tour.startDate],
    ['End Date', tour.endDate],
    ['Total Days', tour.totalDays],
  ];
  const wsInfo = XLSX.utils.aoa_to_sheet(tourInfo);
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Tour Info');

  // Destinations Sheet
  if (tour.destinations && tour.destinations.length > 0) {
    const destData = [
      ['Destination', 'Date', 'Price'],
      ...tour.destinations.map(d => [d.name, d.date, d.price]),
    ];
    const wsDest = XLSX.utils.aoa_to_sheet(destData);
    XLSX.utils.book_append_sheet(wb, wsDest, 'Destinations');
  }

  // Expenses Sheet
  if (tour.expenses && tour.expenses.length > 0) {
    const expData = [
      ['Expense', 'Date', 'Price'],
      ...tour.expenses.map(e => [e.name, e.date, e.price]),
    ];
    const wsExp = XLSX.utils.aoa_to_sheet(expData);
    XLSX.utils.book_append_sheet(wb, wsExp, 'Expenses');
  }

  // Meals Sheet
  if (tour.meals && tour.meals.length > 0) {
    const mealData = [
      ['Meal', 'Date'],
      ...tour.meals.map(m => [m.name, m.date]),
    ];
    const wsMeal = XLSX.utils.aoa_to_sheet(mealData);
    XLSX.utils.book_append_sheet(wb, wsMeal, 'Meals');
  }

  // Allowances Sheet
  if (tour.allowances && tour.allowances.length > 0) {
    const allowData = [
      ['Province', 'Date', 'Amount'],
      ...tour.allowances.map(a => [a.province, a.date, a.amount]),
    ];
    const wsAllow = XLSX.utils.aoa_to_sheet(allowData);
    XLSX.utils.book_append_sheet(wb, wsAllow, 'Allowances');
  }

  XLSX.writeFile(wb, `Tour_${tour.tourCode}_${Date.now()}.xlsx`);
};

export const exportAllToursToExcel = async (tours: Tour[]) => {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  // Tours Summary Sheet
  const toursData = [
    ['Tour Code', 'Client Name', 'Nationality', 'Company', 'Guide', 'Adults', 'Children', 'Total Guests', 'Start Date', 'End Date', 'Total Days'],
    ...tours.map(t => [
      t.tourCode,
      t.clientName,
      t.clientNationalityRef.nameAtBooking,
      t.companyRef.nameAtBooking,
      t.guideRef.nameAtBooking,
      t.adults,
      t.children,
      t.adults + t.children,
      t.startDate,
      t.endDate,
      t.totalDays,
    ]),
  ];
  const wsTours = XLSX.utils.aoa_to_sheet(toursData);
  XLSX.utils.book_append_sheet(wb, wsTours, 'Tours Summary');

  // All Destinations
  const allDestinations: any[] = [['Tour Code', 'Destination', 'Date', 'Price']];
  tours.forEach(tour => {
    tour.destinations?.forEach(d => {
      allDestinations.push([tour.tourCode, d.name, d.date, d.price]);
    });
  });
  if (allDestinations.length > 1) {
    const wsDest = XLSX.utils.aoa_to_sheet(allDestinations);
    XLSX.utils.book_append_sheet(wb, wsDest, 'All Destinations');
  }

  // All Expenses
  const allExpenses: any[] = [['Tour Code', 'Expense', 'Date', 'Price']];
  tours.forEach(tour => {
    tour.expenses?.forEach(e => {
      allExpenses.push([tour.tourCode, e.name, e.date, e.price]);
    });
  });
  if (allExpenses.length > 1) {
    const wsExp = XLSX.utils.aoa_to_sheet(allExpenses);
    XLSX.utils.book_append_sheet(wb, wsExp, 'All Expenses');
  }

  // All Meals
  const allMeals: any[] = [['Tour Code', 'Meal', 'Date']];
  tours.forEach(tour => {
    tour.meals?.forEach(m => {
      allMeals.push([tour.tourCode, m.name, m.date]);
    });
  });
  if (allMeals.length > 1) {
    const wsMeal = XLSX.utils.aoa_to_sheet(allMeals);
    XLSX.utils.book_append_sheet(wb, wsMeal, 'All Meals');
  }

  // All Allowances
  const allAllowances: any[] = [['Tour Code', 'Province', 'Date', 'Amount']];
  tours.forEach(tour => {
    tour.allowances?.forEach(a => {
      allAllowances.push([tour.tourCode, a.province, a.date, a.amount]);
    });
  });
  if (allAllowances.length > 1) {
    const wsAllow = XLSX.utils.aoa_to_sheet(allAllowances);
    XLSX.utils.book_append_sheet(wb, wsAllow, 'All Allowances');
  }

  XLSX.writeFile(wb, `All_Tours_${Date.now()}.xlsx`);
};

export const importTourFromExcel = async (file: File): Promise<Partial<Tour>> => {
  const XLSX = await import('xlsx');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        const tourData: Partial<Tour> = {};
        
        // Read Tour Info
        const infoSheet = workbook.Sheets['Tour Info'];
        if (infoSheet) {
          const infoData = XLSX.utils.sheet_to_json(infoSheet, { header: 1 }) as any[][];
          infoData.forEach((row: any[]) => {
            if (row[0] === 'Tour Code') tourData.tourCode = row[1];
            if (row[0] === 'Client Name') tourData.clientName = row[1];
            if (row[0] === 'Adults') tourData.adults = Number(row[1]);
            if (row[0] === 'Children') tourData.children = Number(row[1]);
            if (row[0] === 'Driver') tourData.driverName = row[1];
            if (row[0] === 'Client Phone') tourData.clientPhone = row[1];
            if (row[0] === 'Start Date') tourData.startDate = row[1];
            if (row[0] === 'End Date') tourData.endDate = row[1];
          });
        }
        
        // Read Destinations
        const destSheet = workbook.Sheets['Destinations'];
        if (destSheet) {
          const destData = XLSX.utils.sheet_to_json(destSheet) as any[];
          tourData.destinations = destData.map((row: any) => ({
            id: `dest_${Date.now()}_${Math.random()}`,
            name: row.Destination,
            date: row.Date,
            price: Number(row.Price) || 0,
          }));
        }
        
        // Read Expenses
        const expSheet = workbook.Sheets['Expenses'];
        if (expSheet) {
          const expData = XLSX.utils.sheet_to_json(expSheet) as any[];
          tourData.expenses = expData.map((row: any) => ({
            id: `exp_${Date.now()}_${Math.random()}`,
            name: row.Expense,
            date: row.Date,
            price: Number(row.Price) || 0,
          }));
        }
        
        // Read Meals
        const mealSheet = workbook.Sheets['Meals'];
        if (mealSheet) {
          const mealData = XLSX.utils.sheet_to_json(mealSheet) as any[];
          tourData.meals = mealData.map((row: any) => ({
            id: `meal_${Date.now()}_${Math.random()}`,
            name: row.Meal,
            date: row.Date,
            price: 0,
          }));
        }
        
        // Read Allowances
        const allowSheet = workbook.Sheets['Allowances'];
        if (allowSheet) {
          const allowData = XLSX.utils.sheet_to_json(allowSheet) as any[];
          tourData.allowances = allowData.map((row: any) => ({
            id: `allow_${Date.now()}_${Math.random()}`,
            province: row.Province,
            date: row.Date,
            amount: Number(row.Amount) || 0,
          }));
        }
        
        resolve(tourData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsBinaryString(file);
  });
};
