import io
import re
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pypdf import PdfReader
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

app = FastAPI()

# Konfigurasi CORS agar frontend bisa akses backend
app.add_middleware(
    CORSMiddleware, 
    allow_origins=["*"], 
    allow_methods=["*"], 
    allow_headers=["*"]
)

# --- KONFIGURASI SECURITY ---
USER_DB = {"admin": "rahasia123"}
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# --- KONFIGURASI GOOGLE SHEETS ---
SERVICE_ACCOUNT_FILE = 'credentials.json'
SPREADSHEET_ID = '1QYAO7Xur9Si93FUhFW1D_Cf2x0oPZsdd1850TW52_RQ'
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

db_tagihan = []

def append_to_google_sheet(row_data):
    try:
        creds = Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=SCOPES)
        service = build('sheets', 'v4', credentials=creds)
        body = {'values': [row_data]}
        service.spreadsheets().values().append(
            spreadsheetId=SPREADSHEET_ID, range="Sheet1!A2", 
            valueInputOption="RAW", body=body).execute()
        return True
    except Exception as e:
        print(f"Error Sheets: {e}")
        return False

# --- ENDPOINT LOGIN ---
@app.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user_password = USER_DB.get(form_data.username)
    if not user_password or form_data.password != user_password:
        raise HTTPException(status_code=400, detail="Username atau password salah")
    return {"access_token": form_data.username, "token_type": "bearer"}

# --- ENDPOINT UPLOAD (DIPROTEKSI) ---
@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...), token: str = Depends(oauth2_scheme)):
    content = await file.read()
    try:
        reader = PdfReader(io.BytesIO(content))
        text = " ".join([page.extract_text() for page in reader.pages])
        text = re.sub(r'\s+', ' ', text)

        bukpot_match = re.search(r"\b([A-Z0-9]{2}\d{2}[A-Z0-9]{5})\b", text)
        if not bukpot_match:
            bukpot_match = re.search(r"\b([A-Z0-9]{9})\b", text)
        nobukpot = bukpot_match.group(1) if bukpot_match else "TIDAK TERDETEKSI"

        npwp_matches = re.findall(r"\b\d{16}\b", text)
        npwp = npwp_matches[-1] if npwp_matches else "-"

        masa_match = re.search(r"(\d{2}-\d{4})", text)
        masa = masa_match.group(1) if masa_match else "-"

        tgl_match = re.search(r"C\.4 TANGGAL :?\s*([\d\s\w]+202\d)", text)
        tanggal = tgl_match.group(1).strip() if tgl_match else "-"
        
        pajak_matches = re.findall(r"(\d{1,3}(?:\.\d{3})+)", text)
        pph = pajak_matches[-1] if pajak_matches else "0"
        
        pemotong_match = re.search(r"C\.3 NAMA PEMOTONG DAN/ATAU PEMUNGUT PPh\s*(.*?)(?=C\.4)", text)
        if pemotong_match:
            pemotong = pemotong_match.group(1).strip()
            pemotong = re.sub(r'^[:\s]+', '', pemotong)
        else:
            pemotong = "TIDAK TERDETEKSI"

        new_entry = {
            "nobukpot": nobukpot,
            "npwp": npwp,
            "masa": masa,
            "tanggal": tanggal,
            "pph": pph,
            "pemotong": pemotong
        }
        
        db_tagihan.append(new_entry)
        append_to_google_sheet([nobukpot, npwp, masa, tanggal, pph, pemotong])
        return new_entry
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/tagihan")
async def get_tagihan():
    return db_tagihan

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)