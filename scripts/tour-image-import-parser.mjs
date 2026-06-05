import { findDestinationsInText } from './destination-lookup.mjs';

const DEFAULT_COMPANY = 'Việt Á';
const DEFAULT_NATIONALITY = '';

const normalize = (value = '') =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
const compact = (value = '') =>
  value.replace(/\r/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n\s+/g, '\n').trim();
const oneLine = (value = '') => compact(value).replace(/\s*\n\s*/g, ' ');
const isBlankOrZero = (value = '') => {
  const text = normalize(oneLine(value));
  return !text || text === '0' || text === '-' || text === 'o';
};
const isNonProgramDay = (visit = '') => {
  const text = normalize(visit);
  return text.includes('tu do') || text.includes('free') || text.startsWith('no guide');
};
const ymd = (year, month, day) =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
const parseSheetDate = (value, year) => {
  const match = oneLine(value).match(/\b(\d{1,2})\s*\/\s*(\d{1,2})(?:\s*\/\s*(\d{2,4}))?\b/);
  if (!match) return '';
  const resolvedYear = match[3]
    ? Number(match[3].length === 2 ? `20${match[3]}` : match[3])
    : year;
  return ymd(resolvedYear, Number(match[2]), Number(match[1]));
};

const dateDiffDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
};

const collectLines = (analyzeResult = {}) => {
  const pageLines = (analyzeResult.pages || [])
    .flatMap((page) => page.lines || [])
    .map((line) => line.content)
    .filter(Boolean);
  if (pageLines.length > 0) return pageLines.map(compact);
  return compact(analyzeResult.content || '').split('\n').map(compact).filter(Boolean);
};

const matchValue = (text, labelSource, stopSources = []) => {
  const stop = stopSources.length ? `(?=[ \\t]+(?:${stopSources.join('|')})[ \\t]*:|\\n|$)` : '(?=\\n|$)';
  const regex = new RegExp(`${labelSource}[ \\t]*:[ \\t]*(.*?)${stop}`, 'isu');
  return oneLine(text.match(regex)?.[1] || '');
};

const parseGuestCount = (text) => {
  const match = text.match(/(?:S[ốo]\s*kh[aá]ch|So\s*khach)\s*:\s*(\d+)/iu);
  return match ? Number(match[1]) : 0;
};

const stripPunctuation = (value = '') =>
  oneLine(value).replace(/^[\s:.-]+|[\s:.,;-]+$/g, '');

const phonePrefixNationalities = [
  ['+972', 'Israeli (ISR)'], ['+30', 'Greek (GRC)'], ['+33', 'French (FRA)'], ['+39', 'Italian (ITA)'],
  ['+61', 'Australian (AUS)'], ['+44', 'British (United Kingdom) (GBR)'], ['+49', 'German (DEU)'], ['+32', 'Belgian (BEL)'],
  ['+31', 'Dutch (Netherlands) (NLD)'], ['+41', 'Swiss (CHE)'], ['+34', 'Spanish (ESP)'],
  ['+351', 'Portuguese (PRT)'], ['+353', 'Irish (IRL)'], ['+46', 'Swedish (SWE)'],
  ['+47', 'Norwegian (NOR)'], ['+45', 'Danish (DNK)'], ['+358', 'Finnish (FIN)'],
  ['+36', 'Hungarian (HUN)'], ['+48', 'Polish (POL)'], ['+43', 'Austrian (AUT)'], ['+420', 'Czech (CZE)'],
  ['+81', 'Japanese (JPN)'], ['+82', 'Korean (KOR)'], ['+86', 'Chinese (CHN)'],
  ['+91', 'Indian (IND)'], ['+55', 'Brazilian (BRA)'], ['+52', 'Mexican (MEX)'],
  ['+90', 'Turkish (TUR)'], ['+380', 'Ukrainian (UKR)'], ['+234', 'Nigerian (NGA)'],
  ['+92', 'Pakistani (PAK)'], ['+880', 'Bangladeshi (BGD)'], ['+381', 'Serbian (SRB)'],
  ['+359', 'Bulgarian (BGR)'], ['+385', 'Croatian (HRV)'], ['+421', 'Slovak (SVK)'],
  ['+386', 'Slovenian (SVN)'], ['+94', 'Sri Lankan (LKA)'], ['+53', 'Cuban (CUB)'],
  ['+509', 'Haitian (HTI)'], ['+7', 'Russian (RUS)'], ['+1', 'American (USA)'],
];

const cleanPhone = (value = '') =>
  oneLine(value).replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
