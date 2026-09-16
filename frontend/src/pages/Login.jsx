import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Building2,
  Award,
} from 'lucide-react';
import { useAuth } from '../components/rbac/AuthContext';
import { DEMO_ACCOUNTS } from '../config/roles';

// Authentic imagery from https://garco10.com.vn/
const MAY10_SLIDES = [
  {
    src: '/images/may10-production.webp',
    title: 'Dây chuyền sản xuất & may công nghiệp hiện đại',
    caption: 'Đạt chuẩn kỹ thuật xuất khẩu sang các thị trường Mỹ, EU, Nhật Bản.',
  },
  {
    src: '/images/may10-factory.webp',
    title: 'Trụ sở & Tổ hợp sản xuất May 10',
    caption: '765 Nguyễn Văn Linh, Sài Đồng, Long Biên, Hà Nội.',
  },
  {
    src: '/images/may10-export.webp',
    title: 'Kiểm định chất lượng & Hoàn tất sản phẩm',
    caption: 'Đảm bảo tiêu chuẩn chất lượng nghiêm ngặt của Thương hiệu Quốc gia.',
  },
];

export default function Login() {
  const { login, switchRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('admin@may10.com.vn');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  const from = location.state?.from?.pathname || '/';

  const formatErrorMessage = (err) => {
    const rawMsg = err.response?.data?.message || err.message || '';
    if (
      rawMsg.includes('ECONNREFUSED') ||
      rawMsg.includes('ENOTFOUND') ||
      rawMsg.includes('ETIMEDOUT') ||
      rawMsg.includes('Network Error')
    ) {
      return 'Không thể kết nối đến máy chủ cơ sở dữ liệu. Vui lòng kiểm tra lại dịch vụ ERP.';
    }
    return rawMsg || 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(formatErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (acc) => {
    try {
      setError(null);
      switchRole(acc.code);
      navigate(from, { replace: true });
    } catch (err) {
      setError(formatErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F8F9FA] text-gray-800 font-sans selection:bg-may10-primary selection:text-white">
      {/* ============================================================ */}
      {/* MOBILE TOP BANNER (Visible on < lg screens) */}
      {/* ============================================================ */}
      <div className="lg:hidden relative h-52 w-full overflow-hidden bg-may10-dark">
        <img
          src={MAY10_SLIDES[activeSlide].src}
          alt="May 10 Production"
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        <div className="relative h-full flex flex-col justify-end p-6 text-white">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-may10-primary text-white">
              Thương hiệu Quốc gia
            </span>
            <span className="text-[11px] text-gray-300">Garco 10 • Est. 1946</span>
          </div>
          <h1 className="text-lg font-bold tracking-tight">TỔNG CÔNG TY MAY 10 - CTCP</h1>
          <p className="text-xs text-gray-300">Cổng Quản trị Doanh nghiệp Hợp nhất ERP</p>
        </div>
      </div>

      {/* ============================================================ */}
      {/* LEFT COLUMN: ENTERPRISE BRANDING & REAL MAY 10 PHOTOGRAPHY   */}
      {/* ============================================================ */}
      <div className="hidden lg:flex lg:w-[52%] xl:w-[56%] relative overflow-hidden flex-col justify-between p-10 xl:p-14 text-white bg-may10-dark">
        {/* Background Image with Smooth Fade */}
        <img
          src={MAY10_SLIDES[activeSlide].src}
          alt={MAY10_SLIDES[activeSlide].title}
          className="absolute inset-0 w-full h-full object-cover object-center transform scale-105 transition-all duration-700 ease-out"
        />

        {/* Corporate Deep Red/Dark Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/40" />
        <div className="absolute inset-0 bg-may10-primary/25 mix-blend-multiply pointer-events-none" />

        {/* Top Header Information */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 p-1 flex items-center justify-center shadow-lg">
              <img
                src="/images/garco10-logo.svg"
                alt="Garco 10 Logo"
                className="w-full h-full object-contain filter brightness-0 invert"
              />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-red-200">
                GARCO 10 • EST. 1946
              </div>
              <div className="text-sm font-semibold tracking-tight text-white">
                TỔNG CÔNG TY MAY 10 - CTCP
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-medium text-gray-200">
            <Award className="w-3.5 h-3.5 text-yellow-400" />
            <span>Thương Hiệu Quốc Gia Việt Nam</span>
          </div>
        </div>

        {/* Bottom Hero Context */}
        <div className="relative z-10 space-y-6">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-may10-primary/80 backdrop-blur-md text-[11px] font-semibold tracking-wide uppercase text-white shadow-sm border border-red-300/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Hệ Thống Điều Hành & Quản Trị Nội Bộ
            </div>

            <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Cổng Thông Tin Quản Trị Doanh Nghiệp ERP May 10
            </h2>

            <p className="text-sm xl:text-base text-gray-200 leading-relaxed font-normal">
              Thân thiện - Tin cậy - Hiệu quả. Đồng bộ và liên thông toàn diện từ Hoạch định sản xuất, 
              Chuỗi cung ứng vật tư, Quản lý kho vận đến Kiểm soát tài chính giá thành.
            </p>
          </div>

          {/* Key Enterprise Milestones */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/15 max-w-lg">
            <div>
              <div className="text-xl xl:text-2xl font-black text-white">80 NĂM</div>
              <div className="text-[11px] text-gray-300 font-medium">1946 – 2026</div>
            </div>
            <div>
              <div className="text-xl xl:text-2xl font-black text-white">12.000+</div>
              <div className="text-[11px] text-gray-300 font-medium">Cán bộ & công nhân viên</div>
            </div>
            <div>
              <div className="text-xs xl:text-sm font-bold text-white uppercase tracking-wider">Thương Hiệu Quốc Gia</div>
              <div className="text-[11px] text-gray-300 font-medium">Thân thiện – Tin cậy – Hiệu quả</div>
            </div>
          </div>

          {/* Photo Caption & Slide Selector */}
          <div className="pt-2 flex items-center justify-between text-xs text-gray-300">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white">{MAY10_SLIDES[activeSlide].title}</span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-300 hidden xl:inline">{MAY10_SLIDES[activeSlide].caption}</span>
            </div>

            <div className="flex items-center gap-1.5">
              {MAY10_SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveSlide(idx)}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === activeSlide ? 'w-6 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'
                  }`}
                  aria-label={`Xem ảnh ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* RIGHT COLUMN: ENTERPRISE LOGIN FORM                          */}
      {/* ============================================================ */}
      <div className="w-full lg:w-[48%] xl:w-[44%] flex flex-col justify-between p-6 sm:p-10 xl:p-14 bg-white">
        {/* Top Spacer / Subtle Notice */}
        <div className="flex items-center justify-between text-xs text-gray-400 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-400" />
            <span className="font-medium">Tổ hợp May 10 • 765 Nguyễn Văn Linh, Hà Nội</span>
          </div>
          <span className="hidden sm:inline font-mono text-[11px] text-gray-400">v2.0.4-prod</span>
        </div>

        {/* Center Container: Main Form */}
        <div className="w-full max-w-[420px] mx-auto my-auto py-8">
          {/* Garco 10 Official Logo & Header */}
          <div className="text-center sm:text-left mb-8">
            <div className="inline-block mb-3">
              <img
                src="/images/garco10-logo.svg"
                alt="May 10 Garco 10 Logo"
                className="h-12 w-auto object-contain mx-auto sm:mx-0"
              />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
              Đăng nhập Cổng ERP
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Dành riêng cho Cán bộ & Nhân viên Tổng Công ty May 10 - CTCP
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700 animate-fadeIn">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
              <div className="flex-1 font-medium leading-relaxed">{error}</div>
            </div>
          )}

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Email nội bộ May 10 <span className="text-red-500">*</span>
              </label>
              <div className="relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="canbo@may10.com.vn"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-xs text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-may10-primary focus:border-transparent transition-all placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-700">
                  Mật khẩu hệ thống <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => alert('Vui lòng liên hệ Phòng Công nghệ thông tin May 10 (Ext: 108 hoặc email: it-support@may10.com.vn) để được cấp lại mật khẩu.')}
                  className="text-[11px] font-medium text-may10-primary hover:text-may10-600 transition-colors"
                >
                  Quên mật khẩu?
                </button>
              </div>
              <div className="relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-10 pr-10 py-2.5 text-xs text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-may10-primary focus:border-transparent transition-all placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center pt-1">
              <label className="flex items-center text-xs text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-may10-primary focus:ring-may10-primary"
                />
                <span className="ml-2 text-gray-700">Duy trì trạng thái đăng nhập trên thiết bị này</span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-lg shadow-sm text-xs font-bold text-white bg-may10-primary hover:bg-may10-600 active:bg-may10-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-may10-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>{loading ? 'Đang xác thực thông tin...' : 'Đăng nhập Cổng ERP'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Security Notice */}
          <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-center gap-2 text-[11px] text-gray-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Kết nối bảo mật • Tài khoản nội bộ May 10</span>
          </div>

          {/* ============================================================ */}
          {/* DEV-ONLY COLLAPSIBLE RBAC TESTER (Hidden in production)     */}
          {/* ============================================================ */}
          {import.meta.env.DEV && (
            <details className="mt-6 rounded-lg border border-dashed border-gray-200 bg-gray-50/70 p-3 text-xs">
              <summary className="cursor-pointer text-[11px] font-semibold text-gray-500 hover:text-gray-800 select-none flex items-center justify-between">
                <span>🛠️ Công cụ kiểm thử vai trò (Dev Only)</span>
                <span className="text-[10px] text-gray-400 font-mono">6 vai trò</span>
              </summary>
              <div className="mt-3 pt-2 border-t border-gray-200">
                <p className="text-[11px] text-gray-500 mb-2">
                  Chọn vai trò để đăng nhập nhanh trong môi trường phát triển:
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {DEMO_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.code}
                      type="button"
                      onClick={() => handleQuickLogin(acc)}
                      className="px-2.5 py-1.5 text-left rounded-md border border-gray-200 bg-white hover:bg-red-50 hover:border-red-200 transition-colors group"
                    >
                      <div className="text-[11px] font-bold text-gray-700 group-hover:text-may10-primary truncate">
                        {acc.shortName}
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono truncate">
                        {acc.code}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </details>
          )}
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-gray-100 text-center sm:text-left text-[11px] text-gray-400 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>© 2026 Tổng Công ty May 10 - CTCP • M10 ERP System</span>
          <span className="text-gray-400">Hỗ trợ kỹ thuật: Ext 108</span>
        </div>
      </div>
    </div>
  );
}
