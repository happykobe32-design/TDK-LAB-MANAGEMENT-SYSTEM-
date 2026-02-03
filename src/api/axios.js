import axios from "axios";

const apiClient = axios.create({
  // 這裡設定你後端的網址與 Port
  // 根據你的 main.py，後端跑在 9000 port   原本:baseURL: "http://10.108.128.104:9000",  
  // 開發階段先使用 window.location.hostname 會自動抓取當前網址的 IP
  baseURL: `http://${window.location.hostname}:9000`,
  headers: {
    "Content-Type": "application/json",
  },
});

export default apiClient;