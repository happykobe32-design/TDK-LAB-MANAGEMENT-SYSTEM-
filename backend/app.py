from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import os

app = Flask(__name__)
CORS(app)

EXCEL_PATH = os.path.join(os.path.dirname(__file__), "data", "QR_V2.xlsx")

def load_sheet1():
    df = pd.read_excel(EXCEL_PATH, sheet_name="Sheet1")
    df = df.fillna("")
    # Sheet1 columns: Stress, Type, Operation, Condition (你這份檔就是這樣)
    stresses = sorted([s for s in df["Stress"].unique().tolist() if str(s).strip() != ""])
    mapping = {}
    for s in stresses:
        sub = df[df["Stress"] == s][["Stress", "Type", "Operation", "Condition"]].to_dict(orient="records")
        mapping[s] = sub
    return stresses, mapping

def load_sheet2_columns():
    df = pd.read_excel(EXCEL_PATH, sheet_name="Sheet2")
    df = df.fillna("")
    cols = df.columns.tolist()
    # 你要的 header 欄位
    header_fields = [
        "id",
        "Status_Up date_Time",
        "Project Family",
        "Product",
        "Version",
        "QR",
    ]
    # 其他欄位（除去 header_fields 的剩下就是 Sheet2 其他項）
    other_fields = [c for c in cols if c not in header_fields]
    return header_fields, other_fields, cols

@app.get("/api/meta")
def api_meta():
    stresses, _ = load_sheet1()
    header_fields, other_fields, all_fields = load_sheet2_columns()
    return jsonify({
        "stresses": stresses,
        "sheet2": {
            "header_fields": header_fields,
            "other_fields": other_fields,
            "all_fields": all_fields,
        }
    })

@app.get("/api/stress/<stress_name>")
def api_stress(stress_name):
    _, mapping = load_sheet1()
    rows = mapping.get(stress_name, [])
    return jsonify({
        "stress": stress_name,
        "sheet1_rows": rows,
    })

@app.post("/api/save")
def api_save():
    """
    前端送：
    {
      "header": {...},
      "lotId": "...",
      "stress": "...",
      "sheet1_rows": [...],   # 編輯後的 sheet1 rows
      "sheet2_other": {...}   # 編輯後的 sheet2 其他欄位
    }
    這裡先示範：回傳你送的資料（確認連線/資料流OK）
    真的要寫回 Excel 我下一步再給你（先把資料流跑通）
    """
    data = request.get_json(force=True)
    return jsonify({"ok": True, "received": data})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)

