"use client";

import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Printer,
  Download,
  FileSpreadsheet,
  Mail,
  MessageSquare,
  Cloud,
  Plus,
  Trash2,
  Sparkles,
  RefreshCw,
  User,
  FolderOpen,
  CreditCard,
  Building,
  Loader2,
  FileText,
  ChevronDown
} from 'lucide-react';
import type { Invoice, InvoiceItem, InvoiceMode, ClientInfo, ProjectDetails, BankDetails, CompanyDetails } from './types';
import {
  amountToWords,
  generateGSTIN,
  generateInvoiceNumber,
  formatDate,
  addDays,
  calculateTotals
} from './quotation-helpers';
import AiDescriptionModal from './AiDescriptionModal';
import { EmailModal, WhatsAppModal, GoogleDriveModal } from './ExportModals';
import './quotation-studio.css';

// Default Luxury Configuration
const DEFAULT_COMPANY: CompanyDetails = {
  name: 'Espacio Interiors',
  address: 'Sleek Heights, Floor 4, Jubilee Hills, Road No. 36, Hyderabad, TS - 500033',
  gstin: '36AAAAE1234F1Z9',
  phone: '+91 90000 80000',
  email: 'accounts@espacio.in',
  website: 'www.espaciointeriors.com',
  logoUrl: '/logo.jpg'
};

const DEFAULT_BANK: BankDetails = {
  bankName: 'HDFC Bank Ltd',
  accountHolder: 'Espacio Design Studio Private Limited',
  accountNumber: '50200048127390',
  ifsc: 'HDFC0001234',
  branch: 'Jubilee Hills, Hyderabad',
  upiId: 'espacio@hdfcbank'
};

const CLIENT_PRESETS: ClientInfo[] = [
  {
    name: 'Ananya Rao',
    phone: '+91 98855 77665',
    email: 'ananya.rao@gmail.com',
    address: 'Plot 42, Silence Valley, Film Nagar, Jubilee Hills, Hyderabad - 500096',
    gstin: '' // Individual client
  },
  {
    name: 'NeoTech Innovations Pvt Ltd',
    phone: '+91 80088 12345',
    email: 'finance@neotech.io',
    address: 'Block A, 12th Floor, Cyber Towers, HITEC City, Hyderabad - 500081',
    gstin: '36AABCN4321A1ZE' // Corporate client
  }
];

const PROJECT_PRESETS: ProjectDetails[] = [
  {
    name: 'The Golden Crest Villa',
    address: 'Villa 18, Whisper Valley, Gachibowli, Hyderabad',
    designer: 'Ar. Vikram Aditya',
    salesExecutive: 'Amit Sharma',
    stage: 'Woodwork & Finishings',
    expectedCompletion: '2026-09-15',
    type: 'Villa'
  },
  {
    name: 'Jubilee Luxury Penthouse',
    address: 'Apartment 5B, Skyline Heights, Jubilee Hills, Hyderabad',
    designer: 'Id. Kiara Sen',
    salesExecutive: 'Priya Nair',
    stage: 'False Ceiling & Electrical',
    expectedCompletion: '2026-08-30',
    type: 'Apartment'
  }
];

const INITIAL_ITEMS: InvoiceItem[] = [
  {
    id: '1',
    description: 'Modular Kitchen\nPremium marine plywood cabinets\nSoft close hinges\nQuartz countertop\nPremium laminate finish\nInstallation included',
    hsn: '9403',
    quantity: 1,
    unit: 'Unit',
    rate: 170000,
    discount: 0,
    gst: 18,
    amount: 200600
  },
  {
    id: '2',
    description: 'Wardrobe\nSoft close shutters\nLoft storage\nInternal organizers\nMirror panel\nPremium handles',
    hsn: '9403',
    quantity: 1,
    unit: 'Unit',
    rate: 72830.51,
    discount: 0,
    gst: 18,
    amount: 85939.99
  }
];

