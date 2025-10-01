export const SEED_DATA = {
  "guides": [
    { "name": "Cao Hữu Tú", "phone": "+84 907 000 111", "note": "VN/EN" },
    { "name": "Nguyễn Hồng Phúc", "phone": "+84 909 222 333", "note": "EN/IT" },
    { "name": "Trần Minh Anh", "phone": "+84 938 444 555", "note": "EN" }
  ],
  "companies": [
    { "name": "Asia Top Travel", "contactName": "Ms. Lan", "phone": "+84 24 3777 8888", "email": "booking@asiatoptravel.vn", "note": "" },
    { "name": "Tonkin Travel", "contactName": "Mr. Huy", "phone": "+84 24 3888 6666", "email": "sales@tonkintravel.vn", "note": "" },
    { "name": "GP Travel", "contactName": "Ms. My", "phone": "+84 28 3555 9999", "email": "op@gptravel.vn", "note": "" }
  ],
  "nationalities": [
    { "name": "Vietnam", "iso2": "VN", "emoji": "🇻🇳" },
    { "name": "Italy", "iso2": "IT", "emoji": "🇮🇹" },
    { "name": "Australia", "iso2": "AU", "emoji": "🇦🇺" },
    { "name": "United States", "iso2": "US", "emoji": "🇺🇸" },
    { "name": "France", "iso2": "FR", "emoji": "🇫🇷" }
  ],
  "tours": [
    {
      "tour": {
        "tourCode": "AT-250901",
        "companyName": "Asia Top Travel",
        "guideName": "Cao Hữu Tú",
        "clientNationality": "Italy",
        "clientName": "Mrs. Matilde Lamura",
        "adults": 8,
        "children": 0,
        "driverName": "Mr Đức",
        "clientPhone": "+39 348 470 4413",
        "startDate": "2025-08-20",
        "endDate": "2025-08-25"
      },
      "subcollections": {
        "destinations": [
          { "name": "Đại Nội", "price": 0, "date": "2025-08-21" },
          { "name": "Lăng Tự Đức", "price": 0, "date": "2025-08-21" },
          { "name": "Hội An Ancient Town", "price": 0, "date": "2025-08-23" }
        ],
        "expenses": [
          { "name": "Nước suối", "price": 120000, "date": "2025-08-21" },
          { "name": "Khăn lạnh", "price": 80000, "date": "2025-08-21" }
        ],
        "meals": [
          { "name": "Ăn trưa La Chu", "price": 400000, "date": "2025-08-21" }
        ],
        "allowances": [
          { "date": "2025-08-21", "province": "Huế", "amount": 300000 }
        ]
      }
    },
    {
      "tour": {
        "tourCode": "TK-251010",
        "companyName": "Tonkin Travel",
        "guideName": "Nguyễn Hồng Phúc",
        "clientNationality": "Australia",
        "clientName": "Mr. David Brown",
        "adults": 4,
        "children": 1,
        "driverName": "Mr Hải",
        "clientPhone": "+61 400 123 456",
        "startDate": "2025-10-10",
        "endDate": "2025-10-13"
      },
      "subcollections": {
        "destinations": [
          { "name": "Phong Nha", "price": 0, "date": "2025-10-11" },
          { "name": "Thiên Đường", "price": 0, "date": "2025-10-11" },
          { "name": "Vĩnh Mốc", "price": 0, "date": "2025-10-12" }
        ],
        "expenses": [
          { "name": "Vé tham quan Phong Nha", "price": 1500000, "date": "2025-10-11" }
        ],
        "meals": [
          { "name": "Ăn tối Huế Tui", "price": 430000, "date": "2025-10-11" }
        ],
        "allowances": [
          { "date": "2025-10-11", "province": "Quảng Bình", "amount": 300000 }
        ]
      }
    }
  ]
};