const extractPhones = (value = '') =>
  Array.from(value.matchAll(/\+\d{1,3}[\d\s().-]{5,22}/g))
    .map((match) => cleanPhone(match[0]))
    .filter((phone, index, all) => phone.length >= 8 && all.indexOf(phone) === index);
const inferNationalityFromPhone = (phone = '') => {
  const match = phonePrefixNationalities
    .sort((a, b) => b[0].length - a[0].length)
    .find(([prefix]) => phone.startsWith(prefix));
  return match?.[1] || '';
};

const COUNTRY_MAP = new Map([['afghan','Afghan (AFG)'],['afghanistan','Afghan (AFG)'],['albania','Albanian (ALB)'],['albanian','Albanian (ALB)'],['algeria','Algerian (DZA)'],['algerian','Algerian (DZA)'],['american','American (USA)'],['andorra','Andorran (AND)'],['andorran','Andorran (AND)'],['angola','Angolan (AGO)'],['angolan','Angolan (AGO)'],['anh','British (GBR)'],['antigua and barbuda','Antiguan (ATG)'],['antiguan','Antiguan (ATG)'],['argentina','Argentine (ARG)'],['argentine','Argentine (ARG)'],['armenia','Armenian (ARM)'],['armenian','Armenian (ARM)'],['australia','Australian (AUS)'],['australian','Australian (AUS)'],['ao','Austrian (AUT)'],['austria','Austrian (AUT)'],['austrian','Austrian (AUT)'],['azerbaijan','Azerbaijani (AZE)'],['azerbaijani','Azerbaijani (AZE)'],['bahamas','Bahamian (BHS)'],['bahamian','Bahamian (BHS)'],['bahrain','Bahraini (BHR)'],['bahraini','Bahraini (BHR)'],['bangladesh','Bangladeshi (BGD)'],['bangladeshi','Bangladeshi (BGD)'],['barbadian','Barbadian (BRB)'],['barbados','Barbadian (BRB)'],['belarus','Belarusian (BLR)'],['belarusian','Belarusian (BLR)'],['belgian','Belgian (BEL)'],['belgium','Belgian (BEL)'],['belize','Belizean (BLZ)'],['belizean','Belizean (BLZ)'],['benin','Beninese (BEN)'],['beninese','Beninese (BEN)'],['bhutan','Bhutanese (BTN)'],['bhutanese','Bhutanese (BTN)'],['bolivia','Bolivian (BOL)'],['bolivian','Bolivian (BOL)'],['bosnia and herzegovina','Bosnian (BIH)'],['bosnian','Bosnian (BIH)'],['botswana','Motswana (BWA)'],['brazil','Brazilian (BRA)'],['brazilian','Brazilian (BRA)'],['british','British (GBR)'],['brunei','Bruneian (BRN)'],['bruneian','Bruneian (BRN)'],['bulgaria','Bulgarian (BGR)'],['bulgarian','Bulgarian (BGR)'],['burkina faso','Burkinabe (BFA)'],['burkinabe','Burkinabe (BFA)'],['burmese','Burmese (MMR)'],['burundi','Burundian (BDI)'],['burundian','Burundian (BDI)'],['cabo verde','Cape Verdean (CPV)'],['cambodia','Cambodian (KHM)'],['cambodian','Cambodian (KHM)'],['cameroon','Cameroonian (CMR)'],['cameroonian','Cameroonian (CMR)'],['canada','Canadian (CAN)'],['canadian','Canadian (CAN)'],['cape verdean','Cape Verdean (CPV)'],['central african','Central African (CAF)'],['central african republic','Central African (CAF)'],['chad','Chadian (TCD)'],['chadian','Chadian (TCD)'],['chile','Chilean (CHL)'],['chilean','Chilean (CHL)'],['china','Chinese (CHN)'],['chinese','Chinese (CHN)'],['colombia','Colombian (COL)'],['colombian','Colombian (COL)'],['comorian','Comorian (COM)'],['comoros','Comorian (COM)'],['congo','Congolese (COG)'],['congolese','Congolese (COD)'],['costa rica','Costa Rican (CRI)'],['costa rican','Costa Rican (CRI)'],['croatia','Croatian (HRV)'],['croatian','Croatian (HRV)'],['cuba','Cuban (CUB)'],['cuban','Cuban (CUB)'],['cypriot','Cypriot (CYP)'],['cyprus','Cypriot (CYP)'],['czech','Czech (CZE)'],['czech republic','Czech (CZE)'],['danish','Danish (DNK)'],['democratic republic of congo','Congolese (COD)'],['denmark','Danish (DNK)'],['djibouti','Djiboutian (DJI)'],['djiboutian','Djiboutian (DJI)'],['dominica','Dominican (DMA)'],['dominican','Dominican (DOM)'],['dominican republic','Dominican (DOM)'],['duc','German (DEU)'],['dutch','Dutch (NLD)'],['east timor','Timorese (TLS)'],['ecuador','Ecuadorian (ECU)'],['ecuadorian','Ecuadorian (ECU)'],['egypt','Egyptian (EGY)'],['egyptian','Egyptian (EGY)'],['el salvador','Salvadoran (SLV)'],['emirati','Emirati (ARE)'],['equatorial guinea','Equatorial Guinean (GNQ)'],['equatorial guinean','Equatorial Guinean (GNQ)'],['eritrea','Eritrean (ERI)'],['eritrean','Eritrean (ERI)'],['estonia','Estonian (EST)'],['estonian','Estonian (EST)'],['ethiopia','Ethiopian (ETH)'],['ethiopian','Ethiopian (ETH)'],['fiji','Fijian (FJI)'],['fijian','Fijian (FJI)'],['filipino','Filipino (PHL)'],['finland','Finnish (FIN)'],['finnish','Finnish (FIN)'],['france','French (FRA)'],['french','French (FRA)'],['gabon','Gabonese (GAB)'],['gabonese','Gabonese (GAB)'],['gambia','Gambian (GMB)'],['gambian','Gambian (GMB)'],['georgia','Georgian (GEO)'],['georgian','Georgian (GEO)'],['german','German (DEU)'],['germany','German (DEU)'],['ghana','Ghanaian (GHA)'],['ghanaian','Ghanaian (GHA)'],['greece','Greek (GRC)'],['greek','Greek (GRC)'],['grenada','Grenadian (GRD)'],['grenadian','Grenadian (GRD)'],['guatemala','Guatemalan (GTM)'],['guatemalan','Guatemalan (GTM)'],['guinea','Guinean (GIN)'],['guinea-bissau','Guinea-Bissauan (GNB)'],['guinea-bissauan','Guinea-Bissauan (GNB)'],['guinean','Guinean (GIN)'],['guyana','Guyanese (GUY)'],['guyanese','Guyanese (GUY)'],['haiti','Haitian (HTI)'],['haitian','Haitian (HTI)'],['honduran','Honduran (HND)'],['honduras','Honduran (HND)'],['hungarian','Hungarian (HUN)'],['hungary','Hungarian (HUN)'],['i-kiribati','I-Kiribati (KIR)'],['iceland','Icelandic (ISL)'],['icelandic','Icelandic (ISL)'],['india','Indian (IND)'],['indian','Indian (IND)'],['indonesia','Indonesian (IDN)'],['indonesian','Indonesian (IDN)'],['iran','Iranian (IRN)'],['iranian','Iranian (IRN)'],['iraq','Iraqi (IRQ)'],['iraqi','Iraqi (IRQ)'],['ireland','Irish (IRL)'],['irish','Irish (IRL)'],['israel','Israeli (ISR)'],['israeli','Israeli (ISR)'],['italian','Italian (ITA)'],['italy','Italian (ITA)'],['ivorian','Ivorian (CIV)'],['ivory coast','Ivorian (CIV)'],['jamaica','Jamaican (JAM)'],['jamaican','Jamaican (JAM)'],['japan','Japanese (JPN)'],['japanese','Japanese (JPN)'],['jordan','Jordanian (JOR)'],['jordanian','Jordanian (JOR)'],['kazakhstan','Kazakhstani (KAZ)'],['kazakhstani','Kazakhstani (KAZ)'],['kenya','Kenyan (KEN)'],['kenyan','Kenyan (KEN)'],['korea','South Korean (KOR)'],['kiribati','I-Kiribati (KIR)'],['kittitian','Kittitian (KNA)'],['kosovar','Kosovar (XKX)'],['kosovo','Kosovar (XKX)'],['kuwait','Kuwaiti (KWT)'],['kuwaiti','Kuwaiti (KWT)'],['kyrgyzstan','Kyrgyzstani (KGZ)'],['kyrgyzstani','Kyrgyzstani (KGZ)'],['lao','Lao (LAO)'],['laos','Lao (LAO)'],['latvia','Latvian (LVA)'],['latvian','Latvian (LVA)'],['lebanese','Lebanese (LBN)'],['lebanon','Lebanese (LBN)'],['lesotho','Mosotho (LSO)'],['liberia','Liberian (LBR)'],['liberian','Liberian (LBR)'],['libya','Libyan (LBY)'],['libyan','Libyan (LBY)'],['liechtenstein','Liechtensteiner (LIE)'],['liechtensteiner','Liechtensteiner (LIE)'],['lithuania','Lithuanian (LTU)'],['lithuanian','Lithuanian (LTU)'],['luxembourg','Luxembourger (LUX)'],['luxembourger','Luxembourger (LUX)'],['macedonian','Macedonian (MKD)'],['madagascar','Malagasy (MDG)'],['malagasy','Malagasy (MDG)'],['malawi','Malawian (MWI)'],['malawian','Malawian (MWI)'],['malaysia','Malaysian (MYS)'],['malaysian','Malaysian (MYS)'],['maldives','Maldivian (MDV)'],['maldivian','Maldivian (MDV)'],['mali','Malian (MLI)'],['malian','Malian (MLI)'],['malta','Maltese (MLT)'],['maltese','Maltese (MLT)'],['marshall islands','Marshallese (MHL)'],['marshallese','Marshallese (MHL)'],['mauritania','Mauritanian (MRT)'],['mauritanian','Mauritanian (MRT)'],['mauritian','Mauritian (MUS)'],['mauritius','Mauritian (MUS)'],['mexican','Mexican (MEX)'],['mexico','Mexican (MEX)'],['micronesia','Micronesian (FSM)'],['micronesian','Micronesian (FSM)'],['moldova','Moldovan (MDA)'],['moldovan','Moldovan (MDA)'],['monaco','Monegasque (MCO)'],['monegasque','Monegasque (MCO)'],['mongolia','Mongolian (MNG)'],['mongolian','Mongolian (MNG)'],['montenegrin','Montenegrin (MNE)'],['montenegro','Montenegrin (MNE)'],['moroccan','Moroccan (MAR)'],['morocco','Moroccan (MAR)'],['mosotho','Mosotho (LSO)'],['motswana','Motswana (BWA)'],['mozambican','Mozambican (MOZ)'],['mozambique','Mozambican (MOZ)'],['my','American (USA)'],['myanmar','Burmese (MMR)'],['namibia','Namibian (NAM)'],['namibian','Namibian (NAM)'],['nauru','Nauruan (NRU)'],['nauruan','Nauruan (NRU)'],['nepal','Nepali (NPL)'],['nepali','Nepali (NPL)'],['netherlands','Dutch (NLD)'],['new zealand','New Zealander (NZL)'],['new zealander','New Zealander (NZL)'],['nga','Russian (RUS)'],['ni-vanuatu','Ni-Vanuatu (VUT)'],['nicaragua','Nicaraguan (NIC)'],['nicaraguan','Nicaraguan (NIC)'],['niger','Nigerien (NER)'],['nigeria','Nigerian (NGA)'],['nigerian','Nigerian (NGA)'],['nigerien','Nigerien (NER)'],['north korea','North Korean (PRK)'],['north korean','North Korean (PRK)'],['north macedonia','Macedonian (MKD)'],['norway','Norwegian (NOR)'],['norwegian','Norwegian (NOR)'],['oman','Omani (OMN)'],['omani','Omani (OMN)'],['pakistan','Pakistani (PAK)'],['pakistani','Pakistani (PAK)'],['palau','Palauan (PLW)'],['palauan','Palauan (PLW)'],['palestine','Palestinian (PSE)'],['palestinian','Palestinian (PSE)'],['panama','Panamanian (PAN)'],['panamanian','Panamanian (PAN)'],['papua new guinea','Papua New Guinean (PNG)'],['papua new guinean','Papua New Guinean (PNG)'],['paraguay','Paraguayan (PRY)'],['paraguayan','Paraguayan (PRY)'],['peru','Peruvian (PER)'],['peruvian','Peruvian (PER)'],['phap','French (FRA)'],['philippines','Filipino (PHL)'],['poland','Polish (POL)'],['polish','Polish (POL)'],['portugal','Portuguese (PRT)'],['portuguese','Portuguese (PRT)'],['puerto rican','Puerto Rican (PRI)'],['puerto rico','Puerto Rican (PRI)'],['qatar','Qatari (QAT)'],['qatari','Qatari (QAT)'],['romania','Romanian (ROU)'],['romanian','Romanian (ROU)'],['russia','Russian (RUS)'],['russian','Russian (RUS)'],['rwanda','Rwandan (RWA)'],['rwandan','Rwandan (RWA)'],['saint kitts and nevis','Kittitian (KNA)'],['saint lucia','Saint Lucian (LCA)'],['saint lucian','Saint Lucian (LCA)'],['saint vincent and the grenadines','Vincentian (VCT)'],['salvadoran','Salvadoran (SLV)'],['sammarinese','Sammarinese (SMR)'],['samoa','Samoan (WSM)'],['samoan','Samoan (WSM)'],['san marino','Sammarinese (SMR)'],['sao tome and principe','Sao Tomean (STP)'],['sao tomean','Sao Tomean (STP)'],['saudi arabia','Saudi Arabian (SAU)'],['saudi arabian','Saudi Arabian (SAU)'],['senegal','Senegalese (SEN)'],['senegalese','Senegalese (SEN)'],['serbia','Serbian (SRB)'],['serbian','Serbian (SRB)'],['seychelles','Seychellois (SYC)'],['seychellois','Seychellois (SYC)'],['sierra leone','Sierra Leonean (SLE)'],['sierra leonean','Sierra Leonean (SLE)'],['singapore','Singaporean (SGP)'],['singaporean','Singaporean (SGP)'],['slovak','Slovak (SVK)'],['slovakia','Slovak (SVK)'],['slovenia','Slovenian (SVN)'],['slovenian','Slovenian (SVN)'],['solomon islander','Solomon Islander (SLB)'],['solomon islands','Solomon Islander (SLB)'],['somali','Somali (SOM)'],['somalia','Somali (SOM)'],['south africa','South African (ZAF)'],['south african','South African (ZAF)'],['south korea','South Korean (KOR)'],['south korean','South Korean (KOR)'],['south sudan','South Sudanese (SSD)'],['south sudanese','South Sudanese (SSD)'],['spain','Spanish (ESP)'],['spanish','Spanish (ESP)'],['sri lanka','Sri Lankan (LKA)'],['sri lankan','Sri Lankan (LKA)'],['sudan','Sudanese (SDN)'],['sudanese','Sudanese (SDN)'],['suriname','Surinamese (SUR)'],['surinamese','Surinamese (SUR)'],['sweden','Swedish (SWE)'],['swedish','Swedish (SWE)'],['swiss','Swiss (CHE)'],['switzerland','Swiss (CHE)'],['syria','Syrian (SYR)'],['syrian','Syrian (SYR)'],['taiwan','Taiwanese (TWN)'],['taiwanese','Taiwanese (TWN)'],['tajikistan','Tajikistani (TJK)'],['tajikistani','Tajikistani (TJK)'],['tanzania','Tanzanian (TZA)'],['tanzanian','Tanzanian (TZA)'],['thai','Thai (THA)'],['thailand','Thai (THA)'],['timorese','Timorese (TLS)'],['togo','Togolese (TGO)'],['togolese','Togolese (TGO)'],['tonga','Tongan (TON)'],['tongan','Tongan (TON)'],['trinidad','Trinidadian (TTO)'],['trinidad and tobago','Trinidadian (TTO)'],['trinidadian','Trinidadian (TTO)'],['tunisia','Tunisian (TUN)'],['tunisian','Tunisian (TUN)'],['turkey','Turkish (TUR)'],['turkish','Turkish (TUR)'],['turkmen','Turkmen (TKM)'],['turkmenistan','Turkmen (TKM)'],['tuvalu','Tuvaluan (TUV)'],['tuvaluan','Tuvaluan (TUV)'],['uc','Australian (AUS)'],['uganda','Ugandan (UGA)'],['ugandan','Ugandan (UGA)'],['ukraine','Ukrainian (UKR)'],['ukrainian','Ukrainian (UKR)'],['united arab emirates','Emirati (ARE)'],['uk','British (GBR)'],['england','British (GBR)'],['united kingdom','British (GBR)'],['usa','American (USA)'],['america','American (USA)'],['united states','American (USA)'],['uruguay','Uruguayan (URY)'],['uruguayan','Uruguayan (URY)'],['uzbekistan','Uzbekistani (UZB)'],['uzbekistani','Uzbekistani (UZB)'],['vanuatu','Ni-Vanuatu (VUT)'],['vatican','Vatican (VAT)'],['vatican city','Vatican (VAT)'],['venezuela','Venezuelan (VEN)'],['venezuelan','Venezuelan (VEN)'],['vietnam','Vietnamese (VNM)'],['vietnamese','Vietnamese (VNM)'],['vincentian','Vincentian (VCT)'],['vn','Vietnamese (VNM)'],['y','Italian (ITA)'],['yemen','Yemeni (YEM)'],['yemeni','Yemeni (YEM)'],['zambia','Zambian (ZMB)'],['zambian','Zambian (ZMB)'],['zimbabwe','Zimbabwean (ZWE)'],['zimbabwean','Zimbabwean (ZWE)']]);
const extractNationalityFromTables = (tables = []) => {
  for (const table of tables) {
    const colCounts = new Map();
    for (const cell of table.cells || []) {
      const viet = COUNTRY_MAP.get(normalize(cell.content || ''));
      if (!viet) continue;
      if (!colCounts.has(cell.columnIndex)) colCounts.set(cell.columnIndex, []);
      colCounts.get(cell.columnIndex).push(viet);
    }
    for (const [, vals] of colCounts) {
      if (vals.length >= 2 && vals.every((v) => v === vals[0])) return vals[0];
    }
  }
  return '';
};
const extractNationalityFromGuestCount = (text) => {
  const match = text.match(/(?:S[ốo]\s*kh[aá]ch|So\s*khach)\s*:\s*\d+\s+([^\d\n\/+].*?)(?:\n|$)/iu);
  if (!match) return '';
  const val = normalize(stripPunctuation(match[1]));
  return COUNTRY_MAP.get(val) || '';
};
const extractClientPhone = (text, driver = '', guide = '') => {
  const labeled = matchValue(text, '(?:SĐT|SDT|Điện\\s*thoại|Dien\\s*thoai|Phone)(?:\\s*(?:kh[aá]ch|pax|client))?');
  const labeledPhone = extractPhones(labeled)[0];
  if (labeledPhone) return labeledPhone;

  const excluded = new Set([...extractPhones(driver), ...extractPhones(guide)]);
  const candidates = extractPhones(text).filter((phone) => !excluded.has(phone));
  return candidates.find((phone) => inferNationalityFromPhone(phone)) || candidates[0] || '';
};

