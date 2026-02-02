import axios from "axios";

const apiClient = axios.create({
  // 這裡設定你後端的網址與 Port
  // 根據你的 main.py，後端跑在 9000 port
  baseURL: "http://127.0.0.1:8000", 
  headers: {
    "Content-Type": "application/json",
  },
});

export default apiClient;