export function QuotationGeneratorStudio({ onSaveComplete }: { onSaveComplete?: () => void } = {}) {
  // --- INVOICE STATE ---
  const [invoice, setInvoice] = useState<Invoice>({
    id: '1',
    mode: 'Tax Invoice',
    invoiceNumber: 'TXI-2026-0001',
    invoiceDate: formatDate(new Date()),
    dueDate: addDays(formatDate(new Date()), 15),
    paymentTerms: '15 Days Net',
    status: 'Pending',
    company: DEFAULT_COMPANY,
    client: CLIENT_PRESETS[0],
    project: PROJECT_PRESETS[0],
    items: INITIAL_ITEMS,
    bank: DEFAULT_BANK,
    notes: 'Thank you for choosing Espacio Interiors. We appreciate your trust. We look forward to creating timeless interiors.',
    terms: [
      'Payment due within specified period.',
      'Materials remain company property until payment.',
      'Warranty applicable as per agreement.',
      'GST included where applicable.',
      'Jurisdiction Hyderabad.'
    ],
    advancePaid: 100000
  });

  // --- ACTIONS STATE ---
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  // --- RESPONSIVE PDF DOCUMENT PREVIEW SCALER & DYNAMIC HEIGHT TRACKER ---
  const previewPanelRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [documentScale, setDocumentScale] = useState<number>(1);
  const [canvasHeight, setCanvasHeight] = useState<number>(1160);

  useEffect(() => {
    const handleResize = () => {
      if (previewPanelRef.current) {
        // Available container width minus padding (32px padding for mobile viewport)
        const containerWidth = previewPanelRef.current.clientWidth - 32;
        if (containerWidth < 820 && containerWidth > 0) {
          setDocumentScale(containerWidth / 820);
        } else {
          setDocumentScale(1);
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const updateCanvasHeight = () => {
      if (canvasRef.current) {
        const h = canvasRef.current.scrollHeight || canvasRef.current.offsetHeight || 1160;
        setCanvasHeight(h);
      }
    };

    updateCanvasHeight();

    const observer = new ResizeObserver(() => {
      updateCanvasHeight();
    });

    observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, [invoice]);
  
  // Modals state
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiTargetItemId, setAiTargetItemId] = useState<string | null>(null);
  const [aiTargetItemName, setAiTargetItemName] = useState<string>('');
  
  // Accordion state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    document: true,
    company: false,
    client: true,
    items: true,
    payment: false
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [driveModalOpen, setDriveModalOpen] = useState(false);

  // --- DERIVED CALCULATIONS ---
  const totals = calculateTotals(invoice.items, invoice.advancePaid, true); // default isLocalState = true
  const amountWords = amountToWords(totals.grandTotal);

  // --- AUTO CALCULATE ITEM AMOUNTS ---
  const handleItemChange = (id: string, field: keyof InvoiceItem, value: any) => {
    const updatedItems = invoice.items.map((item) => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        // Recalculate amount
        const sub = updated.quantity * updated.rate;
        const disc = sub * (updated.discount / 100);
        const taxable = sub - disc;
        const tax = taxable * (updated.gst / 100);
        updated.amount = Number((taxable + tax).toFixed(2));
        return updated;
      }
      return item;
    });
    setInvoice({ ...invoice, items: updatedItems });
  };

  // --- ADD / DELETE ITEMS ---
  const handleAddItem = () => {
    const newItem: InvoiceItem = {
      id: String(Date.now()),
      description: 'Custom Woodwork Panel\nDetails to be generated...',
      hsn: '9403',
      quantity: 1,
      unit: 'Unit',
      rate: 45000,
      discount: 0,
      gst: 18,
      amount: 53100
    };
    setInvoice({ ...invoice, items: [...invoice.items, newItem] });
  };

  const handleDeleteItem = (id: string) => {
    if (invoice.items.length === 1) return; // Keep at least one
    const updated = invoice.items.filter((item) => item.id !== id);
    setInvoice({ ...invoice, items: updated });
  };

  // --- GENERATE SMART VALUES ---
  const handleRegenerateInvoiceNumber = () => {
    const randomCount = Math.floor(Math.random() * 80) + 12;
    const num = generateInvoiceNumber(invoice.mode, randomCount);
    setInvoice({ ...invoice, invoiceNumber: num });
  };

  const handleAutofillGst = (type: 'company' | 'client') => {
    const randomGst = generateGSTIN('36'); // Telangana prefix
    if (type === 'company') {
      setInvoice({
        ...invoice,
        company: { ...invoice.company, gstin: randomGst }
      });
    } else {
      setInvoice({
        ...invoice,
        client: { ...invoice.client, gstin: randomGst }
      });
    }
  };

  // --- QR CODE GENERATOR ---
  useEffect(() => {
    if (!invoice.bank.upiId) return;
    const payeeName = encodeURIComponent(invoice.company.name);
    // UPI standard deep link
    const upiLink = `upi://pay?pa=${invoice.bank.upiId}&pn=${payeeName}&am=${totals.grandTotal}&cu=INR&tn=Espacio_Inv_${invoice.invoiceNumber}`;
    
    QRCode.toDataURL(upiLink, {
      width: 120,
      margin: 1,
      color: {
        dark: '#6A4A2D', // Luxury Dark Brown
        light: '#FFFFFF' // White
      }
    })
      .then((url) => {
        setQrCodeUrl(url);
      })
      .catch((err) => {
        console.error('QR code generation error:', err);
      });
  }, [invoice.bank.upiId, totals.grandTotal, invoice.company.name, invoice.invoiceNumber]);

  // --- TRIGGER AI MODAL FOR SPECIFIC ITEM ---
  const triggerAiAssistant = (id: string, currentDesc: string) => {
    const firstLine = currentDesc.split('\n')[0] || '';
    setAiTargetItemId(id);
    setAiTargetItemName(firstLine);
    setAiModalOpen(true);
  };

  const handleApplyAiDescription = (description: string) => {
    if (!aiTargetItemId) return;
    const updatedItems = invoice.items.map((item) => {
      if (item.id === aiTargetItemId) {
        return { ...item, description };
      }
      return item;
    });
    setInvoice({ ...invoice, items: updatedItems });
    setAiTargetItemId(null);
  };

  // --- PRINT & EXPORTS ---
  const handlePrint = () => {
    window.print();
  };

  const loadHtml2Pdf = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if ((window as any).html2pdf) {
        resolve((window as any).html2pdf);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => resolve((window as any).html2pdf);
      script.onerror = (err) => reject(err);
      document.body.appendChild(script);
    });
  };

  const handleDownloadPdf = async () => {
    setIsPdfLoading(true);
    try {
      const element = document.getElementById('invoice-print-area');
      if (!element) {
        window.print();
        setIsPdfLoading(false);
        return;
      }

      // Clone element offscreen at 100% un-zoomed 820px resolution for high fidelity
      const clone = element.cloneNode(true) as HTMLElement;
      clone.style.zoom = '1';
      clone.style.transform = 'none';
      clone.style.width = '820px';
      clone.style.minWidth = '820px';
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      clone.style.top = '0px';
      document.body.appendChild(clone);

      const html2pdf = await loadHtml2Pdf();
      const filename = `${invoice.mode.replace(/\s+/g, '_')}_${invoice.invoiceNumber}.pdf`;

      const opt = {
        margin: [5, 5, 5, 5],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          letterRendering: true,
          logging: false
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(clone).save();
      document.body.removeChild(clone);
    } catch (err) {
      console.error('PDF generation error, falling back to print dialog:', err);
      window.print();
    } finally {
      setIsPdfLoading(false);
    }
  };

  const handleExportExcel = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Item Description,HSN,Quantity,Unit,Rate,Discount %,GST %,Total (INR)\r\n';
    
    invoice.items.forEach((item) => {
      // Clean up description line breaks for CSV
      const cleanDesc = item.description.replace(/\n/g, ' | ');
      csvContent += `"${cleanDesc}",${item.hsn},${item.quantity},${item.unit},${item.rate},${item.discount},${item.gst},${item.amount}\r\n`;
    });
    
    csvContent += `\r\nSubtotal,,,,,,,${totals.subtotal}\r\n`;
    csvContent += `Discount,,,,,,,${totals.discountTotal}\r\n`;
    csvContent += `Taxable Amount,,,,,,,${totals.taxableAmount}\r\n`;
    csvContent += `CGST (9%),,,,,,,${totals.cgst}\r\n`;
    csvContent += `SGST (9%),,,,,,,${totals.sgst}\r\n`;
    csvContent += `Grand Total,,,,,,,${totals.grandTotal}\r\n`;
    csvContent += `Advance Paid,,,,,,,${invoice.advancePaid}\r\n`;
    csvContent += `Balance Due,,,,,,,${totals.balanceDue}\r\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Espacio_${invoice.invoiceNumber}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Adjust due date when invoice date or terms change
  const handleDateChange = (newDate: string) => {
    let days = 15;
    if (invoice.paymentTerms.toLowerCase().includes('30')) days = 30;
    else if (invoice.paymentTerms.toLowerCase().includes('45')) days = 45;
    else if (invoice.paymentTerms.toLowerCase().includes('60')) days = 60;
    
    setInvoice({
      ...invoice,
      invoiceDate: newDate,
      dueDate: addDays(newDate, days)
    });
  };

  const handleTermsChange = (newTerms: string) => {
    let days = 15;
    if (newTerms.toLowerCase().includes('30')) days = 30;
    else if (newTerms.toLowerCase().includes('45')) days = 45;
    else if (newTerms.toLowerCase().includes('60')) days = 60;
    
    setInvoice({
      ...invoice,
      paymentTerms: newTerms,
      dueDate: addDays(invoice.invoiceDate, days)
    });
  };

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setInvoice({
            ...invoice,
            bank: {
              ...invoice.bank,
              customQrUrl: event.target.result as string
            }
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearCustomQr = () => {
    setInvoice({
      ...invoice,
      bank: {
        ...invoice.bank,
        customQrUrl: undefined
      }
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setInvoice({
            ...invoice,
            company: {
              ...invoice.company,
              logoUrl: event.target.result as string
            }
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearCustomLogo = () => {
    setInvoice({
      ...invoice,
      company: {
        ...invoice.company,
        logoUrl: '/logo.jpg'
      }
    });
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setInvoice({
            ...invoice,
            company: {
              ...invoice.company,
              signatureUrl: event.target.result as string
            }
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearCustomSignature = () => {
    setInvoice({
      ...invoice,
      company: {
        ...invoice.company,
        signatureUrl: undefined
      }
    });
  };

  return (
    <div className="app-container">
      
      {/* 1. APP TOP ACTIONS BAR */}
      <header className="app-actions-header">
        <div className="brand-section">
          <div className="brand-logo">E</div>
          <div>
            <h1 className="brand-name">ESPACIO</h1>
            <div className="brand-tagline">Timeless Interiors</div>
          </div>
        </div>

        <div className="actions-group">
          <button className="btn btn-secondary" onClick={handlePrint}>
            <Printer size={16} />
            Print
          </button>
          
          <button className="btn btn-secondary" onClick={handleDownloadPdf} disabled={isPdfLoading}>
            {isPdfLoading ? (
              <>
                <Loader2 size={16} className="spinner" style={{ animation: 'rotate 1s linear infinite' }} />
                Compiling PDF...
              </>
            ) : (
              <>
                <Download size={16} />
                Download PDF
              </>
            )}
          </button>

          <button className="btn btn-secondary" onClick={handleExportExcel}>
            <FileSpreadsheet size={16} />
            Excel
          </button>

          <button className="btn btn-secondary" onClick={() => setEmailModalOpen(true)}>
            <Mail size={16} />
            Email
          </button>

          <button className="btn btn-secondary" onClick={() => setWhatsappModalOpen(true)}>
            <MessageSquare size={16} />
            WhatsApp
          </button>

          <button className="btn btn-primary" onClick={() => setDriveModalOpen(true)}>
            <Cloud size={16} />
            Sync to Drive
          </button>
        </div>
      </header>

      <div className="workspace-area">
        {/* 2. LEFT EDITOR PANEL */}
        <aside className="editor-panel">
        
        {/* Dashboard Summary Card Widget */}
        <div className="dashboard-widget-card">
          <div className="dashboard-widget-title-row">
            <span className="dashboard-widget-title">Espacio Suite Dashboard</span>
            <span className={`status-pill status-${invoice.status.toLowerCase()}`}>
              {invoice.status}
            </span>
          </div>

          <div className="dashboard-stats-row">
            <div className="dashboard-stat-box">
              <span className="dashboard-stat-lbl">Invoiced (Total)</span>
              <span className="dashboard-stat-val" style={{ color: 'var(--color-primary-gold)' }}>
                ₹{totals.grandTotal.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="dashboard-stat-box">
              <span className="dashboard-stat-lbl">Deposited (Adv)</span>
              <span className="dashboard-stat-val" style={{ color: 'var(--color-success)' }}>
                ₹{invoice.advancePaid.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="dashboard-stat-box">
              <span className="dashboard-stat-lbl">Remaining Due</span>
              <span className="dashboard-stat-val" style={{ color: 'white' }}>
                ₹{totals.balanceDue.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="dashboard-preset-loader-row">
            <button
              className="dashboard-preset-btn"
              type="button"
              onClick={() => {
                setInvoice(prev => ({
                  ...prev,
                  client: CLIENT_PRESETS[0],
                  project: PROJECT_PRESETS[0]
                }));
              }}
            >
              Load Villa Preset
            </button>
            <button
              className="dashboard-preset-btn"
              type="button"
              onClick={() => {
                setInvoice(prev => ({
                  ...prev,
                  client: CLIENT_PRESETS[1],
                  project: PROJECT_PRESETS[1]
                }));
              }}
            >
              Load Corporate Preset
            </button>
          </div>
        </div>

        {/* Section 1: Document Settings */}
        <div className={`collapsible-section ${openSections.document ? 'open' : ''}`}>
          <button className="collapsible-header" type="button" onClick={() => toggleSection('document')}>
            <span className="collapsible-header-title">
              <FileText size={16} />
              1. Document Settings
            </span>
            <ChevronDown size={16} className="collapsible-chevron" />
          </button>
          {openSections.document && (
            <div className="collapsible-content">
              <div className="collapsible-content-wrapper">
                
                <div className="input-group">
                  <span className="input-label">Document Mode / Type</span>
                  <select
                    className="input-field"
                    value={invoice.mode}
                    onChange={(e) => setInvoice({ ...invoice, mode: e.target.value as InvoiceMode })}
                  >
                    <option value="Tax Invoice">Tax Invoice</option>
                    <option value="Quotation">Quotation</option>
                    <option value="Estimate">Estimate</option>
                    <option value="Proforma Invoice">Proforma Invoice</option>
                    <option value="Bill">Bill</option>
                    <option value="Cash Bill">Cash Bill</option>
                    <option value="Purchase Invoice">Purchase Invoice</option>
                    <option value="Credit Note">Credit Note</option>
                    <option value="Debit Note">Debit Note</option>
                    <option value="Receipt">Receipt</option>
                  </select>
                </div>

                <div className="form-grid">
                  <div className="input-group">
                    <span className="input-label">Invoice Number</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        className="input-field"
                        value={invoice.invoiceNumber}
                        onChange={(e) => setInvoice({ ...invoice, invoiceNumber: e.target.value })}
                      />
                      <button
                        className="btn-icon"
                        type="button"
                        title="Auto Generate"
                        onClick={handleRegenerateInvoiceNumber}
                      >
                        <RefreshCw size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="input-group">
                    <span className="input-label">Payment Status</span>
                    <select
                      className="input-field"
                      value={invoice.status}
                      onChange={(e) => setInvoice({ ...invoice, status: e.target.value as any })}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Paid">Paid</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <span className="input-label">Invoice Date</span>
                    <input
                      type="date"
                      className="input-field"
                      value={invoice.invoiceDate}
                      onChange={(e) => handleDateChange(e.target.value)}
                    />
                  </div>

                  <div className="input-group">
                    <span className="input-label">Payment Terms</span>
                    <select
                      className="input-field"
                      value={invoice.paymentTerms}
                      onChange={(e) => handleTermsChange(e.target.value)}
                    >
                      <option value="15 Days Net">15 Days Net</option>
                      <option value="30 Days Net">30 Days Net</option>
                      <option value="45 Days Net">45 Days Net</option>
                      <option value="Immediate Pay">Immediate Pay</option>
                    </select>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>

        {/* Section 2: Company & Brand Profile */}
        <div className={`collapsible-section ${openSections.company ? 'open' : ''}`}>
          <button className="collapsible-header" type="button" onClick={() => toggleSection('company')}>
            <span className="collapsible-header-title">
              <Building size={16} />
              2. Company & Brand Profile
            </span>
            <ChevronDown size={16} className="collapsible-chevron" />
          </button>
          {openSections.company && (
            <div className="collapsible-content">
              <div className="collapsible-content-wrapper">
                
                <div className="input-group">
                  <span className="input-label">Company Name</span>
                  <input
                    type="text"
                    className="input-field"
                    value={invoice.company.name}
                    onChange={(e) => setInvoice({ ...invoice, company: { ...invoice.company, name: e.target.value } })}
                  />
                </div>

                <div className="input-group">
                  <span className="input-label">Company Address</span>
                  <input
                    type="text"
                    className="input-field"
                    value={invoice.company.address}
                    onChange={(e) => setInvoice({ ...invoice, company: { ...invoice.company, address: e.target.value } })}
                  />
                </div>

                <div className="form-grid">
                  <div className="input-group">
                    <span className="input-label">GSTIN (Telangana)</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        className="input-field"
                        value={invoice.company.gstin}
                        onChange={(e) => setInvoice({ ...invoice, company: { ...invoice.company, gstin: e.target.value } })}
                      />
                      <button
                        className="btn-icon"
                        type="button"
                        title="Generate GST"
                        onClick={() => handleAutofillGst('company')}
                      >
                        <RefreshCw size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="input-group">
                    <span className="input-label">Phone</span>
                    <input
                      type="text"
                      className="input-field"
                      value={invoice.company.phone}
                      onChange={(e) => setInvoice({ ...invoice, company: { ...invoice.company, phone: e.target.value } })}
                    />
                  </div>
                </div>

                <div className="form-grid" style={{ gridTemplateColumns: '1fr', gap: '14px' }}>
                  <div className="input-group">
                    <span className="input-label">Upload Custom Company Logo</span>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="input-field"
                        style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                      />
                      {invoice.company.logoUrl !== '/logo.jpg' && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={handleClearCustomLogo}
                          style={{ padding: '6px 12px', fontSize: '0.75rem', borderColor: 'var(--color-cancelled-border)', color: 'var(--color-cancelled)' }}
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="input-group">
                    <span className="input-label">Upload Custom Signature</span>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleSignatureUpload}
                        className="input-field"
                        style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                      />
                      {invoice.company.signatureUrl && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={handleClearCustomSignature}
                          style={{ padding: '6px 12px', fontSize: '0.75rem', borderColor: 'var(--color-cancelled-border)', color: 'var(--color-cancelled)' }}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>

        {/* Section 3: Client & Project Info */}
        <div className={`collapsible-section ${openSections.client ? 'open' : ''}`}>
          <button className="collapsible-header" type="button" onClick={() => toggleSection('client')}>
            <span className="collapsible-header-title">
              <User size={16} />
              3. Client & Project Info
            </span>
            <ChevronDown size={16} className="collapsible-chevron" />
          </button>
          {openSections.client && (
            <div className="collapsible-content">
              <div className="collapsible-content-wrapper">
                
                {/* Client Profile */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--color-primary-gold)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--color-border-beige-light)', paddingBottom: '4px' }}>
                    Client Profile
                  </h4>
                  
                  <div className="input-group">
                    <span className="input-label">Client Name</span>
                    <input
                      type="text"
                      className="input-field"
                      value={invoice.client.name}
                      onChange={(e) => setInvoice({ ...invoice, client: { ...invoice.client, name: e.target.value } })}
                    />
                  </div>

                  <div className="form-grid">
                    <div className="input-group">
                      <span className="input-label">Phone</span>
                      <input
                        type="text"
                        className="input-field"
                        value={invoice.client.phone}
                        onChange={(e) => setInvoice({ ...invoice, client: { ...invoice.client, phone: e.target.value } })}
                      />
                    </div>

                    <div className="input-group">
                      <span className="input-label">Email</span>
                      <input
                        type="email"
                        className="input-field"
                        value={invoice.client.email}
                        onChange={(e) => setInvoice({ ...invoice, client: { ...invoice.client, email: e.target.value } })}
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <span className="input-label">Billing Address</span>
                    <input
                      type="text"
                      className="input-field"
                      value={invoice.client.address}
                      onChange={(e) => setInvoice({ ...invoice, client: { ...invoice.client, address: e.target.value } })}
                    />
                  </div>

                  <div className="input-group">
                    <span className="input-label">Client GSTIN</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        placeholder="Optional for B2C"
                        className="input-field"
                        value={invoice.client.gstin}
                        onChange={(e) => setInvoice({ ...invoice, client: { ...invoice.client, gstin: e.target.value } })}
                      />
                      <button
                        className="btn-icon"
                        type="button"
                        title="Generate GST"
                        onClick={() => handleAutofillGst('client')}
                      >
                        <RefreshCw size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Project Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--color-primary-gold)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--color-border-beige-light)', paddingBottom: '4px' }}>
                    Project Details
                  </h4>
                  
                  <div className="input-group">
                    <span className="input-label">Project Name</span>
                    <input
                      type="text"
                      className="input-field"
                      value={invoice.project.name}
                      onChange={(e) => setInvoice({ ...invoice, project: { ...invoice.project, name: e.target.value } })}
                    />
                  </div>

                  <div className="input-group">
                    <span className="input-label">Site Address</span>
                    <input
                      type="text"
                      className="input-field"
                      value={invoice.project.address}
                      onChange={(e) => setInvoice({ ...invoice, project: { ...invoice.project, address: e.target.value } })}
                    />
                  </div>

                  <div className="form-grid">
                    <div className="input-group">
                      <span className="input-label">Lead Designer</span>
                      <input
                        type="text"
                        className="input-field"
                        value={invoice.project.designer}
                        onChange={(e) => setInvoice({ ...invoice, project: { ...invoice.project, designer: e.target.value } })}
                      />
                    </div>

                    <div className="input-group">
                      <span className="input-label">Project Type</span>
                      <input
                        type="text"
                        className="input-field"
                        value={invoice.project.type}
                        onChange={(e) => setInvoice({ ...invoice, project: { ...invoice.project, type: e.target.value } })}
                      />
                    </div>

                    <div className="input-group">
                      <span className="input-label">Project Stage</span>
                      <input
                        type="text"
                        className="input-field"
                        value={invoice.project.stage}
                        onChange={(e) => setInvoice({ ...invoice, project: { ...invoice.project, stage: e.target.value } })}
                      />
                    </div>

                    <div className="input-group">
                      <span className="input-label">Expected Completion</span>
                      <input
                        type="date"
                        className="input-field"
                        value={invoice.project.expectedCompletion}
                        onChange={(e) => setInvoice({ ...invoice, project: { ...invoice.project, expectedCompletion: e.target.value } })}
                      />
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>

        {/* Section 4: Line Items */}
        <div className={`collapsible-section ${openSections.items ? 'open' : ''}`}>
          <button className="collapsible-header" type="button" onClick={() => toggleSection('items')}>
            <span className="collapsible-header-title">
              <FolderOpen size={16} />
              4. Design Specifications (Line Items)
            </span>
            <ChevronDown size={16} className="collapsible-chevron" />
          </button>
          {openSections.items && (
            <div className="collapsible-content">
              <div className="collapsible-content-wrapper">
                
                <div style={{ display: 'flex', justifySelf: 'flex-end', marginBottom: '8px' }}>
                  <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', width: '100%' }} onClick={handleAddItem}>
                    <Plus size={14} /> Add New Design Item
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {invoice.items.map((item, idx) => (
                    <div className="item-editor-row" key={item.id}>
                      <div className="item-editor-row-top">
                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--color-secondary-brown)' }}>
                          #{idx + 1}
                        </span>
                        
                        <textarea
                          rows={3}
                          placeholder="Item title and specifications..."
                          className="input-field"
                          style={{ flex: 1, resize: 'none', fontSize: '0.8rem', padding: '8px' }}
                          value={item.description}
                          onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                        />
                        
                        <button
                          className="btn-icon"
                          type="button"
                          title="Generate Spec with AI"
                          onClick={() => triggerAiAssistant(item.id, item.description)}
                          style={{ background: 'var(--color-primary-gold-light)', borderColor: 'var(--color-primary-gold)', color: 'var(--color-secondary-brown)' }}
                        >
                          <Sparkles size={14} />
                        </button>
                      </div>

                      <div className="form-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                        <div className="input-group">
                          <span className="input-label">HSN</span>
                          <input
                            type="text"
                            className="input-field"
                            style={{ padding: '6px' }}
                            value={item.hsn}
                            onChange={(e) => handleItemChange(item.id, 'hsn', e.target.value)}
                          />
                        </div>

                        <div className="input-group">
                          <span className="input-label">Quantity</span>
                          <input
                            type="number"
                            className="input-field"
                            style={{ padding: '6px' }}
                            value={item.quantity}
                            onChange={(e) => handleItemChange(item.id, 'quantity', Number(e.target.value))}
                          />
                        </div>

                        <div className="input-group">
                          <span className="input-label">Unit</span>
                          <input
                            type="text"
                            className="input-field"
                            style={{ padding: '6px' }}
                            value={item.unit}
                            onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
                          />
                        </div>

                        <div className="input-group">
                          <span className="input-label">Rate (₹)</span>
                          <input
                            type="number"
                            className="input-field"
                            style={{ padding: '6px' }}
                            value={item.rate}
                            onChange={(e) => handleItemChange(item.id, 'rate', Number(e.target.value))}
                          />
                        </div>
                      </div>

                      <div className="item-editor-actions">
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span className="input-label">Disc%</span>
                            <input
                              type="number"
                              className="input-field"
                              style={{ width: '50px', padding: '4px' }}
                              value={item.discount}
                              onChange={(e) => handleItemChange(item.id, 'discount', Number(e.target.value))}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span className="input-label">GST%</span>
                            <select
                              className="input-field"
                              style={{ width: '65px', padding: '4px' }}
                              value={item.gst}
                              onChange={(e) => handleItemChange(item.id, 'gst', Number(e.target.value))}
                            >
                              <option value="18">18%</option>
                              <option value="28">28%</option>
                              <option value="12">12%</option>
                              <option value="5">5%</option>
                              <option value="0">0%</option>
                            </select>
                          </div>
                        </div>

                        <button
                          className="btn-icon"
                          type="button"
                          style={{ borderColor: 'var(--color-cancelled-border)', color: 'var(--color-cancelled)' }}
                          onClick={() => handleDeleteItem(item.id)}
                          disabled={invoice.items.length === 1}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          )}
        </div>

        {/* Section 5: Banking & QR Payments */}
        <div className={`collapsible-section ${openSections.payment ? 'open' : ''}`}>
          <button className="collapsible-header" type="button" onClick={() => toggleSection('payment')}>
            <span className="collapsible-header-title">
              <CreditCard size={16} />
              5. Banking Details & Scanner
            </span>
            <ChevronDown size={16} className="collapsible-chevron" />
          </button>
          {openSections.payment && (
            <div className="collapsible-content">
              <div className="collapsible-content-wrapper">
                
                <div className="input-group">
                  <span className="input-label">Advance Amount Paid (₹)</span>
                  <input
                    type="number"
                    className="input-field"
                    value={invoice.advancePaid}
                    onChange={(e) => setInvoice({ ...invoice, advancePaid: Number(e.target.value) })}
                  />
                </div>

                <div className="input-group">
                  <span className="input-label">UPI Merchant ID</span>
                  <input
                    type="text"
                    placeholder="e.g. business@okbank"
                    className="input-field"
                    value={invoice.bank.upiId}
                    onChange={(e) => setInvoice({ ...invoice, bank: { ...invoice.bank, upiId: e.target.value } })}
                  />
                </div>

                <div className="form-grid">
                  <div className="input-group">
                    <span className="input-label">Bank Name</span>
                    <input
                      type="text"
                      className="input-field"
                      value={invoice.bank.bankName}
                      onChange={(e) => setInvoice({ ...invoice, bank: { ...invoice.bank, bankName: e.target.value } })}
                    />
                  </div>
                  
                  <div className="input-group">
                    <span className="input-label">IFSC Code</span>
                    <input
                      type="text"
                      className="input-field"
                      value={invoice.bank.ifsc}
                      onChange={(e) => setInvoice({ ...invoice, bank: { ...invoice.bank, ifsc: e.target.value } })}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <span className="input-label">Account Number</span>
                  <input
                    type="text"
                    className="input-field"
                    value={invoice.bank.accountNumber}
                    onChange={(e) => setInvoice({ ...invoice, bank: { ...invoice.bank, accountNumber: e.target.value } })}
                  />
                </div>

                <div className="input-group">
                  <span className="input-label" style={{ fontWeight: 600, color: 'var(--color-secondary-brown)' }}>
                    Payment QR Code / Scanner <span style={{ color: 'var(--color-primary-gold)', fontWeight: 700 }}>(COMPULSORY)</span>
                  </span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleQrUpload}
                      className="input-field"
                      style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                    />
                    {invoice.bank.customQrUrl && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleClearCustomQr}
                        style={{ padding: '6px 12px', fontSize: '0.75rem', borderColor: 'var(--color-cancelled-border)', color: 'var(--color-cancelled)' }}
                      >
                        Reset QR
                      </button>
                    )}
                  </div>
                  <span className="input-label" style={{ fontSize: '0.68rem', color: 'var(--color-primary-gold)', marginTop: '2px', fontWeight: 600 }}>
                    {invoice.bank.customQrUrl ? '✓ Custom QR Code Loaded' : '✓ Dynamic UPI Payment QR Auto-Generated (Compulsory)'}
                  </span>
                </div>

              </div>
            </div>
          )}
        </div>

      </aside>

      {/* 3. RIGHT PREVIEW PANEL */}
      <main className="preview-panel" ref={previewPanelRef}>
        <div className="preview-container">
          
          {/* Quick Actions Bar directly above preview for Mobile & Tablet */}
          <div className="preview-actions-toolbar">
            <button className="preview-action-btn" type="button" onClick={handlePrint}>
              <Printer size={15} />
              Print
            </button>

            <button className="preview-action-btn" type="button" onClick={handleDownloadPdf} disabled={isPdfLoading}>
              {isPdfLoading ? (
                <>
                  <Loader2 size={15} className="spinner" style={{ animation: 'rotate 1s linear infinite' }} />
                  Compiling...
                </>
              ) : (
                <>
                  <Download size={15} />
                  Download PDF
                </>
              )}
            </button>

            <button className="preview-action-btn" type="button" onClick={handleExportExcel}>
              <FileSpreadsheet size={15} />
              Excel
            </button>

            <button className="preview-action-btn" type="button" onClick={() => setEmailModalOpen(true)}>
              <Mail size={15} />
              Email
            </button>

            <button className="preview-action-btn" type="button" onClick={() => setWhatsappModalOpen(true)}>
              <MessageSquare size={15} />
              WhatsApp
            </button>

            <button className="preview-action-btn preview-action-btn-primary" type="button" onClick={() => setDriveModalOpen(true)}>
              <Cloud size={15} />
              Sync to Drive
            </button>
          </div>

          {/* Visual Indicator of Mode */}
          <div className="invoice-mode-badge-indicator">
            Live Preview • {invoice.mode} View
          </div>

          {/* Scaler Wrapper for proportional laptop document preview on mobile */}
          <div 
            className="invoice-a4-scaler"
            style={documentScale < 1 ? {
              width: `${Math.floor(820 * documentScale)}px`,
              height: `${Math.ceil(canvasHeight * documentScale)}px`,
              overflow: 'hidden'
            } : undefined}
          >
            {/* Actual Print Canvas */}
            <div 
              ref={canvasRef}
              className="invoice-a4-canvas anim-fade-in" 
              id="invoice-print-area"
              style={documentScale < 1 ? ({
                '--doc-scale': documentScale,
                zoom: documentScale
              } as React.CSSProperties) : undefined}
            >
            
            <div>
              {/* TOP HEADER SECTION */}
              <div className="invoice-header-row">
                
                {/* Top Left: Logo & Company Address */}
                <div className="company-info-block">
                  {invoice.company.logoUrl ? (
                    <img 
                      src={invoice.company.logoUrl} 
                      alt="Espacio Logo" 
                      style={{ 
                        maxHeight: '130px', 
                        maxWidth: '240px', 
                        objectFit: 'contain',
                        objectPosition: 'left center',
                        marginBottom: '8px',
                        display: 'block',
                        alignSelf: 'flex-start',
                        marginLeft: '-20px'
                      }} 
                    />
                  ) : (
                    <div className="company-logo-preview">
                      E<span>SPACIO</span>
                    </div>
                  )}
                  <div className="company-details-text">
                    <p style={{ fontWeight: 600, color: 'var(--color-secondary-brown)' }}>{invoice.company.name}</p>
                    <p style={{ marginTop: '3px' }}>{invoice.company.address}</p>
                    <p style={{ marginTop: '6px' }}><strong>GSTIN:</strong> {invoice.company.gstin}</p>
                    <p><strong>Tel:</strong> {invoice.company.phone} | <strong>Email:</strong> {invoice.company.email}</p>
                    <p><strong>Web:</strong> {invoice.company.website}</p>
                  </div>
                </div>

                {/* Top Center: Elegant Title Heading */}
                <div className="invoice-title-block">
                  <span className="invoice-title-text">{invoice.mode}</span>
                  <span className="invoice-subtitle-text">Luxury Interior Design Studio</span>
                  <div className="invoice-header-divider"></div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--color-text-light)', letterSpacing: '0.5px', textTransform: 'uppercase', marginTop: '6px', fontWeight: 600 }}>
                    Thank you for your valued business
                  </span>
                </div>

                {/* Top Right: Status Card */}
                <div className="meta-info-card">
                  <div className="meta-info-row">
                    <span className="meta-info-label">Number</span>
                    <span className="meta-info-val">{invoice.invoiceNumber}</span>
                  </div>
                  <div className="meta-info-row">
                    <span className="meta-info-label">Date</span>
                    <span className="meta-info-val">{invoice.invoiceDate}</span>
                  </div>
                  <div className="meta-info-row">
                    <span className="meta-info-label">Due Date</span>
                    <span className="meta-info-val">{invoice.dueDate}</span>
                  </div>
                  <div className="meta-info-row">
                    <span className="meta-info-label">Terms</span>
                    <span className="meta-info-val">{invoice.paymentTerms}</span>
                  </div>
                  <div className="meta-info-row" style={{ alignItems: 'center', marginTop: '4px' }}>
                    <span className="meta-info-label">Status</span>
                    <span className={`status-pill status-${invoice.status.toLowerCase()}`}>
                      {invoice.status}
                    </span>
                  </div>
                </div>

              </div>

              {/* TWO INFORMATION CARDS (CLIENT & PROJECT) */}
              <div className="info-cards-row">
                
                {/* Client Card */}
                <div className="premium-info-card">
                  <div className="card-title-badge">
                    <User size={13} />
                    <span>Bill To</span>
                  </div>
                  <div className="info-details-list">
                    <div className="info-details-row">
                      <span className="info-details-lbl">Client</span>
                      <span className="info-details-val" style={{ color: 'var(--color-secondary-brown)', fontWeight: 700 }}>
                        {invoice.client.name}
                      </span>
                    </div>
                    <div className="info-details-row">
                      <span className="info-details-lbl">Address</span>
                      <span className="info-details-val">{invoice.client.address}</span>
                    </div>
                    <div className="info-details-row">
                      <span className="info-details-lbl">Phone</span>
                      <span className="info-details-val">{invoice.client.phone}</span>
                    </div>
                    <div className="info-details-row">
                      <span className="info-details-lbl">Email</span>
                      <span className="info-details-val">{invoice.client.email}</span>
                    </div>
                    {invoice.client.gstin && (
                      <div className="info-details-row">
                        <span className="info-details-lbl">GSTIN</span>
                        <span className="info-details-val">{invoice.client.gstin}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Project Details Card */}
                <div className="premium-info-card">
                  <div className="card-title-badge">
                    <FolderOpen size={13} />
                    <span>Project Details</span>
                  </div>
                  <div className="info-details-list">
                    <div className="info-details-row">
                      <span className="info-details-lbl">Project</span>
                      <span className="info-details-val" style={{ color: 'var(--color-secondary-brown)', fontWeight: 700 }}>
                        {invoice.project.name}
                      </span>
                    </div>
                    <div className="info-details-row">
                      <span className="info-details-lbl">Site Site</span>
                      <span className="info-details-val">{invoice.project.address}</span>
                    </div>
                    <div className="info-details-row">
                      <span className="info-details-lbl">Designer</span>
                      <span className="info-details-val">{invoice.project.designer}</span>
                    </div>
                    <div className="info-details-row">
                      <span className="info-details-lbl">Type / Stage</span>
                      <span className="info-details-val">{invoice.project.type} | {invoice.project.stage}</span>
                    </div>
                    <div className="info-details-row">
                      <span className="info-details-lbl">Completion</span>
                      <span className="info-details-val">{invoice.project.expectedCompletion}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* INVOICE TABLE */}
              <div className="luxury-table-wrapper">
                <table className="luxury-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40%' }}>Item & Design Specifications</th>
                      <th style={{ width: '10%' }}>HSN</th>
                      <th style={{ width: '10%', textAlign: 'center' }}>Qty</th>
                      <th style={{ width: '10%' }}>Unit</th>
                      <th style={{ width: '15%', textAlign: 'right' }}>Rate (₹)</th>
                      <th style={{ width: '10%', textAlign: 'right' }}>Disc %</th>
                      <th style={{ width: '10%', textAlign: 'right' }}>GST %</th>
                      <th style={{ width: '15%', textAlign: 'right' }}>Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item) => {
                      const descriptionLines = item.description.split('\n');
                      const title = descriptionLines[0] || 'Interior Work';
                      const bullets = descriptionLines.slice(1);

                      return (
                        <tr key={item.id}>
                          <td className="item-desc-cell">
                            <div className="item-desc-title">{title}</div>
                            {bullets.length > 0 && (
                              <ul className="item-desc-bullets">
                                {bullets.map((b, i) => (
                                  <li key={i}>{b}</li>
                                ))}
                              </ul>
                            )}
                          </td>
                          <td>{item.hsn}</td>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.quantity}</td>
                          <td style={{ color: 'var(--color-text-muted)' }}>{item.unit}</td>
                          <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                            {item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ textAlign: 'right', color: 'var(--color-primary-gold)', fontWeight: 600 }}>
                            {item.discount > 0 ? `${item.discount}%` : '—'}
                          </td>
                          <td style={{ textAlign: 'right' }}>{item.gst}%</td>
                          <td className="amount-cell amount-cell-right">
                            {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* LOWER ROW: BANKING AND TOTALS */}
              <div className="lower-sections-container">
                
                {/* Left Side: Banking QR & Terms */}
                <div className="lower-left-column">
                  
                  {/* Banking Details Card */}
                  <div className="payment-banking-card">
                    <div className="qr-section">
                      <div className="qr-code-canvas-container">
                        {invoice.bank.customQrUrl ? (
                          <img src={invoice.bank.customQrUrl} alt="Custom Payment QR Code" style={{ width: '90px', height: '90px', objectFit: 'contain' }} />
                        ) : qrCodeUrl ? (
                          <img src={qrCodeUrl} alt="UPI Payment QR Code" style={{ width: '90px', height: '90px' }} />
                        ) : (
                          <div style={{ width: '90px', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Loader2 className="spinner" style={{ animation: 'rotate 1s linear infinite' }} />
                          </div>
                        )}
                      </div>
                      <span className="qr-scan-text">Scan to Pay</span>
                    </div>

                    <div className="bank-info-section">
                      <h4 className="bank-info-title">
                        <Building size={12} />
                        Banking Details
                      </h4>
                      <div className="bank-info-grid">
                        <span className="bank-info-lbl">Bank</span>
                        <span className="bank-info-val">{invoice.bank.bankName}</span>

                        <span className="bank-info-lbl">Holder</span>
                        <span className="bank-info-val">{invoice.bank.accountHolder}</span>

                        <span className="bank-info-lbl">Account</span>
                        <span className="bank-info-val">{invoice.bank.accountNumber}</span>

                        <span className="bank-info-lbl">IFSC Code</span>
                        <span className="bank-info-val" style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>
                          {invoice.bank.ifsc}
                        </span>

                        <span className="bank-info-lbl">Branch</span>
                        <span className="bank-info-val">{invoice.bank.branch}</span>

                        <span className="bank-info-lbl">UPI ID</span>
                        <span className="bank-info-val" style={{ color: 'var(--color-primary-gold)', fontWeight: 600 }}>
                          {invoice.bank.upiId}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Notes Card */}
                  <div className="notes-card">
                    <span className="notes-title">Architectural Notes</span>
                    <p className="notes-content">{invoice.notes}</p>
                  </div>

                </div>

                {/* Right Side: Totals Summary & Words */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Totals Card */}
                  <div className="summary-card">
                    <div className="summary-row">
                      <span>Subtotal</span>
                      <span className="val">₹{totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {totals.discountTotal > 0 && (
                      <div className="summary-row" style={{ color: 'var(--color-cancelled)' }}>
                        <span>Discount Deducted</span>
                        <span className="val">-₹{totals.discountTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="summary-row" style={{ fontWeight: 600 }}>
                      <span>Taxable Value</span>
                      <span className="val">₹{totals.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="summary-row">
                      <span>CGST (9%)</span>
                      <span className="val">₹{totals.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="summary-row">
                      <span>SGST (9%)</span>
                      <span className="val">₹{totals.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {totals.roundOff !== 0 && (
                      <div className="summary-row">
                        <span>Round Off Adjustment</span>
                        <span className="val">₹{totals.roundOff > 0 ? `+${totals.roundOff}` : totals.roundOff}</span>
                      </div>
                    )}
                    
                    <div className="summary-row grand-total-row">
                      <span>Grand Total</span>
                      <span className="val">₹{totals.grandTotal.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="summary-row">
                      <span>Advance Deposited</span>
                      <span className="val" style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                        -₹{invoice.advancePaid.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="summary-row balance-due-row">
                      <span>Balance Due</span>
                      <span className="val">₹{totals.balanceDue.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Words Card */}
                  <div className="words-card">
                    <div className="words-title">Amount in Words</div>
                    <div className="words-text">{amountWords}</div>
                  </div>

                </div>

              </div>
            </div>

            {/* LOWER TERMS AND SIGNATURE FOOTER */}
            <div className="invoice-footer-container">
              
              {/* Terms Section */}
              <div className="terms-section">
                <span className="terms-title">Standard Terms & Conditions</span>
                <ol className="terms-list">
                  {invoice.terms.map((term, i) => (
                    <li key={i}>{term}</li>
                  ))}
                </ol>
              </div>

              {/* Three Grid Feature Flags */}
              <div className="footer-features-row">
                <div className="footer-feature-card">
                  <span className="footer-feature-title">Quality Assured</span>
                  <span className="footer-feature-desc">Premium Materials | Luxury Finish</span>
                </div>
                <div className="footer-feature-card">
                  <span className="footer-feature-title">Custom Solutions</span>
                  <span className="footer-feature-desc">Tailor-made Interiors | Timely Delivery</span>
                </div>
                <div className="footer-feature-card">
                  <span className="footer-feature-title">Professional Execution</span>
                  <span className="footer-feature-desc">Timely Delivery | Professional Execution</span>
                </div>
              </div>

              {/* Bottom Row: Message & Signature */}
              <div className="footer-bottom-row">
                
                <div className="thank-you-sign">
                  <span className="thank-you-headline">Thank you for trusting Espacio.</span>
                  <span className="thank-you-subline">Creating Timeless Spaces.</span>
                </div>

                <div className="authorized-signature-block">
                  <div className="signature-placeholder" style={{ minHeight: '50px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {invoice.company.signatureUrl ? (
                      <img 
                        src={invoice.company.signatureUrl} 
                        alt="Authorized Signature" 
                        style={{ 
                          maxHeight: '44px', 
                          maxWidth: '120px', 
                          objectFit: 'contain',
                          zIndex: 2,
                          position: 'relative' 
                        }} 
                      />
                    ) : (
                      <div className="signature-script">Espacio Studio</div>
                    )}
                    
                  </div>
                  <span className="signature-label">Authorized Signature</span>
                </div>

              </div>

            </div>

            </div>
          </div>

        </div>
      </main>
      </div>

      {/* --- FLOATING MODALS --- */}
      <AiDescriptionModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        itemName={aiTargetItemName}
        onApply={handleApplyAiDescription}
      />

      <EmailModal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        invoiceNumber={invoice.invoiceNumber}
        clientName={invoice.client.name}
        clientEmail={invoice.client.email}
        grandTotal={totals.grandTotal}
      />

      <WhatsAppModal
        isOpen={whatsappModalOpen}
        onClose={() => setWhatsappModalOpen(false)}
        invoiceNumber={invoice.invoiceNumber}
        clientName={invoice.client.name}
        clientPhone={invoice.client.phone}
        grandTotal={totals.grandTotal}
      />

      <GoogleDriveModal
        isOpen={driveModalOpen}
        onClose={() => setDriveModalOpen(false)}
        invoiceNumber={invoice.invoiceNumber}
      />

    </div>
  );
}

export default QuotationGeneratorStudio;