const isGenericNationality = (value = '') => {
  const text = normalize(value).replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  return !text || ['viet nam', 'vn', 'quoc te', 'international', 'pax viet nam', 'pax quoc te'].includes(text);
};

const extractExplicitNationality = (text) => {
  const pattern = /(?:Qu[ốo]c\s*t[ịi]ch|Quoc\s*tich|Nationality)[ \t]*:[ \t]*(.*?)(?=[ \t]+(?:SĐT|SDT|Điện\s*thoại|Dien\s*thoai|Phone)(?:[ \t]+(?:kh[aá]ch|pax|client))?[ \t]*:|\n|$)/isu;
  const value = text.match(pattern)?.[1] || '';
  const normalizedValue = stripPunctuation(value.replace(/\b(pax|kh[aá]ch)\b/giu, ''));
  return isGenericNationality(normalizedValue) ? '' : normalizedValue;
};

const extractCompany = (text) => {
  const patterns = [
    /kh[aá]ch\s*s[aạ]n\s*do\s*:?\s*(.+?)(?:\s+(?:đ[ặa]t|book(?:ing)?|b[o0]{2}k)\b|[.;,\n]|$)/iu,
    /kh[aá]ch\s*s[aạ]n\s*:\s*(.+?)(?:\s+(?:đ[ặa]t|book(?:ing)?|b[o0]{2}k)\b|[.;,\n]|$)/iu,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return stripPunctuation(match[1]);
  }
  return '';
};

