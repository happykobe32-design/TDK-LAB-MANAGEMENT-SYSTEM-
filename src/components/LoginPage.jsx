// 登入畫面 - 已優化延遲與抖動邏輯
import React, { useState, useEffect } from "react"; 
import logoImg from "../assets/company-logo.png";
import { useTranslation } from "react-i18next";

const LoginPage = ({ loginData, setLoginData, handleLogin, changeLanguage, errorTrigger, loginError, isLoggingIn }) => {
  const { t } = useTranslation();
  
  const [showPassword, setShowPassword] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  // 1. 處理抖動邏輯：只有在 errorTrigger 增加且大於 0 時才觸發
  useEffect(() => {
    if (errorTrigger > 0) {
      setIsShaking(true);
      const timer = setTimeout(() => {
        setIsShaking(false);
      }, 400); 
      return () => clearTimeout(timer);
    }
  }, [errorTrigger]);

  const handleSubmit = (e) => {
    e.preventDefault();
    // 2. 防止重複提交並提供即時反饋
    if (!isLoggingIn) {
      handleLogin();
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="page page-center">
      <style>{`
        @keyframes shake-ios {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-8px); }
          30% { transform: translateX(8px); }
          45% { transform: translateX(-8px); }
          60% { transform: translateX(8px); }
          75% { transform: translateX(-4px); }
          85% { transform: translateX(4px); }
        }
        .shake-animation {
          animation: shake-ios 0.4s ease-in-out;
          border-color: #d63939 !important;
        }
        .error-message {
          color: #d63939;
          font-size: 0.85rem;
          margin-top: 12px;
          text-align: center;
          font-weight: 500;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }
        .login-btn-loading {
          cursor: not-allowed;
          opacity: 0.8;
        }
      `}</style>

      <div className="container container-tight py-4">
        <div className="text-center mb-4">
          <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
            <img 
              src={logoImg} 
              alt="Logo" 
              style={{ height: "30px", width: "auto", filter: "invert(0.8) brightness(0.5)", flexShrink: 0 }} 
            />
            <h1 className="fw-bold m-0" style={{ fontSize: "1.6rem", color: "#030303ff", whiteSpace: "nowrap" }}>
              {t("SYSTEM_TITLE")}
            </h1>
          </div>
          <div className="mt-2">
            <button className="btn btn-sm btn-ghost-primary" onClick={() => changeLanguage('en')}>EN</button>
            <span className="mx-1 text-muted">|</span>
            <button className="btn btn-sm btn-ghost-primary" onClick={() => changeLanguage('zh')}>中文</button>
          </div>
        </div>

        <div className={`card card-md shadow-sm ${isShaking ? "shake-animation" : ""}`} style={{ transition: "border-color 0.2s" }}>
          <div className="card-body">
            <h2 className="h3 text-center mb-4">{t("LOGIN")}</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">{t("USER_ID")}</label>
                <input 
                  className="form-control" 
                  value={loginData.username} 
                  onChange={(e) => setLoginData({ ...loginData, username: e.target.value })} 
                  required
                  disabled={isLoggingIn}
                />
              </div>

              <div className="mb-3">
                <label className="form-label">{t("PASSWORD")}</label>
                <div className="input-group input-group-flat">
                  <input 
                    type={showPassword ? "text" : "password"}
                    className="form-control" 
                    value={loginData.password} 
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })} 
                    required
                    disabled={isLoggingIn}
                  />
                  <span className="input-group-text">
                    <button
                      type="button"
                      className="link-secondary"
                      title={showPassword ? "Hide password" : "Show password"}
                      onClick={togglePasswordVisibility}
                      style={{ border: 'none', background: 'none', padding: 0 }}
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M10.584 10.587a2 2 0 0 0 2.828 2.83" /><path d="M9.363 5.365a9.466 9.466 0 0 1 2.637 -.365c4 0 7.333 2.333 10 7c-.778 1.361 -1.612 2.524 -2.503 3.488m-2.14 1.861c-1.631 1.1 -3.415 1.651 -5.357 1.651c-4 0 -7.333 -2.333 -10 -7c1.369 -2.395 2.913 -4.175 4.632 -5.341" /><line x1="3" y1="3" x2="21" y2="21" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <path stroke="none" d="M0 0h24v24H0z" fill="none"/><circle cx="12" cy="12" r="2" /><path d="M22 12c-2.667 4.667 -6 7 -10 7s-7.333 -2.333 -10 -7c2.667 -4.667 6 -7 10 -7s7.333 2.333 10 7" />
                        </svg>
                      )}
                    </button>
                  </span>
                </div>
              </div>

              <div className="form-footer">
                <button 
                  type="submit" 
                  className={`btn btn-primary w-100 ${isLoggingIn ? "login-btn-loading" : ""}`}
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? "Connecting..." : t("LOGIN")}
                </button>
              </div>
            </form>

            {/* 錯誤訊息放置於按鈕下方，且不會因重複點擊而閃爍消失 */}
            {loginError && (
              <div className="error-message">
                <svg xmlns="http://www.w3.org/2000/svg" className="icon" width="18" height="18" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path stroke="none" d="M0 0h24v24H0z" fill="none"/><circle cx="12" cy="12" r="9" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {loginError}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;