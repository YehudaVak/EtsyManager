// Parser for raw Etsy order text copied from the Etsy orders page

export interface ParsedEtsyOrder {
  etsy_order_no: string;
  customer_name: string;
  address: string;
  product_name: string;
  quantity: number;
  sold_for: number;
  coupon_code?: string;
  sale_percent?: number;
  ordered_date: string; // YYYY-MM-DD
  ship_by: string; // YYYY-MM-DD
  tracking_number?: string;
  color?: string;
  size?: string;
  style?: string;
  has_vat: boolean;
  vat_number?: string;
  vat_amount?: string;
  is_gift?: boolean;
}

// Parse "Mar 3, 2026" → "2026-03-03"
function parseEtsyDate(dateStr: string): string {
  const months: Record<string, string> = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
    'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
    'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
  };
  const match = dateStr.match(/(\w+)\s+(\d+),?\s+(\d{4})/);
  if (!match) return '';
  const [, month, day, year] = match;
  const m = months[month] || '01';
  return `${year}-${m}-${day.padStart(2, '0')}`;
}

// Calculate ship_by: ordered_date + 3 business days
function calculateShipBy(orderedDate: string): string {
  const date = new Date(orderedDate + 'T12:00:00');
  let businessDays = 0;
  while (businessDays < 3) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) businessDays++;
  }
  return date.toISOString().split('T')[0];
}

// UK postcode area → county/region mapping
const UK_POSTCODE_REGIONS: Record<string, string> = {
  'AB': 'Aberdeenshire', 'AL': 'Hertfordshire', 'B': 'West Midlands', 'BA': 'Somerset',
  'BB': 'Lancashire', 'BD': 'West Yorkshire', 'BH': 'Dorset', 'BL': 'Lancashire',
  'BN': 'East Sussex', 'BR': 'Kent', 'BS': 'Bristol', 'BT': 'Northern Ireland',
  'CA': 'Cumbria', 'CB': 'Cambridgeshire', 'CF': 'Cardiff', 'CH': 'Cheshire',
  'CM': 'Essex', 'CO': 'Essex', 'CR': 'Surrey', 'CT': 'Kent',
  'CV': 'Warwickshire', 'CW': 'Cheshire', 'DA': 'Kent', 'DD': 'Dundee',
  'DE': 'Derbyshire', 'DG': 'Dumfries and Galloway', 'DH': 'County Durham',
  'DL': 'County Durham', 'DN': 'South Yorkshire', 'DT': 'Dorset',
  'DY': 'West Midlands', 'E': 'London', 'EC': 'London', 'EH': 'Edinburgh',
  'EN': 'Hertfordshire', 'EX': 'Devon', 'FK': 'Stirlingshire',
  'FY': 'Lancashire', 'G': 'Glasgow', 'GL': 'Gloucestershire',
  'GU': 'Surrey', 'HA': 'London', 'HD': 'West Yorkshire', 'HG': 'North Yorkshire',
  'HP': 'Buckinghamshire', 'HR': 'Herefordshire', 'HS': 'Outer Hebrides',
  'HU': 'East Yorkshire', 'HX': 'West Yorkshire', 'IG': 'London',
  'IP': 'Suffolk', 'IV': 'Inverness-shire', 'KA': 'Ayrshire',
  'KT': 'Surrey', 'KW': 'Caithness', 'KY': 'Fife',
  'L': 'Merseyside', 'LA': 'Lancashire', 'LD': 'Powys', 'LE': 'Leicestershire',
  'LL': 'Gwynedd', 'LN': 'Lincolnshire', 'LS': 'West Yorkshire', 'LU': 'Bedfordshire',
  'M': 'Manchester', 'ME': 'Kent', 'MK': 'Buckinghamshire', 'ML': 'Lanarkshire',
  'N': 'London', 'NE': 'Tyne and Wear', 'NG': 'Nottinghamshire',
  'NN': 'Northamptonshire', 'NP': 'Newport', 'NR': 'Norfolk', 'NW': 'London',
  'OL': 'Lancashire', 'OX': 'Oxfordshire', 'PA': 'Renfrewshire',
  'PE': 'Cambridgeshire', 'PH': 'Perthshire', 'PL': 'Devon',
  'PO': 'Hampshire', 'PR': 'Lancashire', 'RG': 'Berkshire', 'RH': 'Surrey',
  'RM': 'London', 'S': 'South Yorkshire', 'SA': 'Swansea',
  'SE': 'London', 'SG': 'Hertfordshire', 'SK': 'Cheshire',
  'SL': 'Berkshire', 'SM': 'Surrey', 'SN': 'Wiltshire', 'SO': 'Hampshire',
  'SP': 'Wiltshire', 'SR': 'Tyne and Wear', 'SS': 'Essex', 'ST': 'Staffordshire',
  'SW': 'London', 'SY': 'Shropshire', 'TA': 'Somerset', 'TD': 'Scottish Borders',
  'TF': 'Shropshire', 'TN': 'Kent', 'TQ': 'Devon', 'TR': 'Cornwall',
  'TS': 'North Yorkshire', 'TW': 'London', 'UB': 'London',
  'W': 'London', 'WA': 'Cheshire', 'WC': 'London', 'WD': 'Hertfordshire',
  'WF': 'West Yorkshire', 'WN': 'Lancashire', 'WR': 'Worcestershire',
  'WS': 'West Midlands', 'WV': 'West Midlands', 'YO': 'North Yorkshire',
  'ZE': 'Shetland',
};

