/**
 * MAY 10 ERP — GLOBAL DESIGN TOKENS (V2.8)
 * Single Source of Truth for Enterprise Visual Design System
 */

export const DESIGN_TOKENS = {
  colors: {
    primary: '#0F5FAF',
    primaryDark: '#0F4C81',
    primaryLight: '#EAF5FC',
    primaryPale: '#F4FAFE',
    background: '#F7FAFC',
    surface: '#FFFFFF',
    border: '#DCEAF4',
    borderLight: '#EAF4FB',
    textPrimary: '#172033',
    textSecondary: '#5F6F82',
    textMuted: '#6B7785',
    status: {
      success: {
        text: '#16A878',
        bg: 'bg-emerald-50',
        textColor: 'text-emerald-700',
        border: 'border-emerald-200',
      },
      warning: {
        text: '#D97706',
        bg: 'bg-amber-50',
        textColor: 'text-amber-700',
        border: 'border-amber-200',
      },
      danger: {
        text: '#DC2626',
        bg: 'bg-red-50',
        textColor: 'text-red-700',
        border: 'border-red-200',
      },
      info: {
        text: '#3B82F6',
        bg: 'bg-blue-50',
        textColor: 'text-blue-700',
        border: 'border-blue-200',
      },
    },
  },
  typography: {
    h1: 'text-2xl lg:text-3xl font-bold text-[#172033]',
    h2: 'text-xl font-bold text-[#172033]',
    h3: 'text-base lg:text-lg font-semibold text-[#172033]',
    body: 'text-sm text-[#172033]',
    secondary: 'text-sm text-[#5F6F82]',
    caption: 'text-xs text-[#6B7785]',
    kpi: 'text-xl lg:text-2xl font-extrabold text-[#0F4C81]',
  },
  cards: {
    standard: 'bg-white border border-[#DCEAF4] rounded-xl shadow-xs',
    hover: 'transition-all duration-200 hover:shadow-xs hover:border-[#96C8EB]',
  },
  buttons: {
    primary: 'bg-[#0F5FAF] hover:bg-[#0F4C81] text-white transition-colors rounded-lg font-medium text-xs sm:text-sm px-3.5 py-2 shadow-xs',
    secondary: 'bg-white border border-[#DCEAF4] text-[#0F4C81] hover:bg-[#EAF5FC] transition-colors rounded-lg font-medium text-xs sm:text-sm px-3.5 py-2 shadow-xs',
  },
  inputs: {
    standard: 'bg-white border border-[#DCEAF4] rounded-lg text-sm text-[#172033] placeholder-[#6B7785] focus:ring-1 focus:ring-[#96C8EB] focus:border-[#0F5FAF] outline-none',
  },
  tables: {
    header: 'bg-[#F7FAFC] text-[#5F6F82] font-semibold text-xs border-b border-[#DCEAF4]',
    row: 'hover:bg-[#F4FAFE] transition-colors',
    border: 'border-[#DCEAF4]',
  },
};

export default DESIGN_TOKENS;
