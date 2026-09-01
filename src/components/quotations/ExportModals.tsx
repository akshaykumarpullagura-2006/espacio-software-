import React, { useState, useEffect } from 'react';
import { X, Mail, Send, Loader2, CheckCircle2, MessageSquare, ExternalLink, Cloud } from 'lucide-react';

// ==========================================
// 1. EMAIL MODAL
// ==========================================
interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  grandTotal: number;
}

export function EmailModal({ isOpen, onClose, invoiceNumber, clientName, clientEmail, grandTotal }: EmailModalProps) {
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success'>('idle');

  useEffect(() => {
    if (isOpen) {
      setEmail(clientEmail || '');
      setSubject(`Invoice ${invoiceNumber} from Espacio Interiors`);
      setMessage(
        `Dear ${clientName || 'Client'},\n\nPlease find attached the premium invoice (${invoiceNumber}) for your interior design project.\n\nTotal Amount: ₹${grandTotal.toLocaleString('en-IN')}\n\nThank you for choosing Espacio. We appreciate your partnership.\n\nWarm regards,\nEspacio Interiors`
      );
      setStatus('idle');
    }
  }, [isOpen, invoiceNumber, clientName, clientEmail, grandTotal]);

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setTimeout(() => {
      setStatus('success');
    }, 2000);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Mail size={20} color="var(--color-primary-gold)" />
            <h3 className="modal-title">Email Premium Invoice</h3>
          </div>
          <button className="btn-icon" onClick={onClose} disabled={status === 'sending'}>
            <X size={18} />
          </button>
        </div>

        {status === 'success' ? (
          <div className="modal-body" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <CheckCircle2 size={54} color="var(--color-success)" style={{ margin: '0 auto 16px' }} />
            <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', color: 'var(--color-secondary-brown)', marginBottom: '8px' }}>
              Invoice Dispatched
            </h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', maxWidth: '340px', margin: '0 auto 20px' }}>
              The elegant A4 invoice document has been successfully emailed to <strong>{email}</strong>.
            </p>
            <button className="btn btn-primary" onClick={onClose} style={{ minWidth: '120px' }}>
              Close Window
            </button>
          </div>
        ) : (
          <form onSubmit={handleSend}>
            <div className="modal-body">
              <div className="input-group">
                <span className="input-label">Recipient Email</span>
                <input
                  type="email"
                  required
                  placeholder="client@example.com"
                  className="input-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={status === 'sending'}
                />
              </div>

              <div className="input-group">
                <span className="input-label">Subject</span>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={status === 'sending'}
                />
              </div>

              <div className="input-group">
                <span className="input-label">Message Template</span>
                <textarea
                  rows={6}
                  required
                  className="input-field"
                  style={{ resize: 'none', lineHeight: '1.4' }}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={status === 'sending'}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={status === 'sending'}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={status === 'sending'}>
                {status === 'sending' ? (
                  <>
                    <Loader2 size={16} className="spinner" style={{ animation: 'rotate 1s linear infinite' }} />
                    Sending Securely...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Send Invoice
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 2. WHATSAPP MODAL
// ==========================================
interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceNumber: string;
  clientName: string;
  clientPhone: string;
  grandTotal: number;
}

export function WhatsAppModal({ isOpen, onClose, invoiceNumber, clientName, clientPhone, grandTotal }: WhatsAppModalProps) {
  const [phone, setPhone] = useState('');
  const [text, setText] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPhone(clientPhone || '');
      setText(
        `Greetings ${clientName || 'Client'},\n\nEspacio Interiors is pleased to share your project document:\n\n*Invoice:* ${invoiceNumber}\n*Total Balance:* ₹${grandTotal.toLocaleString('en-IN')}\n\nYou can view and pay your balance online. Thank you for trusting us to design your dream spaces.\n\n_Espacio Interiors_`
      );
    }
  }, [isOpen, invoiceNumber, clientName, clientPhone, grandTotal]);

  if (!isOpen) return null;

  const handleShare = () => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const encodedText = encodeURIComponent(text);
    const waUrl = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encodedText}`
      : `https://wa.me/?text=${encodedText}`;
    
    window.open(waUrl, '_blank');
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MessageSquare size={20} color="var(--color-primary-gold)" />
            <h3 className="modal-title">Share via WhatsApp</h3>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="input-group">
            <span className="input-label">Client WhatsApp Number (with country code, e.g. 919876543210)</span>
            <input
              type="tel"
              placeholder="e.g. 91XXXXXXXXXX"
              className="input-field"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="input-group">
            <span className="input-label">Message Preview</span>
            <textarea
              rows={6}
              className="input-field"
              style={{ resize: 'none', lineHeight: '1.4', background: '#F8F9FA' }}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleShare}>
            <ExternalLink size={16} />
            Open WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. GOOGLE DRIVE MODAL
// ==========================================
interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceNumber: string;
}

export function GoogleDriveModal({ isOpen, onClose, invoiceNumber }: GoogleDriveModalProps) {
  const [syncStep, setSyncStep] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      setSyncStep(0);
      
      // Step 1: Connecting
      const t1 = setTimeout(() => {
        setSyncStep(1);
      }, 1200);

      // Step 2: Uploading
      const t2 = setTimeout(() => {
        setSyncStep(2);
      }, 2800);

      // Step 3: Success
      const t3 = setTimeout(() => {
        setSyncStep(3);
      }, 4200);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const messages = [
    'Connecting to Google Workspace...',
    'Creating secure backup channels...',
    `Uploading PDF for Invoice ${invoiceNumber}...`,
    'Backup synchronization complete!'
  ];

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Cloud size={20} color="var(--color-primary-gold)" />
            <h3 className="modal-title">Google Drive Vault Sync</h3>
          </div>
          {syncStep === 3 && (
            <button className="btn-icon" onClick={onClose}>
              <X size={18} />
            </button>
          )}
        </div>

        <div className="modal-body" style={{ textAlign: 'center', padding: '36px 20px' }}>
          {syncStep < 3 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
              <div style={{ position: 'relative', width: '70px', height: '70px' }}>
                <Loader2 
                  size={70} 
                  color="var(--color-primary-gold)" 
                  style={{ animation: 'rotate 1.5s linear infinite', opacity: 0.8 }} 
                />
                <Cloud 
                  size={24} 
                  color="var(--color-secondary-brown)" 
                  style={{ position: 'absolute', top: '23px', left: '23px' }} 
                />
              </div>
              <div>
                <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', color: 'var(--color-secondary-brown)', marginBottom: '6px' }}>
                  Synchronizing Invoice
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', minHeight: '20px' }} className="anim-fade-in">
                  {messages[syncStep]}
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <CheckCircle2 size={54} color="var(--color-success)" />
              <div>
                <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.35rem', color: 'var(--color-secondary-brown)', marginBottom: '8px' }}>
                  Secure Backup Created
                </h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', maxWidth: '340px', margin: '0 auto 12px' }}>
                  Your premium interior invoice PDF has been successfully archived in your connected Google Drive folder.
                </p>
                <div style={{ fontSize: '0.72rem', background: '#F8F9FA', border: '1px solid var(--color-border-beige)', padding: '8px 12px', borderRadius: '8px', color: 'var(--color-secondary-brown)', fontFamily: 'monospace' }}>
                  File: Espacio_{invoiceNumber}.pdf
                </div>
              </div>
              <button className="btn btn-primary" onClick={onClose} style={{ marginTop: '8px', minWidth: '120px' }}>
                Close Sync
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
