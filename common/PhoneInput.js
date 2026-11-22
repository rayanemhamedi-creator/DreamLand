import React, { useEffect, useState } from 'react';

// digits = number of local digits (after the country code)
const countries = [
  { code: '+216', flag: '🇹🇳', name: 'Tunisie',       digits: 8  },
  { code: '+33',  flag: '🇫🇷', name: 'France',        digits: 9  },
  { code: '+49',  flag: '🇩🇪', name: 'Allemagne',     digits: 10 },
  { code: '+39',  flag: '🇮🇹', name: 'Italie',        digits: 10 },
  { code: '+34',  flag: '🇪🇸', name: 'Espagne',       digits: 9  },
  { code: '+44',  flag: '🇬🇧', name: 'Royaume-Uni',   digits: 10 },
  { code: '+351', flag: '🇵🇹', name: 'Portugal',      digits: 9  },
  { code: '+32',  flag: '🇧🇪', name: 'Belgique',      digits: 9  },
  { code: '+41',  flag: '🇨🇭', name: 'Suisse',        digits: 9  },
  { code: '+1',   flag: '🇺🇸', name: 'États-Unis',    digits: 10 },
  { code: '+213', flag: '🇩🇿', name: 'Algérie',       digits: 9  },
  { code: '+212', flag: '🇲🇦', name: 'Maroc',         digits: 9  },
  { code: '+218', flag: '🇱🇾', name: 'Libye',         digits: 9  },
];

export default function PhoneInput({ value = '', onChange, className = '', required = false, placeholder = '' }) {
  // Parse initial value
  let initialCode = '+216';
  let initialDigits = '';

  if (value && value.startsWith('+')) {
    const matched = countries.find(c => value.startsWith(c.code));
    if (matched) {
      initialCode = matched.code;
      initialDigits = value.slice(matched.code.length);
    } else {
      initialDigits = value;
    }
  } else {
    initialDigits = value || '';
  }

  const [countryCode, setCountryCode] = useState(initialCode);
  const [digits, setDigits] = useState(initialDigits);

  // Get the selected country object
  const selectedCountry = countries.find(c => c.code === countryCode) || countries[0];
  const maxDigits = selectedCountry.digits;

  // Sync state if prop changes from outside
  useEffect(() => {
    if (value && value.startsWith('+')) {
      const matched = countries.find(c => value.startsWith(c.code));
      if (matched) {
        setCountryCode(matched.code);
        setDigits(value.slice(matched.code.length));
      } else {
        setDigits(value);
      }
    } else {
      setDigits(value || '');
    }
  }, [value]);

  const handleCodeChange = (e) => {
    const newCode = e.target.value;
    setCountryCode(newCode);
    // Trim digits if they exceed new country's limit
    const newCountry = countries.find(c => c.code === newCode) || countries[0];
    const trimmedDigits = digits.slice(0, newCountry.digits);
    setDigits(trimmedDigits);
    onChange(newCode + trimmedDigits);
  };

  const handleDigitsChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, maxDigits);
    setDigits(val);
    onChange(countryCode + val);
  };

  const buildPlaceholder = () => {
    if (placeholder) return placeholder;
    return 'X'.repeat(maxDigits).replace(/X/g, (_, i) => ((i + 1) % 2 === 0 ? '2' : '9')).replace(/^/, '');
  };

  const isDark = className.includes('premium-input-dark');
  const selectClass = isDark
    ? "form-select bg-dark text-white border-secondary border-end-0"
    : "form-select border-end-0";

  return (
    <div>
      <div className="input-group">
        <select
          className={selectClass}
          style={{ 
            maxWidth: '130px', 
            fontSize: '0.95rem', 
            borderTopLeftRadius: '12px', 
            borderBottomLeftRadius: '12px',
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : undefined,
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : undefined,
            color: isDark ? 'white' : undefined
          }}
          value={countryCode}
          onChange={handleCodeChange}
        >
          {countries.map(c => (
            <option key={c.code} value={c.code} className={isDark ? 'bg-dark text-white' : ''}>
              {c.flag} {c.code}
            </option>
          ))}
        </select>
        <input
          type="tel"
          className={`form-control ${className}`}
          required={required}
          placeholder={placeholder || `Ex: ${'X'.repeat(maxDigits)}`}
          value={digits}
          maxLength={maxDigits}
          minLength={maxDigits}
          pattern={`[0-9]{${maxDigits}}`}
          onChange={handleDigitsChange}
          style={{ 
            borderTopRightRadius: '12px', 
            borderBottomRightRadius: '12px',
            borderTopLeftRadius: '0px',
            borderBottomLeftRadius: '0px'
          }}
        />
      </div>
      <small className="text-muted d-block mt-1" style={{ fontSize: '0.78rem' }}>
        <i className="bi bi-info-circle me-1" />
        {selectedCountry.flag} {selectedCountry.name} : {digits.length}/{maxDigits} chiffres requis
      </small>
    </div>
  );
}