// German postal code prefix → Bundesland mapping
const DE_POSTAL_REGIONS: Record<string, string> = {
  '01': 'Sachsen', '02': 'Sachsen', '03': 'Brandenburg', '04': 'Sachsen',
  '06': 'Sachsen-Anhalt', '07': 'Thüringen', '08': 'Sachsen', '09': 'Sachsen',
  '10': 'Berlin', '12': 'Berlin', '13': 'Berlin', '14': 'Brandenburg',
  '15': 'Brandenburg', '16': 'Brandenburg', '17': 'Mecklenburg-Vorpommern',
  '18': 'Mecklenburg-Vorpommern', '19': 'Mecklenburg-Vorpommern',
  '20': 'Hamburg', '21': 'Niedersachsen', '22': 'Hamburg', '23': 'Schleswig-Holstein',
  '24': 'Schleswig-Holstein', '25': 'Schleswig-Holstein', '26': 'Niedersachsen',
  '27': 'Niedersachsen', '28': 'Bremen', '29': 'Niedersachsen',
  '30': 'Niedersachsen', '31': 'Niedersachsen', '32': 'Nordrhein-Westfalen',
  '33': 'Nordrhein-Westfalen', '34': 'Hessen', '35': 'Hessen',
  '36': 'Hessen', '37': 'Niedersachsen', '38': 'Niedersachsen',
  '39': 'Sachsen-Anhalt',
  '40': 'Nordrhein-Westfalen', '41': 'Nordrhein-Westfalen', '42': 'Nordrhein-Westfalen',
  '44': 'Nordrhein-Westfalen', '45': 'Nordrhein-Westfalen', '46': 'Nordrhein-Westfalen',
  '47': 'Nordrhein-Westfalen', '48': 'Nordrhein-Westfalen', '49': 'Niedersachsen',
  '50': 'Nordrhein-Westfalen', '51': 'Nordrhein-Westfalen', '52': 'Nordrhein-Westfalen',
  '53': 'Nordrhein-Westfalen', '54': 'Rheinland-Pfalz', '55': 'Rheinland-Pfalz',
  '56': 'Rheinland-Pfalz', '57': 'Nordrhein-Westfalen', '58': 'Nordrhein-Westfalen',
  '59': 'Nordrhein-Westfalen',
  '60': 'Hessen', '61': 'Hessen', '63': 'Hessen', '64': 'Hessen', '65': 'Hessen',
  '66': 'Saarland', '67': 'Rheinland-Pfalz', '68': 'Baden-Württemberg',
  '69': 'Baden-Württemberg',
  '70': 'Baden-Württemberg', '71': 'Baden-Württemberg', '72': 'Baden-Württemberg',
  '73': 'Baden-Württemberg', '74': 'Baden-Württemberg', '75': 'Baden-Württemberg',
  '76': 'Baden-Württemberg', '77': 'Baden-Württemberg', '78': 'Baden-Württemberg',
  '79': 'Baden-Württemberg',
  '80': 'Bayern', '81': 'Bayern', '82': 'Bayern', '83': 'Bayern', '84': 'Bayern',
  '85': 'Bayern', '86': 'Bayern', '87': 'Bayern', '88': 'Baden-Württemberg',
  '89': 'Baden-Württemberg',
  '90': 'Bayern', '91': 'Bayern', '92': 'Bayern', '93': 'Bayern', '94': 'Bayern',
  '95': 'Bayern', '96': 'Bayern', '97': 'Bayern', '98': 'Thüringen', '99': 'Thüringen',
};

