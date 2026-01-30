//登入畫面
import React from "react";
import logoImg from "../assets/company-logo.png";
import { useTranslation } from "react-i18next";

const LoginPage = ({ loginData, setLoginData, handleLogin, changeLanguage }) => {
  const { t } = useTranslation();

  return (
    <div className="page page-center">
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
        <div className="card card-md shadow-sm">
          <div className="card-body">
            <h2 className="h3 text-center mb-4">{t("LOGIN")}</h2>
            <div className="mb-3">
              <label className="form-label">{t("USER_ID")}</label>
              <input 
                className="form-control" 
                value={loginData.username} 
                onChange={(e) => setLoginData({ ...loginData, username: e.target.value })} 
              />
            </div>
            <div className="mb-3">
              <label className="form-label">{t("PASSWORD")}</label>
              <input 
                type="password" 
                className="form-control" 
                value={loginData.password} 
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })} 
              />
            </div>
            <button className="btn btn-primary w-100" onClick={handleLogin}>{t("LOGIN")}</button>
            <div className="text-muted text-center mt-3 small">{t("PW_HINT")}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;