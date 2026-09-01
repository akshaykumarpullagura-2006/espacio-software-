import type { InvoiceItem, InvoiceMode } from './types';

// Convert number to Indian Rupee Words (Lakh, Crore system)
export function amountToWords(num: number): string {
  const rounded = Math.round(num);
  if (rounded === 0) return 'Zero Rupees Only';

  const singleDigits = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];

  const doubleDigits = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  const convertLessThanThousand = (n: number): string => {
    let str = '';
    if (n >= 100) {
      str += singleDigits[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += doubleDigits[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += singleDigits[n] + ' ';
    }
    return str.trim();
  };

  let remaining = rounded;
  let words = '';

  // Crores
  if (remaining >= 10000000) {
    words += convertLessThanThousand(Math.floor(remaining / 10000000)) + ' Crore ';
    remaining %= 10000000;
  }

  // Lakhs
  if (remaining >= 100000) {
    words += convertLessThanThousand(Math.floor(remaining / 100000)) + ' Lakh ';
    remaining %= 100000;
  }

  // Thousands
  if (remaining >= 1000) {
    words += convertLessThanThousand(Math.floor(remaining / 1000)) + ' Thousand ';
    remaining %= 1000;
  }

  // Remainder
  if (remaining > 0) {
    words += convertLessThanThousand(remaining);
  }

  return (words.trim() + ' Rupees Only.').replace(/\s+/g, ' ');
}

// Generate a random valid-looking GSTIN for businesses in Telangana (Prefix 36)
export function generateGSTIN(statePrefix = '36'): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const nums = '0123456789';
  
  let pan = '';
  for (let i = 0; i < 5; i++) pan += chars[Math.floor(Math.random() * chars.length)];
  for (let i = 0; i < 4; i++) pan += nums[Math.floor(Math.random() * nums.length)];
  pan += chars[Math.floor(Math.random() * chars.length)];

  const entityDigit = nums[Math.floor(Math.random() * nums.length)];
  const zChar = 'Z';
  const checkDigit = (chars + nums)[Math.floor(Math.random() * (chars.length + nums.length))];

  return `${statePrefix}${pan}${entityDigit}${zChar}${checkDigit}`;
}

// Generate beautiful custom invoice number based on mode and a counter
export function generateInvoiceNumber(mode: InvoiceMode, count = 1): string {
  const year = new Date().getFullYear();
  const serial = String(count).padStart(4, '0');
  
  let prefix = 'INV';
  switch (mode) {
    case 'Tax Invoice': prefix = 'TXI'; break;
    case 'Quotation': prefix = 'QTN'; break;
    case 'Estimate': prefix = 'EST'; break;
    case 'Proforma Invoice': prefix = 'PRO'; break;
    case 'Bill': prefix = 'BIL'; break;
    case 'Cash Bill': prefix = 'CSH'; break;
    case 'Purchase Invoice': prefix = 'PUR'; break;
    case 'Credit Note': prefix = 'CRN'; break;
    case 'Debit Note': prefix = 'DBN'; break;
    case 'Receipt': prefix = 'REC'; break;
  }
  
  return `${prefix}-${year}-${serial}`;
}

// Format date into YYYY-MM-DD
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Add days to date
export function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

// Calculate all invoice summary fields
export interface InvoiceTotals {
  subtotal: number;
  discountTotal: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  roundOff: number;
  grandTotal: number;
  balanceDue: number;
}

export function calculateTotals(items: InvoiceItem[], advancePaid: number, isLocalState = true): InvoiceTotals {
  let subtotal = 0;
  let discountTotal = 0;
  let taxableAmount = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  items.forEach(item => {
    const itemSubtotal = item.quantity * item.rate;
    const itemDiscount = itemSubtotal * (item.discount / 100);
    const itemTaxable = itemSubtotal - itemDiscount;
    const itemGst = itemTaxable * (item.gst / 100);

    subtotal += itemSubtotal;
    discountTotal += itemDiscount;
    taxableAmount += itemTaxable;

    if (isLocalState) {
      cgst += itemGst / 2;
      sgst += itemGst / 2;
    } else {
      igst += itemGst;
    }
  });

  const rawGrandTotal = taxableAmount + cgst + sgst + igst;
  const grandTotal = Math.round(rawGrandTotal);
  const roundOff = Number((grandTotal - rawGrandTotal).toFixed(2));
  const balanceDue = grandTotal - advancePaid;

  return {
    subtotal: Number(subtotal.toFixed(2)),
    discountTotal: Number(discountTotal.toFixed(2)),
    taxableAmount: Number(taxableAmount.toFixed(2)),
    cgst: Number(cgst.toFixed(2)),
    sgst: Number(sgst.toFixed(2)),
    igst: Number(igst.toFixed(2)),
    roundOff,
    grandTotal,
    balanceDue
  };
}