// Lookup province/region from postcode
function lookupRegionFromPostcode(postcode: string, country: string): string {
  if (country === 'United Kingdom') {
    // Extract area code: 1-2 letters at start
    const areaMatch = postcode.match(/^([A-Z]{1,2})/);
    if (areaMatch) {
      return UK_POSTCODE_REGIONS[areaMatch[1]] || '';
    }
  }
  if (country === 'Germany') {
    const prefix = postcode.slice(0, 2);
    return DE_POSTAL_REGIONS[prefix] || '';
  }
  return '';
}

// Format address into labeled structure
function formatAddress(name: string, lines: string[], phone?: string): string {
  // Lines typically: street, city/state/zip, country
  // But can vary. Last line is usually country if it's a known country name.
  const parts: string[] = [];
  parts.push(`Name: ${name}`);

  if (lines.length === 0) return parts.join('\n');

  // Known countries
  const countries = [
    'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany',
    'France', 'Italy', 'Spain', 'Netherlands', 'Belgium', 'Ireland',
    'New Zealand', 'Japan', 'Sweden', 'Norway', 'Denmark', 'Finland',
    'Austria', 'Switzerland', 'Portugal', 'Israel', 'Poland', 'Greece',
    'Czech Republic', 'Hungary', 'Romania', 'Bulgaria', 'Croatia',
    'Singapore', 'Hong Kong', 'South Korea', 'Mexico', 'Brazil'
  ];

  let country = '';
  let addressLines = [...lines];

  // Check if last line is a country
  const lastLine = addressLines[addressLines.length - 1].trim();
  if (countries.includes(lastLine)) {
    country = lastLine;
    addressLines = addressLines.slice(0, -1);
  }

  // For US/UK/AU addresses: last remaining line is typically "City, STATE ZIP"
  // For Canadian: "City PROVINCE POSTAL"
  // For German/EU: "POSTAL City"
  if (addressLines.length >= 2) {
    const street = addressLines.slice(0, -1).join(', ');
    const cityLine = addressLines[addressLines.length - 1].trim();

    parts.push(`Address: ${street}`);

    // Try to parse city/state/zip from the city line
    // US format: "City, ST 12345" or "City, ST 12345-1234"
    const usMatch = cityLine.match(/^(.+?),\s*([A-Z]{2})\s+([\d-]+)$/);
    // UK format: "City, County/Region POSTCODE" — postcode like "TS7 0JL", "IP33 2BJ", "NN3 5LZ"
    const ukMatch = cityLine.match(/^(.+?),\s*(.+?)\s+([A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2})$/);
    // UK simple format: "City, POSTCODE" (no county)
    const ukSimpleMatch = cityLine.match(/^(.+?),\s*([A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2})$/);
    // Canada format: "City PROV POSTAL" like "Toronto ON M5J 2N4"
    const caMatch = cityLine.match(/^(.+?)\s+([A-Z]{2})\s+([A-Z]\d[A-Z]\s*\d[A-Z]\d)$/);
    // German/EU format: "12345 City"
    const euMatch = cityLine.match(/^(\d{4,5})\s+(.+)$/);

    if (usMatch) {
      parts.push(`City: ${usMatch[1]}`);
      parts.push(`Province/State: ${usMatch[2]}`);
      parts.push(`Country: ${country || 'United States'}`);
      parts.push(`Zip code: ${usMatch[3]}`);
    } else if (caMatch) {
      parts.push(`City: ${caMatch[1]}`);
      parts.push(`Province/State: ${caMatch[2]}`);
      parts.push(`Country: ${country || 'Canada'}`);
      parts.push(`Zip code: ${caMatch[3]}`);
    } else if (ukMatch) {
      parts.push(`City: ${ukMatch[1]}`);
      parts.push(`Province/State: ${ukMatch[2]}`);
      parts.push(`Country: ${country || 'United Kingdom'}`);
      parts.push(`Zip code: ${ukMatch[3]}`);
    } else if (ukSimpleMatch) {
      const resolvedCountry = country || 'United Kingdom';
      const region = lookupRegionFromPostcode(ukSimpleMatch[2], resolvedCountry);
      parts.push(`City: ${ukSimpleMatch[1]}`);
      parts.push(`Province/State: ${region}`);
      parts.push(`Country: ${resolvedCountry}`);
      parts.push(`Zip code: ${ukSimpleMatch[2]}`);
    } else if (euMatch) {
      const region = lookupRegionFromPostcode(euMatch[1], country);
      parts.push(`City: ${euMatch[2]}`);
      parts.push(`Province/State: ${region}`);
      parts.push(`Country: ${country}`);
      parts.push(`Zip code: ${euMatch[1]}`);
    } else {
      // Fallback: put cityLine as city
      parts.push(`City: ${cityLine}`);
      parts.push(`Province/State: `);
      parts.push(`Country: ${country}`);
      parts.push(`Zip code: `);
    }
  } else if (addressLines.length === 1) {
    parts.push(`Address: ${addressLines[0]}`);
    parts.push(`City: `);
    parts.push(`Province/State: `);
    parts.push(`Country: ${country}`);
    parts.push(`Zip code: `);
  }

  return parts.join('\n');
}

