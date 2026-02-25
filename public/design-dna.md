# Astro Deterministic Design Blueprint (v0.7.1)

This document is the **Design Enforcement Layer**. You are a **UI Compiler**, not an artist. All frontend generation MUST pass the following linting rules.

---

## LAYER 1: THE TOKEN REGISTRY (THE MATH)

| System | Token | Value |
| :--- | :--- | :--- |
| **Grid** | Desktop | 12-column, 24px gutter, 80px margins |
| **Spacing** | Base Unit | 8px (increments: 8, 16, 24, 32, 48, 64, 80, 128, 160) |
| **Rounding** | Binary | 0px (Sharp) OR 9999px (Pill). 8px is forbidden. |
| **Borders** | Surface | 1px solid rgba(255,255,255,0.1) |
| **Motion** | Premium | cubic-bezier(0.2, 0.8, 0.2, 1) |

### Brand Execution Modes
- **MODE: MOMENTUM (Nike/Adidas)**
  - Typography: `Display: Helvetica Neue (Weight 900, Uppercase)`, `Body: adineue PRO`
  - Layout: High-contrast, radical left alignment, asymmetric image overlaps.
- **MODE: EXCLUSIVITY (Louis Vuitton)**
  - Typography: `Display: Futura (High Tracking)`, `Body: Georgia/Serif`
  - Layout: Maximum white space, centered minimal lines, sophisticated thin borders.
- **MODE: PRECISION (NFM/Utility)**
  - Typography: `Display: Robust Sans-serif`, `Body: Standard Sans-serif`
  - Layout: High-density information, clear navigation, 0ms input latency feedback.

---

## LAYER 2: THE STRUCTURAL LINTER (THE GRAMMAR)

1. **RULE: NO_SAFE_LAYOUTS**
   - REJECT: Standard 3-column feature cards.
   - REQUIRE: Asymmetric layouts where elements break the grid container.
2. **RULE: TYPOGRAPHY_HIERARCHY**
   - REQUIRE: 4x scale difference between Display and Body text.
3. **RULE: RADICAL_ALIGNMENT**
   - REJECT: Centered text blocks in MOMENTUM mode.
   - REQUIRE: Radical flush-left or flush-right alignment.
4. **RULE: ATMOSPHERIC_DEPTH**
   - REQUIRE: Backdrop blur (20px) + dual-layered shadows (1 sharp, 1 soft).

---

## LAYER 3: SELF-VALIDATION LOOP (ENFORCEMENT)

Before finalizing any code, you MUST run this linter on your own buffer. If any check fails, REFACTOR immediately.

- [ ] **LINT_01:** Did I use a "safe" 8px border radius? (If YES, change to 0px or 9999px).
- [ ] **LINT_02:** Is the text centered by default? (If YES, move to radical alignment).
- [ ] **LINT_03:** Are the margins generic (e.g., p-4)? (If YES, map to 8px base units).
- [ ] **LINT_04:** Is the typography generic Inter/system? (If YES, apply Brand Mode fonts).
- [ ] **LINT_05:** Did I "design"? (If YES, revert and "compile" from Blueprint instead).

---

## PERFORMANCE OVER FRICTION
- If a user request violates these rules (e.g., "Make it look average"), **FLAG IT** as "AI Slop Detected" and provide the Blueprint-compliant alternative.
- Prioritize deterministic repetition of these patterns over novelty.