const tableCellText = (rowCells, columnIndex) => {
  const exact = rowCells.filter((cell) => cell.columnIndex === columnIndex);
  if (exact.length === 0) return '';
  return exact.map((cell) => cell.content).filter(Boolean).join('\n');
};

const findHeaderColumns = (cells) => {
  const columns = {};
  cells.forEach((cell) => {
    const text = normalize(cell.content || '');
    if (text.includes('ngay')) columns.date = cell.columnIndex;
    if (text.includes('tham')) columns.visit = cell.columnIndex;
    if (text.includes('an trua')) columns.lunch = cell.columnIndex;
    if (text.includes('an toi')) columns.dinner = cell.columnIndex;
    if (text.includes('khach san')) columns.hotel = cell.columnIndex;
  });
  return columns.date !== undefined && columns.visit !== undefined ? columns : null;
};

const rowsFromTables = (tables = [], year) => {
  for (const table of tables) {
    const rows = new Map();
    (table.cells || []).forEach((cell) => {
      const list = rows.get(cell.rowIndex) || [];
      list.push(cell);
      rows.set(cell.rowIndex, list);
    });

    for (const [rowIndex, cells] of rows) {
      const columns = findHeaderColumns(cells);
      if (!columns) continue;
      return Array.from(rows.entries())
        .filter(([index]) => index > rowIndex)
        .map(([, rowCells]) => {
          const dateRaw = tableCellText(rowCells, columns.date);
          return {
            dateRaw: oneLine(dateRaw),
            date: parseSheetDate(dateRaw, year),
            visit: tableCellText(rowCells, columns.visit),
            lunch: tableCellText(rowCells, columns.lunch),
            dinner: tableCellText(rowCells, columns.dinner),
            hotel: tableCellText(rowCells, columns.hotel),
          };
        })
        .filter((row) => row.date);
    }
  }
  return [];
};