// Parse Etsy email notification format
function parseEtsyEmailOrders(rawText: string): ParsedEtsyOrder[] {
  const orders: ParsedEtsyOrder[] = [];

  // Split by individual order emails
  const emailBlocks = rawText.split(/Congratulations on your Etsy sale/).filter(b => b.includes('order number is'));

  for (const block of emailBlocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // Extract order number
    const orderNoLine = lines.find(l => l.includes('order number is:'));
    if (!orderNoLine) continue;
    const orderNoMatch = orderNoLine.match(/order number is:\s*(\d+)/);
    if (!orderNoMatch) continue;
    const etsy_order_no = orderNoMatch[1];

    // Extract date from "Paid via Etsy Payments on Mar 12, 2026"
    const paidLine = lines.find(l => l.includes('Paid via Etsy Payments on'));
    const ordered_date = paidLine ? parseEtsyDate(paidLine.replace(/.*Paid via Etsy Payments on\s*/, '')) : '';
    const ship_by = ordered_date ? calculateShipBy(ordered_date) : '';

    // Extract shipping address
    const addrIdx = lines.findIndex(l => l === 'Shipping address');
    let customer_name = '';
    let addressRawLines: string[] = [];

    if (addrIdx >= 0) {
      // Name is next non-empty line after "Shipping address"
      customer_name = lines[addrIdx + 1] || '';

      // Collect address lines until we hit a terminator
      const addrTerminators = [
        'Shipping internationally', 'Double check', 'VAT collected',
        'We\'re applying', 'Sell with confidence', 'bell icon',
        'Choose a DDP', 'Learn more', 'Using shipping labels',
      ];

      for (let i = addrIdx + 2; i < lines.length; i++) {
        const line = lines[i];
        if (addrTerminators.some(t => line.startsWith(t))) break;
        addressRawLines.push(line);
      }
    }

    const address = formatAddress(customer_name, addressRawLines);

    // Extract VAT info
    let has_vat = false;
    let vat_number: string | undefined;
    let vat_amount: string | undefined;

    const vatIdx = lines.findIndex(l => l === 'VAT collected');
    if (vatIdx >= 0) {
      has_vat = true;
      for (let i = vatIdx + 1; i < Math.min(vatIdx + 8, lines.length); i++) {
        const vatMatch = lines[i].match(/VAT number,?\s*([\d\s]+)/);
        if (vatMatch) vat_number = vatMatch[1].trim();
        const amountMatch = lines[i].match(/[£€]([\d.]+)/);
        if (amountMatch) vat_amount = amountMatch[0];
      }
    }

    // Extract product details - find product block(s)
    // Product name is a long line before "Shop: TerraLoomz"
    const productBlocks: Array<{
      name: string;
      quantity: number;
      price: number;
      color?: string;
      size?: string;
      style?: string;
    }> = [];

    // Find all "Transaction ID:" lines to locate each product
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].startsWith('Transaction ID:')) continue;

      // Search backwards for the product name (long descriptive line before variation/Shop lines)
      let productName = '';
      let color: string | undefined;
      let size: string | undefined;
      let style: string | undefined;

      for (let j = i - 1; j >= Math.max(0, i - 6); j--) {
        const line = lines[j];
        if (line.startsWith('Color:')) {
          color = line.replace('Color:', '').trim();
        } else if (line.startsWith('Size:')) {
          size = line.replace('Size:', '').trim();
        } else if (line.startsWith('Style:')) {
          style = line.replace('Style:', '').trim();
        } else if (line.startsWith('Choose')) {
          // "Choose Set: Blue Ceramic Teapot"
          const chooseMatch = line.match(/^Choose\s+\w+:\s*(.+)$/);
          if (chooseMatch) style = chooseMatch[1].trim();
        } else if (line.startsWith('Shop:')) {
          continue;
        } else if (line.length > 30 && !line.startsWith('Processing') && !line.startsWith('Returns')) {
          // This is likely the product name
          productName = line;
          break;
        }
      }

      if (!productName) continue;

      // Search forward for Quantity and Price
      let quantity = 1;
      let price = 0;
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const qMatch = lines[j].match(/^Quantity:\s*(\d+)/);
        if (qMatch) quantity = parseInt(qMatch[1]);
        const pMatch = lines[j].match(/^Price:\s*\$([\d.]+)/);
        if (pMatch) price = parseFloat(pMatch[1]);
      }

      productBlocks.push({ name: productName, quantity, price, color, size, style });
    }

    if (productBlocks.length === 0) continue;

    // Extract order total (sold_for)
    let sold_for = 0;
    for (let i = lines.length - 1; i >= 0; i--) {
      const totalMatch = lines[i].match(/^\$([\d.]+)$/);
      if (totalMatch && i > 0 && lines[i - 1].includes('Order total')) {
        sold_for = parseFloat(totalMatch[1]);
        break;
      }
    }
    // Fallback: look for "Order total:" on same line
    if (!sold_for) {
      const totalLine = lines.find(l => l.startsWith('Order total:'));
      if (totalLine) {
        const m = totalLine.match(/\$([\d.]+)/);
        if (m) sold_for = parseFloat(m[1]);
      }
    }

    // Extract coupon code
    let coupon_code: string | undefined;
    let sale_percent: number | undefined;
    const discountLine = lines.find(l => l.includes('buyer applied these discounts:'));
    if (discountLine) {
      const dMatch = discountLine.match(/discounts:\s*(.+)$/);
      if (dMatch) {
        coupon_code = dMatch[1].trim();
        const saleMatch = coupon_code.match(/(\d+)/);
        if (saleMatch) sale_percent = parseInt(saleMatch[1]);
      }
    }

    // Create order entries
    for (let pi = 0; pi < productBlocks.length; pi++) {
      const product = productBlocks[pi];
      let product_name = product.name;
      const variation = product.style || product.color || product.size;
      if (variation) {
        product_name = `${product.name} – ${variation}`;
      }

      orders.push({
        etsy_order_no,
        customer_name,
        address,
        product_name,
        quantity: product.quantity,
        sold_for: pi === 0 ? sold_for : 0,
        coupon_code: pi === 0 ? coupon_code : undefined,
        sale_percent: pi === 0 ? sale_percent : undefined,
        ordered_date,
        ship_by,
        color: product.color,
        size: product.size,
        style: product.style,
        has_vat,
        vat_number,
        vat_amount,
      });
    }
  }

  return orders;
}

