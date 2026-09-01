export type InvoiceMode =
  | 'Tax Invoice'
  | 'Quotation'
  | 'Estimate'
  | 'Proforma Invoice'
  | 'Bill'
  | 'Cash Bill'
  | 'Purchase Invoice'
  | 'Credit Note'
  | 'Debit Note'
  | 'Receipt';

export interface InvoiceItem {
  id: string;
  description: string;
  hsn: string;
  quantity: number;
  unit: string;
  rate: number;
  discount: number; // percentage
  gst: number; // percentage
  amount: number;
}

export interface ClientInfo {
  name: string;
  phone: string;
  email: string;
  address: string;
  gstin: string;
}

export interface ProjectDetails {
  name: string;
  address: string;
  designer: string;
  salesExecutive: string;
  stage: string;
  expectedCompletion: string;
  type: string; // 'Villa' | 'Apartment' | 'Commercial' | 'Office' etc.
}

export interface CompanyDetails {
  name: string;
  address: string;
  gstin: string;
  phone: string;
  email: string;
  website: string;
  logoUrl: string;
  signatureUrl?: string;
  stampUrl?: string;
}

export interface BankDetails {
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  ifsc: string;
  branch: string;
  upiId: string;
  customQrUrl?: string;
}

export interface Invoice {
  id: string;
  mode: InvoiceMode;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  paymentTerms: string;
  status: 'Pending' | 'Paid' | 'Cancelled';
  client: ClientInfo;
  project: ProjectDetails;
  company: CompanyDetails;
  items: InvoiceItem[];
  bank: BankDetails;
  notes: string;
  terms: string[];
  advancePaid: number;
}