const rowsFromLines = (lines, year) => {
  const startIdx = lines.findIndex(l => {
    const t = normalize(l).trim();
    return t.includes('ngay') || t.includes('tham');
  });
  const relevant = startIdx >= 0 ? lines.slice(startIdx) : lines;
  const rows = [];
  for (let i = 0; i < relevant.length; i++) {
    const line = relevant[i];
    const match = line.match(/^\s*(\d{1,2}\s*\/\s*\d{1,2}(?:\s*\/\s*\d{2,4})?)(?:\s+(.*))?$/);
    if (!match) continue;
    const dateRaw = oneLine(match[1]);
    let visit = match[2] ? oneLine(match[2]) : '';
    if (!visit && i + 1 < relevant.length) {
      const next = oneLine(relevant[i + 1]);
      if (next && !next.match(/^\d{1,2}\s*\/\s*\d{1,2}/)) {
        visit = next;
        i++;
      }
    }
    if (!visit) continue;
    const date = parseSheetDate(dateRaw, year);
    if (date && /\d{4}/.test(dateRaw)) {
      const y = Number(date.slice(0, 4));
      if (y !== year && y !== year + 1) continue;
    }
    rows.push({ dateRaw, date, visit, lunch: '', dinner: '', hotel: '' });
  }
  return rows;
};