// AI Luxurious Description Generator
const AI_TEMPLATES: Record<string, string[]> = {
  'modular kitchen': [
    'Premium marine grade boiling water resistant (BWR) plywood cabinets.',
    'Heavy-duty tandem box drawers with soft-close Blum/Hettich hinges.',
    'Exquisite Italian quartz countertop with double-bevel edges.',
    'High-gloss anti-scratch acrylic or premium PU lacquer finish.',
    'Under-cabinet LED profile lighting with warm white illumination.',
    'Built-in modular accessories including cutlery tray, pull-outs, and tall unit.',
    'Professional installation, seamless caulking, and alignment.'
  ],
  'wardrobe': [
    'Bespoke floor-to-ceiling wardrobe with integrated loft storage.',
    'Smooth-sliding soft-close shutters with premium anodized aluminum profiles.',
    'Rich internal layout featuring customized organizers, trouser racks, and safety locker.',
    'Sensored LED hanger rods and interior profile lights.',
    'Elegant exterior panels in premium charcoal/gold laminates and tinted glass doors.',
    'Flawless installation with concealed designer handles.'
  ],
  'living room tv console': [
    'Suspended minimalist TV console in premium teak veneer finish.',
    'Architectural background fluted paneling in deep charcoal and gold accents.',
    'Italian Statuario marble slab backing with subtle warm white edge halo backlighting.',
    'Hidden cable management ports and soft-closing push-to-open doors.',
    'Floating safety-glass shelves for premium audio-visual equipment.'
  ],
  'false ceiling': [
    'Designer gypsum plasterboard false ceiling in premium seamless matte finish.',
    'Perimeter LED cove lighting recesses with high-lumen warm light strips.',
    'Decorative hand-finished teak wooden louvers and rafters.',
    'Precisely aligned cutout provisions for cob lights and magnetic track spotlights.',
    'Anti-cracking joint tape reinforcement and premium Asian Paints Royale base coat.'
  ],
  'master bedroom bed backing': [
    'Plush custom upholstered headboard in rich velvet or luxury fabric.',
    'Flanking vertical panels in high-gloss metal trims and fluted wood.',
    'Concealed warm ambient mood lighting strips along the headboard crest.',
    'Integrated twin floating bedside tables with premium quartz tops.',
    'Dual designer electrical sockets and two-way control switches.'
  ],
  'bathroom vanity': [
    'Wall-mounted moisture-resistant (MR) grade plywood vanity cabinet.',
    'Premium seamless Corian solid surface top with integrated under-counter ceramic basin.',
    'Soft-close cabinet doors in matte PU paint or water-resistant laminate.',
    'Luxurious smart touch LED mirror with anti-fog heating element and gold metallic border.',
    'Premium matte gold finish Koehler/Jaquar washbasin tap installation.'
  ]
};

const RANDOM_FINISHES = ['soft-close mechanisms', 'concealed handles', 'anti-scratch coating', 'ambient lighting integration', 'precision seamless joinery'];

export function generateAiDescription(
  itemName: string,
  style: string = 'Premium',
  material: string = 'Teak Wood & Acrylic',
  details: string = ''
): string {
  const lowerName = itemName.toLowerCase();
  
  // Try to match a templates keys
  let matchedKey = '';
  for (const key of Object.keys(AI_TEMPLATES)) {
    if (lowerName.includes(key) || key.includes(lowerName)) {
      matchedKey = key;
      break;
    }
  }

  let lines: string[] = [];
  if (matchedKey && AI_TEMPLATES[matchedKey]) {
    lines = [...AI_TEMPLATES[matchedKey]];
  } else {
    // Generate procedurally
    lines = [
      `${style} custom-crafted ${itemName} designed for premium residential spaces.`,
      `Constructed using high-density moisture-resistant materials and ${material}.`,
      `Finished with premium luxury details, ${RANDOM_FINISHES[Math.floor(Math.random() * RANDOM_FINISHES.length)]}.`,
      `Includes professional installation, precision leveling, and 5-year structural warranty.`
    ];
  }

  // Adjust style adjective in lines
  if (style === 'Ultra-Luxury') {
    lines = lines.map(line => 
      line.replace(/Premium/g, 'Elite')
          .replace(/Boiling water resistant/gi, 'Bespoke marine-grade')
          .replace(/Hettich/g, 'Blum Legrabox')
          .replace(/laminate finish/g, 'Italian veneer PU finish')
    );
  } else if (style === 'Minimalist') {
    lines = lines.map(line =>
      line.replace(/High-gloss/g, 'Sleek matte')
          .replace(/gold accents/g, 'concealed hairline profile')
          .replace(/decorative/g, 'recessed modern')
    );
  }

  // If custom details are provided, inject them as a line
  if (details.trim()) {
    lines.splice(2, 0, details.trim());
  }

  return lines.join('\n');
}