export function parseEtsyOrders(rawText: string): ParsedEtsyOrder[] {
  // Auto-detect email format
  if (rawText.includes('Congratulations on your Etsy sale') || rawText.includes('Your order number is:')) {
    return parseEtsyEmailOrders(rawText);
  }

  const orders: ParsedEtsyOrder[] = [];

  // Split by order blocks - each starts with "Select this order from"
  // If no "Select this order from" found, check if text contains order number(s) directly
  let orderBlocks: string[];
  if (rawText.includes('Select this order from')) {
    orderBlocks = rawText.split(/Select this order from/);
  } else {
    // Single order or orders without the "Select" prefix
    // Split by order number pattern as delimiter (keep the # in the block)
    orderBlocks = rawText.split(/(?=\n#\d{7,}\$)/).map(b => b.trim()).filter(Boolean);
    // If that doesn't work, treat entire text as one block
    if (orderBlocks.length <= 1) {
      orderBlocks = [rawText];
    }
  }

  for (const block of orderBlocks) {
    if (!block.trim()) continue;

    const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // Extract order number and price
    const orderLine = lines.find(l => l.startsWith('#'));
    if (!orderLine) continue;

    const orderMatch = orderLine.match(/^#(\d+)\$([\d.]+)\s*(.*)?/);
    if (!orderMatch) continue;

    const etsy_order_no = orderMatch[1];
    const sold_for = parseFloat(orderMatch[2]);

    // Extract coupon code and sale percent from trailing text like "40SALE", "35SALEOFF", "COMEBK"
    let coupon_code: string | undefined;
    let sale_percent: number | undefined;
    const couponText = (orderMatch[3] || '').trim();
    if (couponText) {
      coupon_code = couponText;
      // Try to extract a number from the coupon code (e.g., "40SALE" → 40, "35SALEOFF" → 35)
      const saleMatch = couponText.match(/^(\d+)/);
      if (saleMatch) {
        sale_percent = parseInt(saleMatch[1]);
      }
    }

    // Extract ordered date
    const orderedLine = lines.find(l => l.startsWith('Ordered '));
    const ordered_date = orderedLine ? parseEtsyDate(orderedLine.replace('Ordered ', '')) : '';

    // Extract ship_by from "Ship by ..." line if present, otherwise calculate
    const shipByLine = lines.find(l => l.match(/^Ship by\s+\w+\s+\d/));
    const ship_by = shipByLine ? parseEtsyDate(shipByLine.replace('Ship by ', '')) : (ordered_date ? calculateShipBy(ordered_date) : '');

    // Extract tracking number
    const trackingLine = lines.find(l => l.startsWith('Track package'));
    const tracking_number = trackingLine ? trackingLine.replace('Track package', '').trim() : undefined;

    // Extract customer name - it's usually right after order line, but let's find it from address block
    // The address block starts after "Ships today" / "Shipped on ..." / "No tracking" line
    // and the first line of the address is the customer name

    // Find the address section
    // Address starts after shipping status line.
    // For "No tracking" orders, the address comes right after "Ordered ..." line
    let addressStartIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('Ships today') ||
          lines[i].startsWith('Shipped on ')) {
        addressStartIdx = i + 1;
        break;
      }
    }
    // If no "Ships today"/"Shipped on" found, look for address after "Ordered" line
    if (addressStartIdx === -1) {
      const orderedIdx = lines.findIndex(l => l.startsWith('Ordered '));
      if (orderedIdx >= 0) {
        // Skip non-address lines after "Ordered" (e.g., "Standard Shipping($0.00)")
        let startIdx = orderedIdx + 1;
        while (startIdx < lines.length) {
          const line = lines[startIdx];
          if (line.startsWith('Standard Shipping') || line.startsWith('Free Shipping') ||
              line.startsWith('Other Shipping') || line.startsWith('Expedited') ||
              line.startsWith('Express') || line.match(/^\$[\d.]+/) ||
              line.match(/^Shipping/)) {
            startIdx++;
          } else {
            break;
          }
        }
        addressStartIdx = startIdx;
      }
    }

    let customer_name = '';
    let addressLines: string[] = [];
    let phone: string | undefined;

    if (addressStartIdx > 0 && addressStartIdx < lines.length) {
      customer_name = lines[addressStartIdx];

      // Collect address lines until we hit a known terminator
      const terminators = [
        'USPS Verified', 'VAT Collected', 'Marked as gift',
        'Order in reserve', 'Using shipping labels',
        'Learn More', 'Select this order', 'Standard Shipping',
        'Free Shipping', 'Other Shipping', 'Expedited', 'Express'
      ];

      for (let i = addressStartIdx + 1; i < lines.length; i++) {
        const line = lines[i];
        if (terminators.some(t => line.startsWith(t))) break;
        // Check if it's a phone number
        if (line.match(/^[\+\(]?\d[\d\s\-\(\)]+$/)) {
          phone = line;
          continue;
        }
        addressLines.push(line);
      }
    }

    const address = formatAddress(customer_name, addressLines, phone);

    // Extract VAT info
    let has_vat = false;
    let vat_number: string | undefined;
    let vat_amount: string | undefined;

    const vatIdx = lines.findIndex(l => l === 'VAT Collected');
    if (vatIdx >= 0) {
      has_vat = true;
      // Look for VAT number and amount in subsequent lines
      for (let i = vatIdx + 1; i < Math.min(vatIdx + 5, lines.length); i++) {
        const vatMatch = lines[i].match(/VAT number,\s*([\d\s]+),/);
        if (vatMatch) vat_number = vatMatch[1].trim();
        const amountMatch = lines[i].match(/(?:pounds|euros),\s*([£€][\d.]+),/);
        if (amountMatch) vat_amount = amountMatch[1];
        // Also try IOSS format
        const iossMatch = lines[i].match(/IOSS number,\s*([\w\d]+),/);
        if (iossMatch) vat_number = iossMatch[1].trim();
      }
    }

    // Check gift
    const is_gift = lines.some(l => l === 'Marked as gift');

    // Now parse products - there can be multiple items in one order
    // Products appear between the order# line and the status/date lines
    // Pattern: product title (appears twice), then Quantity, then optional Style/Color/Size

    const orderLineIdx = lines.findIndex(l => l.startsWith('#'));
    const orderedLineIdx = lines.findIndex(l => l.startsWith('Ordered '));

    // Get product section
    const productSection = lines.slice(orderLineIdx + 1, orderedLineIdx);

    // Parse products from the product section
    // Products appear as: Title, Title (duplicate), QuantityN, [Style/Color/Size lines]
    // Then possibly another product: Title, Title, QuantityN, etc.
    const products: Array<{
      name: string;
      quantity: number;
      color?: string;
      size?: string;
      style?: string;
    }> = [];

    let i = 0;
    while (i < productSection.length) {
      const line = productSection[i];

      // Skip status lines
      if (['Pre-transit', 'In transit', 'Delivered', 'No tracking', 'Digital'].includes(line)) {
        i++;
        continue;
      }

      // Skip "Track package...", "Ships today", "Ship by...", "Standard Shipping..." etc
      if (line.startsWith('Track package') || line.startsWith('Ships today') || line.startsWith('Shipped on') ||
          line.startsWith('Ship by') || line.startsWith('Standard Shipping') || line.startsWith('Free Shipping')) {
        i++;
        continue;
      }

      // Check if this looks like a product title (not a Quantity/Style/Color/Size/Choose line)
      if (line.startsWith('Quantity') || line.startsWith('Style') || line.startsWith('Color') ||
          line.startsWith('Size') || line.startsWith('Choose')) {
        i++;
        continue;
      }

      // This should be a product title
      const productName = line;

      // Next line should be a duplicate of the title
      if (i + 1 < productSection.length && productSection[i + 1] === productName) {
        i += 2; // skip both title lines
      } else {
        i += 1; // skip just this line
      }

      // Now look for Quantity and variations
      let quantity = 1;
      let color: string | undefined;
      let size: string | undefined;
      let style: string | undefined;

      while (i < productSection.length) {
        const attrLine = productSection[i];

        // Skip "Ship by..." and "Standard Shipping..." lines in attribute section
        if (attrLine.startsWith('Ship by') || attrLine.startsWith('Standard Shipping') || attrLine.startsWith('Free Shipping')) {
          i++;
          continue;
        }

        if (attrLine.startsWith('Quantity')) {
          const qMatch = attrLine.match(/Quantity(\d+)/);
          if (qMatch) quantity = parseInt(qMatch[1]);
          i++;
        } else if (attrLine.startsWith('Choose')) {
          // Etsy "Choose X" variations: "Choose SetBlue Ceramic Teapot", "Choose SetTeapot + 6 Cups"
          // Format: "Choose" + option_label + value (concatenated without space)
          // Remove "Choose " and the option label (first word after Choose)
          let chooseVal = attrLine.replace(/^Choose\s*/, '');
          // Remove the option label (e.g., "Set", "Color", "Style") - it's the first CamelCase word
          const labelMatch = chooseVal.match(/^([A-Z][a-z]*)(.+)$/);
          if (labelMatch) {
            chooseVal = labelMatch[2].trim();
          }
          style = chooseVal;
          i++;
        } else if (attrLine.startsWith('Style')) {
          // Etsy concatenates option group label with selected value:
          // "Style - Square/BowlBowl Plate Set" → "Bowl Plate Set"
          // "Style - Square/BowlSquare Plate Set" → "Square Plate Set"
          // "StyleLeaf Top Only" → "Leaf Top Only"
          // "StyleStyle 1 - Black" → "Style 1 - Black"
          let styleVal = attrLine.replace(/^Style\s*/, '');
          // Remove " - " prefix if present
          styleVal = styleVal.replace(/^-\s*/, '');
          // If contains "/" — it's an option group like "Square/BowlValue..."
          // The last option name + value are concatenated after the last "/"
          if (styleVal.includes('/')) {
            const lastSlash = styleVal.lastIndexOf('/');
            const afterSlash = styleVal.slice(lastSlash + 1);
            // Split: first CamelCase word is the option name, rest is value
            // "BowlBowl Plate Set" → "Bowl" + "Bowl Plate Set"
            // "BowlSquare Plate Set" → "Bowl" + "Square Plate Set"
            const wordBoundary = afterSlash.match(/^([A-Z][a-z]*)(.+)$/);
            if (wordBoundary) {
              styleVal = wordBoundary[2].trim();
              // If value starts with lowercase, prepend the matched word
              // This shouldn't happen in practice but just in case
            } else {
              styleVal = afterSlash;
            }
          }
          style = styleVal.trim();
          i++;
        } else if (attrLine.startsWith('Color')) {
          color = attrLine.replace(/^Color/, '').trim();
          i++;
        } else if (attrLine.startsWith('Size')) {
          size = attrLine.replace(/^Size/, '').trim();
          i++;
        } else {
          // Not an attribute line - might be next product or something else
          break;
        }
      }

      products.push({ name: productName, quantity, color, size, style });
    }

    // If no products found, skip this order
    if (products.length === 0) continue;

    // Create order entries - one per product (multi-item orders = multiple rows)
    for (let pi = 0; pi < products.length; pi++) {
      const product = products[pi];
      // Build product_name with variation
      let product_name = product.name;
      const variation = product.style || product.color || product.size;
      if (variation) {
        product_name = `${product.name} – ${variation}`;
      }

      orders.push({
        etsy_order_no,
        customer_name,
        address,
        product_name,
        quantity: product.quantity,
        // For multi-item orders: total goes on first item, rest get 0 (user can adjust)
        sold_for: pi === 0 ? sold_for : 0,
        coupon_code: pi === 0 ? coupon_code : undefined,
        sale_percent: pi === 0 ? sale_percent : undefined,
        ordered_date,
        ship_by,
        tracking_number,
        color: product.color,
        size: product.size,
        style: product.style,
        has_vat,
        vat_number,
        vat_amount,
        is_gift,
      });
    }
  }

  return orders;
}