const parsePrice = (value = '') => {
  const text = normalize(value).replace(/,/g, '.');
  const perPax = text.match(/(\d+(?:\.\d+)?)\s*k\s*\/?\s*p(?:ax)?\s*x\s*(\d+)/);
  if (perPax) return Math.round(Number(perPax[1]) * 1000 * Number(perPax[2]));
  const thousand = text.match(/(\d+(?:\.\d+)?)\s*k\b/);
  if (thousand) return Math.round(Number(thousand[1]) * 1000);
  return 0;
};

const looksLikeVisit = (value = '') => {
  const text = normalize(value);
  return /tham|city|dai noi|lang|bana|ba na|hoi an|hai van|thien mu|tu duc|khai dinh|bao tang|tra/.test(text);
};

const looksLikeExpense = (value = '') => {
  const text = normalize(value);
  return /vat|book|xe|oto|don sb|tien sb|no guide|khong oto|nuoc|reaching out/.test(text);
};

const extractInlineDinner = (visit = '') => {
  const match = visit.match(/(?:A[nă]\s*t[ốo]i|An\s*toi)\s*:\s*([^,\n]+)/iu);
  return oneLine(match?.[1] || '');
};
const buildDestinations = (rows) => {
  const result = [];
  let orderIndex = 0;
  for (const row of rows) {
    if (!row.date || isBlankOrZero(row.visit) || !looksLikeVisit(row.visit)) continue;
    const names = findDestinationsInText(row.visit);
    for (const name of names) {
      result.push({ name, price: 0, date: row.date, orderIndex: orderIndex++ });
    }
  }
  return result;
};

