import { useState, useEffect } from 'react';
import { Sparkles, X, Check, Loader2 } from 'lucide-react';
import { generateAiDescription } from './quotation-helpers';

interface AiDescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemName: string;
  onApply: (description: string) => void;
}

export default function AiDescriptionModal({
  isOpen,
  onClose,
  itemName,
  onApply,
}: AiDescriptionModalProps) {
  const [luxuryLevel, setLuxuryLevel] = useState<'Premium' | 'Ultra-Luxury' | 'Minimalist'>('Premium');
  const [material, setMaterial] = useState('');
  const [details, setDetails] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState('');
  const [displayedText, setDisplayedText] = useState('');

  // Reset when modal opens for a new item
  useEffect(() => {
    if (isOpen) {
      setGeneratedText('');
      setDisplayedText('');
      setMaterial('');
      setDetails('');
    }
  }, [isOpen, itemName]);

  // Typewriter effect
  useEffect(() => {
    if (!generatedText) return;
    setDisplayedText('');
    let idx = 0;
    
    // Typing speed based on text length
    const speed = generatedText.length > 200 ? 5 : 12; 
    
    const interval = setInterval(() => {
      setDisplayedText((prev) => prev + generatedText.charAt(idx));
      idx++;
      if (idx >= generatedText.length) {
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [generatedText]);

  if (!isOpen) return null;

  const handleGenerate = () => {
    setIsGenerating(true);
    setGeneratedText('');
    setDisplayedText('');

    // Simulate AI thinking and generating with loading skeletons
    setTimeout(() => {
      const result = generateAiDescription(itemName, luxuryLevel, material, details);
      setGeneratedText(result);
      setIsGenerating(false);
    }, 1800);
  };

  const handleApply = () => {
    onApply(displayedText || generatedText);
    onClose();
  };

  const materialsList = [
    'BWR Marine Plywood',
    'Teak Wood',
    'PU Gloss Paint',
    'Italian Quartz',
    'Tempered Tinted Glass',
    'Natural Veneer',
    'Acrylic Anti-Scratch',
    'Gold Hairline Metal Profiles'
  ];

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={20} color="var(--color-primary-gold)" />
            <h3 className="modal-title">AI Designer Assistant</h3>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '-8px' }}>
            Generate a luxury, professional specification list for: <strong style={{ color: 'var(--color-secondary-brown)' }}>{itemName || 'Selected Item'}</strong>
          </p>

          {/* Preset Styles */}
          <div className="input-group">
            <span className="input-label">Design & Premium Preset</span>
            <div className="ai-modal-selector-group">
              {(['Premium', 'Ultra-Luxury', 'Minimalist'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  className={`ai-modal-pill-btn ${luxuryLevel === level ? 'active' : ''}`}
                  onClick={() => setLuxuryLevel(level)}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Materials Selection */}
          <div className="input-group">
            <span className="input-label">Primary Material Finish</span>
            <select
              className="input-field"
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
            >
              <option value="">Select or type custom...</option>
              {materialsList.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Input */}
          <div className="input-group">
            <span className="input-label">Custom Specifications (e.g. Dimensions, brand name)</span>
            <input
              type="text"
              placeholder="e.g. Size 10'x8', Blum hardware, gold trims"
              className="input-field"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
          </div>

          {/* Generate Action */}
          <button
            className="btn btn-gold"
            onClick={handleGenerate}
            disabled={isGenerating || !itemName}
            style={{ width: '100%', padding: '12px' }}
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="spinner" style={{ animation: 'rotate 1s linear infinite' }} />
                Architecting luxury specifications...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Generate Elegant Specification
              </>
            )}
          </button>

          {/* Visual Output */}
          {(isGenerating || generatedText || displayedText) && (
            <div className="input-group">
              <span className="input-label">AI Proposal Output</span>
              {isGenerating ? (
                <div className="ai-generated-output-box" style={{ display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center' }}>
                  <div className="skeleton-bar" style={{ width: '90%' }}></div>
                  <div className="skeleton-bar" style={{ width: '75%' }}></div>
                  <div className="skeleton-bar" style={{ width: '85%' }}></div>
                </div>
              ) : (
                <div className="ai-generated-output-box">
                  <span className="ai-typing-text">{displayedText}</span>
                  {displayedText.length < generatedText.length && <span className="ai-cursor"></span>}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleApply}
            disabled={!displayedText || isGenerating}
          >
            <Check size={16} />
            Apply Specification
          </button>
        </div>
      </div>
    </div>
  );
}
