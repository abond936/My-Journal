'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './ThemeAdmin.module.css';
import { StructuredThemeData, BaseColor, ThemeColor, hexToHsl } from '@/lib/types/theme';
import {
  THEME_PRESET_META,
  getThemePresetDocument,
  type ThemePresetId,
  type ThemeDocumentData,
} from '@/lib/theme/themePresets';
import ThemeReaderPreview from './ThemeReaderPreview';

// Color Palette Editor Component
const PaletteColorEditor: React.FC<{
  color: BaseColor | ThemeColor;
  onColorChange: (id: number, field: keyof BaseColor | keyof ThemeColor, value: string, variant?: 'light' | 'dark') => void;
  onHslChange: (id: number, h: string, s: string, l: string, variant?: 'light' | 'dark') => void;
  darkModeShift: number;
}> = ({ color, onColorChange, onHslChange, darkModeShift }) => {

  const isThemeColor = (color: BaseColor | ThemeColor): color is ThemeColor => {
    return 'light' in color && 'dark' in color;
  };

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>, variant?: 'light' | 'dark') => {
    const newHex = e.target.value;
    
    if (isThemeColor(color)) {
      onColorChange(color.id, 'hex', newHex, variant);
      
      // For colors 1 and 2, also update HSL values when hex is valid
      if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(newHex)) {
        const { h, s, l } = hexToHsl(newHex);
        onHslChange(color.id, `${h}`, `${s}%`, `${l}%`, variant);
      }
    } else {
      onColorChange(color.id, 'hex', newHex);
      
      // If it's a valid hex, auto-update HSL
      if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(newHex)) {
        const { h, s, l } = hexToHsl(newHex);
        onHslChange(color.id, `${h}`, `${s}%`, `${l}%`);
      }
    }
  };
  
  const handleHslSliderChange = (component: 'h' | 's' | 'l', value: string, variant?: 'light' | 'dark') => {
    if (isThemeColor(color)) {
      const variantData = variant === 'light' ? color.light : color.dark;
      const newH = component === 'h' ? value : variantData.h;
      const newS = component === 's' ? `${value}%` : variantData.s;
      const newL = component === 'l' ? `${value}%` : variantData.l;
      onHslChange(color.id, newH, newS, newL, variant);
      
      // Convert HSL back to HEX and update
      const h = parseInt(newH, 10);
      const s = parseInt(newS, 10);
      const l = parseInt(newL, 10);
      const newHex = hslToHex(h, s, l);
      onColorChange(color.id, 'hex', newHex, variant);
    } else {
      const newH = component === 'h' ? value : color.h;
      const newS = component === 's' ? `${value}%` : color.s;
      const newL = component === 'l' ? `${value}%` : color.l;
      onHslChange(color.id, newH, newS, newL);
      
      // Convert HSL back to HEX and update
      const h = parseInt(newH, 10);
      const s = parseInt(newS, 10);
      const l = parseInt(newL, 10);
      const newHex = hslToHex(h, s, l);
      onColorChange(color.id, 'hex', newHex);
    }
  };

  const handleAssignmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onColorChange(color.id, 'name', e.target.value);
  };

  if (isThemeColor(color)) {
    // Generate 3-shade color scales matching theme service exactly
    const generateShadeColors = (baseHex: string, isBackground: boolean) => {
      try {
        const { h, s, l } = hexToHsl(baseHex);
        
        if (isBackground) {
          // Background colors (Color 1): 100=darkest, 200=medium, 300=lightest
          const step1 = Math.min(100, l + 10); // 10% lighter
          const step2 = Math.min(100, l + 20); // 20% lighter
          
          return {
            '100': `hsl(${h}, ${s}%, ${l}%)`,      // Original color (darkest)
            '200': `hsl(${h}, ${s}%, ${step1}%)`,  // 10% lighter
            '300': `hsl(${h}, ${s}%, ${step2}%)`   // 20% lighter (lightest)
          };
        } else {
          // Text colors (Color 2): 100=lightest, 200=medium, 300=darkest
          const step1 = Math.max(0, l - 10); // 10% darker
          const step2 = Math.max(0, l - 20); // 20% darker
          
          return {
            '100': `hsl(${h}, ${s}%, ${l}%)`,      // Original color (lightest)
            '200': `hsl(${h}, ${s}%, ${step1}%)`,  // 10% darker
            '300': `hsl(${h}, ${s}%, ${step2}%)`   // 20% darker (darkest)
          };
        }
      } catch (error) {
        console.error('Error generating shade colors:', error);
        // Fallback to basic colors
        return {
          '100': baseHex,
          '200': baseHex,
          '300': baseHex
        };
      }
    };

    // Generate shades for each hex color
    const lightShades = generateShadeColors(color.light.hex, color.id === 1);
    const darkShades = generateShadeColors(color.dark.hex, color.id === 1);

    return (
      <div className={styles.colorEditor}>
        {/* Top Row: Number */}
        <div className={styles.topRow}>
          <div className={styles.numberAndColors}>
            <div className={styles.colorNumber}>{color.id}</div>
          </div>
        </div>

        {/* Main Color Boxes Row: Light and Dark with labels above */}
        <div className={styles.mainColorBoxesRow}>
          <div className={styles.colorBoxContainer}>
            <label className={styles.colorBoxLabel}>Light</label>
            <div className={styles.colorBoxWithShades}>
              <div className={styles.mainBoxWithLabel}>
                <div
                  className={styles.mainColorBox}
                  style={{ backgroundColor: color.light.hex }}
                  title={`Light: ${color.light.hex}`}
                />
                <span className={styles.shadeLabel}>100</span>
              </div>
              <div className={styles.shadeBoxesContainer}>
                <div className={styles.shadeBoxWithLabel}>
                  <div
                    className={styles.shadeBox}
                    style={{ backgroundColor: lightShades['200'] }}
                    title={`Light 200: ${lightShades['200']}`}
                  />
                  <span className={styles.shadeLabel}>200</span>
                </div>
                <div className={styles.shadeBoxWithLabel}>
                  <div
                    className={styles.shadeBox}
                    style={{ backgroundColor: lightShades['300'] }}
                    title={`Light 300: ${lightShades['300']}`}
                  />
                  <span className={styles.shadeLabel}>300</span>
                </div>
              </div>
            </div>
          </div>
          <div className={styles.colorBoxContainer}>
            <label className={styles.colorBoxLabel}>Dark</label>
            <div className={styles.colorBoxWithShades}>
              <div className={styles.mainBoxWithLabel}>
                <div
                  className={styles.mainColorBox}
                  style={{ backgroundColor: color.dark.hex }}
                  title={`Dark: ${color.dark.hex}`}
                />
                <span className={styles.shadeLabel}>100</span>
              </div>
              <div className={styles.shadeBoxesContainer}>
                <div className={styles.shadeBoxWithLabel}>
                  <div
                    className={styles.shadeBox}
                    style={{ backgroundColor: darkShades['200'] }}
                    title={`Dark 200: ${darkShades['200']}`}
                  />
                  <span className={styles.shadeLabel}>200</span>
                </div>
                <div className={styles.shadeBoxWithLabel}>
                  <div
                    className={styles.shadeBox}
                    style={{ backgroundColor: darkShades['300'] }}
                    title={`Dark 300: ${darkShades['300']}`}
                  />
                  <span className={styles.shadeLabel}>300</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hex Input Row: Two hex inputs for light/dark variants */}
        <div className={`${styles.hexInputRow} ${styles.hexInputRowTheme}`}>
          <div className={styles.hexInputLeft}>
            <input
              type="text"
              value={color.light.hex}
              onChange={(e) => handleHexChange(e, 'light')}
              className={styles.hexInput}
              title="Light variant HEX color value"
            />
          </div>
          <div className={styles.hexInputRight}>
            <input
              type="text"
              value={color.dark.hex}
              onChange={(e) => handleHexChange(e, 'dark')}
              className={styles.hexInput}
              title="Dark variant HEX color value"
            />
          </div>
        </div>


      </div>
    );
  } else {
    // Colors 3-14: Original BaseColor behavior
    const h = parseInt(color.h, 10);
    const s = parseInt(color.s, 10);
    const l = parseInt(color.l, 10);

    // Generate color scale based on HSL values
    const generateColorScale = (h: number, s: number, l: number, colorId: number, darkModeShift: number = 5) => {
      const scale = [];
      
      // Colors 3-14 get 2-box layout: base (light mode) and calculated dark variation (brighter)
      const darkL = Math.min(100, l + darkModeShift);
      
      scale.push(
        {
          step: 0,
          color: `hsl(${h}, ${s}%, ${l}%)`,
          isBase: true,
          label: 'LIGHT'
        },
        {
          step: 1,
          color: `hsl(${h}, ${s}%, ${darkL}%)`,
          isBase: false,
          label: 'DARK'
        }
      );
      
      return scale;
    };

    const colorScale = generateColorScale(h, s, l, color.id, darkModeShift);

    // Colors 3-14: Labels above boxes, hex input under left box, HSL spinners centered under left box
    return (
      <div className={styles.colorEditor}>
        {/* Top Row: Number and Color Scale with labels above */}
        <div className={styles.topRow}>
          <div className={styles.numberAndColors}>
            <div className={styles.colorNumber}>{color.id}</div>
            <div className={styles.colorScale}>
              {colorScale.map(({ step, color: scaleColor, isBase, label }) => (
                <div key={step} className={styles.scaleItem}>
                  <span className={styles.scaleLabelAbove}>{label}</span>
                  <div
                    className={`${styles.scaleColor} ${isBase ? styles.scaleColorBase : ''}`}
                    style={{ backgroundColor: scaleColor }}
                    title={`${label}: ${scaleColor}`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Hex Input Row: Only under the left (LIGHT) box */}
        <div className={styles.hexInputRow}>
          <div className={styles.hexInputLeft}>
            <input
              type="text"
              value={color.hex}
              onChange={handleHexChange}
              className={styles.hexInput}
              title="HEX color value"
            />
          </div>
        </div>

        {/* Bottom Row: HSL Spinners left-justified */}
        <div className={styles.hslSpinnersLeft}>
          <div className={styles.spinnerGroupInline}>
            <label>H</label>
            <input
              type="number"
              min="0"
              max="360"
              value={isNaN(h) ? 0 : h}
              onChange={(e) => handleHslSliderChange('h', e.target.value)}
              className={styles.hslSpinner}
            />
          </div>
          <div className={styles.spinnerGroupInline}>
            <label>S</label>
            <input
              type="number"
              min="0"
              max="100"
              value={isNaN(s) ? 0 : s}
              onChange={(e) => handleHslSliderChange('s', e.target.value)}
              className={styles.hslSpinner}
            />
          </div>
          <div className={styles.spinnerGroupInline}>
            <label>L</label>
            <input
              type="number"
              min="0"
              max="100"
              value={isNaN(l) ? 0 : l}
              onChange={(e) => handleHslSliderChange('l', e.target.value)}
              className={styles.hslSpinner}
            />
          </div>
        </div>
      </div>
    );
  }
};

// Helper function to convert HSL to HEX
const hslToHex = (h: number, s: number, l: number): string => {
  const sDecimal = s / 100;
  const lDecimal = l / 100;

  const c = (1 - Math.abs(2 * lDecimal - 1)) * sDecimal;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = lDecimal - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

// Token Input Component
const TokenInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'number';
}> = ({ label, value, onChange, type = 'text' }) => (
  <div className={styles.tokenInput}>
    <label>{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

// Font Size Token Input - Right-justified layout
const FontSizeTokenInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
}> = ({ label, value, onChange }) => (
  <div className={styles.fontSizeTokenInput}>
    <label>{label}</label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

// Extended Token Input - Wider input for complex formulas
const ExtendedTokenInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
}> = ({ label, value, onChange }) => (
  <div className={styles.extendedTokenInput}>
    <label>{label}</label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

// Color Reference Input - Right-justified layout with validation and preview
const ColorReferenceInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  colors: any[];
  themeColors?: any[];
}> = ({ label, value, onChange, colors, themeColors = [] }) => {
  const [isValid, setIsValid] = useState(true);
  const [previewColor, setPreviewColor] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const validateAndPreview = useCallback((inputValue: string) => {
    if (!inputValue.trim()) {
      setIsValid(true);
      setPreviewColor('');
      setErrorMessage('');
      return;
    }

    // Parse input: "color1-100" or "color3"
    const colorMatch = inputValue.match(/^color(\d+)(?:-(\d+))?$/);
    if (!colorMatch) {
      setIsValid(false);
      setPreviewColor('');
      setErrorMessage('Invalid format. Use "color1-100" for theme colors or "color3" for palette colors');
      return;
    }

    const colorNum = parseInt(colorMatch[1], 10);
    const step = colorMatch[2];

    // Validate color number range
    if (colorNum < 1 || colorNum > 14) {
      setIsValid(false);
      setPreviewColor('');
      setErrorMessage('Color number must be between 1 and 14');
      return;
    }

    // Find the color - check themeColors first for colors 1-2, then palette for colors 3-14
    let color;
    if (colorNum === 1 || colorNum === 2) {
      color = themeColors.find(c => c.id === colorNum);
      if (!color) {
        setIsValid(false);
        setPreviewColor('');
        setErrorMessage(`Color ${colorNum} not found in theme colors`);
        return;
      }
    } else {
      color = colors.find(c => c.id === colorNum);
      if (!color) {
        setIsValid(false);
        setPreviewColor('');
        setErrorMessage(`Color ${colorNum} not found in palette`);
        return;
      }
    }

    // Validate format based on color type
    if (colorNum === 1 || colorNum === 2) {
      // Colors 1-2 need step specification
      if (!step) {
        setIsValid(false);
        setPreviewColor('');
        setErrorMessage(`Color ${colorNum} requires a step (e.g., "color${colorNum}-100")`);
        return;
      }
      
      const validSteps = ['100', '200', '300'];
      if (!validSteps.includes(step)) {
        setIsValid(false);
        setPreviewColor('');
        setErrorMessage(`Invalid step "${step}". Valid steps: ${validSteps.join(', ')}`);
        return;
      }

      // Generate preview color matching CSS generation logic (theme colors 1–2 store HSL under light/dark)
      const light = (color as ThemeColor).light;
      const h = parseInt(light.h, 10);
      const s = parseInt(String(light.s).replace('%', ''), 10);
      const stepValue = parseInt(step, 10);
      
      let baseLightness;
      if (colorNum === 1) {
        // Color1 (background): 100=100%, 200=95%, 300=90%
        baseLightness = Math.max(0, Math.min(100, 105 - (stepValue / 20)));
      } else {
        // Color2 (text): 100=20%, 200=15%, 300=10%
        baseLightness = Math.max(0, Math.min(100, 25 - (stepValue / 20)));
      }
      
      // Show light theme preview (for simplicity in admin interface)
      setPreviewColor(`hsl(${h}, ${s}%, ${baseLightness}%)`);
      setIsValid(true);
      setErrorMessage('');
    } else if (colorNum >= 3 && colorNum <= 14) {
      // Colors 3-14 should not have step specification
      if (step) {
        setIsValid(false);
        setPreviewColor('');
        setErrorMessage(`Color ${colorNum} should not have a step specification (use just "color${colorNum}")`);
        return;
      }

      // Generate preview color (base color)
      const h = parseInt(color.h, 10);
      const s = parseInt(color.s, 10);
      const l = parseInt(color.l, 10);
      setPreviewColor(`hsl(${h}, ${s}%, ${l}%)`);
      setIsValid(true);
      setErrorMessage('');
    } else {
      setIsValid(false);
      setPreviewColor('');
      setErrorMessage('Invalid color reference format');
    }
  }, [colors, themeColors]);

  React.useEffect(() => {
    validateAndPreview(value);
  }, [value, validateAndPreview]);

  return (
    <div className={styles.colorReferenceInput}>
      <div className={styles.colorInputRow}>
        <label>{label}</label>
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            validateAndPreview(e.target.value);
          }}
          className={`${styles.colorInput} ${!isValid ? styles.colorInputError : ''}`}
          placeholder="color1-100 or color3"
        />
      </div>
      {previewColor && (
        <div 
          className={styles.colorPreview}
          style={{ backgroundColor: previewColor }}
          title={`Preview: ${previewColor}`}
        />
      )}
      {!isValid && (
        <span className={styles.colorError}>
          {errorMessage}
        </span>
      )}
    </div>
  );
};

// State Color Input - For states with color preview boxes
const StateColorInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  colors: any[];
}> = ({ label, value, onChange, colors }) => {
  const [previewColor, setPreviewColor] = useState('');

  React.useEffect(() => {
    if (value && colors) {
      // Handle both old numeric format and new color format
      let colorNum;
      if (value.startsWith('color')) {
        colorNum = parseInt(value.replace('color', ''), 10);
      } else {
        colorNum = parseInt(value, 10);
      }
      
      const color = colors.find(c => c.id === colorNum);
      if (color) {
        const h = parseInt(color.h, 10);
        const s = parseInt(color.s, 10);
        const l = parseInt(color.l, 10);
        setPreviewColor(`hsl(${h}, ${s}%, ${l}%)`);
      } else {
        setPreviewColor('');
      }
    } else {
      setPreviewColor('');
    }
  }, [value, colors]);

  return (
    <div className={styles.colorReferenceInput}>
      <div className={styles.colorInputRow}>
        <label>{label}</label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={styles.colorInput}
          placeholder="color11-color14"
        />
      </div>
      {previewColor && (
        <div 
          className={styles.colorPreview}
          style={{ backgroundColor: previewColor }}
          title={`Preview: ${previewColor}`}
        />
      )}
    </div>
  );
};