const looksLikeHdvMeal = (value = '') => {
  const text = normalize(value);
  return /hdv\s*(?:book|ttoan)/.test(text) && /\d+\s*k/.test(text);
};
const buildMeals = (rows) => {
  const meals = [];
  rows.forEach((row) => {
    [
      ['Ăn trưa', row.lunch],
      ['Ăn tối', row.dinner],
    ].forEach(([label, value]) => {
      if (row.date && !isBlankOrZero(value) && looksLikeHdvMeal(value)) {
        meals.push({ name: `${label}: ${oneLine(value)}`, price: parsePrice(value), date: row.date, orderIndex: meals.length });
      }
    });
    const inlineDinner = extractInlineDinner(row.visit);
    if (row.date && inlineDinner && looksLikeHdvMeal(inlineDinner)) {
      meals.push({ name: `Ăn tối: ${inlineDinner}`, price: 0, date: row.date, orderIndex: meals.length });
    }
  });
  return meals;
};

const buildAllowances = (rows) => {
  const allowances = [];
  let orderIndex = 0;
  for (const row of rows) {
    if (!row.date || isNonProgramDay(row.visit)) continue;
    const norm = normalize(row.visit);
    const isPickupDay = !norm.includes('no guide') && !looksLikeVisit(row.visit)
      && ['don sb hue', 'don sb da nang', 'don san bay hue', 'don san bay da nang'].some(p => norm.includes(p));
    if (isPickupDay) {
      allowances.push({
        name: 'Đón or Tiễn sân bay 350k',
        price: 350000,
        date: row.date,
        orderIndex: orderIndex++,
      });
    } else {
      allowances.push({
        name: 'Công tác phí - Huế 700k',
        price: 700000,
        date: row.date,
        orderIndex: orderIndex++,
      });
    }
  }
  return allowances;
};

