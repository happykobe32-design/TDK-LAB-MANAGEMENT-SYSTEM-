import axios from "axios";

const apiClient = axios.create({
  // 這裡設定你後端的網址與 Port
  // 開發階段先使用 window.location.hostname 會自動抓取當前網址的 IP(同台電腦前後端才有用)
  baseURL: `http://${window.location.hostname}:8000`,
  //連別台後端需要IP(可能會變)
  //baseURL: `http://10.108.128.77:9000`,
  headers: {
    "Content-Type": "application/json",
  },
});

export default apiClient;