// Font Weight Input - Right-justified layout for editable values
const FontWeightInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
}> = ({ label, value, onChange }) => (
  <div className={styles.fontSizeTokenInput}>
    <label>{label}</label>
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);



// Spacing Multiplier Input - Right-justified layout for multiplier values
const SpacingMultiplierInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
}> = ({ label, value, onChange }) => (
  <div className={styles.fontSizeTokenInput}>
    <label>{label}</label>
    <input
      type="number"
      step="0.25"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

// Spacing Section with calculation logic
const SpacingSection: React.FC<{
  spacing: any;
  onUnitChange: (value: string) => void;
  onMultiplierChange: (size: string, value: string) => void;
}> = ({ spacing, onUnitChange, onMultiplierChange }) => {
  const unit = spacing?.unit || '8px';
  
  // Default multipliers if not set
  const multipliers = {
    xs: spacing?.xsMultiplier || '0.5',
    sm: spacing?.smMultiplier || '1',
    md: spacing?.mdMultiplier || '2',
    lg: spacing?.lgMultiplier || '3',
    xl: spacing?.xlMultiplier || '4',
    '2xl': spacing?.['2xlMultiplier'] || '6',
    '3xl': spacing?.['3xlMultiplier'] || '8',
    '4xl': spacing?.['4xlMultiplier'] || '12'
  };
  
  return (
    <div className={styles.tokenCategory}>
      <h3>Spacing</h3>
      <div className={styles.tokenSubsection}>
        <h4>Base Unit</h4>
        <FontSizeTokenInput 
          label="Unit" 
          value={unit} 
          onChange={onUnitChange} 
        />
      </div>
      <div className={styles.tokenSubsection}>
        <h4>Spacing Scale</h4>
        <SpacingMultiplierInput 
          label="XS" 
          value={multipliers.xs} 
          onChange={(v) => onMultiplierChange('xsMultiplier', v)} 
        />
        <SpacingMultiplierInput 
          label="SM" 
          value={multipliers.sm} 
          onChange={(v) => onMultiplierChange('smMultiplier', v)} 
        />
        <SpacingMultiplierInput 
          label="MD" 
          value={multipliers.md} 
          onChange={(v) => onMultiplierChange('mdMultiplier', v)} 
        />
        <SpacingMultiplierInput 
          label="LG" 
          value={multipliers.lg} 
          onChange={(v) => onMultiplierChange('lgMultiplier', v)} 
        />
        <SpacingMultiplierInput 
          label="XL" 
          value={multipliers.xl} 
          onChange={(v) => onMultiplierChange('xlMultiplier', v)} 
        />
        <SpacingMultiplierInput 
          label="2XL" 
          value={multipliers['2xl']} 
          onChange={(v) => onMultiplierChange('2xlMultiplier', v)} 
        />
        <SpacingMultiplierInput 
          label="3XL" 
          value={multipliers['3xl']} 
          onChange={(v) => onMultiplierChange('3xlMultiplier', v)} 
        />
        <SpacingMultiplierInput 
          label="4XL" 
          value={multipliers['4xl']} 
          onChange={(v) => onMultiplierChange('4xlMultiplier', v)} 
        />
      </div>
      <div className={styles.tokenSubsection}>
        <h4>Fluid Spacing</h4>
        <FontSizeTokenInput label="FSpc1" value={spacing?.fluidSpacing?.spacing1 || ''} onChange={(v) => onMultiplierChange('fluidSpacing.spacing1', v)} />
        <FontSizeTokenInput label="FSpc2" value={spacing?.fluidSpacing?.spacing2 || ''} onChange={(v) => onMultiplierChange('fluidSpacing.spacing2', v)} />
        <FontSizeTokenInput label="FSpc3" value={spacing?.fluidSpacing?.spacing3 || ''} onChange={(v) => onMultiplierChange('fluidSpacing.spacing3', v)} />
      </div>
    </div>
  );
};



// Main Theme Admin Component
export default function ThemeAdminPage() {
  const router = useRouter();
  const [themeData, setThemeData] = useState<StructuredThemeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');
  const [darkModeShift, setDarkModeShift] = useState(5);
  const [activePresetId, setActivePresetId] = useState<ThemePresetId | 'custom'>('custom');

  useEffect(() => {
    const fetchThemeData = async () => {
      try {
        const response = await fetch('/api/theme');
        if (response.ok) {
          const data = await response.json();
          setThemeData(data);
          setDarkModeShift(data.darkModeShift || 5);
          const ap = (data as ThemeDocumentData).activePresetId;
          setActivePresetId(ap === 'journal' || ap === 'editorial' ? ap : 'custom');
        }
      } catch (error) {
        console.error('Failed to fetch theme data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchThemeData();
  }, []);

  const handleColorChange = (id: number, field: keyof BaseColor | keyof ThemeColor, value: string, variant?: 'light' | 'dark') => {
    if (!themeData) return;
    setActivePresetId('custom');

    setThemeData(prev => {
      const newData = { ...prev! };
      
      // Handle theme colors (1 and 2)
      if (id === 1 || id === 2) {
        const themeColor = newData.themeColors.find(color => color.id === id);
        if (themeColor && variant) {
          if (field === 'hex') {
            themeColor[variant].hex = value;
          } else if (field === 'name') {
            themeColor.name = value;
          }
        }
      } else {
        // Handle regular palette colors (3-14)
        newData.palette = newData.palette.map(color =>
          color.id === id ? { ...color, [field]: value } : color
        );
      }
      
      return newData;
    });
  };

  const handleHslChange = (id: number, h: string, s: string, l: string, variant?: 'light' | 'dark') => {
    if (!themeData) return;
    setActivePresetId('custom');

    setThemeData(prev => {
      const newData = { ...prev! };
      
      // Handle theme colors (1 and 2)
      if (id === 1 || id === 2) {
        const themeColor = newData.themeColors.find(color => color.id === id);
        if (themeColor && variant) {
          themeColor[variant].h = h;
          themeColor[variant].s = s;
          themeColor[variant].l = l;
        }
      } else {
        // Handle regular palette colors (3-14)
        newData.palette = newData.palette.map(color =>
          color.id === id ? { ...color, h, s, l } : color
        );
      }
      
      return newData;
    });
  };

  const handleTokenChange = (section: string, key: string, value: string) => {
    if (!themeData) return;
    setActivePresetId('custom');

    setThemeData(prev => ({
      ...prev!,
      [section]: {
        ...prev![section as keyof StructuredThemeData],
        [key]: value
      }
    }));
  };

  const handleNestedTokenChange = (section: string, subsection: string, key: string, value: string) => {
    if (!themeData) return;
    setActivePresetId('custom');

    setThemeData(prev => ({
      ...prev!,
      [section]: {
        ...prev![section as keyof StructuredThemeData],
        [subsection]: {
          ...(prev![section as keyof StructuredThemeData] as any)?.[subsection],
          [key]: value
        }
      }
    }));
  };

  const handleDeepNestedTokenChange = (section: string, subsection: string, subsubsection: string, key: string, value: string) => {
    if (!themeData) return;
    setActivePresetId('custom');

    setThemeData(prev => ({
      ...prev!,
      [section]: {
        ...prev![section as keyof StructuredThemeData],
        [subsection]: {
          ...(prev![section as keyof StructuredThemeData] as any)?.[subsection],
          [subsubsection]: {
            ...((prev![section as keyof StructuredThemeData] as any)?.[subsection] as any)?.[subsubsection],
            [key]: value
          }
        }
      }
    }));
  };

  const toggleTheme = () => {
    setCurrentTheme(prev => prev === 'light' ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', currentTheme === 'light' ? 'dark' : 'light');
  };

  const applyPreset = (id: ThemePresetId) => {
    const doc = getThemePresetDocument(id);
    setDarkModeShift(doc.darkModeShift ?? 5);
    setActivePresetId(doc.activePresetId ?? id);
    const { darkModeShift: _ds, activePresetId: _ap, ...structured } = doc;
    setThemeData(structured as StructuredThemeData);
  };

  const validateThemeData = (data: any): string[] => {
    const errors: string[] = [];
    
    console.log('Validating theme data:', data);
    
    // Helper function to validate color references recursively
    const validateColorReferences = (obj: any, path: string = '') => {
      if (!obj || typeof obj !== 'object') return;
      
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (typeof value === 'string') {
          // Only check strings that look like color references (start with "color")
          if (value.match(/^color\d+(-\d+)?$/)) {
            console.log(`Checking color reference at ${currentPath}:`, value);
            if (!isValidColorReference(value, data.palette, data.themeColors || [])) {
              errors.push(`Invalid color reference at ${currentPath}: ${value}`);
            }
          }
        } else if (typeof value === 'object' && value !== null) {
          validateColorReferences(value, currentPath);
        }
      }
    };
    
    // Validate all color references in the theme data
    validateColorReferences(data);
    
    return errors;
  };

  const isValidColorReference = (reference: string, palette: any[], themeColors: any[]): boolean => {
    if (!reference.trim()) return true; // Empty is valid
    
    // Check for theme color format: "color1-200", "color2-100", etc.
    const themeColorMatch = reference.match(/^color(\d+)-(\d+)$/);
    if (themeColorMatch) {
      const colorNum = parseInt(themeColorMatch[1], 10);
      const step = themeColorMatch[2];
      
      // Validate color number range
      if (colorNum < 1 || colorNum > 14) return false;
      
      // For colors 1 and 2, check themeColors array
      if (colorNum === 1 || colorNum === 2) {
        const color = themeColors.find(c => c.id === colorNum);
        if (!color) return false;
        
        // Validate step for colors 1 and 2 (3-shade system)
        const validSteps = ['100', '200', '300'];
        return validSteps.includes(step);
      } else {
        // Colors 3-14 should not have step specification
        return false;
      }
    }
    
    // Check for palette color format: "color3", "color4", etc. (colors 3-14)
    const paletteColorMatch = reference.match(/^color(\d+)$/);
    if (paletteColorMatch) {
      const colorNum = parseInt(paletteColorMatch[1], 10);
      
      // Only colors 3-14 can use this format
      if (colorNum < 3 || colorNum > 14) return false;
      
      // Find the color in palette array
      const color = palette.find(c => c.id === colorNum);
      return !!color;
    }
    
    return false;
  };

  const saveTheme = async () => {
    if (!themeData) return;
    
    // Validate theme data before saving
    const validationErrors = validateThemeData(themeData);
    if (validationErrors.length > 0) {
      alert(`Cannot save theme due to validation errors:\n${validationErrors.join('\n')}`);
      return;
    }
    
    setSaving(true);
    try {
      const dataToSave: ThemeDocumentData = {
        ...themeData,
        darkModeShift,
        activePresetId,
      };
      
      const response = await fetch('/api/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave)
      });
      
      if (response.ok) {
        router.refresh();
        alert('Theme saved successfully!');
      } else {
        const errorText = await response.text();
        alert(`Failed to save theme: ${errorText}`);
      }
    } catch (error) {
      console.error('Failed to save theme:', error);
      alert(`Failed to save theme: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.centered}>
        <div>Loading theme data...</div>
      </div>
    );
  }

  if (!themeData) {
    return (
      <div className={styles.centered}>
        <div>Failed to load theme data</div>
      </div>
    );
  }

  return (
    <div className={styles.adminContainer}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Theme Management</h1>
          <button 
            onClick={saveTheme}
            disabled={saving}
            className={styles.saveButton}
          >
            {saving ? 'Saving...' : 'Save Theme'}
          </button>
        </div>
      </div>

      <main className={styles.mainContent}>
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Design preset</h2>
          </div>
          <p className={styles.presetIntro}>
            The admin chooses the look for all readers. Pick a starting point, refine below, then Save. Active:{' '}
            <strong>
              {activePresetId === 'custom'
                ? 'Custom'
                : THEME_PRESET_META[activePresetId].label}
            </strong>
            .
          </p>
          <div className={styles.presetGrid}>
            {(['journal', 'editorial'] as const).map((id) => (
              <div key={id} className={styles.presetCard}>
                <h3 className={styles.presetCardTitle}>{THEME_PRESET_META[id].label}</h3>
                <p className={styles.presetCardText}>{THEME_PRESET_META[id].description}</p>
                <button
                  type="button"
                  className={styles.presetApplyButton}
                  onClick={() => applyPreset(id)}
                  disabled={saving}
                >
                  Apply {THEME_PRESET_META[id].label}
                </button>
              </div>
            ))}
          </div>
        </section>

        <ThemeReaderPreview themeData={themeData} darkModeShift={darkModeShift} />

        {/* Color Palette Section */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Color Palette</h2>
            <div className={styles.paletteControls}>
              <button 
                onClick={toggleTheme}
                className={styles.themeToggleButton}
              >
                Switch to {currentTheme === 'light' ? 'Dark' : 'Light'} Theme
              </button>
              <div className={styles.lightDarkVariation}>
                <label>Dark Mode Shift:</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={darkModeShift}
                  onChange={(e) => {
                    setActivePresetId('custom');
                    setDarkModeShift(parseInt(e.target.value, 10));
                  }}
                  className={styles.variationInput}
                />
                <span>%</span>
              </div>
            </div>
          </div>
          <div className={styles.paletteGrid}>
            {/* Render theme colors (1 and 2) first */}
            {themeData.themeColors?.map((color) => (
              <PaletteColorEditor
                key={color.id}
                color={color}
                onColorChange={handleColorChange}
                onHslChange={handleHslChange}
                darkModeShift={darkModeShift}
              />
            ))}
            {/* Render regular palette colors (3-14) - filter out colors 1 and 2 */}
            {themeData.palette.filter(color => color.id > 2).map((color) => (
              <PaletteColorEditor
                key={color.id}
                color={color}
                onColorChange={handleColorChange}
                onHslChange={handleHslChange}
                darkModeShift={darkModeShift}
              />
            ))}
          </div>
        </section>

        {/* All Design Tokens in 4-Column Layout */}
        <section className={styles.section}>
          <h2>Design Tokens</h2>
          <div className={styles.tokenGrid4Column}>
            {/* Column 1: Typography */}
            <div className={styles.tokenCategory}>
              <h3>Typography</h3>
              
              <div className={styles.tokenSubsection}>
                <h4>Font Families</h4>
                <TokenInput 
                  label="Sans" 
                  value={themeData.typography?.fontFamilies?.sans || ''} 
                  onChange={(v) => handleNestedTokenChange('typography', 'fontFamilies', 'sans', v)} 
                />
                <TokenInput 
                  label="Serif" 
                  value={themeData.typography?.fontFamilies?.serif || ''} 
                  onChange={(v) => handleNestedTokenChange('typography', 'fontFamilies', 'serif', v)} 
                />
                <TokenInput 
                  label="Handwriting" 
                  value={themeData.typography?.fontFamilies?.handwriting || ''} 
                  onChange={(v) => handleNestedTokenChange('typography', 'fontFamilies', 'handwriting', v)} 
                />
              </div>

              <div className={styles.tokenSubsection}>
                <h4>Text Colors</h4>
                <ColorReferenceInput label="Text1" value={themeData.typography?.textColors?.text1 || ''} onChange={(v) => handleNestedTokenChange('typography', 'textColors', 'text1', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <ColorReferenceInput label="Text2" value={themeData.typography?.textColors?.text2 || ''} onChange={(v) => handleNestedTokenChange('typography', 'textColors', 'text2', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
              </div>

              <div className={styles.tokenSubsection}>
                <h4>Font Sizes</h4>
                <FontSizeTokenInput label="XS" value={themeData.typography?.fontSizes?.xs || ''} onChange={(v) => handleNestedTokenChange('typography', 'fontSizes', 'xs', v)} />
                <FontSizeTokenInput label="SM" value={themeData.typography?.fontSizes?.sm || ''} onChange={(v) => handleNestedTokenChange('typography', 'fontSizes', 'sm', v)} />
                <FontSizeTokenInput label="Base" value={themeData.typography?.fontSizes?.base || ''} onChange={(v) => handleNestedTokenChange('typography', 'fontSizes', 'base', v)} />
                <FontSizeTokenInput label="LG" value={themeData.typography?.fontSizes?.lg || ''} onChange={(v) => handleNestedTokenChange('typography', 'fontSizes', 'lg', v)} />
                <FontSizeTokenInput label="XL" value={themeData.typography?.fontSizes?.xl || ''} onChange={(v) => handleNestedTokenChange('typography', 'fontSizes', 'xl', v)} />
                <FontSizeTokenInput label="2XL" value={themeData.typography?.fontSizes?.['2xl'] || ''} onChange={(v) => handleNestedTokenChange('typography', 'fontSizes', '2xl', v)} />
                <FontSizeTokenInput label="3XL" value={themeData.typography?.fontSizes?.['3xl'] || ''} onChange={(v) => handleNestedTokenChange('typography', 'fontSizes', '3xl', v)} />
                <FontSizeTokenInput label="4XL" value={themeData.typography?.fontSizes?.['4xl'] || ''} onChange={(v) => handleNestedTokenChange('typography', 'fontSizes', '4xl', v)} />
                <FontSizeTokenInput label="5XL" value={themeData.typography?.fontSizes?.['5xl'] || ''} onChange={(v) => handleNestedTokenChange('typography', 'fontSizes', '5xl', v)} />
                <FontSizeTokenInput label="6XL" value={themeData.typography?.fontSizes?.['6xl'] || ''} onChange={(v) => handleNestedTokenChange('typography', 'fontSizes', '6xl', v)} />
              </div>

              <div className={styles.tokenSubsection}>
                <h4>Font Weights</h4>
                <FontWeightInput label="Normal" value={themeData.typography?.fontWeights?.normal || ''} onChange={(v) => handleNestedTokenChange('typography', 'fontWeights', 'normal', v)} />
                <FontWeightInput label="Medium" value={themeData.typography?.fontWeights?.medium || ''} onChange={(v) => handleNestedTokenChange('typography', 'fontWeights', 'medium', v)} />
                <FontWeightInput label="Semibold" value={themeData.typography?.fontWeights?.semibold || ''} onChange={(v) => handleNestedTokenChange('typography', 'fontWeights', 'semibold', v)} />
                <FontWeightInput label="Bold" value={themeData.typography?.fontWeights?.bold || ''} onChange={(v) => handleNestedTokenChange('typography', 'fontWeights', 'bold', v)} />
              </div>

              <div className={styles.tokenSubsection}>
                <h4>Line Heights</h4>
                <FontSizeTokenInput label="Base" value={themeData.typography?.lineHeights?.base || ''} onChange={(v) => handleNestedTokenChange('typography', 'lineHeights', 'base', v)} />
                <FontSizeTokenInput label="Tight" value={themeData.typography?.lineHeights?.tight || ''} onChange={(v) => handleNestedTokenChange('typography', 'lineHeights', 'tight', v)} />
                <FontSizeTokenInput label="Relaxed" value={themeData.typography?.lineHeights?.relaxed || ''} onChange={(v) => handleNestedTokenChange('typography', 'lineHeights', 'relaxed', v)} />
              </div>

              <div className={styles.tokenSubsection}>
                <h4>Fluid Sizes</h4>
                <ExtendedTokenInput label="Fld1" value={themeData.typography?.fluidFontSizes?.size1 || ''} onChange={(v) => handleNestedTokenChange('typography', 'fluidFontSizes', 'size1', v)} />
                <ExtendedTokenInput label="Fld2" value={themeData.typography?.fluidFontSizes?.size2 || ''} onChange={(v) => handleNestedTokenChange('typography', 'fluidFontSizes', 'size2', v)} />
                <ExtendedTokenInput label="Fld3" value={themeData.typography?.fluidFontSizes?.size3 || ''} onChange={(v) => handleNestedTokenChange('typography', 'fluidFontSizes', 'size3', v)} />
              </div>

              <div className={styles.tokenSubsection}>
                <h4>Breakpoints</h4>
                <FontSizeTokenInput label="SM" value={themeData.layout?.breakpoints?.sm || ''} onChange={(v) => handleNestedTokenChange('layout', 'breakpoints', 'sm', v)} />
                <FontSizeTokenInput label="MD" value={themeData.layout?.breakpoints?.md || ''} onChange={(v) => handleNestedTokenChange('layout', 'breakpoints', 'md', v)} />
                <FontSizeTokenInput label="LG" value={themeData.layout?.breakpoints?.lg || ''} onChange={(v) => handleNestedTokenChange('layout', 'breakpoints', 'lg', v)} />
                <FontSizeTokenInput label="XL" value={themeData.layout?.breakpoints?.xl || ''} onChange={(v) => handleNestedTokenChange('layout', 'breakpoints', 'xl', v)} />
              </div>

              <div className={styles.tokenSubsection}>
                <h4>Z-Index</h4>
                <FontSizeTokenInput label="Default" value={themeData.zIndex?.default || ''} onChange={(v) => handleTokenChange('zIndex', 'default', v)} />
                <FontSizeTokenInput label="Content" value={themeData.zIndex?.content || ''} onChange={(v) => handleTokenChange('zIndex', 'content', v)} />
                <FontSizeTokenInput label="Sticky" value={themeData.zIndex?.sticky || ''} onChange={(v) => handleTokenChange('zIndex', 'sticky', v)} />
                <FontSizeTokenInput label="Modal Backdrop" value={themeData.zIndex?.modalBackdrop || ''} onChange={(v) => handleTokenChange('zIndex', 'modalBackdrop', v)} />
                <FontSizeTokenInput label="Sidebar" value={themeData.zIndex?.sidebar || ''} onChange={(v) => handleTokenChange('zIndex', 'sidebar', v)} />
                <FontSizeTokenInput label="Header" value={themeData.zIndex?.header || ''} onChange={(v) => handleTokenChange('zIndex', 'header', v)} />
                <FontSizeTokenInput label="Modal" value={themeData.zIndex?.modal || ''} onChange={(v) => handleTokenChange('zIndex', 'modal', v)} />
                <FontSizeTokenInput label="Tooltip" value={themeData.zIndex?.tooltip || ''} onChange={(v) => handleTokenChange('zIndex', 'tooltip', v)} />
              </div>

              <div className={styles.tokenSubsection}>
                <h4>Gradients</h4>
                <ExtendedTokenInput label="Bottom Overlay" value={themeData.gradients?.bottomOverlay || ''} onChange={(v) => handleTokenChange('gradients', 'bottomOverlay', v)} />
                <ExtendedTokenInput label="Bottom Overlay Strong" value={themeData.gradients?.bottomOverlayStrong || ''} onChange={(v) => handleTokenChange('gradients', 'bottomOverlayStrong', v)} />
              </div>
            </div>

            {/* Column 2: Spacing & Borders */}
            <div className={styles.tokenCategory}>
              <h3>Spacing & Borders</h3>
              
              <div className={styles.tokenSubsection}>
                <h4>Spacing Unit</h4>
                <FontSizeTokenInput 
                  label="Unit" 
                  value={themeData.spacing?.unit || ''} 
                  onChange={(v) => handleTokenChange('spacing', 'unit', v)} 
                />
              </div>
              
              <div className={styles.tokenSubsection}>
                <h4>Spacing Scale</h4>
                <SpacingMultiplierInput 
                  label="XS" 
                  value={themeData.spacing?.xsMultiplier || ''} 
                  onChange={(v) => handleTokenChange('spacing', 'xsMultiplier', v)} 
                />
                <SpacingMultiplierInput 
                  label="SM" 
                  value={themeData.spacing?.smMultiplier || ''} 
                  onChange={(v) => handleTokenChange('spacing', 'smMultiplier', v)} 
                />
                <SpacingMultiplierInput 
                  label="MD" 
                  value={themeData.spacing?.mdMultiplier || ''} 
                  onChange={(v) => handleTokenChange('spacing', 'mdMultiplier', v)} 
                />
                <SpacingMultiplierInput 
                  label="LG" 
                  value={themeData.spacing?.lgMultiplier || ''} 
                  onChange={(v) => handleTokenChange('spacing', 'lgMultiplier', v)} 
                />
                <SpacingMultiplierInput 
                  label="XL" 
                  value={themeData.spacing?.xlMultiplier || ''} 
                  onChange={(v) => handleTokenChange('spacing', 'xlMultiplier', v)} 
                />
                <SpacingMultiplierInput 
                  label="2XL" 
                  value={themeData.spacing?.['2xlMultiplier'] || ''} 
                  onChange={(v) => handleTokenChange('spacing', '2xlMultiplier', v)} 
                />
                <SpacingMultiplierInput 
                  label="3XL" 
                  value={themeData.spacing?.['3xlMultiplier'] || ''} 
                  onChange={(v) => handleTokenChange('spacing', '3xlMultiplier', v)} 
                />
                <SpacingMultiplierInput 
                  label="4XL" 
                  value={themeData.spacing?.['4xlMultiplier'] || ''} 
                  onChange={(v) => handleTokenChange('spacing', '4xlMultiplier', v)} 
                />
              </div>

              <div className={styles.tokenSubsection}>
                <h4>Fluid Spacing</h4>
                <ExtendedTokenInput label="FSpc1" value={themeData.spacing?.fluidSpacing?.spacing1 || ''} onChange={(v) => handleNestedTokenChange('spacing', 'fluidSpacing', 'spacing1', v)} />
                <ExtendedTokenInput label="FSpc2" value={themeData.spacing?.fluidSpacing?.spacing2 || ''} onChange={(v) => handleNestedTokenChange('spacing', 'fluidSpacing', 'spacing2', v)} />
                <ExtendedTokenInput label="FSpc3" value={themeData.spacing?.fluidSpacing?.spacing3 || ''} onChange={(v) => handleNestedTokenChange('spacing', 'fluidSpacing', 'spacing3', v)} />
              </div>

              <div className={styles.tokenSubsection}>
                <h4>Border Colors</h4>
                <ColorReferenceInput label="Border1" value={themeData.borders?.colors?.border1 || ''} onChange={(v) => handleNestedTokenChange('borders', 'colors', 'border1', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <ColorReferenceInput label="Border2" value={themeData.borders?.colors?.border2 || ''} onChange={(v) => handleNestedTokenChange('borders', 'colors', 'border2', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
              </div>

              <div className={styles.tokenSubsection}>
                <h4>Border Widths</h4>
                <FontSizeTokenInput label="Thin" value={themeData.borders?.widths?.thin || ''} onChange={(v) => handleNestedTokenChange('borders', 'widths', 'thin', v)} />
                <FontSizeTokenInput label="Medium" value={themeData.borders?.widths?.medium || ''} onChange={(v) => handleNestedTokenChange('borders', 'widths', 'medium', v)} />
                <FontSizeTokenInput label="Thick" value={themeData.borders?.widths?.thick || ''} onChange={(v) => handleNestedTokenChange('borders', 'widths', 'thick', v)} />
              </div>

              <div className={styles.tokenSubsection}>
                <h4>Border Radius</h4>
                <FontSizeTokenInput label="SM" value={themeData.borders?.radius?.sm || ''} onChange={(v) => handleNestedTokenChange('borders', 'radius', 'sm', v)} />
                <FontSizeTokenInput label="MD" value={themeData.borders?.radius?.md || ''} onChange={(v) => handleNestedTokenChange('borders', 'radius', 'md', v)} />
                <FontSizeTokenInput label="LG" value={themeData.borders?.radius?.lg || ''} onChange={(v) => handleNestedTokenChange('borders', 'radius', 'lg', v)} />
                <FontSizeTokenInput label="XL" value={themeData.borders?.radius?.xl || ''} onChange={(v) => handleNestedTokenChange('borders', 'radius', 'xl', v)} />
                <FontSizeTokenInput label="Full" value={themeData.borders?.radius?.full || ''} onChange={(v) => handleNestedTokenChange('borders', 'radius', 'full', v)} />
              </div>

              <div className={styles.tokenSubsection}>
                <h4>Box Shadows</h4>
                <FontSizeTokenInput label="Strength (Light)" value={themeData.shadows?.strength || ''} onChange={(v) => handleTokenChange('shadows', 'strength', v)} />
                <FontSizeTokenInput label="Strength (Dark)" value={themeData.shadows?.strengthDark || ''} onChange={(v) => handleTokenChange('shadows', 'strengthDark', v)} />
                <ExtendedTokenInput label="Color" value={themeData.shadows?.color || ''} onChange={(v) => handleTokenChange('shadows', 'color', v)} />
                <ExtendedTokenInput label="SM" value={themeData.shadows?.sm || ''} onChange={(v) => handleTokenChange('shadows', 'sm', v)} />
                <ExtendedTokenInput label="MD" value={themeData.shadows?.md || ''} onChange={(v) => handleTokenChange('shadows', 'md', v)} />
                <ExtendedTokenInput label="LG" value={themeData.shadows?.lg || ''} onChange={(v) => handleTokenChange('shadows', 'lg', v)} />
                <ExtendedTokenInput label="XL" value={themeData.shadows?.xl || ''} onChange={(v) => handleTokenChange('shadows', 'xl', v)} />
              </div>

              <div className={styles.tokenSubsection}>
                <h4>Tag Dimensions</h4>
                <ColorReferenceInput label="Who BG" value={themeData.components?.tag?.backgrounds?.who || ''} onChange={(v) => handleDeepNestedTokenChange('components', 'tag', 'backgrounds', 'who', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <ColorReferenceInput label="What BG" value={themeData.components?.tag?.backgrounds?.what || ''} onChange={(v) => handleDeepNestedTokenChange('components', 'tag', 'backgrounds', 'what', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <ColorReferenceInput label="When BG" value={themeData.components?.tag?.backgrounds?.when || ''} onChange={(v) => handleDeepNestedTokenChange('components', 'tag', 'backgrounds', 'when', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <ColorReferenceInput label="Where BG" value={themeData.components?.tag?.backgrounds?.where || ''} onChange={(v) => handleDeepNestedTokenChange('components', 'tag', 'backgrounds', 'where', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
              </div>
            </div>

            {/* Column 3: Layout */}
            <div className={styles.tokenCategory}>
              <h3>Layout</h3>
              
              <div className={styles.tokenSubsection}>
                <h4>Layout</h4>
                <FontSizeTokenInput label="Container Max Width" value={themeData.layout?.containerMaxWidth || ''} onChange={(v) => handleTokenChange('layout', 'containerMaxWidth', v)} />
                <TokenInput label="Body Font Family" value={themeData.layout?.bodyFontFamily || ''} onChange={(v) => handleTokenChange('layout', 'bodyFontFamily', v)} />
                <ColorReferenceInput label="Body Background" value={themeData.layout?.bodyBackgroundColor || 'color1-100'} onChange={(v) => handleTokenChange('layout', 'bodyBackgroundColor', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <ColorReferenceInput label="Background1" value={themeData.layout?.background1Color || ''} onChange={(v) => handleTokenChange('layout', 'background1Color', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <ColorReferenceInput label="Background2" value={themeData.layout?.background2Color || ''} onChange={(v) => handleTokenChange('layout', 'background2Color', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <ColorReferenceInput label="Border1" value={themeData.layout?.border1Color || ''} onChange={(v) => handleTokenChange('layout', 'border1Color', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <ColorReferenceInput label="Border2" value={themeData.layout?.border2Color || ''} onChange={(v) => handleTokenChange('layout', 'border2Color', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <FontSizeTokenInput label="Sidebar Width" value={themeData.layout?.sidebarWidth || ''} onChange={(v) => handleTokenChange('layout', 'sidebarWidth', v)} />
                <FontSizeTokenInput label="Sidebar Width Mobile" value={themeData.layout?.sidebarWidthMobile || ''} onChange={(v) => handleTokenChange('layout', 'sidebarWidthMobile', v)} />
                <FontSizeTokenInput label="Logo Max Height" value={themeData.layout?.logoMaxHeight || ''} onChange={(v) => handleTokenChange('layout', 'logoMaxHeight', v)} />
                <FontSizeTokenInput label="Spinner Size" value={themeData.layout?.spinnerSize || ''} onChange={(v) => handleTokenChange('layout', 'spinnerSize', v)} />
                <FontSizeTokenInput label="Form Min Width" value={themeData.layout?.formMinWidth || ''} onChange={(v) => handleTokenChange('layout', 'formMinWidth', v)} />
                <FontSizeTokenInput label="Button Min Width" value={themeData.layout?.buttonMinWidth || ''} onChange={(v) => handleTokenChange('layout', 'buttonMinWidth', v)} />
                <FontSizeTokenInput label="Icon Min Width" value={themeData.layout?.iconMinWidth || ''} onChange={(v) => handleTokenChange('layout', 'iconMinWidth', v)} />
                <FontSizeTokenInput label="Transition Short" value={themeData.layout?.transitionShort || ''} onChange={(v) => handleTokenChange('layout', 'transitionShort', v)} />
              </div>

              <div className={styles.tokenSubsection}>
                <h4>Header</h4>
                <FontSizeTokenInput label="Height" value={themeData.components?.header?.height || ''} onChange={(v) => handleNestedTokenChange('components', 'header', 'height', v)} />
                <ColorReferenceInput label="Background" value={themeData.components?.header?.backgroundColor || ''} onChange={(v) => handleNestedTokenChange('components', 'header', 'backgroundColor', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <ColorReferenceInput label="Border Color" value={themeData.components?.header?.borderColor || ''} onChange={(v) => handleNestedTokenChange('components', 'header', 'borderColor', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <FontSizeTokenInput label="Border Width" value={themeData.components?.header?.borderWidth || ''} onChange={(v) => handleNestedTokenChange('components', 'header', 'borderWidth', v)} />
              </div>

              <div className={styles.tokenSubsection}>
                <h4>Input</h4>
                <ColorReferenceInput label="Background" value={themeData.components?.input?.backgroundColor || ''} onChange={(v) => handleNestedTokenChange('components', 'input', 'backgroundColor', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <ColorReferenceInput label="Border Color" value={themeData.components?.input?.borderColor || ''} onChange={(v) => handleNestedTokenChange('components', 'input', 'borderColor', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <ColorReferenceInput label="Border Focus" value={themeData.components?.input?.borderColorFocus || ''} onChange={(v) => handleNestedTokenChange('components', 'input', 'borderColorFocus', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <ColorReferenceInput label="Text Color" value={themeData.components?.input?.textColor || ''} onChange={(v) => handleNestedTokenChange('components', 'input', 'textColor', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <FontSizeTokenInput label="Border Radius" value={themeData.components?.input?.borderRadius || ''} onChange={(v) => handleNestedTokenChange('components', 'input', 'borderRadius', v)} />
                <FontSizeTokenInput label="Padding" value={themeData.components?.input?.padding || ''} onChange={(v) => handleNestedTokenChange('components', 'input', 'padding', v)} />
              </div>

              <div className={styles.tokenSubsection}>
                <h4>Card</h4>
                <ColorReferenceInput label="Background" value={themeData.components?.card?.backgroundColor || ''} onChange={(v) => handleNestedTokenChange('components', 'card', 'backgroundColor', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <FontSizeTokenInput label="Padding" value={themeData.components?.card?.padding || ''} onChange={(v) => handleNestedTokenChange('components', 'card', 'padding', v)} />
                                  <ColorReferenceInput label="Border Color" value={themeData.components?.card?.borderColor || ''} onChange={(v) => handleNestedTokenChange('components', 'card', 'borderColor', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <FontSizeTokenInput label="Border Width" value={themeData.components?.card?.borderWidth || ''} onChange={(v) => handleNestedTokenChange('components', 'card', 'borderWidth', v)} />
                <FontSizeTokenInput label="Border Radius" value={themeData.components?.card?.borderRadius || ''} onChange={(v) => handleNestedTokenChange('components', 'card', 'borderRadius', v)} />
                <ExtendedTokenInput label="Shadow" value={themeData.components?.card?.shadow || ''} onChange={(v) => handleNestedTokenChange('components', 'card', 'shadow', v)} />
                <ExtendedTokenInput label="Shadow Hover" value={themeData.components?.card?.shadowHover || ''} onChange={(v) => handleNestedTokenChange('components', 'card', 'shadowHover', v)} />
              </div>

              <div className={styles.tokenSubsection}>
                <h4>Tag</h4>
                <FontSizeTokenInput label="Padding" value={themeData.components?.tag?.padding || ''} onChange={(v) => handleNestedTokenChange('components', 'tag', 'padding', v)} />
                <FontSizeTokenInput label="Border Radius" value={themeData.components?.tag?.borderRadius || ''} onChange={(v) => handleNestedTokenChange('components', 'tag', 'borderRadius', v)} />
                <FontSizeTokenInput label="Font" value={themeData.components?.tag?.font || ''} onChange={(v) => handleNestedTokenChange('components', 'tag', 'font', v)} />
                <ColorReferenceInput label="Text Color" value={themeData.components?.tag?.textColor || ''} onChange={(v) => handleNestedTokenChange('components', 'tag', 'textColor', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
              </div>
            </div>

            {/* Column 4: Components */}
            <div className={styles.tokenCategory}>
              <h3>Components</h3>
              
              <div className={styles.tokenSubsection}>
                <h4>Link</h4>
                <ColorReferenceInput label="Text Color" value={themeData.components?.link?.textColor || ''} onChange={(v) => handleNestedTokenChange('components', 'link', 'textColor', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <ColorReferenceInput label="Text Color Hover" value={themeData.components?.link?.textColorHover || ''} onChange={(v) => handleNestedTokenChange('components', 'link', 'textColorHover', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <FontSizeTokenInput label="Decoration Hover" value={themeData.components?.link?.decorationHover || ''} onChange={(v) => handleNestedTokenChange('components', 'link', 'decorationHover', v)} />
              </div>

              <div className={styles.tokenSubsection}>
                <h4>States</h4>
                <p style={{fontSize: '12px', color: 'var(--text2-color)', marginBottom: '8px'}}>Enter color number (11-14) for each state</p>
                <StateColorInput label="Success BG" value={themeData.states?.success?.backgroundColor || '11'} onChange={(v) => handleNestedTokenChange('states', 'success', 'backgroundColor', v)} colors={themeData.palette} />
                <StateColorInput label="Success Border" value={themeData.states?.success?.borderColor || '11'} onChange={(v) => handleNestedTokenChange('states', 'success', 'borderColor', v)} colors={themeData.palette} />
                <StateColorInput label="Error BG" value={themeData.states?.error?.backgroundColor || '12'} onChange={(v) => handleNestedTokenChange('states', 'error', 'backgroundColor', v)} colors={themeData.palette} />
                <StateColorInput label="Error Border" value={themeData.states?.error?.borderColor || '12'} onChange={(v) => handleNestedTokenChange('states', 'error', 'borderColor', v)} colors={themeData.palette} />
                <StateColorInput label="Warning BG" value={themeData.states?.warning?.backgroundColor || '13'} onChange={(v) => handleNestedTokenChange('states', 'warning', 'backgroundColor', v)} colors={themeData.palette} />
                <StateColorInput label="Warning Border" value={themeData.states?.warning?.borderColor || '13'} onChange={(v) => handleNestedTokenChange('states', 'warning', 'borderColor', v)} colors={themeData.palette} />
                <StateColorInput label="Info BG" value={themeData.states?.info?.backgroundColor || '14'} onChange={(v) => handleNestedTokenChange('states', 'info', 'backgroundColor', v)} colors={themeData.palette} />
                <StateColorInput label="Info Border" value={themeData.states?.info?.borderColor || '14'} onChange={(v) => handleNestedTokenChange('states', 'info', 'borderColor', v)} colors={themeData.palette} />
              </div>

              <div className={styles.tokenSubsection}>
                <h4>Button - Solid</h4>
                <ColorReferenceInput label="Background" value={themeData.components?.button?.solid?.backgroundColor || ''} onChange={(v) => handleDeepNestedTokenChange('components', 'button', 'solid', 'backgroundColor', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <ColorReferenceInput label="Background Hover" value={themeData.components?.button?.solid?.backgroundColorHover || ''} onChange={(v) => handleDeepNestedTokenChange('components', 'button', 'solid', 'backgroundColorHover', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <ColorReferenceInput label="Border" value={themeData.components?.button?.solid?.borderColor || ''} onChange={(v) => handleDeepNestedTokenChange('components', 'button', 'solid', 'borderColor', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <ColorReferenceInput label="Text" value={themeData.components?.button?.solid?.textColor || ''} onChange={(v) => handleDeepNestedTokenChange('components', 'button', 'solid', 'textColor', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
              </div>

              <div className={styles.tokenSubsection}>
                <h4>Button - Outline</h4>
                <ColorReferenceInput label="Border" value={themeData.components?.button?.outline?.borderColor || ''} onChange={(v) => handleDeepNestedTokenChange('components', 'button', 'outline', 'borderColor', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <ColorReferenceInput label="Text" value={themeData.components?.button?.outline?.textColor || ''} onChange={(v) => handleDeepNestedTokenChange('components', 'button', 'outline', 'textColor', v)} colors={themeData.palette} themeColors={themeData.themeColors} />
                <FontSizeTokenInput label="Border Width" value={themeData.components?.button?.outline?.borderWidth || ''} onChange={(v) => handleDeepNestedTokenChange('components', 'button', 'outline', 'borderWidth', v)} />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
} 