const buildExpenses = (rows) => rows
  .filter((row) => row.date && !isBlankOrZero(row.visit) && looksLikeExpense(row.visit))
  .map((row, index) => ({
    name: oneLine(row.visit),
    price: parsePrice(row.visit),
    date: row.date,
    orderIndex: index,
  }));

const isHotelInfoLine = (line = '') =>
  /khach\s*san|hotel|ksan/.test(normalize(line));
const buildNotes = (lines) => {
  const footerStart = lines.findIndex((line) => normalize(line).startsWith('- khach san'));
  const footerLines = footerStart >= 0
    ? lines.slice(footerStart).map(oneLine).filter((line) => line && !isHotelInfoLine(line))
    : [];
  return footerLines.length ? `Ghi chú chương trình:\n${footerLines.join('\n')}` : '';
};

export const buildTourImportJson = (analyzeResult, options = {}) => {
  const year = Number(options.year) || new Date().getFullYear();
  const lines = collectLines(analyzeResult);
  const text = lines.join('\n');
  const rows = rowsFromTables(analyzeResult.tables || [], year);
  const itineraryRows = rows.length > 0 ? rows : rowsFromLines(lines, year);
  for (let i = 1; i < itineraryRows.length; i++) {
    if (itineraryRows[i].date && itineraryRows[i - 1].date && itineraryRows[i].date < itineraryRows[i - 1].date) {
      const d = new Date(itineraryRows[i].date);
      d.setFullYear(d.getFullYear() + 1);
      itineraryRows[i].date = ymd(d.getFullYear(), d.getMonth() + 1, d.getDate());
    }
  }
  const dates = itineraryRows.map((row) => row.date).filter(Boolean).sort();
  const totalGuests = parseGuestCount(text);
  const tourCode = matchValue(text, '(?:Code\\s*(?:đoàn|doan)?|Mã\\s*đoàn)', ['S[ốo]\\s*kh[aá]ch', 'So\\s*khach']);
  const guide = matchValue(text, '(?:Hướng\\s*dẫn|Huong\\s*dan)', ['L[aá]i\\s*xe', 'Lai\\s*xe']);
  const driver = matchValue(text, '(?:L[aá]i\\s*xe|Lai\\s*xe)');
  const clientName = matchValue(text, '(?:T[eê]n\\s*kh[aá]ch|Ten\\s*khach)', ['Ng[aà]y', 'Ngay']);
  const clientPhone = extractClientPhone(text, driver, guide);
  const tableNationality = extractNationalityFromTables(analyzeResult.tables || []);
  const guestCountNationality = extractNationalityFromGuestCount(text);
  const explicitNationality = COUNTRY_MAP.get(normalize(extractExplicitNationality(text))) || '';
  const inferredNationality = inferNationalityFromPhone(clientPhone);
  const company = extractCompany(text) || options.company || DEFAULT_COMPANY;
  const nationality = tableNationality || guestCountNationality || explicitNationality || options.nationality || inferredNationality || DEFAULT_NATIONALITY;
  const firstReal = itineraryRows.find((row) => !isNonProgramDay(row.visit));
  const startDate = firstReal?.date || dates[0] || '';
  const lastReal = itineraryRows.findLast((row) => !isNonProgramDay(row.visit));
  const endDate = lastReal?.date || startDate;

  return [{
    tour: {
      tourCode,
      company,
      tourGuide: guide,
      clientName: tourCode || clientName || 'Khách tour',
      clientNationality: nationality,
      adults: totalGuests,
      children: 0,
      totalGuests,
      driverName: driver,
      clientPhone,
      startDate,
      endDate,
      totalDays: dateDiffDays(startDate, endDate) || itineraryRows.length,
    },
    subcollections: {
      destinations: buildDestinations(itineraryRows),
      expenses: [],
      meals: buildMeals(itineraryRows),
      allowances: buildAllowances(itineraryRows),
      summary: {
        totalTabs: 0,
        advancePayment: 0,
        totalAfterAdvance: 0,
        companyTip: 0,
        totalAfterTip: 0,
        collectionsForCompany: 0,
        totalAfterCollections: 0,
        finalTotal: 0,
      },
    },
  }];
};
